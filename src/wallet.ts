import { readFile } from "node:fs/promises";
import { Keypair } from "@solana/web3.js";

export async function loadKeypair(path: string | undefined): Promise<Keypair> {
  if (!path) {
    throw new Error("WALLET_KEYPAIR_PATH is required in real mode.");
  }
  const raw = await readFile(path, "utf8");
  const secret = Uint8Array.from(JSON.parse(raw) as number[]);
  return Keypair.fromSecretKey(secret);
}
