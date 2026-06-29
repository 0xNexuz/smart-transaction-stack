import "dotenv/config";
import { z } from "zod";

const ConfigSchema = z.object({
  solanaRpcUrl: z.string().url(),
  solanaWsUrl: z.string().url().optional(),
  walletKeypairPath: z.string().optional(),
  jitoBlockEngineUrl: z.string().url(),
  jitoUuid: z.string().optional(),
  yellowstoneEndpoint: z.string().optional(),
  yellowstoneToken: z.string().optional(),
  openaiApiKey: z.string().optional(),
  openaiModel: z.string().default("gpt-4.1-mini"),
  network: z.string().default("mainnet-beta"),
  dryRun: z.boolean().default(true),
  logDir: z.string().default("logs")
});

function readBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

export type StackConfig = z.infer<typeof ConfigSchema>;

export function loadConfig(): StackConfig {
  return ConfigSchema.parse({
    solanaRpcUrl: process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com",
    solanaWsUrl: process.env.SOLANA_WS_URL,
    walletKeypairPath: process.env.WALLET_KEYPAIR_PATH,
    jitoBlockEngineUrl: process.env.JITO_BLOCK_ENGINE_URL ?? "https://mainnet.block-engine.jito.wtf",
    jitoUuid: process.env.JITO_UUID,
    yellowstoneEndpoint: process.env.YELLOWSTONE_ENDPOINT,
    yellowstoneToken: process.env.YELLOWSTONE_X_TOKEN,
    openaiApiKey: process.env.OPENAI_API_KEY,
    openaiModel: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
    network: process.env.NETWORK ?? "mainnet-beta",
    dryRun: readBoolean(process.env.DRY_RUN, true),
    logDir: process.env.LOG_DIR ?? "logs"
  });
}
