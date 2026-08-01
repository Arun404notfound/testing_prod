import { DEFAULT_INSTRUCTIONS } from "@/lib/default-instructions";

export interface CustomPoint {
  text: string;
  enabled: boolean;
}

export interface ParsedCustomInstructions {
  defaultOrder: string[];
  disabledDefaults: string[];
  customPoints: CustomPoint[];
}

const CANONICAL_DEFAULT_ORDER = DEFAULT_INSTRUCTIONS.map((d) => d.key);

/** Admin-chosen order, filled out with any keys it's missing (new defaults, or a legacy row with no order saved) in canonical order. */
function resolveDefaultOrder(order: string[] | undefined): string[] {
  if (!order || order.length === 0) return CANONICAL_DEFAULT_ORDER;
  const known = order.filter((k) => CANONICAL_DEFAULT_ORDER.includes(k));
  const missing = CANONICAL_DEFAULT_ORDER.filter((k) => !known.includes(k));
  return [...known, ...missing];
}

/**
 * `Assessment.customInstructions` stores JSON: { defaultOrder, disabledDefaults, customPoints }.
 * Two older formats are also accepted and normalized on read:
 *  - { disabledDefaults, customPoints: string[] } (no ordering/per-point toggle yet)
 *  - plain newline-separated text predating any of this (no JSON at all)
 */
export function parseCustomInstructions(raw: string | null | undefined): ParsedCustomInstructions {
  if (!raw) return { defaultOrder: CANONICAL_DEFAULT_ORDER, disabledDefaults: [], customPoints: [] };

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && Array.isArray((parsed as { customPoints?: unknown }).customPoints)) {
      const obj = parsed as { defaultOrder?: unknown; disabledDefaults?: unknown; customPoints: unknown[] };
      const customPoints: CustomPoint[] = obj.customPoints
        .map((p): CustomPoint | null => {
          if (typeof p === "string") return { text: p, enabled: true };
          if (p && typeof p === "object") {
            const text = (p as Record<string, unknown>).text;
            const enabled = (p as Record<string, unknown>).enabled;
            if (typeof text === "string") return { text, enabled: enabled !== false };
          }
          return null;
        })
        .filter((p): p is CustomPoint => p !== null);
      const disabledDefaults = Array.isArray(obj.disabledDefaults)
        ? obj.disabledDefaults.filter((k): k is string => typeof k === "string")
        : [];
      const defaultOrder = resolveDefaultOrder(
        Array.isArray(obj.defaultOrder) ? obj.defaultOrder.filter((k): k is string => typeof k === "string") : undefined,
      );
      return { defaultOrder, disabledDefaults, customPoints };
    }
  } catch {
    // Not JSON — fall through to legacy plain-text parsing.
  }

  return {
    defaultOrder: CANONICAL_DEFAULT_ORDER,
    disabledDefaults: [],
    customPoints: raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((text) => ({ text, enabled: true })),
  };
}

export function serializeCustomInstructions(data: ParsedCustomInstructions): string | null {
  const orderIsCanonical =
    data.defaultOrder.length === CANONICAL_DEFAULT_ORDER.length &&
    data.defaultOrder.every((key, i) => key === CANONICAL_DEFAULT_ORDER[i]);
  if (orderIsCanonical && data.disabledDefaults.length === 0 && data.customPoints.length === 0) return null;
  return JSON.stringify(data);
}
