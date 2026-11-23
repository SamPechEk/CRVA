import type {
  Quote,
  CandleModel,
  Material,
  Settings,
  Client,
} from "../domain/types";
import { calculateModel, controlled } from "../domain/formulas";
export function draftQuote(
  model: CandleModel,
  materials: Material[],
  settings: Settings,
  quantity: number,
  margin: string,
  iva: string,
  client: Client | null,
  notes: string,
  email: string,
  tier: string,
): Quote {
  const q = calculateModel(model, materials, margin, iva, quantity),
    id = crypto.randomUUID(),
    now = new Date().toISOString();
  return {
    id,
    folio: "SIN GUARDAR",
    status: "BORRADOR",
    clientId: client?.id ?? null,
    clientSnapshot: client ? structuredClone(client) : null,
    pricingTierName: tier,
    marginPct: controlled(margin, 4),
    ivaPct: iva,
    items: [
      {
        id: crypto.randomUUID(),
        quoteId: id,
        modelId: model.id,
        modelName: model.name,
        presentation: model.presentation,
        imageUrl: model.imageUrl,
        quantity,
        unitPrice: controlled(q.price),
        subtotal: controlled(q.subtotal, 2),
      },
    ],
    costBreakdownSnapshot: q.lines.map((l) => ({
      ...l,
      unitCost: controlled(l.unitCost),
      quantityPerCandle: controlled(l.quantityPerCandle),
      cost: controlled(l.cost),
      profit: controlled(l.profit),
    })),
    subtotal: controlled(q.subtotal, 2),
    iva: controlled(q.iva, 2),
    total: controlled(q.total, 2),
    productionCost: controlled(q.orderCost, 2),
    profit: controlled(q.orderProfit, 2),
    businessSnapshot: {
      name: settings.businessName,
      logoUrl: settings.businessLogoUrl,
    },
    notes,
    createdAt: now,
    updatedAt: now,
    createdByEmail: email,
  };
}
export function duplicateQuote(q: Quote): Quote {
  const id = crypto.randomUUID(),
    now = new Date().toISOString();
  return {
    ...structuredClone(q),
    id,
    folio: "SIN GUARDAR",
    status: "BORRADOR",
    items: q.items.map((i) => ({ ...i, id: crypto.randomUUID(), quoteId: id })),
    createdAt: now,
    updatedAt: now,
  };
}
