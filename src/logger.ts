import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { LifecycleLogEntry } from "./types.js";

export class LifecycleLogger {
  readonly jsonlPath: string;

  constructor(logDir: string) {
    this.jsonlPath = join(logDir, "lifecycle.jsonl");
  }

  async append(entry: LifecycleLogEntry): Promise<void> {
    await mkdir(dirname(this.jsonlPath), { recursive: true });
    await writeFile(this.jsonlPath, `${JSON.stringify(entry)}\n`, { flag: "a" });
  }
}

export async function readLifecycleLog(path: string): Promise<LifecycleLogEntry[]> {
  const raw = await readFile(path, "utf8");
  return raw
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line) as LifecycleLogEntry);
}
