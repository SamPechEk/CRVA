import { assertCompatibleSnapshots } from "../../domain/snapshots";
import {
  collection,
  getDocs,
  doc,
  runTransaction,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import type { IBackupRepo } from "../../ports/repositories.port";
import type { DataSet, Backup } from "../../domain/types";
import { backupSchema } from "../../domain/validations";
import { emptyData, seedV4 } from "../../domain/seedV4";
export function firestoreBackup(db: Firestore): IBackupRepo {
  const names = [
    "materials",
    "models",
    "pricingTiers",
    "fixedCosts",
    "clients",
    "quotes",
  ] as const;
  async function read(): Promise<DataSet> {
    const data = structuredClone(emptyData);
    await Promise.all(
      names.map(async (n) => {
        (data[n] as unknown[]) = (await getDocs(collection(db, n))).docs.map(
          (d) => d.data(),
        );
      }),
    );
    const { getDoc } = await import("firebase/firestore");
    const s = await getDoc(doc(db, "settings", "global")),
      c = await getDoc(doc(db, "counters", "quotes"));
    data.settings = s.exists() ? (s.data() as DataSet["settings"]) : null;
    data.counter = c.exists()
      ? { year: c.data().year, seq: c.data().seq }
      : data.counter;
    return data;
  }
  return {
    async export() {
      return {
        version: 1,
        exportedAt: new Date().toISOString(),
        data: await read(),
      };
    },
    async restore(input: Backup) {
      const backup = backupSchema.parse(input);
      const current = await read();
      assertCompatibleSnapshots(current.quotes, backup.data.quotes);
      const entries = names.flatMap((n) =>
        backup.data[n]
          .filter(
            (v) => n !== "quotes" || !current.quotes.some((q) => q.id === v.id),
          )
          .map((v) => ({ path: String(n), id: v.id, value: v as object })),
      );
      if (backup.data.settings)
        entries.unshift({
          path: "settings",
          id: "global",
          value: backup.data.settings,
        });
      await runTransaction(db, async (tx) => {
        const ref = doc(db, "counters", "quotes"),
          old = await tx.get(ref),
          a = old.data(),
          b = backup.data.counter;
        if (!a || b.year > a.year || (b.year === a.year && b.seq > a.seq))
          tx.set(ref, b);
      });
      for (let start = 0; start < entries.length; start += 400) {
        const batch = writeBatch(db);
        entries
          .slice(start, start + 400)
          .forEach((e) => batch.set(doc(db, e.path, e.id), e.value));
        await batch.commit();
      }
    },
    async seed() {
      const data = await read();
      if (data.settings || names.some((n) => data[n].length))
        throw Error(
          "Los datos iniciales ya existen. No se sobrescribió información.",
        );
      await runTransaction(db, async (tx) => {
        const ref = doc(db, "settings", "global");
        if ((await tx.get(ref)).exists())
          throw Error("Los datos ya fueron inicializados");
        tx.set(ref, seedV4.settings!);
        for (const n of names)
          for (const v of seedV4[n]) tx.set(doc(db, n, v.id), v);
        tx.set(doc(db, "counters", "quotes"), seedV4.counter);
      });
    },
  };
}
