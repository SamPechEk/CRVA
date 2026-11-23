// @vitest-environment jsdom
import { beforeEach, it, expect } from "vitest";
import { localRepositories } from "./local.adapter";
import { draftQuote } from "../../services/quoteService";
import { seedV4 } from "../../domain/seedV4";
import { calculateModel } from "../../domain/formulas";
beforeEach(() => localStorage.clear());
it("bloquea desactivación y conserva snapshots al cambiar una compra", async () => {
  const r = localRepositories();
  await r.backup.seed();
  await expect(r.materials.deactivate("INS-03")).rejects.toThrow("VEL-01");
  const q = await r.quotes.create(
    draftQuote(
      seedV4.models[0],
      seedV4.materials,
      seedV4.settings!,
      1,
      ".3",
      "0",
      null,
      "",
      "",
      "Menudeo",
    ),
  );
  await r.materials.save({ ...seedV4.materials[2], totalPrice: "198" });
  const saved = (await r.quotes.page()).items[0];
  expect(saved.total).toBe(q.total);
  expect(
    calculateModel(seedV4.models[0], await r.materials.list()).price.toFixed(2),
  ).not.toBe("32.23");
  await r.quotes.setStatus(q.id, "ENVIADA");
  expect((await r.quotes.page()).items[0].status).toBe("ENVIADA");
  await expect(r.backup.seed()).rejects.toThrow();
});
it("respalda y restaura todo el conjunto con Zod", async () => {
  const r = localRepositories();
  await r.backup.seed();
  const b = await r.backup.export();
  localStorage.clear();
  await r.backup.restore(b);
  expect((await r.materials.list()).length).toBe(18);
  expect((await r.models.list()).length).toBe(4);
  expect((await r.clients.list()).length).toBe(0);
  await expect(
    r.backup.restore({ ...b, version: 2 } as never),
  ).rejects.toThrow();
});

it("restaurar no permite alterar un snapshot existente", async () => {
  const r = localRepositories();
  await r.backup.seed();
  const q = await r.quotes.create(
    draftQuote(
      seedV4.models[0],
      seedV4.materials,
      seedV4.settings!,
      1,
      ".3",
      "0",
      null,
      "",
      "",
      "Menudeo",
    ),
  );
  const b = await r.backup.export();
  b.data.quotes[0].total = "1";
  await expect(r.backup.restore(b)).rejects.toThrow("inmutable");
  expect((await r.quotes.page()).items[0].total).toBe(q.total);
});
