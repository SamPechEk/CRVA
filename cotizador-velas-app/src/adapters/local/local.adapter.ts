import { assertCompatibleSnapshots } from "../../domain/snapshots";
import type { Repositories } from "../../ports/repositories.port";
import type {
  DataSet,
  Quote,
  Material,
  CandleModel,
  Client,
  FixedCost,
  PricingTier,
} from "../../domain/types";
import { emptyData, seedV4 } from "../../domain/seedV4";
import {
  backupSchema,
  dataSchema,
  validateData,
  validateMix,
  validateTiers,
  materialSchema,
  modelSchema,
  clientSchema,
  fixedSchema,
} from "../../domain/validations";
import { D } from "../../domain/formulas";
const key = "cotizador-velas-demo-v1";
const read = (): DataSet => {
  const raw = localStorage.getItem(key);
  return raw ? dataSchema.parse(JSON.parse(raw)) : structuredClone(emptyData);
};
const write = (v: DataSet) => {
  validateData(v);
  localStorage.setItem(key, JSON.stringify(v));
};
export function localRepositories(): Repositories {
  const generic = <T extends { id: string }>(
    name: "materials" | "models" | "clients" | "fixedCosts" | "pricingTiers",
    parse: (v: T) => unknown,
  ) => ({
    async list() {
      return read()[name] as unknown as T[];
    },
    async save(v: T) {
      parse(v);
      const data = read(),
        rows = data[name] as unknown as T[];
      const i = rows.findIndex((x) => x.id === v.id);
      if (i < 0) rows.push(v);
      else rows[i] = v;
      write(data);
    },
  });
  const materials = generic<Material>("materials", (v) =>
      materialSchema.parse(v),
    ),
    models = generic<CandleModel>("models", (v) => modelSchema.parse(v));
  return {
    settings: {
      async get() {
        return read().settings;
      },
      async save(v) {
        const d = read();
        d.settings = v;
        write(dataSchema.parse(d));
      },
    },
    materials: {
      ...materials,
      async deactivate(id) {
        const d = read(),
          m = d.materials.find((m) => m.id === id)!;
        const used = d.models.filter(
          (v) =>
            v.isActive &&
            (m.systemRole !== "NONE" ||
              v.recipeItems.some(
                (i) => i.materialId === id && D(i.quantityPerCandle).gt(0),
              )),
        );
        if (used.length)
          throw Error("Se usa en: " + used.map((m) => m.name).join(", "));
        await materials.save({ ...m, isActive: false });
      },
    },
    models: {
      ...models,
      async deactivate(id) {
        await models.save({
          ...read().models.find((x) => x.id === id)!,
          isActive: false,
        });
      },
      async saveMix(ms) {
        validateMix(ms);
        const d = read();
        d.models = ms;
        write(d);
      },
    },
    pricing: {
      ...generic<PricingTier>("pricingTiers", () => {}),
      async saveAll(ts, s) {
        validateTiers(ts, s.defaultMarginPct);
        const d = read();
        d.pricingTiers = ts;
        d.settings = s;
        write(d);
      },
    },
    fixedCosts: generic<FixedCost>("fixedCosts", (v) => fixedSchema.parse(v)),
    clients: {
      ...generic<Client>("clients", (v) => clientSchema.parse(v)),
      async remove(id) {
        const d = read();
        d.clients = d.clients.filter((c) => c.id !== id);
        write(d);
      },
    },
    quotes: {
      async page(cursor, filter) {
        let rows = read().quotes.sort(
          (a, b) =>
            b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id),
        );
        if (filter?.status)
          rows = rows.filter((q) => q.status === filter.status);
        if (filter?.clientId)
          rows = rows.filter((q) => q.clientId === filter.clientId);
        if (filter?.folio) rows = rows.filter((q) => q.folio === filter.folio);
        const start = Number(cursor ?? 0);
        return {
          items: rows.slice(start, start + 25),
          nextCursor: rows.length > start + 25 ? String(start + 25) : undefined,
        };
      },
      async create(q: Quote) {
        const d = read();
        const year = new Date().getUTCFullYear(),
          seq = d.counter.year === year ? d.counter.seq + 1 : 1;
        d.counter = { year, seq };
        const value = {
          ...q,
          folio: "DEMO-" + year + "-" + String(seq).padStart(4, "0"),
        };
        d.quotes.push(value);
        write(dataSchema.parse(d));
        return value;
      },
      async setStatus(id, status) {
        const d = read(),
          q = d.quotes.find((q) => q.id === id);
        if (q) {
          q.status = status;
          q.updatedAt = new Date().toISOString();
          write(d);
        }
      },
    },
    backup: {
      async export() {
        return {
          version: 1,
          exportedAt: new Date().toISOString(),
          data: read(),
        };
      },
      async restore(b) {
        const incoming = backupSchema.parse(b).data,
          current = read();
        assertCompatibleSnapshots(current.quotes, incoming.quotes);
        const merge = <T extends { id: string }>(a: T[], b: T[]) => [
          ...new Map([...a, ...b].map((v) => [v.id, v])).values(),
        ];
        const data: DataSet = {
          settings: incoming.settings ?? current.settings,
          materials: merge(current.materials, incoming.materials),
          models: merge(current.models, incoming.models),
          pricingTiers: merge(current.pricingTiers, incoming.pricingTiers),
          fixedCosts: merge(current.fixedCosts, incoming.fixedCosts),
          clients: merge(current.clients, incoming.clients),
          quotes: merge(incoming.quotes, current.quotes),
          counter:
            incoming.counter.year > current.counter.year ||
            (incoming.counter.year === current.counter.year &&
              incoming.counter.seq > current.counter.seq)
              ? incoming.counter
              : current.counter,
        };
        write(data);
      },
      async seed() {
        const d = read();
        if (d.settings || d.materials.length || d.models.length)
          throw Error(
            "La semilla ya fue cargada; no se sobrescribió información",
          );
        write(structuredClone(seedV4));
      },
    },
  };
}
