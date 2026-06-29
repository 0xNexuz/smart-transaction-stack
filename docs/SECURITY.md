# Security Notes

## Wallet Safety

- `keys/` is ignored by Git.
- `.env` is ignored by Git.
- Use a fresh operator wallet for the bounty.
- Fund only the amount needed for the proof run.
- Do not reuse a personal treasury wallet.

## Transaction Safety

The prototype transaction is intentionally harmless:

- self-transfer of 0 lamports
- memo instruction
- Jito tip transfer

The only expected spend is normal transaction fees plus Jito tips.

## API Keys

Keep these out of Git:

- RPC URLs with private tokens
- Yellowstone tokens
- Jito UUIDs
- OpenAI API keys

## Mainnet Run Discipline

Before running `--mode real`:

1. Run `npm run doctor:env`.
2. Check the wallet address with `npm run wallet:address`.
3. Confirm the wallet only contains a small proof-run balance.
4. Start with `--count 1` before running the full `--count 10`.

## Known Dependency Warning

`npm audit` may report a moderate warning through the current Solana web3 dependency
tree. The suggested forced fix can downgrade Solana web3 to an unusable version. Do not
apply `npm audit fix --force` without checking the resulting dependency graph.
