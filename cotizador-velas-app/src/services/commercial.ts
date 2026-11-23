import type { Quote } from "../domain/types";
import { money, pct } from "../domain/formulas";
export function commercialQuote(q: Quote) {
  return {
    business: q.businessSnapshot.name,
    logo: q.businessSnapshot.logoUrl,
    folio: q.folio,
    date: new Date(q.createdAt).toLocaleDateString("es-MX", {
      timeZone: "UTC",
    }),
    client: q.clientSnapshot
      ? {
          name: q.clientSnapshot.name,
          email: q.clientSnapshot.email,
          phone: q.clientSnapshot.phoneWhatsapp,
        }
      : null,
    items: q.items.map((i) => ({
      name: i.modelName,
      presentation: i.presentation,
      image: i.imageUrl,
      quantity: i.quantity,
      unitPrice: money(i.unitPrice),
      subtotal: money(i.subtotal),
    })),
    subtotal: money(q.subtotal),
    taxRate: pct(q.ivaPct),
    tax: money(q.iva),
    total: money(q.total),
    notes: q.notes,
  };
}
