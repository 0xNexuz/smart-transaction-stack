import type { StackConfig } from "./config.js";

export class YellowstoneSlotStream {
  constructor(private readonly config: StackConfig) {}

  isConfigured(): boolean {
    return Boolean(this.config.yellowstoneEndpoint);
  }

  async readLatestSlot(timeoutMs = 5_000): Promise<number | undefined> {
    if (!this.config.yellowstoneEndpoint) return undefined;

    const mod = await import("@triton-one/yellowstone-grpc");
    const Client = (mod as unknown as { default: new (endpoint: string, token?: string) => unknown }).default;
    const client = new Client(this.config.yellowstoneEndpoint, this.config.yellowstoneToken);
    const stream = await (client as any).subscribe();

    const request = {
      slots: {
        slots: {}
      },
      accounts: {},
      transactions: {},
      transactionsStatus: {},
      blocks: {},
      blocksMeta: {},
      entry: {},
      accountsDataSlice: [],
      commitment: 1
    };

    return new Promise<number | undefined>((resolve) => {
      const timeout = setTimeout(() => {
        cleanup();
        resolve(undefined);
      }, timeoutMs);

      const cleanup = () => {
        clearTimeout(timeout);
        stream.removeAllListeners?.("data");
        stream.removeAllListeners?.("error");
        stream.end?.();
      };

      stream.on("data", (data: unknown) => {
        const slot = extractSlot(data);
        if (slot !== undefined) {
          cleanup();
          resolve(slot);
        }
      });

      stream.on("error", () => {
        cleanup();
        resolve(undefined);
      });

      stream.write?.(request);
    });
  }
}

function extractSlot(data: unknown): number | undefined {
  if (!data || typeof data !== "object") return undefined;
  const record = data as Record<string, unknown>;
  const slotValue = record.slot ?? nestedNumber(record, ["slot", "slot"]) ?? nestedNumber(record, ["slots", "slot"]);
  return typeof slotValue === "number" ? slotValue : undefined;
}

function nestedNumber(record: Record<string, unknown>, path: string[]): number | undefined {
  let current: unknown = record;
  for (const key of path) {
    if (!current || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === "number" ? current : undefined;
}
