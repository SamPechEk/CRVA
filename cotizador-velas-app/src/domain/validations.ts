import { z } from "zod";
import { D, sum } from "./formulas";
import {
  categories,
  units,
  statuses,
  type PricingTier,
  type CandleModel,
  type DataSet,
} from "./types";
export const numeric = z.string().refine((v) => {
  try {
    return D(v).isFinite() && D(v).gte(0);
  } catch {
    return false;
  }
}, "Escribe un número mayor o igual a cero");
export const positive = numeric.refine(
  (v) => D(v).gt(0),
  "Debe ser mayor que cero",
);
export const margin = numeric.refine(
  (v) => D(v).lt(1),
  "Debe ser menor a 100%",
);
const id = z.string().min(1);
const url = z.string().url().nullable();
export const materialSchema = z
  .object({
    id,
    code: id,
    name: id,
    category: z.enum(categories),
    unit: z.enum(units),
    quantityPurchased: positive,
    totalPrice: numeric,
    isWax: z.boolean(),
    systemRole: z.enum(["NONE", "ENERGY", "LABOR"]),
    isActive: z.boolean(),
    supplierName: z.string().nullable().optional(),
  })
  .superRefine((m, c) => {
    if (m.isWax && !["g", "kg"].includes(m.unit))
      c.addIssue({
        code: "custom",
        message: "Las ceras deben expresarse en g o kg",
      });
    if (
      (m.systemRole === "ENERGY" && m.unit !== "kWh") ||
      (m.systemRole === "LABOR" && m.unit !== "min")
    )
      c.addIssue({
        code: "custom",
        message: "Energía usa kWh; mano de obra usa min",
      });
  });
export const modelSchema = z.object({
  id,
  code: id,
  name: id,
  presentation: z.string(),
  batchConfig: z.object({
    candlesPerBatch: z.number().int().min(1),
    meltPourMinutesBatch: numeric,
    unmoldPackMinutesBatch: numeric,
    curingHoursPassive: numeric,
    energyKwhBatch: numeric,
  }),
  recipeItems: z.array(
    z.object({ modelId: id, materialId: id, quantityPerCandle: numeric }),
  ),
  salesMixPct: margin.or(z.literal("1")),
  imageUrl: url,
  imagePublicId: z.string().nullable(),
  isReferenceTemplate: z.boolean(),
  isActive: z.boolean(),
});
export const tierSchema = z.object({
  id,
  name: id,
  minQty: z.number().int().min(1),
  maxQty: z.number().int().min(1).nullable(),
  marginPct: margin,
  isRetailBase: z.boolean(),
  description: z.string(),
  sortOrder: z.number().int(),
});
export const settingsSchema = z.object({
  id: z.literal("global"),
  currencyCode: z.literal("MXN"),
  defaultMarginPct: margin,
  defaultIvaPct: z.enum(["0", "0.08", "0.16"]),
  dropsPerMl: positive,
  maxDropsPer100gWax: numeric,
  monthlyTargetProfit: numeric,
  activeMixChannel: id,
  businessName: z.string(),
  businessLogoUrl: url,
  businessLogoPublicId: z.string().nullable(),
  quoteDefaultNotes: z.string(),
});
export const clientSchema = z.object({
  id,
  name: id,
  phoneWhatsapp: z.string().regex(/^\+?[0-9 ()-]*$/, "Teléfono inválido"),
  email: z.string().email().or(z.literal("")),
  notes: z.string(),
});
export const fixedSchema = z.object({ id, name: id, monthlyAmount: numeric });
const lineSchema = z.object({
  materialId: id,
  name: id,
  category: z.enum(categories),
  unit: z.enum(units),
  quantityPurchased: positive,
  totalPrice: numeric,
  unitCost: numeric,
  quantityPerCandle: numeric,
  cost: numeric,
  profit: numeric,
});
export const quoteSchema = z.object({
  id,
  folio: id,
  status: z.enum(statuses),
  clientId: id.nullable(),
  clientSnapshot: clientSchema.nullable(),
  pricingTierName: z.string(),
  marginPct: margin,
  ivaPct: z.enum(["0", "0.08", "0.16"]),
  items: z
    .array(
      z.object({
        id,
        quoteId: id,
        modelId: id,
        modelName: id,
        presentation: z.string(),
        imageUrl: url,
        quantity: z.number().int().positive(),
        unitPrice: numeric,
        subtotal: numeric,
      }),
    )
    .min(1),
  costBreakdownSnapshot: z.array(lineSchema),
  subtotal: numeric,
  iva: numeric,
  total: numeric,
  productionCost: numeric,
  profit: numeric,
  businessSnapshot: z.object({ name: z.string(), logoUrl: url }),
  notes: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  createdByEmail: z.string(),
});
export const dataSchema = z.object({
  settings: settingsSchema.nullable(),
  materials: z.array(materialSchema),
  models: z.array(modelSchema),
  pricingTiers: z.array(tierSchema),
  fixedCosts: z.array(fixedSchema),
  clients: z.array(clientSchema),
  quotes: z.array(quoteSchema),
  counter: z.object({
    year: z.number().int(),
    seq: z.number().int().nonnegative(),
  }),
});
export const backupSchema = z
  .object({
    version: z.literal(1),
    exportedAt: z.string().datetime(),
    data: dataSchema,
  })
  .superRefine((b, c) => {
    try {
      validateData(b.data);
    } catch (e) {
      c.addIssue({ code: "custom", message: String(e) });
    }
  });
