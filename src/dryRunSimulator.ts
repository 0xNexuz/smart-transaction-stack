import { randomUUID } from "node:crypto";
import type { BundleSubmitResult, LifecycleLogEntry, StageObservation } from "./types.js";
import { latencyMs, nowIso } from "./time.js";

export class DryRunSimulator {
  submit(attempt: number): BundleSubmitResult {
    return {
      bundleId: `dry-bundle-${attempt}-${randomUUID()}`,
      signature: `dry-signature-${attempt}-${randomUUID()}`
    };
  }

  stages(input: {
    submittedAt: string;
    submittedSlot: number;
    signature: string;
    bundleId: string;
    shouldFail: boolean;
    failureRaw?: string;
  }): StageObservation[] {
    const submitted: StageObservation = {
      stage: "submitted",
      slot: input.submittedSlot,
      signature: input.signature,
      bundleId: input.bundleId,
      timestamp: input.submittedAt
    };

    if (input.shouldFail) {
      const timestamp = offsetIso(input.submittedAt, 780);
      return [
        submitted,
        {
          stage: "failed",
          slot: input.submittedSlot + 1,
          signature: input.signature,
          bundleId: input.bundleId,
          timestamp,
          latencyMsFromSubmitted: latencyMs(input.submittedAt, timestamp),
          error: input.failureRaw ?? "simulated expired blockhash"
        }
      ];
    }

    const processedAt = offsetIso(input.submittedAt, 420);
    const confirmedAt = offsetIso(input.submittedAt, 1_260);
    const finalizedAt = offsetIso(input.submittedAt, 12_000);
    return [
      submitted,
      {
        stage: "processed",
        commitment: "processed",
        slot: input.submittedSlot + 1,
        signature: input.signature,
        bundleId: input.bundleId,
        timestamp: processedAt,
        latencyMsFromSubmitted: latencyMs(input.submittedAt, processedAt)
      },
      {
        stage: "confirmed",
        commitment: "confirmed",
        slot: input.submittedSlot + 2,
        signature: input.signature,
        bundleId: input.bundleId,
        timestamp: confirmedAt,
        latencyMsFromSubmitted: latencyMs(input.submittedAt, confirmedAt)
      },
      {
        stage: "finalized",
        commitment: "finalized",
        slot: input.submittedSlot + 33,
        signature: input.signature,
        bundleId: input.bundleId,
        timestamp: finalizedAt,
        latencyMsFromSubmitted: latencyMs(input.submittedAt, finalizedAt)
      }
    ];
  }

  mutateForFailure(entry: LifecycleLogEntry): LifecycleLogEntry {
    return {
      ...entry,
      failure: {
        kind: "expired_blockhash",
        raw: "simulated expired blockhash due to fault injection"
      }
    };
  }
}

function offsetIso(startIso: string, ms: number): string {
  return new Date(new Date(startIso).getTime() + ms).toISOString();
}
