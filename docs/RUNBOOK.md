# Devnet Rehearsal and Mainnet Proof Runbook

## 1. Install and Check

```bash
npm install
npm run check
```

## 2. Create a Local Operator Wallet

```bash
npm run wallet:create
npm run wallet:address
```

This creates `keys/operator.json`. Do not commit or share this file.

## 3. Rehearse on Devnet

Devnet is useful for wallet setup, RPC connectivity, blockhash fetching, transaction
building, and lifecycle tracking practice. It is not the strongest proof for this bounty
unless your provider gives you a devnet-compatible Jito bundle endpoint.

Fund the wallet on devnet:

```bash
npm run devnet:airdrop
```

Use this `.env` shape for devnet rehearsal:

```env
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_WS_URL=wss://api.devnet.solana.com
WALLET_KEYPAIR_PATH=./keys/operator.json
NETWORK=devnet
DRY_RUN=true
LOG_DIR=logs
```

Run the local evidence pipeline:

```bash
npm run demo
npm run analyze-log
```

Expected output:

```text
entries=10
landed=8
failed=2
failure_kinds=expired_blockhash
```

## 4. Prepare for Mainnet Proof

For the final bounty evidence, use mainnet with tiny harmless transactions.

You need:

- funded operator wallet with a small amount of SOL
- mainnet RPC URL
- mainnet websocket URL
- Yellowstone/Geyser endpoint and token
- Jito block engine URL
- optional Jito UUID
- optional OpenAI API key

Mainnet `.env`:

```env
SOLANA_RPC_URL=https://your-mainnet-rpc.example
SOLANA_WS_URL=wss://your-mainnet-rpc.example
WALLET_KEYPAIR_PATH=./keys/operator.json
JITO_BLOCK_ENGINE_URL=https://mainnet.block-engine.jito.wtf
JITO_UUID=
YELLOWSTONE_ENDPOINT=https://your-yellowstone.example
YELLOWSTONE_X_TOKEN=your-token
OPENAI_API_KEY=your-openai-key
OPENAI_MODEL=gpt-4.1-mini
NETWORK=mainnet-beta
DRY_RUN=false
LOG_DIR=logs
```

Before running mainnet, check the wallet address:

```bash
npm run wallet:address
```

Fund that address with a small amount of SOL. The stack uses harmless memo/self-transfer
transactions plus the Jito tip. Start small.

## 5. Run Mainnet Evidence

Clear old dry-run evidence:

```powershell
Remove-Item .\logs\lifecycle.jsonl -ErrorAction SilentlyContinue
```

Run 10 real submissions:

```bash
npm run dev -- run --mode real --count 10
```

To include 2 real blockhash-expiry failure cases, run:

```bash
npm run dev -- run --mode real --count 10 --inject-failures 2
```

The first two attempts intentionally wait for their blockhash to expire before
submission. This can add a few minutes, but it creates real failure evidence for the
lifecycle log.

Analyze the resulting log:

```bash
npm run analyze-log
```

## 6. Prove It Works

Your final proof is `logs/lifecycle.jsonl` from mainnet mode. It should contain:

- real Solana signatures
- real Jito bundle IDs
- real slot numbers
- commitment progression
- dynamic tip amounts
- AI decision reasoning
- at least 2 failure cases

For each successful signature, open it in a Solana explorer. For example:

```text
https://solscan.io/tx/<SIGNATURE>
```

For devnet signatures, use:

```text
https://solscan.io/tx/<SIGNATURE>?cluster=devnet
```

For the bounty, mainnet explorer-verifiable logs are the stronger submission.
