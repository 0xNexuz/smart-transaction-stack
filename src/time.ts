export function nowIso(): string {
  return new Date().toISOString();
}

export function latencyMs(startIso: string, endIso = nowIso()): number {
  return new Date(endIso).getTime() - new Date(startIso).getTime();
}
