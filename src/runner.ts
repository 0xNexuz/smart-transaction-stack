import { randomUUID } from "node:crypto";
import bs58 from "bs58";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import type { StackConfig } from "./config.js";
import { OperationalDecisionAgent } from "./aiAgent.js";
import { BundleBuilder } from "./bundleBuilder.js";
import { DryRunSimulator } from "./dryRunSimulator.js";
import { classifyFailure } from "./failureClassifier.js";
import { JitoClient } from "./jitoClient.js";
import { LifecycleLogger } from "./logger.js";
import { LifecycleTracker } from "./lifecycleTracker.js";
import { SlotObserver } from "./slotObserver.js";
import { TipOracle } from "./tipOracle.js";
import type { LifecycleLogEntry, StackMode, StageObservation } from "./types.js";
import { nowIso } from "./time.js";
import { loadKeypair } from "./wallet.js";
import { YellowstoneSlotStream } from "./yellowstoneStream.js";

export interface RunOptions {
  mode: StackMode;
  count: number;
  injectFailures: number;
}

export async function runStack(config: StackConfig, options: RunOptions): Promise<void> {
  const connection = new Connection(config.solanaRpcUrl, {
    commitment: "confirmed",
    wsEndpoint: config.solanaWsUrl
  });
  const tipOracle = new TipOracle(config.jitoBlockEngineUrl);
  const slotObserver = new SlotObserver(connection);
  const agent = new OperationalDecisionAgent(config.openaiApiKey, config.openaiModel);
  const logger = new LifecycleLogger(config.logDir);
  const builder = new BundleBuilder(connection);
  const jito = new JitoClient(config.jitoBlockEngineUrl, config.jitoUuid);
  const tracker = new LifecycleTracker(connection);
  const dryRun = new DryRunSimulator();
  const yellowstone = new YellowstoneSlotStream(config);
  const payer = options.mode === "real" ? await loadKeypair(config.walletKeypairPath) : Keypair.generate();
  const tipAccounts =
    options.mode === "dry-run"
      ? [new PublicKey("96gYZGLn1gQYY4C38Mz5kJrLiJ7zWc8mjTnWhxWcTFLB")]
      : await tipOracle.getTipAccounts();
  const runId = randomUUID();

  if (options.mode === "real") {
    const balance = await connection.getBalance(payer.publicKey, "confirmed");
    if (balance < builder.estimateMinimumBalance()) {
      throw new Error(`Wallet ${payer.publicKey.toBase58()} needs more SOL for fees and tips.`);
    }
  }

  for (let attempt = 1; attempt <= options.count; attempt += 1) {
    const recentTips = options.mode === "dry-run" ? syntheticRecentTips(attempt) : await tipOracle.recentTips();
    const streamedSlot = options.mode === "dry-run" ? undefined : await yellowstone.readLatestSlot();
    const snapshot =
      options.mode === "dry-run" ? dryRunSnapshot(recentTips, attempt) : await slotObserver.snapshot(recentTips, streamedSlot);
    const tipDecision = await agent.decideTip(snapshot);
    const tipAccount = tipAccounts[attempt % tipAccounts.length] ?? new PublicKey("11111111111111111111111111111111");
    const memo = `smart-stack:${runId}:${attempt}`;
    const plan =
      options.mode === "dry-run"
        ? {
            memo,
            blockhash: `dry-blockhash-${runId}-${attempt}`,
            lastValidBlockHeight: 1_000_000 + attempt,
            tipLamports: tipDecision.lamports,
            tipAccount,
            targetLeaderSlot: snapshot.nextJitoLeaderSlot
          }
        : await builder.createPlan({
            memo,
            payer: payer.publicKey,
            tipLamports: tipDecision.lamports,
            tipAccount,
            targetLeaderSlot: snapshot.nextJitoLeaderSlot
          });

    const submittedAt = nowIso();
    const shouldInjectFailure = attempt <= options.injectFailures;
    const submittedSlot = snapshot.slot;
    let bundleId: string;
    let signature: string;
    let stages: StageObservation[];

    if (options.mode === "dry-run") {
      const result = dryRun.submit(attempt);
      bundleId = result.bundleId;
      signature = result.signature;
      stages = dryRun.stages({
        submittedAt,
        submittedSlot,
        signature,
        bundleId,
        shouldFail: shouldInjectFailure,
        failureRaw: shouldInjectFailure ? "simulated expired blockhash due to fault injection" : undefined
      });
    } else {
      const serialized = builder.buildSignedBundle(plan, payer);
      signature = signatureFromBase64Transaction(serialized[0] ?? "");
      if (shouldInjectFailure) {
        process.stdout.write(
          `attempt ${attempt}: waiting for blockhash expiry to create a real expired_blockhash failure...\n`
        );
        await waitUntilBlockhashExpired(connection, plan.lastValidBlockHeight);
      }

      try {
        const result = await jito.sendBundle(serialized);
        bundleId = result.bundleId;
        stages = [
          {
            stage: "submitted",
            slot: submittedSlot,
            signature,
            bundleId,
            timestamp: submittedAt
          }
        ];
        try {
          stages.push(...(await tracker.observeSignature(signature, submittedAt)));
        } catch (error) {
          stages.push({
            stage: "failed",
            slot: await connection.getSlot("processed").catch(() => submittedSlot),
            signature,
            bundleId,
            timestamp: nowIso(),
            error: String(error)
          });
        }
      } catch (error) {
        bundleId = "jito-submit-error";
        stages = [
          {
            stage: "submitted",
            slot: submittedSlot,
            signature,
            bundleId,
            timestamp: submittedAt
          },
          {
            stage: "failed",
            slot: await connection.getSlot("processed").catch(() => submittedSlot),
            signature,
            bundleId,
            timestamp: nowIso(),
            error: String(error)
          }
        ];
      }
    }

    const failed = stages.find((stage) => stage.stage === "failed");
    const rawFailure = failed?.error;
    const failureKind = rawFailure ? classifyFailure(rawFailure) : undefined;
    const retryDecision =
      failureKind === undefined
        ? undefined
        : await agent.decideRetry({
            failureKind,
            rawError: rawFailure ?? "",
            previousTipLamports: tipDecision.lamports,
            snapshot
          });

    const entry: LifecycleLogEntry = {
      runId,
      attempt,
      mode: options.mode,
      memo,
      bundleId,
      signature,
      submittedSlot,
      targetLeaderSlot: snapshot.nextJitoLeaderSlot,
      tipLamports: tipDecision.lamports,
      blockhash: plan.blockhash,
      lastValidBlockHeight: plan.lastValidBlockHeight,
      stages,
      failure: failureKind && rawFailure ? { kind: failureKind, raw: rawFailure } : undefined,
      ai: {
        tipDecision,
        retryDecision
      }
    };

    await logger.append(entry);
    process.stdout.write(
      `${attempt}/${options.count} ${entry.failure ? "failed" : "landed"} ` +
        `slot=${submittedSlot} tip=${tipDecision.lamports} bundle=${bundleId}\n`
    );
  }
}

function signatureFromBase64Transaction(base64: string): string {
  const raw = Buffer.from(base64, "base64");
  const sigCount = raw[0] ?? 0;
  if (sigCount < 1) return "signature-unavailable";
  return bs58.encode(raw.subarray(1, 65));
}

function dryRunSnapshot(recentTips: number[], attempt: number) {
  const slot = 500_000_000 + attempt;
  return {
    slot,
    leader: "dry-run-leader",
    nextJitoLeaderSlot: slot + 4,
    slotsUntilJitoLeader: 4,
    recentTipLamports: recentTips,
    congestionScore: 0.25,
    observedAt: nowIso()
  };
}

function syntheticRecentTips(attempt: number): number[] {
  const base = 5_000 + attempt * 750;
  return [base, base * 2, base * 3, base * 5, base * 8];
}

async function waitUntilBlockhashExpired(connection: Connection, lastValidBlockHeight: number): Promise<void> {
  while (true) {
    const current = await connection.getBlockHeight("confirmed");
    if (current > lastValidBlockHeight) return;
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
}
