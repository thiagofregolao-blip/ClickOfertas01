// Helpers simples, sem dependências, para padronizar tipos de entrada.
export type Nullable<T> = T | null | undefined;

export function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim() !== "";
}

export function requireString(v: Nullable<string>, msg = "campo obrigatório"): string {
  if (!isNonEmptyString(v)) throw new Error(msg);
  return v.trim();
}

export function optionalString(v: Nullable<string>): string | undefined {
  return isNonEmptyString(v) ? v.trim() : undefined;
}

export function toBool(v: unknown, def = false): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return ["1", "true", "on", "yes"].includes(v.toLowerCase());
  if (typeof v === "number") return v !== 0;
  return def;
}

export function toInt(v: unknown, def?: number): number | undefined {
  if (v === null || v === undefined || v === "") return def;
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  return Number.isFinite(n) ? n : def;
}

export function ensureArray<T = unknown>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}