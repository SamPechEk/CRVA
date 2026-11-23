import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  startAfter,
  where,
  runTransaction,
  writeBatch,
  type Firestore,
  type DocumentData,
  type QueryConstraint,
} from "firebase/firestore";
import type { Repositories, IRepository } from "../../ports/repositories.port";
import type {
  Quote,
  QuoteStatus,
  Settings,
  PricingTier,
  Material,
  CandleModel,
} from "../../domain/types";
import {
  materialSchema,
  modelSchema,
  tierSchema,
  settingsSchema,
  clientSchema,
  fixedSchema,
  quoteSchema,
  validateTiers,
  validateMix,
} from "../../domain/validations";
import { D } from "../../domain/formulas";
import { firestoreBackup } from "./firestoreBackup.adapter";
export function firestoreRepositories(db: Firestore): Repositories {
  const generic = <T extends { id: string }>(
    name: string,
    parse: (v: T) => T,
  ): IRepository<T> => ({
    async list() {
      return (await getDocs(collection(db, name))).docs.map(
        (d) => d.data() as T,
      );
    },
    async save(v) {
      await setDoc(doc(db, name, v.id), parse(v) as DocumentData);
    },
  });
  const materials = generic<Material>("materials", (v) =>
      materialSchema.parse(v),
    ),
    models = generic<CandleModel>("models", (v) => modelSchema.parse(v)),
    pricing = generic<PricingTier>("pricingTiers", (v) => tierSchema.parse(v));
  const settings = {
    async get() {
      const d = await getDoc(doc(db, "settings", "global"));
      return d.exists() ? (d.data() as Settings) : null;
    },
    async save(s: Settings) {
      settingsSchema.parse(s);
      validateTiers(await pricing.list(), s.defaultMarginPct);
      await setDoc(doc(db, "settings", "global"), s);
    },
  };
  const repos: Repositories = {
    settings,
    materials: {
      ...materials,
      async save(m) {
        materialSchema.parse(m);
        if (!m.isActive) {
          await this.deactivate(m.id);
          return;
        }
        if (m.systemRole !== "NONE") {
          const all = await materials.list();
          if (
            all.some(
              (x) =>
                x.id !== m.id && x.isActive && x.systemRole === m.systemRole,
            )
          )
            throw Error("Ya existe un insumo con ese rol");
        }
        await materials.save(m);
      },
      async deactivate(id) {
        const used = (await models.list()).filter(
          (m) =>
            m.isActive &&
            m.recipeItems.some(
              (i) => i.materialId === id && D(i.quantityPerCandle).gt(0),
            ),
        );
        const mat = (await materials.list()).find((m) => m.id === id);
        if (
          mat?.systemRole !== "NONE" &&
          (await models.list()).some((m) => m.isActive)
        )
          throw Error(
            "El insumo de sistema se usa automáticamente en todos los modelos activos",
          );
        if (used.length)
          throw Error("Se usa en: " + used.map((m) => m.name).join(", "));
        if (mat) await materials.save({ ...mat, isActive: false });
      },
    },
    models: {
      ...models,
      async save(m) {
        modelSchema.parse(m);
        const mats = await materials.list();
        for (const r of m.recipeItems)
          if (
            D(r.quantityPerCandle).gt(0) &&
            !mats.some((x) => x.id === r.materialId && x.isActive)
          )
            throw Error("La receta contiene un insumo inactivo");
        await models.save(m);
      },
      async deactivate(id) {
        const m = (await models.list()).find((m) => m.id === id);
        if (m) await models.save({ ...m, isActive: false });
      },
      async saveMix(values) {
        validateMix(values);
        const batch = writeBatch(db);
        values.forEach((v) =>
          batch.set(doc(db, "models", v.id), modelSchema.parse(v)),
        );
        await batch.commit();
      },
    },
    pricing: {
      ...pricing,
      async saveAll(values, s) {
        validateTiers(values, s.defaultMarginPct);
        const b = writeBatch(db);
        b.set(doc(db, "settings", "global"), settingsSchema.parse(s));
        values.forEach((v) =>
          b.set(doc(db, "pricingTiers", v.id), tierSchema.parse(v)),
        );
        await b.commit();
      },
    },
    fixedCosts: generic("fixedCosts", (v) => fixedSchema.parse(v)),
    clients: {
      ...generic("clients", (v) => clientSchema.parse(v)),
      async remove(id) {
        await deleteDoc(doc(db, "clients", id));
      },
    },
    quotes: {
      async page(cursor, filter) {
        const constraints: QueryConstraint[] = [];
        if (filter?.status)
          constraints.push(where("status", "==", filter.status));
        if (filter?.clientId)
          constraints.push(where("clientId", "==", filter.clientId));
        if (filter?.folio) constraints.push(where("folio", "==", filter.folio));
        constraints.push(orderBy("createdAt", "desc"), orderBy("id", "desc"));
        if (cursor) {
          const c = JSON.parse(cursor) as [string, string];
          constraints.push(startAfter(...c));
        }
        constraints.push(limit(25));
        const docs = (
          await getDocs(query(collection(db, "quotes"), ...constraints))
        ).docs;
        const items = docs.map((d) => d.data() as Quote);
        return {
          items,
          nextCursor:
            items.length === 25
              ? JSON.stringify([items.at(-1)!.createdAt, items.at(-1)!.id])
              : undefined,
        };
      },
      async create(input) {
        if (!navigator.onLine)
          throw Error(
            "Conéctate para asignar un folio y guardar la cotización",
          );
        return runTransaction(db, async (tx) => {
          const ref = doc(db, "counters", "quotes"),
            c = await tx.get(ref),
            existing = await tx.get(doc(db, "quotes", input.id));
          if (existing.exists()) return existing.data() as Quote;
          const year = new Date().getUTCFullYear(),
            prior = c.data(),
            seq = prior?.year === year ? Number(prior.seq) + 1 : 1;
          const now = new Date().toISOString();
          const quote = quoteSchema.parse({
            ...input,
            folio: "COT-" + year + "-" + String(seq).padStart(4, "0"),
            createdAt: now,
            updatedAt: now,
          });
          tx.set(ref, { year, seq, lastQuoteId: quote.id });
          tx.set(doc(db, "quotes", quote.id), quote);
          return quote;
        });
      },
      async setStatus(id, status: QuoteStatus) {
        await runTransaction(db, async (tx) => {
          const ref = doc(db, "quotes", id),
            current = await tx.get(ref);
          if (!current.exists()) throw Error("Cotización no encontrada");
          tx.update(ref, { status, updatedAt: new Date().toISOString() });
        });
      },
    },
    backup: null!,
  };
  repos.backup = firestoreBackup(db);
  return repos;
}
