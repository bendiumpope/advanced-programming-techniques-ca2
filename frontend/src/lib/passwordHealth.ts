export type HealthFlag = "weak" | "reused";

function isWeakPassword(p: string): boolean {
  if (!p || p.length < 10) return true;
  if (!/[a-z]/.test(p) || !/[A-Z]/.test(p)) return true;
  if (!/[0-9]/.test(p)) return true;
  return false;
}

/** Per-entry flags from decrypted passwords only (client-side). */
export function computePasswordHealth(
  entries: { id: number; password: string }[]
): Map<number, Set<HealthFlag>> {
  const byPassword = new Map<string, number[]>();
  for (const e of entries) {
    const p = e.password;
    if (!p) continue;
    const list = byPassword.get(p) ?? [];
    list.push(e.id);
    byPassword.set(p, list);
  }

  const reusedIds = new Set<number>();
  for (const ids of byPassword.values()) {
    if (ids.length > 1) ids.forEach((id) => reusedIds.add(id));
  }

  const out = new Map<number, Set<HealthFlag>>();
  for (const e of entries) {
    const flags = new Set<HealthFlag>();
    if (e.password && isWeakPassword(e.password)) flags.add("weak");
    if (reusedIds.has(e.id)) flags.add("reused");
    if (flags.size) out.set(e.id, flags);
  }
  return out;
}
