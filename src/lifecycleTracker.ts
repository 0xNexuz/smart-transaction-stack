import type { Connection, Commitment, TransactionSignature } from "@solana/web3.js";
import type { StageObservation } from "./types.js";
import { latencyMs, nowIso } from "./time.js";

export class LifecycleTracker {
  constructor(private readonly connection: Connection) {}

  async observeSignature(signature: TransactionSignature, submittedAt: string): Promise<StageObservation[]> {
    const observations: StageObservation[] = [];
    for (const commitment of ["processed", "confirmed", "finalized"] as Commitment[]) {
      const timestamp = nowIso();
      await this.waitForCommitment(signature, commitment);
      observations.push({
        stage: commitment as "processed" | "confirmed" | "finalized",
        commitment,
        signature,
        timestamp,
        latencyMsFromSubmitted: latencyMs(submittedAt, timestamp),
        slot: await this.connection.getSlot(commitment)
      });
    }
    return observations;
  }

  private async waitForCommitment(signature: TransactionSignature, commitment: Commitment): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`Timed out waiting for ${commitment}`)), 90_000);
      const id = this.connection.onSignature(
        signature,
        (result) => {
          clearTimeout(timeout);
          void this.connection.removeSignatureListener(id);
          if (result.err) reject(new Error(JSON.stringify(result.err)));
          else resolve();
        },
        commitment
      );
    });
  }
}
