import type { BundleSubmitResult } from "./types.js";

interface JsonRpcResponse<T> {
  result?: T;
  error?: unknown;
}

export class JitoClient {
  constructor(
    private readonly blockEngineUrl: string,
    private readonly uuid?: string
  ) {}

  async sendBundle(base64Transactions: string[]): Promise<BundleSubmitResult> {
    const result = await this.rpc<string>("sendBundle", [base64Transactions]);
    return {
      bundleId: result,
      signature: "signature-unavailable-until-status"
    };
  }

  async getBundleStatus(bundleId: string): Promise<unknown> {
    return this.rpc("getBundleStatuses", [[bundleId]]);
  }

  private async rpc<T>(method: string, params: unknown[]): Promise<T> {
    const url = new URL(`${this.blockEngineUrl}/api/v1/bundles`);
    if (this.uuid) url.searchParams.set("uuid", this.uuid);

    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method,
        params
      })
    });

    const body = (await response.json()) as JsonRpcResponse<T>;
    if (!response.ok || body.error || body.result === undefined) {
      throw new Error(JSON.stringify(body.error ?? body));
    }
    return body.result;
  }
}
