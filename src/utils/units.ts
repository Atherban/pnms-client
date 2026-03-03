export const QUANTITY_UNITS = ["SEEDS", "GRAM", "KG", "UNITS"] as const;

export type QuantityUnit = (typeof QUANTITY_UNITS)[number];

const UNIT_LABELS: Record<QuantityUnit, string> = {
  SEEDS: "seeds",
  GRAM: "gram",
  KG: "kg",
  UNITS: "units",
};

export const normalizeQuantityUnit = (
  value: unknown,
  fallback: QuantityUnit = "UNITS",
): QuantityUnit => {
  if (typeof value !== "string") {
    return fallback;
  }
  const normalized = value.trim().toUpperCase() as QuantityUnit;
  return QUANTITY_UNITS.includes(normalized) ? normalized : fallback;
};

export const formatQuantityUnit = (
  value: unknown,
  fallback: QuantityUnit = "UNITS",
): string => {
  const normalized = normalizeQuantityUnit(value, fallback);
  return UNIT_LABELS[normalized];
};
