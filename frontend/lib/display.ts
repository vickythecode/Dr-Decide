function toDisplayText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

export function formatNameWithId(name: unknown, id: unknown, fallback = "-"): string {
  const safeName = toDisplayText(name);
  const safeId = toDisplayText(id);
  if (safeName && safeId) return `${safeName} (${safeId})`;
  if (safeName) return safeName;
  if (safeId) return safeId;
  return fallback;
}

export function firstPresent(source: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = toDisplayText(source[key]);
    if (value) return value;
  }
  return "";
}
