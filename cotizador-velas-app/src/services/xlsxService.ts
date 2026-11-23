import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { D } from "../domain/formulas";
import type { DataSet } from "../domain/types";
export const sheetNames = [
  "Cotizador de Velas",
  "Catálogo de Modelos",
  "Mayoreo y Punto de Equilibrio",
  "Lista Maestra de Insumos",
  "Resumen y Gráficos",
  "Parámetros",
];
export async function createWorkbook(data: DataSet) {
  if (!data.settings) throw Error("Primero inicializa los datos");
  const book = new ExcelJS.Workbook();
  book.calcProperties.fullCalcOnLoad = true;
  const [quote, cat, wholesale, mat, summary, params] = sheetNames.map((n) =>
    book.addWorksheet(n),
  );
  const s = data.settings,
    materials = data.materials.filter((m) => m.isActive),
    models = data.models.filter((m) => m.isActive);
  if (!models.length || !materials.length)
    throw Error("Se necesita al menos un modelo y un insumo activo");
  const f = (sheet: ExcelJS.Worksheet, address: string, formula: string) => {
    sheet.getCell(address).value = { formula };
  };
  params.addRow(["Parámetro", "Valor"]);
  [
    ["Margen base", s.defaultMarginPct],
    ["IVA", s.defaultIvaPct],
    ["Gotas / ml", s.dropsPerMl],
    ["Máx. gotas / 100 g", s.maxDropsPer100gWax],
    ["Meta mensual", s.monthlyTargetProfit],
  ].forEach(([n, v]) => params.addRow([n, Number(v)]));
  params.addRow(["Canal de mezcla", s.activeMixChannel]);
  params.addRow(["Nombre del negocio", s.businessName]);
  params.addRow(["Notas", s.quoteDefaultNotes]);
  params.addRow([]);
  params.addRow(["Márgenes permitidos", "IVA permitido"]);
  for (let i = 0; i < 13; i++)
    params.addRow([
      D("0.1").plus(D(i).times("0.05")).toNumber(),
      i < 3 ? [0, 0.08, 0.16][i] : null,
    ]);
  mat.addRow([
    "Código",
    "Insumo",
    "Categoría",
    "Unidad",
    "Cantidad comprada",
    "Precio total",
    "Costo unitario",
  ]);
  materials.forEach((m, i) => {
    const r = i + 2;
    mat.addRow([
      m.code,
      m.name,
      m.category,
      m.unit,
      Number(m.quantityPurchased),
      Number(m.totalPrice),
    ]);
    f(mat, "G" + r, `F${r}/E${r}`);
  });
  mat.addRow(["", "", "", "", "Inversión"]);
  f(mat, "F" + (materials.length + 2), `SUM(F2:F${materials.length + 1})`);
  cat.addRow([
    "Código",
    "Modelo",
    "Presentación",
    "Cera (g)",
    "Insumos directos",
    "Empaque",
    "Costos indirectos",
    "Costo total",
    "Menudeo sin IVA",
    "Menudeo con IVA",
    "Mezcla",
    "PE menudeo",
  ]);
  models.forEach((m, i) => {
    cat.addRow([
      m.code,
      m.name,
      m.presentation,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      Number(m.salesMixPct),
    ]);
  });
  const end = models.length + 1;
  const avg = end + 1;
  cat.getCell("A" + avg).value = "PROMEDIO";
  for (let c = 4; c <= 12; c++)
    f(
      cat,
      cat.getColumn(c).letter + avg,
      `AVERAGE(${cat.getColumn(c).letter}2:${cat.getColumn(c).letter}${end})`,
    );
  let start = avg + 3;
  models.forEach((m, i) => {
    const row = i + 2;
    cat.getCell("A" + start).value = m.name;
    cat.getRow(start + 1).values = [
      "Código",
      "Insumo",
      "Categoría",
      "Cantidad por vela",
      "Costo unitario",
      "Costo por vela",
      "Cera g",
    ];
    const first = start + 2,
      last = first + materials.length - 1,
      batch = last + 3;
    cat.getRow(batch).values = [
      "Velas por lote",
      m.batchConfig.candlesPerBatch,
    ];
    cat.getRow(batch + 1).values = [
      "Min derretido + vaciado",
      Number(m.batchConfig.meltPourMinutesBatch),
    ];
    cat.getRow(batch + 2).values = [
      "Min desmolde + empaque",
      Number(m.batchConfig.unmoldPackMinutesBatch),
    ];
    cat.getRow(batch + 3).values = [
      "Reposo pasivo (horas)",
      Number(m.batchConfig.curingHoursPassive),
      "Costo",
      0,
    ];
    cat.getRow(batch + 4).values = [
      "Energía lote kWh",
      Number(m.batchConfig.energyKwhBatch),
    ];
    cat.getRow(batch + 5).values = ["Minutos activos / vela"];
    f(cat, "B" + (batch + 5), `(B${batch + 1}+B${batch + 2})/B${batch}`);
    cat.getRow(batch + 6).values = ["Energía / vela"];
    f(cat, "B" + (batch + 6), `B${batch + 4}/B${batch}`);
    materials.forEach((material, j) => {
      const r = first + j;
      cat.getRow(r).values = [
        material.code,
        material.name,
        material.category,
        Number(
          m.recipeItems.find((x) => x.materialId === material.id)
            ?.quantityPerCandle ?? 0,
        ),
      ];
      if (material.systemRole !== "NONE")
        f(
          cat,
          "D" + r,
          `B${batch + (material.systemRole === "ENERGY" ? 6 : 5)}`,
        );
      f(
        cat,
        "E" + r,
        `INDEX('Lista Maestra de Insumos'!G$2:G$${materials.length + 1},MATCH(A${r},'Lista Maestra de Insumos'!A$2:A$${materials.length + 1},0))`,
      );
      f(cat, "F" + r, `D${r}*E${r}`);
      if (material.isWax)
        f(cat, "G" + r, `D${r}*${material.unit === "kg" ? 1000 : 1}`);
    });
    f(cat, "D" + row, `SUM(G${first}:G${last})`);
    ["Insumos directos", "Empaque", "Costos indirectos"].forEach((c, j) =>
      f(
        cat,
        cat.getColumn(j + 5).letter + row,
        `SUMIF(C${first}:C${last},"${c}",F${first}:F${last})`,
      ),
    );
    f(cat, "H" + row, `SUM(F${first}:F${last})`);
    f(cat, "I" + row, `H${row}/(1-'Parámetros'!B2)`);
    f(cat, "J" + row, `I${row}*(1+'Parámetros'!B3)`);
    f(
      cat,
      "L" + row,
      `IF(I${row}>H${row},ROUNDUP('Mayoreo y Punto de Equilibrio'!B${data.fixedCosts.length + 6}/(I${row}-H${row}),0),0)`,
    );
    start = batch + 9;
  });
  wholesale.addRow(["Gastos fijos", "Mensual"]);
  data.fixedCosts.forEach((x) =>
    wholesale.addRow([x.name, Number(x.monthlyAmount)]),
  );
  const fixedRow = data.fixedCosts.length + 6;
  wholesale.getCell("A" + fixedRow).value = "Total gastos fijos";
  f(wholesale, "B" + fixedRow, `SUM(B2:B${data.fixedCosts.length + 1})`);
  let tierRow = fixedRow + 3;
  wholesale.getRow(tierRow).values = [
    "Nivel",
    "Desde",
    "Hasta",
    "Margen",
    "Recargo",
    "Descuento",
  ];
  data.pricingTiers.forEach((t, i) => {
    const r = tierRow + i + 1;
    wholesale.getRow(r).values = [
      t.name,
      t.minQty,
      t.maxQty,
      Number(t.marginPct),
    ];
    if (t.isRetailBase) f(wholesale, "D" + r, "'Parámetros'!B2");
    f(wholesale, "E" + r, `D${r}/(1-D${r})`);
    f(wholesale, "F" + r, `1-(1-'Parámetros'!B2)/(1-D${r})`);
  });
  let priceRow = tierRow + data.pricingTiers.length + 3;
  wholesale.getRow(priceRow).values = [
    "Modelo",
    "Nivel",
    "Sin IVA",
    "Con IVA",
    "MC unitario",
    "PE velas",
    "PE ventas",
  ];
  models.forEach((m, i) =>
    data.pricingTiers.forEach((t, j) => {
      const r = priceRow + 1 + i * data.pricingTiers.length + j;
      wholesale.getRow(r).values = [m.name, t.name];
      f(
        wholesale,
        "C" + r,
        `'Catálogo de Modelos'!H${i + 2}/(1-D${tierRow + j + 1})`,
      );
      f(wholesale, "D" + r, `C${r}*(1-'Parámetros'!B3)`);
      f(wholesale, "E" + r, `C${r}-'Catálogo de Modelos'!H${i + 2}`);
      f(wholesale, "F" + r, `IF(E${r}>0,ROUNDUP(B$${fixedRow}/E${r},0),0)`);
      f(wholesale, "G" + r, `F${r}*C${r}`);
    }),
  );
  let mix = priceRow + models.length * data.pricingTiers.length + 4;
  wholesale.getCell("A" + mix).value = "Costo ponderado";
  f(
    wholesale,
    "B" + mix,
    `SUMPRODUCT('Catálogo de Modelos'!H2:H${end},'Catálogo de Modelos'!K2:K${end})`,
  );
  wholesale.getCell("A" + (mix + 1)).value = "Margen del canal";
  f(
    wholesale,
    "B" + (mix + 1),
    `INDEX(D${tierRow + 1}:D${tierRow + data.pricingTiers.length},MATCH('Parámetros'!B7,A${tierRow + 1}:A${tierRow + data.pricingTiers.length},0))`,
  );
  wholesale.getCell("A" + (mix + 2)).value = "Precio ponderado";
  f(wholesale, "B" + (mix + 2), `B${mix}/(1-B${mix + 1})`);
  wholesale.getCell("A" + (mix + 3)).value = "MC ponderado";
  f(wholesale, "B" + (mix + 3), `B${mix + 2}-B${mix}`);
  for (const [offset, label, target] of [
    [4, "PE velas", "0"],
    [6, "Meta velas", "'Parámetros'!B6"],
  ] as const) {
    wholesale.getCell("A" + (mix + offset)).value = label;
    f(
      wholesale,
      "B" + (mix + offset),
      `IF(B${mix + 3}>0,ROUNDUP((B${fixedRow}+${target})/B${mix + 3},0),0)`,
    );
    wholesale.getCell("A" + (mix + offset + 1)).value = "Ventas sin IVA";
    f(wholesale, "B" + (mix + offset + 1), `B${mix + offset}*B${mix + 2}`);
  }
  quote.addRow([
    "Modelo",
    models[0].code,
    "Margen",
    Number(s.defaultMarginPct),
    "IVA",
    Number(s.defaultIvaPct),
    "Cantidad",
    1,
  ]);
  quote.addRow([
    "Insumo",
    "Categoría",
    "Unidad",
    "Cantidad compra",
    "Precio paquete",
    "Cantidad / vela",
    "Costo unitario",
    "Costo / vela",
    "Margen / vela",
  ]);
  materials.forEach((m, i) => {
    const r = i + 3;
    quote.getRow(r).values = [m.name, m.category, m.unit];
    f(quote, "D" + r, `'Lista Maestra de Insumos'!E${i + 2}`);
    f(quote, "E" + r, `'Lista Maestra de Insumos'!F${i + 2}`);
    f(quote, "F" + r, `'Catálogo de Modelos'!D${avg + 5 + i}`);
    f(quote, "G" + r, `'Lista Maestra de Insumos'!G${i + 2}`);
    f(quote, "H" + r, `F${r}*G${r}`);
    f(quote, "I" + r, `H${r}/(1-D$1)-H${r}`);
  });
  const qr = materials.length + 3;
  quote.getCell("A" + qr).value = "TOTAL POR VELA";
  f(quote, "H" + qr, `SUM(H3:H${qr - 1})`);
  f(quote, "I" + qr, `SUM(I3:I${qr - 1})`);
  quote.getCell("A" + (qr + 2)).value = "Subtotal pedido";
  f(quote, "H" + (qr + 2), `H${qr}/(1-D1)*H1`);
  quote.getCell("A" + (qr + 3)).value = "IVA";
  f(quote, "H" + (qr + 3), `H${qr + 2}*F1`);
  quote.getCell("A" + (qr + 4)).value = "TOTAL MXN";
  f(quote, "H" + (qr + 4), `SUM(H${qr + 2}:H${qr + 3})`);
  // Hidden matrix avoids nested-IF limits when the catalogue grows.
  cat.getCell("O1").value = "Insumo";
  models.forEach((m, j) => (cat.getCell(1, 16 + j).value = m.code));
  const lastColumn = cat.getColumn(15 + models.length).letter;
  materials.forEach((m, i) => {
    cat.getCell(i + 2, 15).value = m.code;
    models.forEach((_, j) =>
      f(
        cat,
        cat.getColumn(16 + j).letter + (i + 2),
        `D${avg + 5 + j * (materials.length + 13) + i}`,
      ),
    );
    f(
      quote,
      "F" + (i + 3),
      `INDEX('Catálogo de Modelos'!P${i + 2}:${lastColumn}${i + 2},1,MATCH(B$1,'Catálogo de Modelos'!P$1:${lastColumn}$1,0))`,
    );
  });
  book.definedNames.add(
    `'Catálogo de Modelos'!$A$2:$A$${end}`,
    "ModelosActivos",
  );
  summary.addRow([
    "Categoría",
    "Costo",
    "% costo",
    "Margen $",
    "Precio sin IVA",
    "Precio con IVA",
  ]);
  ["Insumos directos", "Empaque", "Costos indirectos"].forEach((c, i) => {
    const r = i + 2;
    summary.getCell("A" + r).value = c;
    f(
      summary,
      "B" + r,
      `SUMIF('Cotizador de Velas'!B3:B${qr - 1},A${r},'Cotizador de Velas'!H3:H${qr - 1})`,
    );
    f(summary, "C" + r, `IF(B5>0,B${r}/B5,0)`);
    f(summary, "D" + r, `B${r}/(1-'Cotizador de Velas'!D1)-B${r}`);
    f(summary, "E" + r, `B${r}+D${r}`);
    f(summary, "F" + r, `E${r}*(1+'Cotizador de Velas'!F1)`);
  });
  summary.getCell("A5").value = "TOTAL POR VELA";
  for (const c of ["B", "C", "D", "E", "F"])
    f(summary, c + "5", `SUM(${c}2:${c}4)`);
  summary.getRow(8).values = [
    "Margen",
    "Recargo",
    "Costo",
    "Utilidad",
    "Precio sin IVA",
    "IVA",
    "Precio final",
  ];
  for (let i = 0; i < 8; i++) {
    const r = i + 9;
    summary.getCell("A" + r).value = D("0.15")
      .plus(D(i).times("0.05"))
      .toNumber();
    f(summary, "B" + r, `A${r}/(1-A${r})`);
    f(summary, "C" + r, "B$5");
    f(summary, "E" + r, `C${r}/(1-A${r})`);
    f(summary, "D" + r, `E${r}-C${r}`);
    f(summary, "F" + r, `E${r}*'Cotizador de Velas'!F1`);
    f(summary, "G" + r, `E${r}+F${r}`);
  }
  const extra = [
    ["Precio unitario sin IVA", `H${qr}/(1-D1)`],
    ["IVA por vela", `H${qr}/(1-D1)*F1`],
    ["Precio final por vela", `H${qr}/(1-D1)*(1+F1)`],
    ["Costo del pedido", `H${qr}*H1`],
    ["Utilidad del pedido", `I${qr}*H1`],
    ["Recargo sobre costo", `IF(H${qr}>0,I${qr}/H${qr},0)`],
    ["Insumos activos", `COUNTIF(F3:F${qr - 1},">0")`],
    [
      "Desembolso de insumos activos",
      `SUMIF(F3:F${qr - 1},">0",E3:E${qr - 1})`,
    ],
  ];
  extra.forEach(([label, formula], i) => {
    quote.getCell("A" + (qr + 6 + i)).value = label;
    f(quote, "H" + (qr + 6 + i), formula);
  });
  for (const sheet of book.worksheets) {
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    sheet.columns.forEach((c, i) => {
      c.width = i === 0 ? 34 : 22;
      c.numFmt = "#,##0.00####";
    });
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF97482F" },
    };
    sheet.getRow(1).height = 30;
    sheet.eachRow((row) => {
      row.alignment = { vertical: "middle", wrapText: true };
      if (row.number > 1) row.height = 26;
    });
  }
  for (const address of ["D1", "F1"]) quote.getCell(address).numFmt = "0%";
  for (const address of ["B2", "B3"]) params.getCell(address).numFmt = "0%";
  for (let r = 12; r <= 24; r++) params.getCell("A" + r).numFmt = "0%";
  for (let r = 12; r <= 14; r++) params.getCell("B" + r).numFmt = "0%";
  for (let r = 2; r <= avg; r++) cat.getCell("K" + r).numFmt = "0%";
  for (let r = tierRow + 1; r <= tierRow + data.pricingTiers.length; r++)
    for (const col of ["D", "E", "F"]) wholesale.getCell(col + r).numFmt = "0%";
  for (let r = 2; r <= 5; r++) summary.getCell("C" + r).numFmt = "0.00%";
  for (let r = 9; r <= 16; r++)
    for (const col of ["A", "B"]) summary.getCell(col + r).numFmt = "0.00%";
  quote.getCell("B1").dataValidation = {
    type: "list",
    allowBlank: false,
    formulae: ["ModelosActivos"],
  };
  for (let c = 15; c <= 15 + models.length; c++) cat.getColumn(c).hidden = true;
  return book;
}
export async function exportXlsx(data: DataSet) {
  const book = await createWorkbook(data);
  saveAs(
    new Blob([await book.xlsx.writeBuffer()], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    "cotizador-velas.xlsx",
  );
}
