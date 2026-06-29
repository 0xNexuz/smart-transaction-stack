# Bundle Landing Investigation

## What Counts as Strong Proof

Strong proof is a mainnet `logs/lifecycle.jsonl` containing:

- real signatures
- real Jito bundle IDs
- real slot numbers
- stream or subscription-backed commitment progression
- explorer-verifiable successful transactions
- at least two real failure cases
- visible AI decision reasoning

## Why Devnet Is Not Enough

Devnet can validate wallet setup, blockhash handling, transaction building, and local
observability. It does not reliably prove Jito bundle landing unless a provider gives a
devnet-compatible bundle endpoint and the resulting transactions are verifiable.

For this bounty, mainnet proof is the safer strategy.

## If Bundles Do Not Land

Capture the failure honestly:

1. Keep the failed entries in `logs/lifecycle.jsonl`.
2. Record the block engine response.
3. Record the slot, tip, and leader window.
4. Increase the tip according to the AI decision.
5. Refresh the blockhash.
6. Resubmit near the next viable leader window.

Common causes:

- tip too low
- stale blockhash
- skipped leader
- inaccessible block engine route
- provider-level auth or rate limit
- websocket subscription timeout

## Recommended Proof Sequence

1. `npm run doctor:env`
2. `npm run dev -- run --mode real --count 1`
3. Confirm explorer visibility.
4. `npm run dev -- run --mode real --count 10 --inject-failures 2`
5. `npm run analyze-log`
6. `npm run summary`
7. `npm run dev -- verify --log logs/lifecycle.jsonl --require-real true`
