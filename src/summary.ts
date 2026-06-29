import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { readLifecycleLog } from "./logger.js";

export async function writeLifecycleSummary(logPath: string, outPath: string): Promise<void> {
  const entries = await readLifecycleLog(logPath);
  const failures = entries.filter((entry) => entry.failure);
  const lines = [
    "# Lifecycle Summary",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Entries: ${entries.length}`,
    `Successful paths: ${entries.length - failures.length}`,
    `Failure paths: ${failures.length}`,
    `Modes: ${[...new Set(entries.map((entry) => entry.mode))].join(", ")}`,
    "",
    "| Attempt | Mode | Slot | Tip Lamports | Result | Bundle ID | Signature |",
    "| --- | --- | ---: | ---: | --- | --- | --- |"
  ];

  for (const entry of entries) {
    lines.push(
      `| ${[
        entry.attempt,
        entry.mode,
        entry.submittedSlot,
        entry.tipLamports,
        entry.failure?.kind ?? "landed",
        trim(entry.bundleId),
        trim(entry.signature)
      ].join(" | ")} |`
    );
  }

  lines.push("");
  lines.push("## AI Decisions");
  lines.push("");
  for (const entry of entries) {
    lines.push(`### Attempt ${entry.attempt}`);
    lines.push("");
    lines.push(`Tip: ${entry.ai.tipDecision.lamports} lamports (${entry.ai.tipDecision.source})`);
    lines.push("");
    lines.push(entry.ai.tipDecision.reasoning);
    if (entry.ai.retryDecision) {
      lines.push("");
      lines.push(`Retry: ${entry.ai.retryDecision.shouldRetry ? "yes" : "no"} (${entry.ai.retryDecision.source})`);
      lines.push("");
      lines.push(entry.ai.retryDecision.reasoning);
    }
    lines.push("");
  }

  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, `${lines.join("\n")}\n`);
  process.stdout.write(`summary=${outPath}\n`);
}

function trim(value: string | undefined): string {
  if (!value) return "";
  if (value.length <= 18) return value;
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}
