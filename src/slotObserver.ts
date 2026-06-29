import { Connection } from "@solana/web3.js";
import type { NetworkSnapshot } from "./types.js";
import { nowIso } from "./time.js";

export class SlotObserver {
  constructor(private readonly connection: Connection) {}

  async snapshot(recentTipLamports: number[], streamedSlot?: number): Promise<NetworkSnapshot> {
    const slot = streamedSlot ?? (await this.connection.getSlot("processed"));
    const leaders = await this.safeLeaderSchedule(slot);
    const nextJitoLeaderSlot = this.estimateNextLeaderWindow(slot, leaders);
    const tipSpread = spread(recentTipLamports);
    return {
      slot,
      leader: leaders.get(slot),
      nextJitoLeaderSlot,
      slotsUntilJitoLeader: nextJitoLeaderSlot === undefined ? undefined : Math.max(0, nextJitoLeaderSlot - slot),
      recentTipLamports,
      congestionScore: Math.max(0.05, Math.min(1, tipSpread / 100_000)),
      observedAt: nowIso()
    };
  }

  private async safeLeaderSchedule(slot: number): Promise<Map<number, string>> {
    try {
      const epochInfo = await this.connection.getEpochInfo("processed");
      const schedule = await this.connection.getLeaderSchedule();
      const map = new Map<number, string>();
      for (const [validator, indices] of Object.entries(schedule ?? {})) {
        for (const index of indices) {
          map.set(epochInfo.absoluteSlot + index, validator);
        }
      }
      return map;
    } catch {
      return new Map([[slot, "unknown"]]);
    }
  }

  private estimateNextLeaderWindow(slot: number, leaders: Map<number, string>): number | undefined {
    for (let offset = 0; offset < 64; offset += 1) {
      if (leaders.has(slot + offset)) return slot + offset;
    }
    return undefined;
  }
}

function spread(values: number[]): number {
  if (values.length < 2) return 1_000;
  return Math.max(...values) - Math.min(...values);
}
