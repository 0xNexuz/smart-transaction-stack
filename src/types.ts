import type { Commitment, PublicKey } from "@solana/web3.js";

export type StackMode = "dry-run" | "real";

export type LifecycleStage = "submitted" | "processed" | "confirmed" | "finalized" | "failed";

export type FailureKind =
  | "expired_blockhash"
  | "fee_too_low"
  | "compute_exceeded"
  | "bundle_failure"
  | "leader_skipped"
  | "unknown";

export interface NetworkSnapshot {
  slot: number;
  leader?: string;
  nextJitoLeaderSlot?: number;
  slotsUntilJitoLeader?: number;
  recentTipLamports: number[];
  blockhashAgeSlots?: number;
  congestionScore: number;
  observedAt: string;
}

export interface TipDecision {
  lamports: number;
  confidence: number;
  reasoning: string;
  source: "ai" | "local-policy";
}

export interface RetryDecision {
  shouldRetry: boolean;
  refreshBlockhash: boolean;
  tipMultiplier: number;
  reasoning: string;
  source: "ai" | "local-policy";
}

export interface BundlePlan {
  memo: string;
  blockhash: string;
  lastValidBlockHeight: number;
  tipLamports: number;
  tipAccount: PublicKey;
  targetLeaderSlot?: number;
}

export interface StageObservation {
  stage: LifecycleStage;
  slot?: number;
  signature?: string;
  bundleId?: string;
  commitment?: Commitment;
  timestamp: string;
  latencyMsFromSubmitted?: number;
  error?: string;
}

export interface LifecycleLogEntry {
  runId: string;
  attempt: number;
  mode: StackMode;
  memo: string;
  bundleId?: string;
  signature?: string;
  submittedSlot: number;
  targetLeaderSlot?: number;
  tipLamports: number;
  blockhash: string;
  lastValidBlockHeight: number;
  stages: StageObservation[];
  failure?: {
    kind: FailureKind;
    raw: string;
  };
  ai: {
    tipDecision: TipDecision;
    retryDecision?: RetryDecision;
  };
}

export interface BundleSubmitResult {
  bundleId: string;
  signature: string;
}
