import { useState } from "react";
import { Plus } from "lucide-react";
import { useCatalogData, useRefresh } from "../hooks/useCatalogData";
import {
  D,
  sum,
  money,
  pct,
  calculateModel,
  pricing,
  breakEven,
  mixture,
  effectiveTiers,
  discount,
  controlled,
} from "../domain/formulas";
import { validateTiers, validateMix } from "../domain/validations";
import { services } from "../services/container";
import {
  Field,
  NumberInput,
  Kpi,
  Table,
  Alert,
  useAction,
} from "../components/common/UI";
import { Bars } from "../components/charts/Charts";
export default function MayoreoPePage() {
  const { data } = useCatalogData(),
    refresh = useRefresh(),
    a = useAction();
  const [tiers, setTiers] = useState(structuredClone(data!.pricingTiers)),
    [settings, setSettings] = useState({ ...data!.settings! }),
    [fixed, setFixed] = useState(structuredClone(data!.fixedCosts)),
    [models, setModels] = useState(structuredClone(data!.models));
  const active = models.filter((m) => m.isActive),
    t = effectiveTiers(tiers, settings.defaultMarginPct),
    total = sum(fixed.map((f) => f.monthlyAmount || 0));
  let tierError = "",
    mixError = "";
  try {
    validateTiers(tiers, settings.defaultMarginPct);
  } catch (e) {
    tierError = (e as Error).message;
  }
  try {
    validateMix(models);
  } catch (e) {
    mixError = (e as Error).message;
  }
  const channel = t.find((t) => t.name === settings.activeMixChannel) ?? t[0],
    mix = mixture(
      active,
      data!.materials,
      channel && D(channel.marginPct).lt(1) ? channel.marginPct : ".3",
      total,
      settings.monthlyTargetProfit || 0,
    ),
    mixTotal = sum(active.map((m) => m.salesMixPct || 0));
  const save = () =>
    a.run(async () => {
      validateTiers(tiers, settings.defaultMarginPct);
      validateMix(models);
      await services.repos!.pricing.saveAll(tiers, settings);
      for (const f of fixed)
        await services.repos!.fixedCosts.save({
          ...f,
          monthlyAmount: controlled(f.monthlyAmount, 2),
        });
      await services.repos!.models.saveMix(models);
      await refresh();
    });
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">CRECER CON NÚMEROS CLAROS</p>
          <h1>Volumen y equilibrio.</h1>
          <p>Tarifas coherentes y metas para tu emprendimiento en casa.</p>
        </div>
        <button disabled={a.busy || !!tierError || !!mixError} onClick={save}>
          Guardar ajustes
        </button>
      </div>
      {a.feedback}
      {tierError && <Alert error>{tierError}</Alert>}
      {mixError && (
        <Alert error>
          {mixError} · Suma actual: {pct(mixTotal)} ·{" "}
          {mixTotal.lt(1) ? "Falta" : "Sobra"} {pct(mixTotal.minus(1).abs())}
        </Alert>
      )}
      <section className="panel">
        <h2>Niveles de venta</h2>
        <Table
          heads={[
            "Nivel",
            "Desde",
            "Hasta",
            "Margen %",
            "Recargo",
            "Descuento vs. menudeo",
            "Uso",
          ]}
        >
          {t.map((level) => (
            <tr key={level.id}>
              <td>
                <input
                  aria-label={"Nombre del nivel " + level.name}
                  value={level.name}
                  onChange={(e) => {
                    setTiers(
                      tiers.map((v) =>
                        v.id === level.id ? { ...v, name: e.target.value } : v,
                      ),
                    );
                    if (settings.activeMixChannel === level.name)
                      setSettings({
                        ...settings,
                        activeMixChannel: e.target.value,
                      });
                  }}
                />
              </td>
              <td>
                <NumberInput
                  aria-label={"Desde " + level.name}
                  min="1"
                  step="1"
                  value={level.minQty}
                  onChange={(e) =>
                    setTiers(
                      tiers.map((v) =>
                        v.id === level.id
                          ? { ...v, minQty: Number(e.target.value) }
                          : v,
                      ),
                    )
                  }
                />
              </td>
              <td>
                {level.maxQty === null ? (
                  "Sin límite"
                ) : (
                  <NumberInput
                    aria-label={"Hasta " + level.name}
                    min="1"
                    step="1"
                    value={level.maxQty}
                    onChange={(e) =>
                      setTiers(
                        tiers.map((v) =>
                          v.id === level.id
                            ? { ...v, maxQty: Number(e.target.value) }
                            : v,
                        ),
                      )
                    }
                  />
                )}
              </td>
              <td>
                <NumberInput
                  aria-label={"Margen " + level.name}
                  max="99.99"
                  value={D(level.marginPct || 0)
                    .times(100)
                    .toString()}
                  onChange={(e) => {
                    const v = D(e.target.value || 0)
                      .div(100)
                      .toString();
                    if (level.isRetailBase)
                      setSettings({ ...settings, defaultMarginPct: v });
                    else
                      setTiers(
                        tiers.map((t) =>
                          t.id === level.id ? { ...t, marginPct: v } : t,
                        ),
                      );
                  }}
                />
              </td>
              <td>
                {D(level.marginPct).lt(1)
                  ? pct(pricing(1, level.marginPct).markup)
                  : "—"}
              </td>
              <td>
                {D(level.marginPct).lt(1)
                  ? pct(discount(settings.defaultMarginPct, level.marginPct))
                  : "—"}
              </td>
              <td>
                <input
                  aria-label={"Uso de " + level.name}
                  value={level.description}
                  onChange={(e) =>
                    setTiers(
                      tiers.map((v) =>
                        v.id === level.id
                          ? { ...v, description: e.target.value }
                          : v,
                      ),
                    )
                  }
                />
              </td>
            </tr>
          ))}
        </Table>
        <button
          className="text-button"
          onClick={() => {
            const last = [...tiers]
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .at(-1)!;
            const boundary = last.minQty + 30;
            setTiers([
              ...tiers.map((v) =>
                v.id === last.id ? { ...v, maxQty: boundary - 1 } : v,
              ),
              {
                id: crypto.randomUUID(),
                name: "Nuevo nivel",
                minQty: boundary,
                maxQty: null,
                marginPct: "0",
                isRetailBase: false,
                description: "",
                sortOrder: last.sortOrder + 1,
              },
            ]);
          }}
        >
          <Plus size={16} />
          Agregar nivel
        </button>
      </section>
      {!tierError && (
        <section className="panel">
          <h2>Precios por volumen</h2>
          <Table
            heads={["Modelo", ...t.map((t) => t.name + " sin IVA / con IVA")]}
          >
            {active.map((m) => {
              const c = calculateModel(m, data!.materials);
              return (
                <tr key={m.id}>
                  <td>{m.name}</td>
                  {t.map((t) => {
                    const p = pricing(
                      c.cost,
                      t.marginPct,
                      settings.defaultIvaPct,
                    );
                    return (
                      <td key={t.id}>
                        {money(p.price)}
                        <small>{money(p.final)} con IVA</small>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </Table>
        </section>
      )}
      <div className="split">
        <section className="panel">
          <h2>Gastos fijos de casa</h2>
          {fixed.map((f, i) => (
            <Field
              key={f.id}
              label={f.name}
              hint={
                "Peso: " +
                (total.gt(0) ? pct(D(f.monthlyAmount || 0).div(total)) : "0%")
              }
            >
              <NumberInput
                value={f.monthlyAmount}
                onChange={(e) =>
                  setFixed(
                    fixed.map((v, j) =>
                      j === i ? { ...v, monthlyAmount: e.target.value } : v,
                    ),
                  )
                }
              />
            </Field>
          ))}
          <button
            className="text-button"
            onClick={() => {
              const name = prompt("Nombre del gasto fijo");
              if (name)
                setFixed([
                  ...fixed,
                  { id: crypto.randomUUID(), name, monthlyAmount: "0" },
                ]);
            }}
          >
            Agregar gasto
          </button>
          <div className="editor-total">
            Total mensual <b>{money(total)}</b>
          </div>
        </section>
        <section className="panel">
          <h2>Tu meta mensual</h2>
          <Field label="Utilidad que quieres alcanzar (MXN)">
            <NumberInput
              value={settings.monthlyTargetProfit}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  monthlyTargetProfit: e.target.value,
                })
              }
            />
          </Field>
          <Field label="Canal de la mezcla">
            <select
              value={settings.activeMixChannel}
              onChange={(e) =>
                setSettings({ ...settings, activeMixChannel: e.target.value })
              }
            >
              {t.map((t) => (
                <option key={t.id}>{t.name}</option>
              ))}
            </select>
          </Field>
          <Table heads={["Modelo", "Mezcla %", "Piezas PE", "Piezas meta"]}>
            {active.map((m) => (
              <tr key={m.id}>
                <td>{m.code}</td>
                <td>
                  <NumberInput
                    aria-label={"Mezcla " + m.code}
                    max="100"
                    value={D(m.salesMixPct || 0)
                      .times(100)
                      .toString()}
                    onChange={(e) =>
                      setModels(
                        models.map((v) =>
                          v.id === m.id
                            ? {
                                ...v,
                                salesMixPct: D(e.target.value || 0)
                                  .div(100)
                                  .toString(),
                              }
                            : v,
                        ),
                      )
                    }
                  />
                </td>
                <td>
                  {mix.pe.units
                    ?.times(m.salesMixPct)
                    .toDecimalPlaces(2)
                    .toString() ?? "—"}
                </td>
                <td>
                  {mix.goal.units
                    ?.times(m.salesMixPct)
                    .toDecimalPlaces(2)
                    .toString() ?? "—"}
                </td>
              </tr>
            ))}
          </Table>
          {!mixError && (
            <div className="kpi-grid compact">
              <Kpi label="MC ponderado" value={money(mix.profit)} />
              <Kpi label="Precio ponderado" value={money(mix.price)} />
              <Kpi
                label="Punto de equilibrio"
                value={mix.pe.units?.toString() ?? "Sin contribución"}
                detail={
                  mix.pe.sales
                    ? money(mix.pe.sales) + " sin IVA"
                    : "El canal debe generar utilidad"
                }
              />
              <Kpi
                label="Meta de ventas"
                value={mix.goal.units?.toString() ?? "—"}
                detail={
                  mix.goal.sales ? money(mix.goal.sales) + " sin IVA" : ""
                }
              />
            </div>
          )}
        </section>
      </div>
      {!tierError && (
        <>
          <section className="panel">
            <h2>Punto de equilibrio por modelo</h2>
            <Table
              heads={[
                "Modelo",
                "Menudeo (pzas / ventas)",
                "Mayoreo (pzas / ventas)",
              ]}
            >
              {active.map((m) => {
                const c = calculateModel(m, data!.materials).cost;
                return (
                  <tr key={m.id}>
                    <td>{m.name}</td>
                    {[
                      settings.defaultMarginPct,
                      t.find((t) => t.name === "Mayoreo")?.marginPct ?? "0",
                    ].map((margin, i) => {
                      const pe = breakEven(total, c, margin);
                      return (
                        <td key={i}>
                          {pe.units?.toString() ?? "Sin contribución"}
                          <small>
                            {pe.sales ? money(pe.sales) + " sin IVA" : ""}
                          </small>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </Table>
          </section>
          <div className="split">
            <section className="panel">
              <h2>Precio final por nivel</h2>
              <Bars
                data={active.map((m) => ({
                  name: m.code,
                  ...Object.fromEntries(
                    t.map((t) => [
                      t.name,
                      Number(
                        pricing(
                          calculateModel(m, data!.materials).cost,
                          t.marginPct,
                          settings.defaultIvaPct,
                        ).final.toFixed(2),
                      ),
                    ]),
                  ),
                }))}
                keys={t.map((t) => t.name)}
              />
            </section>
            <section className="panel">
              <h2>Velas para cubrir gastos</h2>
              <Bars
                data={active.map((m) => ({
                  name: m.code,
                  Menudeo:
                    breakEven(
                      total,
                      calculateModel(m, data!.materials).cost,
                      settings.defaultMarginPct,
                    ).units?.toNumber() ?? 0,
                  Mayoreo:
                    breakEven(
                      total,
                      calculateModel(m, data!.materials).cost,
                      t.find((t) => t.name === "Mayoreo")?.marginPct ?? "0",
                    ).units?.toNumber() ?? 0,
                }))}
                keys={["Menudeo", "Mayoreo"]}
              />
            </section>
          </div>
        </>
      )}
    </div>
  );
}
