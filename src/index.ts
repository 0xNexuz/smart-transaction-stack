import { Command } from "commander";
import { loadConfig } from "./config.js";
import { runStack } from "./runner.js";
import { analyzeLog } from "./analyze.js";
import type { StackMode } from "./types.js";
import { airdropDevnetSol, createWallet, printWalletAddress } from "./walletTools.js";

const program = new Command();

program.name("smart-transaction-stack").description("Jito smart transaction stack with AI-assisted decisions.");

program
  .command("run")
  .option("--mode <mode>", "dry-run or real", "dry-run")
  .option("--count <number>", "number of bundle submissions", "10")
  .option("--inject-failures <number>", "number of failure cases to inject", "0")
  .action(async (raw) => {
    const mode = raw.mode as StackMode;
    if (!["dry-run", "real"].includes(mode)) throw new Error("--mode must be dry-run or real");
    const config = loadConfig();
    await runStack(config, {
      mode,
      count: Number(raw.count),
      injectFailures: Number(raw.injectFailures)
    });
  });

program
  .command("analyze")
  .requiredOption("--log <path>", "path to lifecycle jsonl log")
  .action(async (raw) => {
    await analyzeLog(raw.log);
  });

const wallet = program.command("wallet").description("Wallet helpers for devnet rehearsal and mainnet proof runs.");

wallet
  .command("create")
  .requiredOption("--path <path>", "keypair output path")
  .action(async (raw) => {
    await createWallet(raw.path);
  });

wallet
  .command("address")
  .requiredOption("--path <path>", "keypair path")
  .action(async (raw) => {
    await printWalletAddress(raw.path);
  });

wallet
  .command("airdrop")
  .requiredOption("--path <path>", "keypair path")
  .requiredOption("--rpc <url>", "devnet RPC URL")
  .option("--sol <number>", "SOL to request", "2")
  .action(async (raw) => {
    await airdropDevnetSol(raw.path, raw.rpc, Number(raw.sol));
  });

program.parseAsync(process.argv).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
