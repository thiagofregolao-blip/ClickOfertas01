export function requireString(v: string | null | undefined, msg = "valor obrigatório"): string {
  if (v == null || v === "") throw new Error(msg);
  return v;
}

export function safeString(v: string | null | undefined, defaultValue = ""): string {
  return v ?? defaultValue;
}

export function safeNumber(v: number | string | null | undefined): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const num = parseFloat(v);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}