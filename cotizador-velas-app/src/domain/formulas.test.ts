import { describe, it, expect } from "vitest";
import { seedV4 as s, seedModels, seedMaterials } from "./seedV4";
import {
  calculateModel,
  pricing,
  breakEven,
  mixture,
  suggestedDose,
  sum,
  discount,
} from "./formulas";
import { validateTiers, validateMix, backupSchema } from "./validations";
describe("Regresión exacta v4", () => {
  it.each([
    [0, "22.56", "32.23", 52, 89],
    [1, "20.38", "29.12", 58, 99],
    [2, "115.90", "165.56", 11, 18],
    [3, "133.49", "190.69", 9, 15],
  ])("modelo %s", (i, c, p, r, w) => {
    const x = calculateModel(seedModels[Number(i)], seedMaterials);
    expect(x.cost.toFixed(2)).toBe(c);
    expect(x.price.toFixed(2)).toBe(p);
    expect(breakEven(500, x.cost, ".3").units?.toNumber()).toBe(r);
    expect(breakEven(500, x.cost, ".2").units?.toNumber()).toBe(w);
  });
  it("detalle y costos sin redondeo intermedio", () => {
    const a = calculateModel(seedModels[0], seedMaterials),
      b = calculateModel(seedModels[1], seedMaterials);
    expect(a.cost.toNumber()).toBeCloseTo(22.558333333333, 10);
    expect(b.cost.toNumber()).toBeCloseTo(20.383666666667, 10);
    expect(Object.values(a.categories).map((c) => c.toFixed(2))).toEqual([
      "5.41",
      "5.17",
      "11.99",
    ]);
    expect(a.initialInvestment.toFixed(2)).toBe("1023.00");
    expect(a.activeCount).toBe(9);
    expect(sum(seedMaterials.map((m) => m.totalPrice)).toFixed(2)).toBe(
      "2433.00",
    );
    expect(sum(s.fixedCosts.map((f) => f.monthlyAmount)).toString()).toBe(
      "500",
    );
    expect(calculateModel(seedModels[2], seedMaterials).cost.toString()).toBe(
      "115.895",
    );
    expect(calculateModel(seedModels[3], seedMaterials).cost.toString()).toBe(
      "133.485",
    );
  });
  it.each([
    [0, ".4", "37.60"],
    [0, ".25", "30.08"],
    [0, ".2", "28.20"],
    [0, ".15", "26.54"],
    [1, ".25", "27.18"],
    [1, ".2", "25.48"],
    [1, ".15", "23.98"],
  ])("tarifa %s %s", (i, m, p) =>
    expect(
      calculateModel(
        seedModels[Number(i)],
        seedMaterials,
        String(m),
      ).price.toFixed(2),
    ).toBe(p),
  );
  it("mezcla y meta", () => {
    const m = mixture(seedModels, seedMaterials, ".3", 500, 3000);
    expect(m.profit.toFixed(2)).toBe("22.05");
    expect(m.price.toFixed(2)).toBe("73.50");
    expect(m.pe.units?.toString()).toBe("23");
    expect(m.pe.sales?.toFixed(2)).toBe("1690.45");
    expect(m.goal.units?.toString()).toBe("159");
    expect(m.goal.sales?.toFixed(2)).toBe("11686.15");
  });
  it("esencias", () => {
    expect(suggestedDose(30).ml.toString()).toBe("0.15");
    expect(suggestedDose(30).drops.toString()).toBe("3");
    expect(suggestedDose(20).ml.toString()).toBe("0.1");
    expect(suggestedDose(20).drops.toString()).toBe("2");
  });
  it("bloquea inversiones y mezcla incompleta", () => {
    expect(() =>
      validateTiers(
        s.pricingTiers.map((t) =>
          t.isRetailBase ? t : { ...t, marginPct: ".3" },
        ),
        ".3",
      ),
    ).toThrow();
    expect(() =>
      validateMix(seedModels.map((m) => ({ ...m, salesMixPct: ".1" }))),
    ).toThrow();
    expect(() => validateMix(seedModels)).not.toThrow();
    expect(discount(".3", ".2").gt(0)).toBe(true);
  });
  it("IVA, pedido y cero contribución", () => {
    const p = pricing(70, ".3", ".16", 10);
    expect(p.total.toString()).toBe("1160");
    expect(p.orderProfit.toString()).toBe("300");
    expect(breakEven(500, 70, 0).units).toBeNull();
    expect(pricing(0, ".3").markup.toString()).toBe("0");
    expect(() => pricing(70, 1)).toThrow();
  });
  it("semilla válida", () =>
    expect(
      backupSchema.safeParse({
        version: 1,
        exportedAt: new Date().toISOString(),
        data: s,
      }).success,
    ).toBe(true));
});
