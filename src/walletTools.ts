import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";

export async function createWallet(path: string): Promise<void> {
  const keypair = Keypair.generate();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(Array.from(keypair.secretKey)));
  process.stdout.write(`created=${path}\n`);
  process.stdout.write(`address=${keypair.publicKey.toBase58()}\n`);
}

export async function printWalletAddress(path: string): Promise<void> {
  const keypair = await readKeypair(path);
  process.stdout.write(`${keypair.publicKey.toBase58()}\n`);
}

export async function airdropDevnetSol(path: string, rpcUrl: string, sol: number): Promise<void> {
  const keypair = await readKeypair(path);
  const connection = new Connection(rpcUrl, "confirmed");
  const signature = await connection.requestAirdrop(keypair.publicKey, Math.ceil(sol * LAMPORTS_PER_SOL));
  await connection.confirmTransaction(signature, "confirmed");
  const balance = await connection.getBalance(keypair.publicKey, "confirmed");
  process.stdout.write(`address=${keypair.publicKey.toBase58()}\n`);
  process.stdout.write(`airdrop_signature=${signature}\n`);
  process.stdout.write(`balance_sol=${balance / LAMPORTS_PER_SOL}\n`);
}

async function readKeypair(path: string): Promise<Keypair> {
  const raw = await readFile(path, "utf8");
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw) as number[]));
}
