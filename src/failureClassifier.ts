import type { FailureKind } from "./types.js";

export function classifyFailure(raw: string): FailureKind {
  const normalized = raw.toLowerCase();
  if (normalized.includes("blockhash") || normalized.includes("expired")) return "expired_blockhash";
  if (normalized.includes("tip") || normalized.includes("fee") || normalized.includes("insufficient prioritization")) {
    return "fee_too_low";
  }
  if (normalized.includes("compute") || normalized.includes("cu")) return "compute_exceeded";
  if (normalized.includes("leader") && normalized.includes("skip")) return "leader_skipped";
  if (normalized.includes("bundle")) return "bundle_failure";
  return "unknown";
}
