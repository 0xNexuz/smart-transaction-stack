import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction
} from "@solana/web3.js";
import type { BundlePlan } from "./types.js";

export class BundleBuilder {
  constructor(private readonly connection: Connection) {}

  async createPlan(input: {
    memo: string;
    payer: PublicKey;
    tipLamports: number;
    tipAccount: PublicKey;
    targetLeaderSlot?: number;
  }): Promise<BundlePlan> {
    const latest = await this.connection.getLatestBlockhash("confirmed");
    return {
      memo: input.memo,
      blockhash: latest.blockhash,
      lastValidBlockHeight: latest.lastValidBlockHeight,
      tipLamports: input.tipLamports,
      tipAccount: input.tipAccount,
      targetLeaderSlot: input.targetLeaderSlot
    };
  }

  buildSignedBundle(plan: BundlePlan, payer: Keypair): string[] {
    const tx = new Transaction({
      feePayer: payer.publicKey,
      recentBlockhash: plan.blockhash
    });

    tx.add(
      SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: payer.publicKey,
        lamports: 0
      })
    );

    tx.add(
      SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: plan.tipAccount,
        lamports: plan.tipLamports
      })
    );

    tx.add(memoInstruction(plan.memo));
    tx.sign(payer);
    return [tx.serialize().toString("base64")];
  }

  estimateMinimumBalance(): number {
    return Math.ceil(0.003 * LAMPORTS_PER_SOL);
  }
}

function memoInstruction(memo: string): TransactionInstruction {
  return new TransactionInstruction({
    keys: [],
    programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
    data: Buffer.from(memo, "utf8")
  });
}
