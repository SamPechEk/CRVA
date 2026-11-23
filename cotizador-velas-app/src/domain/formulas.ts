import Decimal from "decimal.js";
import {
  categories,
  type CandleModel,
  type Material,
  type PricingTier,
  type CostLine,
} from "./types";
Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });
export const D = (v: Decimal.Value) => new Decimal(v);
export const sum = (values: Decimal.Value[]) =>
  values.reduce<Decimal>((a, v) => a.plus(v), D(0));
export const money = (v: Decimal.Value) =>
  "$" +
  D(v)
    .toFixed(2)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
export const pct = (v: Decimal.Value) =>
  D(v).times(100).toDecimalPlaces(2).toString() + "%";
export const controlled = (v: Decimal.Value, places = 6) =>
  D(v).toDecimalPlaces(places).toString();
export function unitCost(m: Material) {
  if (D(m.quantityPurchased).lte(0))
    throw Error("La cantidad comprada debe ser mayor a cero");
  return D(m.totalPrice).div(m.quantityPurchased);
}
export function batch(m: CandleModel) {
  const b = m.batchConfig;
  if (!Number.isInteger(b.candlesPerBatch) || b.candlesPerBatch < 1)
    throw Error("El lote debe contener al menos una vela");
  return {
    minutes: D(b.meltPourMinutesBatch)
      .plus(b.unmoldPackMinutesBatch)
      .div(b.candlesPerBatch),
    energy: D(b.energyKwhBatch).div(b.candlesPerBatch),
    passiveCost: D(0),
  };
}
export function suggestedDose(
  wax: Decimal.Value,
  maxDrops: Decimal.Value = 10,
  dropsPerMl: Decimal.Value = 20,
) {
  const drops = D(wax).div(100).times(maxDrops);
  return { drops, ml: drops.div(dropsPerMl) };
}
export function pricing(
  cost: Decimal.Value,
  margin: Decimal.Value,
  iva: Decimal.Value = 0,
  quantity = 1,
) {
  const m = D(margin);
  if (m.lt(0) || m.gte(1))
    throw Error("El margen debe estar entre 0 y menos de 100%");
  const c = D(cost),
    price = c.div(D(1).minus(m)),
    profit = price.minus(c),
    tax = price.times(iva),
    final = price.plus(tax);
  return {
    cost: c,
    price,
    profit,
    tax,
    final,
    markup: c.gt(0) ? profit.div(c) : D(0),
    orderCost: c.times(quantity),
    orderProfit: profit.times(quantity),
    subtotal: price.times(quantity),
    iva: tax.times(quantity),
    total: final.times(quantity),
  };
}
export function calculateModel(
  model: CandleModel,
  materials: Material[],
  margin: Decimal.Value = "0.3",
  iva: Decimal.Value = 0,
  quantity = 1,
) {
  const b = batch(model);
  const lines: CostLine[] = materials
    .filter((m) => m.isActive)
    .map((m) => {
      const q =
          m.systemRole === "ENERGY"
            ? b.energy
            : m.systemRole === "LABOR"
              ? b.minutes
              : D(
                  model.recipeItems.find((i) => i.materialId === m.id)
                    ?.quantityPerCandle ?? 0,
                ),
        c = unitCost(m).times(q);
      return {
        materialId: m.id,
        name: m.name,
        category: m.category,
        unit: m.unit,
        quantityPurchased: m.quantityPurchased,
        totalPrice: m.totalPrice,
        unitCost: unitCost(m).toString(),
        quantityPerCandle: q.toString(),
        cost: c.toString(),
        profit: pricing(c, margin).profit.toString(),
      };
    });
  const cost = sum(lines.map((l) => l.cost));
  return {
    lines,
    categories: Object.fromEntries(
      categories.map((c) => [
        c,
        sum(lines.filter((l) => l.category === c).map((l) => l.cost)),
      ]),
    ) as Record<(typeof categories)[number], Decimal>,
    wax: sum(
      model.recipeItems
        .filter((i) => materials.find((m) => m.id === i.materialId)?.isWax)
        .map((i) => {
          const material = materials.find((m) => m.id === i.materialId)!;
          return material.unit === "kg"
            ? D(i.quantityPerCandle).times(1000)
            : D(i.quantityPerCandle);
        }),
    ),
    activeCount: lines.filter((l) => D(l.quantityPerCandle).gt(0)).length,
    initialInvestment: sum(
      lines
        .filter((l) => D(l.quantityPerCandle).gt(0))
        .map((l) => l.totalPrice),
    ),
    ...pricing(cost, margin, iva, quantity),
  };
}
export function breakEven(
  fixed: Decimal.Value,
  cost: Decimal.Value,
  margin: Decimal.Value,
  target: Decimal.Value = 0,
) {
  const p = pricing(cost, margin);
  if (p.profit.lte(0)) return { units: null, sales: null };
  const units = D(fixed).plus(target).div(p.profit).ceil();
  return { units, sales: units.times(p.price) };
}
export function mixture(
  models: CandleModel[],
  materials: Material[],
  margin: Decimal.Value,
  fixed: Decimal.Value,
  target: Decimal.Value,
) {
  const weighted = sum(
    models
      .filter((m) => m.isActive)
      .map((m) => calculateModel(m, materials).cost.times(m.salesMixPct)),
  );
  return {
    ...pricing(weighted, margin),
    pe: breakEven(fixed, weighted, margin),
    goal: breakEven(fixed, weighted, margin, target),
  };
}
export const effectiveTiers = (tiers: PricingTier[], retail: string) =>
  tiers
    .map((t) => ({ ...t, marginPct: t.isRetailBase ? retail : t.marginPct }))
    .sort((a, b) => a.sortOrder - b.sortOrder);
export const discount = (retail: string, margin: string) =>
  D(1).minus(D(1).minus(retail).div(D(1).minus(margin)));
