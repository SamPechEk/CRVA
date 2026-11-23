import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Quote } from "../domain/types";
import { commercialQuote } from "./commercial";
import { services } from "./container";
async function image(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const timer = setTimeout(() => reject(Error("Imagen no disponible")), 5000);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      reject(Error("Imagen no disponible"));
    };
    img.src = services.media.getOptimizedUrl(url, "pdf");
  });
}
export async function generatePdf(q: Quote) {
  const c = commercialQuote(q),
    pdf = new jsPDF();
  pdf.setCreationDate(new Date(q.createdAt));
  pdf.setFileId(q.id.replace(/-/g, "").padEnd(32, "0").slice(0, 32));
  pdf.setProperties({ title: "Cotización " + c.folio, author: c.business });
  pdf.setTextColor(48, 43, 39);
  pdf.setFontSize(22);
  pdf.text(c.business || "Cotización de velas", 18, 25);
  pdf.setFontSize(11);
  pdf.text(c.folio + " · " + c.date, 18, 35);
  let top = 50;
  if (c.client) {
    pdf.text(
      [c.client.name, c.client.email, c.client.phone].filter(Boolean),
      18,
      45,
    );
    top = 68;
  }
  if (c.logo) {
    try {
      const img = await image(c.logo);
      pdf.addImage(img, "JPEG", 170, 15, 22, 22, undefined, "FAST");
    } catch {
      /* optional image */
    }
  }
  const photo = c.items.find((i) => i.image)?.image;
  if (photo) {
    try {
      const img = await image(photo);
      const ratio = img.naturalWidth / img.naturalHeight;
      pdf.addImage(img, "JPEG", 160, top, 30, 30 / ratio, undefined, "FAST");
      top += 42;
    } catch {
      /* clean fallback */
    }
  }
  autoTable(pdf, {
    startY: top,
    head: [
      ["Modelo / presentación", "Cantidad", "P. unitario sin IVA", "Subtotal"],
    ],
    body: c.items.map((i) => [
      i.name + "\n" + i.presentation,
      String(i.quantity),
      i.unitPrice,
      i.subtotal,
    ]),
    theme: "grid",
    headStyles: { fillColor: [151, 72, 47] },
    styles: { fontSize: 10, cellPadding: 4 },
    margin: { left: 18, right: 18 },
  });
  let y =
    (pdf as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable
      .finalY + 12;
  if (y > 230) {
    pdf.addPage();
    y = 25;
  }
  pdf.text("Subtotal: " + c.subtotal, 130, y);
  pdf.text("IVA (" + c.taxRate + "): " + c.tax, 130, y + 8);
  pdf.setFontSize(14);
  pdf.text("Total: " + c.total + " MXN", 115, y + 20);
  if (c.notes) {
    pdf.setFontSize(10);
    const lines = pdf.splitTextToSize(c.notes, 174) as string[];
    let noteY = y + 38;
    for (const line of lines) {
      if (noteY > 277) {
        pdf.addPage();
        noteY = 20;
      }
      pdf.text(line, 18, noteY);
      noteY += 5;
    }
  }
  return pdf;
}
export async function downloadPdf(q: Quote) {
  (await generatePdf(q)).save(q.folio + ".pdf");
}
