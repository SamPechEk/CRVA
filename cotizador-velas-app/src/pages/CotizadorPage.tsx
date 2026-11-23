import { useMemo, useState } from "react";
import { Eye, Download, Save, Flame, MessageCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useCatalogData } from "../hooks/useCatalogData";
import { useClients } from "../hooks/useClients";
import { useWorkspace } from "../hooks/useWorkspace";
import {
  calculateModel,
  D,
  money,
  pct,
  effectiveTiers,
} from "../domain/formulas";
import { draftQuote } from "../services/quoteService";
import { whatsappUrl } from "../services/whatsappService";
import { services } from "../services/container";
import { ClientPreview } from "../components/common/ClientPreviewModal";
import {
  Field,
  NumberInput,
  Kpi,
  Table,
  Alert,
  Empty,
  useAction,
} from "../components/common/UI";
import type { Quote } from "../domain/types";
export default function CotizadorPage() {
  const { data } = useCatalogData(),
    { data: clients = [] } = useClients(),
    w = useWorkspace(),
    a = useAction(),
    cache = useQueryClient();
  const [quantity, setQuantity] = useState(1),
    [clientId, setClientId] = useState(""),
    [notes, setNotes] = useState(data?.settings?.quoteDefaultNotes ?? ""),
    [hide, setHide] = useState(true),
    [preview, setPreview] = useState(false),
    [saved, setSaved] = useState<{ signature: string; quote: Quote } | null>(
      null,
    );
  const models = data!.models.filter((m) => m.isActive),
    model = models.find((m) => m.id === w.modelId) ?? models[0];
  const valid = Number.isInteger(quantity) && quantity > 0;
  const q = useMemo(
    () =>
      model
        ? calculateModel(
            model,
            data!.materials,
            w.margin,
            w.iva,
            valid ? quantity : 1,
          )
        : null,
    [model, data, w.margin, w.iva, quantity, valid],
  );
  const draft = useMemo(
    () =>
      model
        ? draftQuote(
            model,
            data!.materials,
            data!.settings!,
            valid ? quantity : 1,
            w.margin,
            w.iva,
            clients.find((c) => c.id === clientId) ?? null,
            notes,
            "",
            effectiveTiers(
              data!.pricingTiers,
              data!.settings!.defaultMarginPct,
            ).find((t) => D(t.marginPct).eq(w.margin))?.name ?? "Personalizada",
          )
        : null,
    [model, data, quantity, valid, w.margin, w.iva, clientId, notes, clients],
  );
  if (!model || !q || !draft)
    return <Empty title="Agrega un modelo para cotizar" />;
  const signature = JSON.stringify({
      ...draft,
      id: "",
      createdAt: "",
      updatedAt: "",
      items: draft.items.map((i) => ({ ...i, id: "", quoteId: "" })),
    }),
    quote = saved?.signature === signature ? saved.quote : draft;
  const tier = effectiveTiers(
    data!.pricingTiers,
    data!.settings!.defaultMarginPct,
  ).find(
    (t) => quantity >= t.minQty && (t.maxQty === null || quantity <= t.maxQty),
  );
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">DE TU TALLER A TUS CLIENTES</p>
          <h1>Cada vela, bien cotizada.</h1>
          <p>Conoce lo que inviertes y el valor de tu trabajo.</p>
        </div>
        <button
          className="secondary"
          onClick={() => setPreview(true)}
          disabled={!valid}
        >
          <Eye size={17} />
          Vista cliente
        </button>
      </div>
      <div className="quote-grid">
        <section className="panel configuration">
          <div className="section-heading">
            <h2>Prepara tu cotización</h2>
            <span className="badge">Editable</span>
          </div>
          <Field label="Modelo de vela">
            <select
              value={model.id}
              onChange={(e) => w.setModelId(e.target.value)}
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="model-caption">
            <div className="model-art">
              {model.imageUrl ? (
                <img
                  src={services.media.getOptimizedUrl(model.imageUrl)}
                  alt={model.name}
                />
              ) : (
                <Flame size={35} />
              )}
            </div>
            <div>
              <b>{model.code}</b>
              <small>{model.presentation}</small>
              {model.isReferenceTemplate && (
                <span className="badge">Referencia editable</span>
              )}
            </div>
          </div>
          <div className="fields two">
            <Field label="Margen bruto">
              <select
                value={w.margin}
                onChange={(e) => w.setMargin(e.target.value)}
              >
                {Array.from({ length: 13 }, (_, i) =>
                  D(10 + i * 5)
                    .div(100)
                    .toString(),
                )
                  .concat(["0.25", "0.2", "0.15"])
                  .filter((v, i, ar) => ar.indexOf(v) === i)
                  .map((v) => (
                    <option key={v} value={v}>
                      {pct(v)}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="IVA">
              <select value={w.iva} onChange={(e) => w.setIva(e.target.value)}>
                {["0", "0.08", "0.16"].map((v) => (
                  <option key={v} value={v}>
                    {pct(v)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Cantidad del pedido">
              <NumberInput
                step="1"
                min="1"
                value={Number.isNaN(quantity) ? "" : quantity}
                onChange={(e) => setQuantity(e.target.valueAsNumber)}
              />
            </Field>
            <Field label="Cliente (opcional)">
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              >
                <option value="">Sin cliente asignado</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {!valid && (
            <Alert error>La cantidad debe ser un entero mayor a cero.</Alert>
          )}
          {tier && !D(tier.marginPct).eq(w.margin) && valid && (
            <Alert>
              Este pedido corresponde a {tier.name} ({pct(tier.marginPct)}).
              <button
                className="text-button"
                onClick={() => w.setMargin(tier.marginPct)}
              >
                Aplicar tarifa {tier.name}
              </button>
            </Alert>
          )}
          <Field label="Notas para el cliente">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalles de tu propuesta…"
            />
          </Field>
        </section>
        <div className="quote-results">
          <article className="hero-price">
            <div>
              <span>PRECIO FINAL POR VELA</span>
              <strong>
                {money(q.final)} <small>MXN</small>
              </strong>
              <p>
                {money(q.price)} sin IVA · {pct(w.iva)} de IVA
              </p>
            </div>
            <div className="price-divider" />
            <div className="order-total">
              <span>TOTAL DEL PEDIDO · {valid ? quantity : "—"} PZAS</span>
              <b>{money(q.total)}</b>
            </div>
            <Flame className="hero-flame" size={160} />
          </article>
          <div className="kpi-grid">
            <Kpi
              label="Costo por vela"
              value={money(q.cost)}
              detail="Materiales + empaque + trabajo"
            />
            <Kpi
              label="Utilidad por vela"
              value={money(q.profit)}
              detail={"Margen bruto de " + pct(w.margin)}
            />
            <Kpi label="Precio sin IVA" value={money(q.price)} />
            <Kpi label="IVA por vela" value={money(q.tax)} />
            <Kpi label="Inversión del pedido" value={money(q.orderCost)} />
            <Kpi label="Utilidad del pedido" value={money(q.orderProfit)} />
            <Kpi label="Subtotal del pedido" value={money(q.subtotal)} />
            <Kpi label="IVA del pedido" value={money(q.iva)} />
            <Kpi label="Recargo sobre costo" value={pct(q.markup)} />
            <Kpi
              label="Insumos activos"
              value={q.activeCount}
              detail={"Desembolso inicial " + money(q.initialInvestment)}
            />
          </div>
        </div>
      </div>
      {a.feedback}
      <div className="action-bar">
        <span>
          <b>{quote.folio}</b>
          <small>
            {quote.folio === "SIN GUARDAR"
              ? "Guarda para asignar un folio"
              : "Snapshot guardado en historial"}
          </small>
        </span>
        <div className="actions">
          <button
            className="secondary"
            disabled={!valid || a.busy}
            onClick={() =>
              a.run(
                async () =>
                  (await import("../services/pdfService")).downloadPdf(quote),
                "PDF descargado",
              )
            }
          >
            <Download size={17} />
            PDF
          </button>
          <a
            className={"button secondary " + (!valid ? "disabled" : "")}
            aria-disabled={!valid}
            href={valid ? whatsappUrl(quote) : undefined}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle size={17} />
            WhatsApp
          </a>
          <button
            disabled={!valid || a.busy || quote.folio !== "SIN GUARDAR"}
            onClick={() =>
              a.run(async () => {
                const auth = services.demo
                  ? ""
                  : await new Promise<string>((resolve) => {
                      let done = false;
                      const stop = services.auth!.observe((u) => {
                        if (u && !done) {
                          done = true;
                          resolve(u.email);
                          queueMicrotask(() => stop());
                        }
                      });
                    });
                const result = await services.repos!.quotes.create({
                  ...draft,
                  createdByEmail: auth,
                });
                setSaved({ signature, quote: result });
                await cache.invalidateQueries({ queryKey: ["quotes"] });
              }, "Cotización guardada")
            }
          >
            <Save size={17} />
            {a.busy ? "Guardando…" : "Guardar cotización"}
          </button>
        </div>
      </div>
      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Lo que lleva tu vela</h2>
            <p>Desglose interno · no se comparte con el cliente</p>
          </div>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={hide}
              onChange={(e) => setHide(e.target.checked)}
            />
            Ocultar insumos en 0
          </label>
        </div>
        <Table
          heads={[
            "Insumo",
            "Categoría",
            "Unidad",
            "Compra",
            "Precio paquete",
            "Por vela",
            "Unitario",
            "Costo por vela",
            "Utilidad por vela",
          ]}
        >
          {q.lines
            .filter((l) => !hide || D(l.quantityPerCandle).gt(0))
            .map((l) => (
              <tr
                key={l.materialId}
                className={D(l.quantityPerCandle).eq(0) ? "muted-row" : ""}
              >
                <td>{l.name}</td>
                <td>
                  <span className="category">{l.category}</span>
                </td>
                <td>{l.unit}</td>
                <td>{l.quantityPurchased}</td>
                <td>{money(l.totalPrice)}</td>
                <td>{D(l.quantityPerCandle).toDecimalPlaces(6).toString()}</td>
                <td>${D(l.unitCost).toFixed(4)}</td>
                <td>
                  <span
                    className={
                      "cost-level " +
                      (D(l.cost).gte(5)
                        ? "high"
                        : D(l.cost).gte(1)
                          ? "medium"
                          : "low")
                    }
                  >
                    {money(l.cost)}
                  </span>
                </td>
                <td>{money(l.profit)}</td>
              </tr>
            ))}
          <tr className="total-row">
            <td>TOTAL POR VELA</td>
            <td colSpan={5}>{q.activeCount} insumos activos</td>
            <td />
            <td>{money(q.cost)}</td>
            <td>{money(q.profit)}</td>
          </tr>
        </Table>
      </section>
      {preview && (
        <ClientPreview quote={quote} onClose={() => setPreview(false)} />
      )}
    </div>
  );
}
