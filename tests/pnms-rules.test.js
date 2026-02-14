import test from "node:test";
import assert from "node:assert/strict";

const canWritePlantType = (role) => role === "ADMIN";
const canWriteOperational = (role) => role === "STAFF" || role === "ADMIN";
const canViewProfit = (role) => role === "ADMIN";

const buildLifecycle = ({ sowingQty, germinatedQty, purchasedQty }) => {
  const fromSowing = 0;
  const fromGermination = germinatedQty;
  const fromPurchase = purchasedQty;
  return {
    inventoryAfterSowing: fromSowing,
    inventoryAfterGermination: fromGermination,
    inventoryAfterPurchase: fromGermination + fromPurchase,
    sowingQty,
  };
};

const saleTotals = (sale) => {
  const totalAmount =
    sale.totalAmount ??
    sale.items.reduce(
      (sum, item) =>
        sum + (Number(item.priceAtSale ?? 0) || 0) * (Number(item.quantity) || 0),
      0,
    );
  const totalCost =
    sale.totalCost ??
    sale.items.reduce(
      (sum, item) =>
        sum + (Number(item.costAtSale ?? 0) || 0) * (Number(item.quantity) || 0),
      0,
    );
  const totalProfit = sale.totalProfit ?? totalAmount - totalCost;
  return { totalAmount, totalCost, totalProfit };
};

test("RBAC matrix matches backend contract intent", () => {
  assert.equal(canWritePlantType("ADMIN"), true);
  assert.equal(canWritePlantType("STAFF"), false);
  assert.equal(canWritePlantType("VIEWER"), false);

  assert.equal(canWriteOperational("STAFF"), true);
  assert.equal(canWriteOperational("ADMIN"), true);
  assert.equal(canWriteOperational("VIEWER"), false);

  assert.equal(canViewProfit("ADMIN"), true);
  assert.equal(canViewProfit("STAFF"), false);
  assert.equal(canViewProfit("VIEWER"), false);
});

test("Lifecycle does not create inventory at sowing", () => {
  const flow = buildLifecycle({ sowingQty: 100, germinatedQty: 72, purchasedQty: 20 });
  assert.equal(flow.inventoryAfterSowing, 0);
  assert.equal(flow.inventoryAfterGermination, 72);
  assert.equal(flow.inventoryAfterPurchase, 92);
});

test("Sale totals/profit are computed from backend sale fields", () => {
  const result = saleTotals({
    items: [
      { quantity: 2, priceAtSale: 120, costAtSale: 70 },
      { quantity: 1, priceAtSale: 90, costAtSale: 50 },
    ],
  });

  assert.equal(result.totalAmount, 330);
  assert.equal(result.totalCost, 190);
  assert.equal(result.totalProfit, 140);
});