export function validateTiers(tiers: PricingTier[], retail: string) {
  margin.parse(retail);
  const t = [...tiers].sort((a, b) => a.sortOrder - b.sortOrder);
  if (new Set(t.map((v) => v.name)).size !== t.length)
    throw Error("Los nombres de nivel deben ser únicos");
  if (t.filter((t) => t.isRetailBase).length !== 1 || !t[0]?.isRetailBase)
    throw Error("Debe existir un nivel Menudeo base al inicio");
  for (let i = 0; i < t.length; i++) {
    tierSchema.parse(t[i]);
    if (t[i].maxQty !== null && t[i].maxQty! < t[i].minQty)
      throw Error("Rango de cantidades inválido");
    if (
      i > 0 &&
      (D(t[i].marginPct).gte(retail) ||
        D(t[i].marginPct).gte(
          t[i - 1].isRetailBase ? retail : t[i - 1].marginPct,
        ))
    )
      throw Error("Los márgenes deben disminuir al aumentar el volumen");
    if (
      (i === 0 && t[i].minQty !== 1) ||
      (i > 0 && t[i].minQty !== t[i - 1].maxQty! + 1) ||
      (i < t.length - 1 && t[i].maxQty === null) ||
      (i === t.length - 1 && t[i].maxQty !== null)
    )
      throw Error("Los rangos deben ser continuos, desde 1 y sin límite final");
  }
}
export function validateMix(models: CandleModel[]) {
  if (
    sum(models.filter((m) => m.isActive).map((m) => m.salesMixPct))
      .minus(1)
      .abs()
      .gt("0.0001")
  )
    throw Error("La mezcla de ventas debe sumar 100%");
}
export function validateData(data: DataSet) {
  if (data.settings && data.pricingTiers.length)
    validateTiers(data.pricingTiers, data.settings.defaultMarginPct);
  for (const group of [
    data.materials,
    data.models,
    data.pricingTiers,
    data.clients,
    data.quotes,
    data.fixedCosts,
  ])
    if (new Set(group.map((x) => x.id)).size !== group.length)
      throw Error("Hay identificadores duplicados");
  for (const m of data.models) {
    for (const r of m.recipeItems)
      if (
        r.modelId !== m.id ||
        !data.materials.some(
          (x) =>
            x.id === r.materialId &&
            (x.isActive || !m.isActive || D(r.quantityPerCandle).eq(0)),
        )
      )
        throw Error("La receta referencia un insumo inválido");
    if (
      new Set(m.recipeItems.map((r) => r.materialId)).size !==
      m.recipeItems.length
    )
      throw Error("Insumos duplicados en receta");
  }
  for (const role of ["ENERGY", "LABOR"])
    if (
      data.materials.filter((m) => m.isActive && m.systemRole === role).length >
      1
    )
      throw Error("Sólo puede existir un insumo activo por rol de sistema");
}
