import { useCatalogData } from "../hooks/useCatalogData";
import { useWorkspace } from "../hooks/useWorkspace";
import { calculateModel, pricing, money, pct, D } from "../domain/formulas";
import { categories } from "../domain/types";
import { Table, Field, Empty } from "../components/common/UI";
import { Bars, Donut } from "../components/charts/Charts";
export default function ResumenPage() {
  const { data } = useCatalogData(),
    w = useWorkspace(),
    models = data!.models.filter((m) => m.isActive),
    model = models.find((m) => m.id === w.modelId) ?? models[0];
  if (!model) return <Empty title="Agrega un modelo" />;
  const c = calculateModel(model, data!.materials, w.margin, w.iva);
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">MIRA EL PANORAMA COMPLETO</p>
          <h1>De los costos a las decisiones.</h1>
          <p>Compara tus modelos y encuentra el margen adecuado.</p>
        </div>
        <Field label="Modelo activo">
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
      </div>
      <div className="split">
        <section className="panel">
          <h2>¿Qué compone tu costo?</h2>
          <Donut
            data={categories.map((name) => ({
              name,
              value: c.categories[name].toNumber(),
            }))}
          />
        </section>
        <section className="panel">
          <h2>Costos del catálogo</h2>
          <Bars
            stacked
            keys={[...categories]}
            data={models.map((m) => {
              const q = calculateModel(m, data!.materials);
              return {
                name: m.code,
                ...Object.fromEntries(
                  categories.map((c) => [
                    c,
                    Number(q.categories[c].toFixed(2)),
                  ]),
                ),
              };
            })}
          />
        </section>
      </div>
      <section className="panel">
        <h2>Composición de {model.name}</h2>
        <Table
          heads={[
            "Categoría",
            "Costo",
            "% del costo",
            "Utilidad",
            "Precio sin IVA",
            "Precio con IVA",
          ]}
        >
          {categories.map((cat) => {
            const p = pricing(c.categories[cat], w.margin, w.iva);
            return (
              <tr key={cat}>
                <td>{cat}</td>
                <td>{money(p.cost)}</td>
                <td>{c.cost.gt(0) ? pct(p.cost.div(c.cost)) : "0%"}</td>
                <td>{money(p.profit)}</td>
                <td>{money(p.price)}</td>
                <td>{money(p.final)}</td>
              </tr>
            );
          })}
          <tr className="total-row">
            <td>TOTAL POR VELA</td>
            <td>{money(c.cost)}</td>
            <td>100%</td>
            <td>{money(c.profit)}</td>
            <td>{money(c.price)}</td>
            <td>{money(c.final)}</td>
          </tr>
        </Table>
      </section>
      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Explora tu margen</h2>
            <p>
              Margen actual: {pct(w.margin)} · IVA: {pct(w.iva)}
            </p>
          </div>
        </div>
        <Table
          heads={[
            "Margen bruto",
            "Recargo sobre costo",
            "Costo",
            "Utilidad",
            "Precio sin IVA",
            "IVA",
            "Precio final",
          ]}
        >
          {Array.from({ length: 8 }, (_, i) =>
            D(15 + i * 5)
              .div(100)
              .toString(),
          ).map((m) => {
            const p = pricing(c.cost, m, w.iva);
            return (
              <tr className={D(m).eq(w.margin) ? "selected-row" : ""} key={m}>
                <td>
                  {pct(m)}{" "}
                  {D(m).eq(w.margin) && <span className="badge">Activo</span>}
                </td>
                <td>{pct(p.markup)}</td>
                <td>{money(p.cost)}</td>
                <td>{money(p.profit)}</td>
                <td>{money(p.price)}</td>
                <td>{money(p.tax)}</td>
                <td>{money(p.final)}</td>
              </tr>
            );
          })}
        </Table>
      </section>
    </div>
  );
}
