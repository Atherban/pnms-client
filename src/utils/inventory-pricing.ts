const toNonNegativeNumber = (value: unknown): number | null => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
};

export const resolveInventoryPricing = (item: any) => {
  const quantity = Number(item?.quantity ?? 0);
  const safeQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 0;

  const unitCost =
    toNonNegativeNumber(item?.unitCost) ??
    toNonNegativeNumber(item?.costPrice) ??
    toNonNegativeNumber(item?.purchasePrice) ??
    toNonNegativeNumber(item?.plantType?.defaultCostPrice);

  const sellingPrice =
    toNonNegativeNumber(item?.unitPrice) ??
    toNonNegativeNumber(item?.sellingPrice) ??
    toNonNegativeNumber(item?.plantType?.sellingPrice) ??
    toNonNegativeNumber(item?.plantType?.price);

  const inventoryValue = unitCost !== null ? unitCost * safeQuantity : null;
  const potentialRevenue = sellingPrice !== null ? sellingPrice * safeQuantity : null;
  const grossProfit =
    unitCost !== null && sellingPrice !== null
      ? (sellingPrice - unitCost) * safeQuantity
      : null;

  return {
    unitCost,
    sellingPrice,
    inventoryValue,
    potentialRevenue,
    grossProfit,
  };
};
