import { readLifecycleLog } from "./logger.js";

export interface VerifyOptions {
  path: string;
  requireReal: boolean;
  minEntries: number;
  minFailures: number;
}

export async function verifyEvidence(options: VerifyOptions): Promise<boolean> {
  const entries = await readLifecycleLog(options.path);
  const failures = entries.filter((entry) => entry.failure);
  const successes = entries.filter((entry) => !entry.failure);
  const problems: string[] = [];

  if (entries.length < options.minEntries) problems.push(`expected at least ${options.minEntries} entries`);
  if (failures.length < options.minFailures) problems.push(`expected at least ${options.minFailures} failures`);
  if (options.requireReal && entries.some((entry) => entry.mode !== "real")) problems.push("all entries must be real mode");

  for (const entry of entries) {
    if (!entry.submittedSlot) problems.push(`attempt ${entry.attempt}: missing submittedSlot`);
    if (!entry.tipLamports || entry.tipLamports <= 0) problems.push(`attempt ${entry.attempt}: missing tipLamports`);
    if (!entry.ai.tipDecision.reasoning) problems.push(`attempt ${entry.attempt}: missing AI tip reasoning`);
    if (entry.failure && !entry.ai.retryDecision?.reasoning) {
      problems.push(`attempt ${entry.attempt}: failure missing retry reasoning`);
    }
    if (!entry.failure) {
      for (const stage of ["submitted", "processed", "confirmed", "finalized"]) {
        if (!entry.stages.some((item) => item.stage === stage)) {
          problems.push(`attempt ${entry.attempt}: missing ${stage} stage`);
        }
      }
    }
    if (options.requireReal) {
      if (!entry.signature || entry.signature.startsWith("dry-")) problems.push(`attempt ${entry.attempt}: non-real signature`);
      if (!entry.bundleId || entry.bundleId.startsWith("dry-")) problems.push(`attempt ${entry.attempt}: non-real bundle id`);
    }
  }

  process.stdout.write(`entries=${entries.length}\n`);
  process.stdout.write(`successes=${successes.length}\n`);
  process.stdout.write(`failures=${failures.length}\n`);
  process.stdout.write(`modes=${[...new Set(entries.map((entry) => entry.mode))].join(",")}\n`);
  process.stdout.write(`result=${problems.length === 0 ? "PASS" : "FAIL"}\n`);

  for (const problem of problems) {
    process.stdout.write(`problem=${problem}\n`);
  }

  return problems.length === 0;
}
