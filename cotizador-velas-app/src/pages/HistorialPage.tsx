import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useQuotes } from "../hooks/useQuotes";
import { useClients } from "../hooks/useClients";
import { statuses, type Quote } from "../domain/types";
import { money, pct } from "../domain/formulas";
import { services } from "../services/container";
import { duplicateQuote } from "../services/quoteService";
import { Field, Table, Modal, Alert, useAction } from "../components/common/UI";
import { ClientPreview } from "../components/common/ClientPreviewModal";
export default function HistorialPage() {
  const [params] = useSearchParams(),
    [filter, setFilter] = useState({
      status: "",
      clientId: params.get("cliente") ?? "",
      folio: "",
    }),
    [draft, setDraft] = useState(filter),
    [selected, setSelected] = useState<Quote | null>(null),
    [clientView, setClientView] = useState<Quote | null>(null);
  const { data: clients = [] } = useClients(),
    q = useQuotes(filter),
    a = useAction(),
    cache = useQueryClient(),
    items = q.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">EL REGISTRO DE TUS PROPUESTAS</p>
          <h1>Cotizaciones con memoria.</h1>
          <p>
            Los costos y precios guardados se conservan aunque cambie tu
            catálogo.
          </p>
        </div>
      </div>
      <section className="panel">
        <form
          className="toolbar"
          onSubmit={(e) => {
            e.preventDefault();
            setFilter(draft);
          }}
        >
          <Field label="Folio exacto">
            <input
              placeholder="COT-2026-0001"
              value={draft.folio}
              onChange={(e) => setDraft({ ...draft, folio: e.target.value })}
            />
          </Field>
          <Field label="Estado">
            <select
              value={draft.status}
              onChange={(e) => setDraft({ ...draft, status: e.target.value })}
            >
              <option value="">Todos</option>
              {statuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Cliente">
            <select
              value={draft.clientId}
              onChange={(e) => setDraft({ ...draft, clientId: e.target.value })}
            >
              <option value="">Todos</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <button>Filtrar</button>
        </form>
        {a.feedback}
        {q.error && <Alert error>{q.error.message}</Alert>}
        <Table
          heads={[
            "Folio / fecha",
            "Cliente",
            "Modelo",
            "Total MXN",
            "Estado",
            "Acciones",
          ]}
        >
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                <b>{item.folio}</b>
                <small>
                  {new Date(item.createdAt).toLocaleDateString("es-MX")}
                </small>
              </td>
              <td>{item.clientSnapshot?.name || "Sin cliente"}</td>
              <td>
                {item.items
                  .map((i) => i.modelName + " · " + i.quantity + " pzas")
                  .join(", ")}
              </td>
              <td>{money(item.total)}</td>
              <td>
                <select
                  aria-label={"Estado " + item.folio}
                  disabled={a.busy}
                  value={item.status}
                  onChange={(e) =>
                    a.run(async () => {
                      await services.repos!.quotes.setStatus(
                        item.id,
                        e.target.value as Quote["status"],
                      );
                      await cache.invalidateQueries({ queryKey: ["quotes"] });
                    })
                  }
                >
                  {statuses.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </td>
              <td>
                <div className="actions">
                  <button
                    className="text-button"
                    onClick={() => setSelected(item)}
                  >
                    Inspeccionar
                  </button>
                  <button
                    className="text-button"
                    onClick={() => setClientView(item)}
                  >
                    Vista cliente
                  </button>
                  <button
                    className="text-button"
                    disabled={a.busy}
                    onClick={() =>
                      a.run(
                        async () =>
                          (await import("../services/pdfService")).downloadPdf(
                            item,
                          ),
                        "PDF descargado",
                      )
                    }
                  >
                    PDF
                  </button>
                  <button
                    className="text-button"
                    disabled={a.busy}
                    onClick={() =>
                      a.run(async () => {
                        const copy = duplicateQuote(item);
                        await services.repos!.quotes.create(copy);
                        await cache.invalidateQueries({ queryKey: ["quotes"] });
                      }, "Copia guardada con nuevo folio")
                    }
                  >
                    Duplicar
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </Table>
        {q.isPending ? (
          <p>Cargando historial…</p>
        ) : (
          !items.length && (
            <div className="empty">
              No hay cotizaciones con estos filtros. Guarda tu primera propuesta
              desde el cotizador.
            </div>
          )
        )}
        {q.hasNextPage && (
          <button
            className="secondary"
            disabled={q.isFetchingNextPage}
            onClick={() => q.fetchNextPage()}
          >
            Cargar siguientes 25
          </button>
        )}
      </section>
      {selected && (
        <Modal
          title={"Snapshot interno · " + selected.folio}
          onClose={() => setSelected(null)}
        >
          <Alert>
            Información interna. El PDF y la vista cliente sólo muestran tu
            propuesta comercial.
          </Alert>
          <p>
            Margen: {pct(selected.marginPct)} · Costo del pedido:{" "}
            {money(selected.productionCost)} · Utilidad:{" "}
            {money(selected.profit)}
          </p>
          <Table heads={["Insumo", "Cantidad / vela", "Costo / vela"]}>
            {selected.costBreakdownSnapshot.map((l) => (
              <tr key={l.materialId}>
                <td>{l.name}</td>
                <td>
                  {l.quantityPerCandle} {l.unit}
                </td>
                <td>{money(l.cost)}</td>
              </tr>
            ))}
          </Table>
          <p>
            Creada por {selected.createdByEmail || "prueba local"} ·{" "}
            {selected.createdAt}
          </p>
        </Modal>
      )}
      {clientView && (
        <ClientPreview quote={clientView} onClose={() => setClientView(null)} />
      )}
    </div>
  );
}
