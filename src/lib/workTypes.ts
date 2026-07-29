export const WORK_TYPE_OPTIONS = [
  "Civil",
  "Structure",
  "M.E.P",
  "Interior",
  "Landscaping",
  "P.E.B structure",
] as const;

export type WorkTypeOption = (typeof WORK_TYPE_OPTIONS)[number];

export function formatWorkTypes(
  types: string[] | null | undefined,
  custom?: string | null
): string {
  const list = [...(types || [])];
  const c = (custom || "").trim();
  if (c) list.push(c);
  return list.length ? list.join(", ") : "—";
}

export function normalizeWorkTypes(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((x) => String(x).trim()).filter(Boolean);
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((x) => String(x).trim()).filter(Boolean);
      }
    } catch {
      return raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return [];
}
