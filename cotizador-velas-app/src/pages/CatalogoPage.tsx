import { useState } from "react";
import { Plus, Flame, Copy } from "lucide-react";
import { useCatalogData, useRefresh } from "../hooks/useCatalogData";
import {
  calculateModel,
  batch,
  suggestedDose,
  D,
  money,
  sum,
  controlled,
} from "../domain/formulas";
import { modelSchema } from "../domain/validations";
import type { CandleModel, Material, Settings } from "../domain/types";
import { services } from "../services/container";
import {
  Field,
  NumberInput,
  Table,
  Modal,
  ImageUploader,
  Alert,
  useAction,
} from "../components/common/UI";
export default function CatalogoPage() {
  const { data } = useCatalogData(),
    refresh = useRefresh(),
    a = useAction();
  const [edit, setEdit] = useState<CandleModel | null>(null);
  const models = data!.models.filter((m) => m.isActive),
    s = data!.settings!;
  function create() {
    const id = crypto.randomUUID();
    setEdit({
      id,
      code: "",
      name: "",
      presentation: "",
      batchConfig: {
        candlesPerBatch: 1,
        meltPourMinutesBatch: "0",
        unmoldPackMinutesBatch: "0",
        curingHoursPassive: "24",
        energyKwhBatch: "0",
      },
      recipeItems: [],
      salesMixPct: "0",
      imageUrl: null,
      imagePublicId: null,
      isActive: true,
      isReferenceTemplate: false,
    });
  }
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">PIEZAS CON IDENTIDAD</p>
          <h1>Tu catálogo de velas.</h1>
          <p>Recetas, lotes y presentaciones en un solo lugar.</p>
        </div>
        <button onClick={create}>
          <Plus size={18} />
          Nuevo modelo
        </button>
      </div>
      {a.feedback}
      <div className="model-cards">
        {models.map((m) => {
          const c = calculateModel(
            m,
            data!.materials,
            s.defaultMarginPct,
            s.defaultIvaPct,
          );
          return (
            <article key={m.id} className="model-card">
              <div className="model-image">
                {m.imageUrl ? (
                  <img
                    src={services.media.getOptimizedUrl(m.imageUrl)}
                    alt={m.name}
                    loading="lazy"
                  />
                ) : (
                  <div className="candle-illustration">
                    <Flame size={48} />
                    <span />
                  </div>
                )}
                <span className="badge">{m.code}</span>
              </div>
              <div className="model-card-body">
                {m.isReferenceTemplate && (
                  <span className="badge reference">Referencia editable</span>
                )}
                <h2>{m.name.replace(m.code + " ", "")}</h2>
                <p>{m.presentation}</p>
                <div className="model-prices">
                  <span>
                    Costo <b>{money(c.cost)}</b>
                  </span>
                  <span>
                    Precio final <b>{money(c.final)}</b>
                  </span>
                </div>
                <div className="actions">
                  <button
                    className="secondary"
                    onClick={() => setEdit(structuredClone(m))}
                  >
                    Editar receta
                  </button>
                  <button
                    className="icon-button"
                    aria-label={"Duplicar " + m.name}
                    onClick={() => {
                      const id = crypto.randomUUID();
                      setEdit({
                        ...structuredClone(m),
                        id,
                        code: "",
                        name: m.name + " (copia)",
                        salesMixPct: "0",
                        recipeItems: m.recipeItems.map((r) => ({
                          ...r,
                          modelId: id,
                        })),
                      });
                    }}
                  >
                    <Copy size={18} />
                  </button>
                  <button
                    className="text-button danger"
                    disabled={a.busy}
                    onClick={() => {
                      if (
                        confirm(
                          "¿Desactivar " +
                            m.name +
                            "? Revisa después la mezcla de ventas.",
                        )
                      )
                        void a.run(async () => {
                          await services.repos!.models.deactivate(m.id);
                          await refresh();
                        });
                    }}
                  >
                    Desactivar
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <section className="panel">
        <h2>Comparativa del catálogo</h2>
        <Table
          heads={[
            "Modelo",
            "Cera (g)",
            "Directos",
            "Empaque",
            "Indirectos",
            "Costo",
            "Precio final",
          ]}
        >
          {models.map((m) => {
            const c = calculateModel(
              m,
              data!.materials,
              s.defaultMarginPct,
              s.defaultIvaPct,
            );
            return (
              <tr key={m.id}>
                <td>{m.name}</td>
                <td>{c.wax.toString()}</td>
                {Object.values(c.categories).map((v, i) => (
                  <td key={i}>{money(v)}</td>
                ))}
                <td>{money(c.cost)}</td>
                <td>{money(c.final)}</td>
              </tr>
            );
          })}
          {models.length > 0 && (
            <tr className="total-row">
              <td>Promedio</td>
              {[
                "wax",
                "Insumos directos",
                "Empaque",
                "Costos indirectos",
                "cost",
                "final",
              ].map((k) => (
                <td key={k}>
                  {k === "wax"
                    ? sum(
                        models.map(
                          (m) =>
                            calculateModel(
                              m,
                              data!.materials,
                              s.defaultMarginPct,
                              s.defaultIvaPct,
                            ).wax,
                        ),
                      )
                        .div(models.length)
                        .toFixed(2)
                    : money(
                        sum(
                          models.map((m) => {
                            const c = calculateModel(
                              m,
                              data!.materials,
                              s.defaultMarginPct,
                              s.defaultIvaPct,
                            );
                            return k === "cost"
                              ? c.cost
                              : k === "final"
                                ? c.final
                                : c.categories[k as keyof typeof c.categories];
                          }),
                        ).div(models.length),
                      )}
                </td>
              ))}
            </tr>
          )}
        </Table>
      </section>
      {edit && (
        <ModelEditor
          value={edit}
          materials={data!.materials.filter((m) => m.isActive)}
          settings={s}
          onClose={() => setEdit(null)}
          onSave={async (m) => {
            await services.repos!.models.save(m);
            await refresh();
            setEdit(null);
          }}
        />
      )}
    </div>
  );
}
function ModelEditor({
  value,
  materials,
  settings,
  onClose,
  onSave,
}: {
  value: CandleModel;
  materials: Material[];
  settings: Settings;
  onClose: () => void;
  onSave: (m: CandleModel) => Promise<void>;
}) {
  const [m, setM] = useState(value),
    [tab, setTab] = useState("Datos y foto"),
    a = useAction();
  const [essence, setEssence] = useState(
    materials.find(
      (x) =>
        x.unit === "ml" &&
        D(
          m.recipeItems.find((r) => r.materialId === x.id)?.quantityPerCandle ??
            0,
        ).gt(0),
    )?.id ??
      materials.find((x) => x.unit === "ml")?.id ??
      "",
  );
  const set = (key: keyof CandleModel, v: unknown) => setM({ ...m, [key]: v });
  const setQuantity = (id: string, q: string) =>
    setM({
      ...m,
      recipeItems: [
        ...m.recipeItems.filter((i) => i.materialId !== id),
        { modelId: m.id, materialId: id, quantityPerCandle: q },
      ],
    });
  let c;
  try {
    c = calculateModel(
      m,
      materials,
      settings.defaultMarginPct,
      settings.defaultIvaPct,
    );
  } catch {
    c = null;
  }
  return (
    <Modal
      title={value.name ? "Editar modelo" : "Nuevo modelo"}
      onClose={onClose}
    >
      <div className="tabs" role="tablist">
        {["Datos y foto", "Receta", "Calculadora de lote"].map((t) => (
          <button
            type="button"
            role="tab"
            aria-selected={tab === t}
            key={t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void a.run(() =>
            onSave(
              modelSchema.parse({
                ...m,
                recipeItems: m.recipeItems.map((r) => ({
                  ...r,
                  quantityPerCandle: controlled(r.quantityPerCandle),
                })),
              }),
            ),
          );
        }}
      >
        {tab === "Datos y foto" && (
          <>
            <div className="fields two">
              <Field label="Código">
                <input
                  required
                  value={m.code}
                  onChange={(e) => set("code", e.target.value)}
                />
              </Field>
              <Field label="Nombre">
                <input
                  required
                  value={m.name}
                  onChange={(e) => set("name", e.target.value)}
                />
              </Field>
            </div>
            <Field label="Presentación">
              <input
                value={m.presentation}
                onChange={(e) => set("presentation", e.target.value)}
              />
            </Field>
            <ImageUploader
              value={m.imageUrl}
              onChange={(imageUrl, imagePublicId) =>
                setM({ ...m, imageUrl, imagePublicId })
              }
            />
            {m.imageUrl && (
              <button
                type="button"
                className="text-button"
                onClick={() =>
                  setM({ ...m, imageUrl: null, imagePublicId: null })
                }
              >
                Quitar foto
              </button>
            )}
            <label className="checkbox">
              <input
                type="checkbox"
                checked={m.isReferenceTemplate}
                onChange={(e) => set("isReferenceTemplate", e.target.checked)}
              />
              Referencia editable
            </label>
          </>
        )}
        {tab === "Receta" && (
          <>
            <div className="calculated">
              <b>Asistente de esencia</b>
              <p>
                {c?.wax.toString() ?? "0"} g de cera →{" "}
                {c
                  ? suggestedDose(
                      c.wax,
                      settings.maxDropsPer100gWax,
                      settings.dropsPerMl,
                    ).ml.toString()
                  : "0"}{" "}
                ml ·{" "}
                {c
                  ? suggestedDose(
                      c.wax,
                      settings.maxDropsPer100gWax,
                      settings.dropsPerMl,
                    ).drops.toString()
                  : "0"}{" "}
                gotas
              </p>
              <div className="actions">
                <select
                  aria-label="Esencia para dosis sugerida"
                  value={essence}
                  onChange={(e) => setEssence(e.target.value)}
                >
                  <option value="">Selecciona esencia</option>
                  {materials
                    .filter((m) => m.unit === "ml")
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  className="secondary"
                  disabled={!c || !essence}
                  onClick={() =>
                    setQuantity(
                      essence,
                      controlled(
                        suggestedDose(
                          c!.wax,
                          settings.maxDropsPer100gWax,
                          settings.dropsPerMl,
                        ).ml,
                      ),
                    )
                  }
                >
                  Aplicar dosis sugerida según cera
                </button>
              </div>
            </div>
            <Table heads={["Insumo", "Cantidad / vela", "Unidad", "Costo"]}>
              {materials.map((mat) => {
                const line = c?.lines.find((l) => l.materialId === mat.id);
                return (
                  <tr key={mat.id}>
                    <td>
                      {mat.name}
                      {mat.systemRole !== "NONE" && (
                        <small>Automático desde el lote</small>
                      )}
                    </td>
                    <td>
                      {mat.systemRole === "NONE" ? (
                        <NumberInput
                          aria-label={"Cantidad de " + mat.name}
                          value={
                            m.recipeItems.find((i) => i.materialId === mat.id)
                              ?.quantityPerCandle ?? "0"
                          }
                          onChange={(e) => setQuantity(mat.id, e.target.value)}
                        />
                      ) : (
                        D(line?.quantityPerCandle ?? 0)
                          .toDecimalPlaces(6)
                          .toString()
                      )}
                    </td>
                    <td>{mat.unit}</td>
                    <td>{money(line?.cost ?? 0)}</td>
                  </tr>
                );
              })}
            </Table>
          </>
        )}
        {tab === "Calculadora de lote" && (
          <>
            <Alert>
              El reposo y curado es pasivo: 24 horas = $0 cobrables.
            </Alert>
            <div className="fields two">
              {[
                ["candlesPerBatch", "Velas por lote"],
                ["meltPourMinutesBatch", "Minutos de derretido y vaciado"],
                ["unmoldPackMinutesBatch", "Minutos de desmolde y empaque"],
                ["energyKwhBatch", "Consumo del lote (kWh)"],
              ].map(([key, label]) => (
                <Field key={key} label={label}>
                  <NumberInput
                    required
                    min={key === "candlesPerBatch" ? "1" : "0"}
                    step={key === "candlesPerBatch" ? "1" : "any"}
                    value={String(
                      m.batchConfig[key as keyof typeof m.batchConfig],
                    )}
                    onChange={(e) =>
                      set("batchConfig", {
                        ...m.batchConfig,
                        [key]:
                          key === "candlesPerBatch"
                            ? Number(e.target.value)
                            : e.target.value,
                      })
                    }
                  />
                </Field>
              ))}
            </div>
            {c && (
              <div className="calculated">
                <p>
                  Trabajo activo:{" "}
                  {batch(m).minutes.toDecimalPlaces(6).toString()} min / vela
                </p>
                <p>
                  Energía: {batch(m).energy.toDecimalPlaces(6).toString()} kWh /
                  vela
                </p>
                <p>Reposo: {m.batchConfig.curingHoursPassive} h · $0.00</p>
              </div>
            )}
          </>
        )}
        {c && (
          <div className="editor-total">
            Costo por vela <b>{money(c.cost)}</b>
          </div>
        )}
        {a.feedback}
        <div className="actions">
          <button disabled={a.busy}>Guardar modelo</button>
          <button type="button" className="secondary" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  );
}
