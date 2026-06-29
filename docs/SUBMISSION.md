# Submission Guide

## What Goes in the Superteam Submission

Submit these links/files:

- Public GitHub repo URL.
- Public architecture document URL. You can use `docs/ARCHITECTURE.md` as the source for a Notion or Google Docs version.
- Mainnet `logs/lifecycle.jsonl` from the real proof run.
- Optional short Loom/video showing the command run and log analysis.
- Optional explorer links for the successful signatures.

## Required Evidence

The final evidence log should show:

- 10 real bundle submissions.
- At least 2 failure cases.
- Slot numbers.
- Commitment progression.
- Timestamps.
- Tip amounts.
- Failure classification.
- AI tip and retry reasoning.

## Devnet vs Mainnet

Use devnet only for rehearsal. It is useful for checking wallet setup and normal Solana
flow, but it is weak proof for this bounty unless your infrastructure provider confirms
Jito bundle support on devnet.

Use mainnet for the final evidence. The transactions in this repo are intentionally
harmless: memo plus self-transfer plus Jito tip. Start with a small funded wallet.

## Final Mainnet Command

After `.env` is configured and the wallet is funded:

```bash
Remove-Item .\logs\lifecycle.jsonl -ErrorAction SilentlyContinue
npm run dev -- run --mode real --count 10 --inject-failures 2
npm run analyze-log
```

Then inspect `logs/lifecycle.jsonl` and include the successful signatures in your
submission notes.
