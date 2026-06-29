import { access } from "node:fs/promises";
import { Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import type { StackConfig } from "./config.js";
import { loadKeypair } from "./wallet.js";

export async function doctorEnv(config: StackConfig): Promise<void> {
  const checks: Array<[string, boolean, string]> = [];

  checks.push(["SOLANA_RPC_URL", Boolean(config.solanaRpcUrl), config.solanaRpcUrl]);
  checks.push(["SOLANA_WS_URL", Boolean(config.solanaWsUrl), config.solanaWsUrl ?? "missing"]);
  checks.push(["JITO_BLOCK_ENGINE_URL", Boolean(config.jitoBlockEngineUrl), config.jitoBlockEngineUrl]);
  checks.push(["YELLOWSTONE_ENDPOINT", Boolean(config.yellowstoneEndpoint), config.yellowstoneEndpoint ?? "missing"]);
  checks.push(["YELLOWSTONE_X_TOKEN", Boolean(config.yellowstoneToken), config.yellowstoneToken ? "set" : "missing"]);
  checks.push(["OPENAI_API_KEY", Boolean(config.openaiApiKey), config.openaiApiKey ? "set" : "missing"]);
  checks.push(["WALLET_KEYPAIR_PATH", Boolean(config.walletKeypairPath), config.walletKeypairPath ?? "missing"]);

  if (config.walletKeypairPath) {
    try {
      await access(config.walletKeypairPath);
      checks.push(["wallet_file", true, "readable"]);
    } catch {
      checks.push(["wallet_file", false, "not found"]);
    }
  }

  try {
    const connection = new Connection(config.solanaRpcUrl, "confirmed");
    const slot = await connection.getSlot("confirmed");
    checks.push(["rpc_slot", true, String(slot)]);
    if (config.walletKeypairPath) {
      const keypair = await loadKeypair(config.walletKeypairPath);
      const balance = await connection.getBalance(keypair.publicKey, "confirmed");
      checks.push(["wallet_balance", balance > 0, `${balance / LAMPORTS_PER_SOL} SOL`]);
    }
  } catch (error) {
    checks.push(["rpc_connectivity", false, String(error)]);
  }

  for (const [name, ok, detail] of checks) {
    process.stdout.write(`${ok ? "PASS" : "WARN"} ${name}: ${detail}\n`);
  }

  process.stdout.write("\nReadiness notes:\n");
  process.stdout.write("- Dry-run works without wallet, OpenAI, Jito auth, or Yellowstone.\n");
  process.stdout.write("- Final bounty evidence should use mainnet plus Yellowstone and Jito access.\n");
  process.stdout.write("- Missing OpenAI falls back to local policy and marks decisions as local-policy.\n");
}
