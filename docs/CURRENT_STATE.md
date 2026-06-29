# Current State

This document is intentionally explicit about what is live, what is simulated, and what
requires external credentials.

| Area | Status | Evidence |
| --- | --- | --- |
| CLI runner | Working | `npm run judge:demo` |
| Lifecycle log format | Working | `logs/lifecycle.jsonl` |
| Evidence verifier | Working | `npm run verify:evidence` |
| AI decision boundary | Working | OpenAI if configured, local policy fallback otherwise |
| Dynamic tip policy | Working | Uses Jito tip floor API in real mode, synthetic tips in dry-run |
| Failure classification | Working | Expired blockhash, low fee/tip, compute exceeded, bundle failure, skipped leader |
| Dry-run fault injection | Working | `--mode dry-run --inject-failures 2` |
| Mainnet expired-blockhash fault injection | Implemented | `--mode real --inject-failures 2` waits for blockhash expiry |
| Jito bundle submission | Implemented | Requires mainnet block engine access and funded wallet |
| Yellowstone slot stream | Implemented | Requires `YELLOWSTONE_ENDPOINT` and token |
| Real landed bundle evidence | Pending local operator run | Requires mainnet credentials and SOL |

## Honest Submission Note

The repository contains all code paths required for the bounty, but the final winning
evidence must come from a mainnet run. Dry-run evidence is useful for judging code shape
and reproducibility; it is not a substitute for explorer-verifiable bundle submissions.

If a provider blocks Jito bundle landing, include the failed log entries and the landing
investigation notes. Do not relabel dry-run logs as live evidence.
