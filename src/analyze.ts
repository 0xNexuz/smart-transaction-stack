import { readLifecycleLog } from "./logger.js";

export async function analyzeLog(path: string): Promise<void> {
  const entries = await readLifecycleLog(path);
  const total = entries.length;
  const failed = entries.filter((entry) => entry.failure);
  const landed = total - failed.length;
  const confirmedDeltas = entries
    .map((entry) => {
      const processed = entry.stages.find((stage) => stage.stage === "processed");
      const confirmed = entry.stages.find((stage) => stage.stage === "confirmed");
      if (!processed || !confirmed) return undefined;
      return new Date(confirmed.timestamp).getTime() - new Date(processed.timestamp).getTime();
    })
    .filter((value): value is number => value !== undefined);

  const avgDelta =
    confirmedDeltas.length === 0
      ? undefined
      : Math.round(confirmedDeltas.reduce((sum, value) => sum + value, 0) / confirmedDeltas.length);

  process.stdout.write(`entries=${total}\n`);
  process.stdout.write(`landed=${landed}\n`);
  process.stdout.write(`failed=${failed.length}\n`);
  process.stdout.write(`avg_processed_to_confirmed_ms=${avgDelta ?? "n/a"}\n`);
  process.stdout.write(`failure_kinds=${[...new Set(failed.map((entry) => entry.failure?.kind))].join(",") || "none"}\n`);
}
