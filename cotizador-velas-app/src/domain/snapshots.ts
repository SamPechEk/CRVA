import type { Quote } from "./types";
const canonical = (v: unknown): unknown =>
  Array.isArray(v)
    ? v.map(canonical)
    : v && typeof v === "object"
      ? Object.fromEntries(
          Object.entries(v)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, val]) => [k, canonical(val)]),
        )
      : v;
const stable = (q: Quote) =>
  JSON.stringify(
    canonical(
      Object.fromEntries(
        Object.entries(q).filter(([k]) => !["status", "updatedAt"].includes(k)),
      ),
    ),
  );
export function assertCompatibleSnapshots(current: Quote[], incoming: Quote[]) {
  for (const q of incoming) {
    const old = current.find((x) => x.id === q.id);
    if (old && stable(old) !== stable(q))
      throw Error("Conflicto con cotización inmutable: " + q.folio);
    if (current.some((x) => x.folio === q.folio && x.id !== q.id))
      throw Error("El folio ya pertenece a otra cotización: " + q.folio);
  }
}
