import { useState } from "react";
import { saveAs } from "file-saver";
import { useQueryClient } from "@tanstack/react-query";
import { useCatalogData, useRefresh } from "../hooks/useCatalogData";
import { useWorkspace } from "../hooks/useWorkspace";
import { settingsSchema, backupSchema } from "../domain/validations";
import { D, pct } from "../domain/formulas";
import type { Backup } from "../domain/types";
import { services } from "../services/container";
import {
  Field,
  NumberInput,
  ImageUploader,
  Modal,
  Alert,
  useAction,
} from "../components/common/UI";
export default function ParametrosPage() {
  const { data } = useCatalogData(),
    refresh = useRefresh(),
    w = useWorkspace(),
    cache = useQueryClient(),
    [s, setS] = useState({ ...data!.settings! }),
    [restore, setRestore] = useState<Backup | null>(null),
    [confirmation, setConfirmation] = useState(""),
    a = useAction();
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">UN ESTUDIO A TU MEDIDA</p>
          <h1>Parámetros y respaldo.</h1>
          <p>Define tu identidad y mantén una copia de tu trabajo.</p>
        </div>
        <button
          disabled={a.busy}
          onClick={() =>
            a.run(async () => {
              await services.repos!.settings.save(settingsSchema.parse(s));
              w.setMargin(s.defaultMarginPct);
              w.setIva(s.defaultIvaPct);
              await refresh();
            })
          }
        >
          Guardar parámetros
        </button>
      </div>
      {a.feedback}
      <div className="split">
        <section className="panel">
          <h2>Identidad del negocio</h2>
          <Field label="Nombre comercial (opcional)">
            <input
              value={s.businessName}
              onChange={(e) => setS({ ...s, businessName: e.target.value })}
            />
          </Field>
          <ImageUploader
            value={s.businessLogoUrl}
            onChange={(businessLogoUrl, businessLogoPublicId) =>
              setS({ ...s, businessLogoUrl, businessLogoPublicId })
            }
          />
          {s.businessLogoUrl && (
            <button
              className="text-button"
              onClick={() =>
                setS({
                  ...s,
                  businessLogoUrl: null,
                  businessLogoPublicId: null,
                })
              }
            >
              Quitar logo
            </button>
          )}
          <Field label="Notas por defecto de la cotización">
            <textarea
              value={s.quoteDefaultNotes}
              onChange={(e) =>
                setS({ ...s, quoteDefaultNotes: e.target.value })
              }
            />
          </Field>
        </section>
        <section className="panel">
          <h2>Criterios de cálculo</h2>
          <div className="fields two">
            <Field label="Margen inicial">
              <select
                value={s.defaultMarginPct}
                onChange={(e) =>
                  setS({ ...s, defaultMarginPct: e.target.value })
                }
              >
                {Array.from({ length: 13 }, (_, i) =>
                  D(10 + i * 5)
                    .div(100)
                    .toString(),
                ).map((m) => (
                  <option key={m} value={m}>
                    {pct(m)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="IVA inicial">
              <select
                value={s.defaultIvaPct}
                onChange={(e) => setS({ ...s, defaultIvaPct: e.target.value })}
              >
                {["0", "0.08", "0.16"].map((v) => (
                  <option key={v} value={v}>
                    {pct(v)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Gotas por ml">
              <NumberInput
                min="0.0001"
                value={s.dropsPerMl}
                onChange={(e) => setS({ ...s, dropsPerMl: e.target.value })}
              />
            </Field>
            <Field label="Máx. gotas / 100 g de cera">
              <NumberInput
                value={s.maxDropsPer100gWax}
                onChange={(e) =>
                  setS({ ...s, maxDropsPer100gWax: e.target.value })
                }
              />
            </Field>
          </div>
          <div className="calculated">
            Margen bruto real: precio = costo ÷ (1 − margen).
            <p>
              Las cifras se calculan con precisión completa y se muestran con
              centavos.
            </p>
          </div>
        </section>
      </div>
      <section className="panel">
        <h2>Respalda y lleva tus datos</h2>
        <p>
          El respaldo contiene información interna. Guárdalo en un lugar
          privado.
        </p>
        <div className="backup-grid">
          <article>
            <h3>Respaldo completo JSON</h3>
            <p>Catálogo, parámetros, clientes y snapshots de cotizaciones.</p>
            <button
              className="secondary"
              disabled={a.busy}
              onClick={() =>
                a.run(async () => {
                  const b = await services.repos!.backup.export();
                  saveAs(
                    new Blob([JSON.stringify(b, null, 2)], {
                      type: "application/json",
                    }),
                    "respaldo-velas-" +
                      new Date().toISOString().slice(0, 10) +
                      ".json",
                  );
                }, "Respaldo descargado")
              }
            >
              Descargar respaldo
            </button>
          </article>
          <article>
            <h3>Restaurar un respaldo</h3>
            <p>Valida el archivo antes de confirmar los cambios.</p>
            <label className="button secondary">
              Seleccionar JSON
              <input
                type="file"
                className="sr-only"
                accept="application/json,.json"
                disabled={a.busy}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file)
                    void a.run(async () => {
                      if (file.size > 30 * 1024 * 1024)
                        throw Error("El respaldo excede 30 MB");
                      setRestore(
                        backupSchema.parse(JSON.parse(await file.text())),
                      );
                      setConfirmation("");
                    }, "Archivo validado; revisa y confirma la restauración");
                }}
              />
            </label>
          </article>
          <article>
            <h3>Libro Excel editable</h3>
            <p>Las 6 hojas originales, actualizadas y con fórmulas vivas.</p>
            <button
              className="secondary"
              disabled={a.busy}
              onClick={() =>
                a.run(async () => {
                  const { exportXlsx } =
                    await import("../services/xlsxService");
                  await exportXlsx(
                    (await services.repos!.backup.export()).data,
                  );
                }, "Excel descargado")
              }
            >
              Exportar libro Excel (.xlsx)
            </button>
          </article>
        </div>
      </section>
      <section className="panel">
        <h2>Datos iniciales v4</h2>
        <p>
          Carga segura e idempotente. Si ya hay datos, se conserva la
          información existente.
        </p>
        <button
          className="secondary"
          disabled={a.busy}
          onClick={() =>
            a.run(async () => {
              await services.repos!.backup.seed();
              await refresh();
            }, "Datos iniciales cargados")
          }
        >
          Cargar datos iniciales del Excel (v4)
        </button>
      </section>
      {restore && (
        <Modal title="Confirmar restauración" onClose={() => setRestore(null)}>
          <Alert>
            Se actualizarán los documentos del respaldo. Las cotizaciones
            existentes conservan su snapshot; cualquier conflicto detiene la
            restauración. Los documentos ausentes del archivo se conservan. En
            Firebase se procesa por lotes: mantén conexión y conserva un
            respaldo previo.
          </Alert>
          <p>
            {restore.data.materials.length} insumos ·{" "}
            {restore.data.models.length} modelos · {restore.data.clients.length}{" "}
            clientes · {restore.data.quotes.length} cotizaciones
          </p>
          <p>Fecha del respaldo: {restore.exportedAt}</p>
          <Field label="Escribe RESTAURAR para confirmar">
            <input
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
            />
          </Field>
          {a.feedback}
          <button
            disabled={confirmation !== "RESTAURAR" || a.busy}
            onClick={() =>
              a.run(async () => {
                await services.repos!.backup.restore(restore);
                await cache.invalidateQueries();
                await refresh();
                setRestore(null);
              }, "Respaldo restaurado")
            }
          >
            Confirmar restauración
          </button>
        </Modal>
      )}
    </div>
  );
}
