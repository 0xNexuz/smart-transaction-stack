import { PublicKey } from "@solana/web3.js";

export class TipOracle {
  private readonly fallbackTipAccounts = [
    "96gYZGLn1gQYY4C38Mz5kJrLiJ7zWc8mjTnWhxWcTFLB",
    "HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe",
    "Cw8CFyMfbY8njS7SpAVkz8W5G5z3r8N6X4iyp242f2uP",
    "ADaUMidb8i73FoxF8P6A7n3Qn6dKq5pYSXgN7EJ2e3H"
  ];

  constructor(private readonly blockEngineUrl: string) {}

  async getTipAccounts(): Promise<PublicKey[]> {
    try {
      const result = await this.jitoRpc<string[]>("getTipAccounts", []);
      if (result.length > 0) return result.map((value) => new PublicKey(value));
    } catch {
      // The fallback list keeps dry-run and dev setup usable.
    }
    return this.fallbackTipAccounts.map((value) => new PublicKey(value));
  }

  async recentTips(): Promise<number[]> {
    const url = "https://bundles.jito.wtf/api/v1/bundles/tip_floor";
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const data = (await response.json()) as Array<Record<string, unknown>>;
      const tips = data
        .flatMap((row) =>
          Object.entries(row)
            .filter(([key]) => key.toLowerCase().includes("percentile") || key.toLowerCase().includes("ema"))
            .map(([, value]) => Number(value))
        )
        .filter((value) => Number.isFinite(value) && value > 0)
        .map((sol) => Math.ceil(sol * 1_000_000_000));
      if (tips.length > 0) return tips;
    } catch {
      // Fall through to deterministic defaults.
    }
    return [1_000, 5_000, 10_000, 20_000, 50_000];
  }

  private async jitoRpc<T>(method: string, params: unknown[]): Promise<T> {
    const response = await fetch(`${this.blockEngineUrl}/api/v1/bundles`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method,
        params
      })
    });
    const body = (await response.json()) as { result?: T; error?: unknown };
    if (body.error || body.result === undefined) throw new Error(JSON.stringify(body.error ?? body));
    return body.result;
  }
}
