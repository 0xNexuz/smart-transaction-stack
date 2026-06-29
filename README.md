# Smart Transaction Stack

Advanced Solana transaction infrastructure stack for the Superteam Nigeria bounty:
**Advanced Infrastructure Challenge - Build a Smart Transaction Stack**.

The stack observes live Solana network state, chooses a Jito tip from recent tip data,
builds a Jito bundle, submits it, tracks lifecycle stages, classifies failures, and logs
the AI decision trail behind tip and retry decisions.

## Features

- Environment readiness diagnostics.
- Judge-facing demo command and evidence verifier.
- Slot streaming through a Yellowstone/Geyser adapter when credentials are configured.
- Leader snapshot collection from Solana RPC.
- Jito bundle construction with dynamic tip account selection.
- Dynamic tip decisioning from recent Jito tip floor data.
- AI-assisted operational decisions with visible reasoning.
- Signature subscription tracking for `processed`, `confirmed`, and `finalized`.
- Failure classification for expired blockhash, low fee/tip, compute exceeded, skipped leader, and bundle failures.
- Fault-injection dry-run mode that produces 10 judge-shaped lifecycle entries with at least 2 failures.
- JSONL lifecycle log suitable for verification and post-run analysis.

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Setup

```bash
npm install
cp .env.example .env
npm run check
```

For exact devnet rehearsal and mainnet proof steps, see [docs/RUNBOOK.md](docs/RUNBOOK.md).

For submission honesty and proof status, see:

- [docs/CURRENT_STATE.md](docs/CURRENT_STATE.md)
- [docs/SUBMISSION.md](docs/SUBMISSION.md)
- [docs/LANDING_INVESTIGATION.md](docs/LANDING_INVESTIGATION.md)
- [docs/SECURITY.md](docs/SECURITY.md)

## Judge Demo

```bash
npm run judge:demo
```

This runs environment diagnostics, a 10-entry dry-run with 2 injected failures, log
analysis, evidence verification, and a Markdown lifecycle summary.

## Evidence Verification

Dry-run verification:

```bash
npm run verify:evidence
```

Mainnet verification:

```bash
npm run dev -- verify --log logs/lifecycle.jsonl --require-real true
```

Readable summary:

```bash
npm run summary
```

## Dry-Run Demo

Dry-run mode does not spend SOL. It exercises the decision, lifecycle, failure, retry,
and logging pipeline with deterministic fault injection.

```bash
npm run demo
npm run analyze-log
```

The lifecycle evidence is written to:

```text
logs/lifecycle.jsonl
```

## Real Mode

Real mode requires:

- A funded Solana wallet keypair.
- `SOLANA_RPC_URL`.
- `SOLANA_WS_URL`.
- Jito block engine access.
- Optional `JITO_UUID`.
- Yellowstone/Geyser provider for production-grade stream data.
- Optional `OPENAI_API_KEY` for model-backed decisions.

Configure `.env`:

```bash
DRY_RUN=false
SOLANA_RPC_URL=https://your-rpc.example
SOLANA_WS_URL=wss://your-rpc.example
WALLET_KEYPAIR_PATH=./keys/operator.json
JITO_BLOCK_ENGINE_URL=https://mainnet.block-engine.jito.wtf
OPENAI_API_KEY=...
```

Run:

```bash
npm run dev -- run --mode real --count 10
```

When `YELLOWSTONE_ENDPOINT` is set, the runner reads live slots from the Geyser stream
before each submission. Without it, dry-run and local development use RPC slot snapshots.

## Lifecycle Log Requirements

Every entry records:

- run id and attempt number
- submitted slot
- target leader slot estimate
- blockhash and last valid block height
- tip amount
- bundle id
- signature
- commitment progression
- timestamps
- latency from submission
- failure classification, when applicable
- AI tip reasoning
- AI retry reasoning, when applicable

Judges can cross-check real-mode slot numbers and signatures with Solana explorers.

## AI Agent Responsibility

This implementation uses the agent for **Tip Intelligence** and **Failure Reasoning**.

For every submission, the agent receives:

- recent tip floor observations
- current slot
- leader timing estimate
- congestion score

It decides the bundle tip and logs its reasoning. If a failure occurs, it also decides
whether to retry, whether the blockhash should be refreshed, and how much the tip should
change.

If `OPENAI_API_KEY` is not configured, the same decision boundary uses a transparent
local policy and marks the decision source as `local-policy`. This keeps development and
testing reproducible while preserving the interface used by the model-backed agent.

## Required README Questions

### 1. What does the delta between `processed_at` and `confirmed_at` tell you about network health?

The gap between `processed_at` and `confirmed_at` shows how quickly the cluster moves
from first seeing a transaction in a processed fork to voting it into a confirmed block.
A small delta usually means healthy propagation, quick voting, and low contention. A
large delta can indicate congestion, slow propagation, fork churn, skipped slots, or
weak leader performance around the submission window.

### 2. Why should you never use finalized commitment when fetching a blockhash for a time-sensitive transaction?

`finalized` is too old for time-sensitive sending. A finalized blockhash lags behind the
head of the chain, so it has already consumed part of its validity window by the time the
transaction is built. For latency-sensitive bundles, use a fresh `confirmed` blockhash so
the transaction has more remaining slots before expiry.

### 3. What happens to your bundle if the Jito leader skips their slot?

If the Jito leader skips the target slot, the bundle does not land in that slot. The
sender must treat the leader window as missed, watch for the next viable Jito leader,
refresh timing-sensitive data such as the blockhash, recalculate the tip if conditions
changed, and resubmit. Otherwise the bundle can expire or become economically stale.

## Submission Checklist

- Public GitHub repo with this code.
- Public architecture document URL.
- `logs/lifecycle.jsonl` from at least 10 real bundle submissions.
- At least 2 real failure cases in the log.
- README includes the three required answers above.
- Setup instructions are tested from a clean clone.
- Real-mode signatures and slots are explorer-verifiable.
