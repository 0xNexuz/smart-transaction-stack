import OpenAI from "openai";
import type { FailureKind, NetworkSnapshot, RetryDecision, TipDecision } from "./types.js";

export interface DecisionAgent {
  decideTip(snapshot: NetworkSnapshot): Promise<TipDecision>;
  decideRetry(input: {
    failureKind: FailureKind;
    rawError: string;
    previousTipLamports: number;
    snapshot: NetworkSnapshot;
  }): Promise<RetryDecision>;
}

export class OperationalDecisionAgent implements DecisionAgent {
  private readonly client?: OpenAI;

  constructor(
    apiKey: string | undefined,
    private readonly model: string
  ) {
    if (apiKey) {
      this.client = new OpenAI({ apiKey });
    }
  }

  async decideTip(snapshot: NetworkSnapshot): Promise<TipDecision> {
    const local = this.localTipPolicy(snapshot);
    if (!this.client) return local;

    const prompt = [
      "You are operating a Solana Jito bundle sender.",
      "Choose a bundle tip in lamports using the current snapshot.",
      "Return strict JSON with lamports, confidence, and reasoning.",
      JSON.stringify(snapshot)
    ].join("\n");

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        temperature: 0.2,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      });
      const parsed = JSON.parse(response.choices[0]?.message.content ?? "{}") as Partial<TipDecision>;
      return {
        lamports: clampLamports(parsed.lamports ?? local.lamports),
        confidence: clampConfidence(parsed.confidence ?? local.confidence),
        reasoning: parsed.reasoning ?? local.reasoning,
        source: "ai"
      };
    } catch (error) {
      return {
        ...local,
        reasoning: `${local.reasoning} OpenAI decision failed, so local policy was used: ${String(error)}`
      };
    }
  }

  async decideRetry(input: {
    failureKind: FailureKind;
    rawError: string;
    previousTipLamports: number;
    snapshot: NetworkSnapshot;
  }): Promise<RetryDecision> {
    const local = this.localRetryPolicy(input.failureKind);
    if (!this.client) return local;

    const prompt = [
      "You are operating a Solana smart transaction stack.",
      "Decide whether to retry a failed Jito bundle and what must change.",
      "Return strict JSON with shouldRetry, refreshBlockhash, tipMultiplier, and reasoning.",
      JSON.stringify(input)
    ].join("\n");

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        temperature: 0.2,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      });
      const parsed = JSON.parse(response.choices[0]?.message.content ?? "{}") as Partial<RetryDecision>;
      return {
        shouldRetry: parsed.shouldRetry ?? local.shouldRetry,
        refreshBlockhash: parsed.refreshBlockhash ?? local.refreshBlockhash,
        tipMultiplier: clampMultiplier(parsed.tipMultiplier ?? local.tipMultiplier),
        reasoning: parsed.reasoning ?? local.reasoning,
        source: "ai"
      };
    } catch (error) {
      return {
        ...local,
        reasoning: `${local.reasoning} OpenAI retry decision failed, so local policy was used: ${String(error)}`
      };
    }
  }

  private localTipPolicy(snapshot: NetworkSnapshot): TipDecision {
    const tips = snapshot.recentTipLamports.length > 0 ? [...snapshot.recentTipLamports].sort((a, b) => a - b) : [1_000];
    const p75 = tips[Math.floor((tips.length - 1) * 0.75)] ?? tips[tips.length - 1] ?? 1_000;
    const urgency = Math.max(0, 8 - (snapshot.slotsUntilJitoLeader ?? 8)) / 8;
    const congestionBoost = 1 + snapshot.congestionScore * 0.6 + urgency * 0.35;
    const lamports = clampLamports(Math.ceil(p75 * congestionBoost));
    return {
      lamports,
      confidence: 0.62,
      reasoning:
        `Local policy selected p75 recent tip (${p75}) adjusted by congestion ` +
        `${snapshot.congestionScore.toFixed(2)} and leader urgency ${urgency.toFixed(2)}.`,
      source: "local-policy"
    };
  }

  private localRetryPolicy(failureKind: FailureKind): RetryDecision {
    if (failureKind === "expired_blockhash") {
      return {
        shouldRetry: true,
        refreshBlockhash: true,
        tipMultiplier: 1.15,
        reasoning: "Expired blockhash means the transaction can no longer land; refresh blockhash and modestly raise the tip.",
        source: "local-policy"
      };
    }
    if (failureKind === "fee_too_low" || failureKind === "bundle_failure") {
      return {
        shouldRetry: true,
        refreshBlockhash: false,
        tipMultiplier: 1.35,
        reasoning: "The failure indicates weak landing economics or bundle rejection; retry with a higher tip.",
        source: "local-policy"
      };
    }
    if (failureKind === "leader_skipped") {
      return {
        shouldRetry: true,
        refreshBlockhash: true,
        tipMultiplier: 1.1,
        reasoning: "Skipped leader windows require waiting for a new viable leader and refreshing timing-sensitive data.",
        source: "local-policy"
      };
    }
    return {
      shouldRetry: false,
      refreshBlockhash: false,
      tipMultiplier: 1,
      reasoning: "Failure is not classified as retryable without operator review.",
      source: "local-policy"
    };
  }
}

function clampLamports(value: number): number {
  return Math.max(1_000, Math.min(10_000_000, Math.floor(value)));
}

function clampConfidence(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function clampMultiplier(value: number): number {
  return Math.max(1, Math.min(5, value));
}
