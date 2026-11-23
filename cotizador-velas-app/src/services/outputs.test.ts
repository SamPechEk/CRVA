import { it, expect } from "vitest";
import { seedV4 as s } from "../domain/seedV4";
import { draftQuote } from "./quoteService";
import { commercialQuote } from "./commercial";
import { whatsappText } from "./whatsappService";
import { createWorkbook, sheetNames } from "./xlsxService";
import ExcelJS from "exceljs";
it("salidas comerciales excluyen datos internos", () => {
  const q = draftQuote(
    s.models[0],
    s.materials,
    s.settings!,
    1,
    ".3",
    "0",
    null,
    "",
    "",
    "Menudeo",
  );
  for (const content of [JSON.stringify(commercialQuote(q)), whatsappText(q)]) {
    expect(content).not.toMatch(
      /costo|margen|utilidad|INS-03|Parafina|22\.56|9\.67/i,
    );
  }
});
it("xlsx válido con seis hojas y fórmulas vivas", async () => {
  const book = await createWorkbook(s);
  const bytes = await book.xlsx.writeBuffer();
  const loaded = new ExcelJS.Workbook();
  await loaded.xlsx.load(bytes);
  expect(loaded.worksheets.map((s) => s.name)).toEqual(sheetNames);
  const xml = JSON.stringify(loaded.model);
  for (const formula of ["SUM(", "SUMIF(", "INDEX(", "MATCH(", "ROUNDUP("])
    expect(xml).toContain(formula);
  expect(
    (loaded.worksheets[0].getCell("F3").value as { formula: string }).formula,
  ).toContain("INDEX(");
  expect(
    (loaded.worksheets[1].getCell("P2").value as { formula: string }).formula,
  ).toBe("D11");
});
