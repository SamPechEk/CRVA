import type { Quote } from "../domain/types";
import { commercialQuote } from "./commercial";
export function whatsappText(q: Quote) {
  const c = commercialQuote(q);
  return [
    c.business,
    "Cotización " + c.folio,
    c.date,
    c.client?.name ?? "",
    ...c.items.map(
      (i) =>
        i.name +
        " · " +
        i.presentation +
        "\n" +
        i.quantity +
        " pzas × " +
        i.unitPrice +
        " = " +
        i.subtotal,
    ),
    "Subtotal: " + c.subtotal,
    "IVA (" + c.taxRate + "): " + c.tax,
    "Total: " + c.total + " MXN",
    c.notes,
  ]
    .filter(Boolean)
    .join("\n");
}
export function whatsappUrl(q: Quote) {
  return (
    "https://wa.me/" +
    (q.clientSnapshot?.phoneWhatsapp ?? "").replace(/\D/g, "") +
    "?text=" +
    encodeURIComponent(whatsappText(q))
  );
}
