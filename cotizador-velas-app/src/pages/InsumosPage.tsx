import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { useCatalogData, useRefresh } from "../hooks/useCatalogData";
import { categories, units, type Material } from "../domain/types";
import { unitCost, sum, money, D, controlled } from "../domain/formulas";
import { services } from "../services/container";
import { materialSchema } from "../domain/validations";
import {
  Field,
  NumberInput,
  Kpi,
  Table,
  Modal,
  useAction,
} from "../components/common/UI";
export default function InsumosPage() {
  const { data } = useCatalogData(),
    refresh = useRefresh(),
    a = useAction();
  const [search, setSearch] = useState(""),
    [category, setCategory] = useState(""),
    [edit, setEdit] = useState<Material | null>(null);
  const materials = data!.materials.filter((m) => m.isActive),
    list = materials.filter(
      (m) =>
        (m.name + " " + m.code).toLowerCase().includes(search.toLowerCase()) &&
        (!category || m.category === category),
    );
  function create() {
    const id = crypto.randomUUID();
    setEdit({
      id,
      code: "",
      name: "",
      category: "Insumos directos",
      unit: "g",
      quantityPurchased: "",
      totalPrice: "",
      isWax: false,
      systemRole: "NONE",
      isActive: true,
      supplierName: "",
    });
  }
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">LA BASE DE CADA CREACIÓN</p>
          <h1>Tus insumos, en orden.</h1>
          <p>Actualiza una compra y todos tus cálculos se ajustan.</p>
        </div>
        <button onClick={create}>
          <Plus size={18} />
          Nuevo insumo
        </button>
      </div>
      <div className="kpi-grid compact">
        <Kpi
          label="Inversión del catálogo"
          value={money(sum(materials.map((m) => m.totalPrice)))}
        />
        <Kpi label="Insumos activos" value={materials.length} />
        <Kpi label="Categorías" value="3" />
      </div>
      {a.feedback}
      <section className="panel">
        <div className="toolbar">
          <label className="search">
            <Search size={18} />
            <input
              aria-label="Buscar insumos"
              placeholder="Buscar nombre o código"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <select
            aria-label="Filtrar por categoría"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <Table
          heads={[
            "Insumo",
            "Categoría",
            "Compra",
            "Precio total",
            "Costo unitario",
            "Acciones",
          ]}
        >
          {list.map((m) => (
            <tr key={m.id}>
              <td>
                <b>{m.name}</b>
                <small>
                  {m.code}
                  {m.systemRole !== "NONE" ? " · Vinculado al lote" : ""}
                </small>
              </td>
              <td>{m.category}</td>
              <td>
                {m.quantityPurchased} {m.unit}
              </td>
              <td>{money(m.totalPrice)}</td>
              <td>
                ${unitCost(m).toFixed(4)} / {m.unit}
              </td>
              <td>
                <div className="actions">
                  <button
                    className="text-button"
                    onClick={() => setEdit({ ...m })}
                  >
                    Editar
                  </button>
                  <button
                    className="text-button danger"
                    disabled={a.busy}
                    onClick={() => {
                      if (confirm("¿Desactivar " + m.name + "?"))
                        void a.run(async () => {
                          await services.repos!.materials.deactivate(m.id);
                          await refresh();
                        });
                    }}
                  >
                    Desactivar
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </Table>
        {!list.length && (
          <p className="empty">No hay insumos con estos filtros.</p>
        )}
      </section>
      {edit && (
        <MaterialEditor
          value={edit}
          onClose={() => setEdit(null)}
          onSave={async (v) => {
            await services.repos!.materials.save(v);
            await refresh();
            setEdit(null);
          }}
        />
      )}
    </div>
  );
}
function MaterialEditor({
  value,
  onSave,
  onClose,
}: {
  value: Material;
  onSave: (v: Material) => Promise<void>;
  onClose: () => void;
}) {
  const [m, setM] = useState(value),
    a = useAction(),
    set = (key: keyof Material, value: string | boolean) =>
      setM({ ...m, [key]: value });
  return (
    <Modal
      title={value.name ? "Editar insumo" : "Nuevo insumo"}
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void a.run(async () => {
            const v = materialSchema.parse({
              ...m,
              quantityPurchased: controlled(m.quantityPurchased),
              totalPrice: controlled(m.totalPrice, 2),
            });
            await onSave(v);
          });
        }}
      >
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
          <Field label="Categoría">
            <select
              value={m.category}
              onChange={(e) => set("category", e.target.value)}
            >
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Unidad de compra">
            <select
              value={m.unit}
              onChange={(e) => set("unit", e.target.value)}
            >
              {units.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field
            label="Cantidad comprada"
            hint="Ejemplo: un frasco de 20 ml se captura como 20 ml."
          >
            <NumberInput
              min="0.000001"
              required
              value={m.quantityPurchased}
              onChange={(e) => set("quantityPurchased", e.target.value)}
            />
          </Field>
          <Field label="Precio total de compra (MXN)">
            <NumberInput
              required
              value={m.totalPrice}
              onChange={(e) => set("totalPrice", e.target.value)}
            />
          </Field>
          <Field label="Proveedor (opcional)">
            <input
              value={m.supplierName ?? ""}
              onChange={(e) => set("supplierName", e.target.value)}
            />
          </Field>
          <Field label="Rol de sistema">
            <select
              value={m.systemRole}
              onChange={(e) => set("systemRole", e.target.value)}
            >
              <option value="NONE">Ninguno</option>
              <option value="ENERGY">Energía (kWh)</option>
              <option value="LABOR">Mano de obra (min)</option>
            </select>
          </Field>
        </div>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={m.isWax}
            onChange={(e) => set("isWax", e.target.checked)}
          />
          Es cera (se suma en gramos)
        </label>
        {m.quantityPurchased &&
          D(m.quantityPurchased).gt(0) &&
          m.totalPrice && (
            <div className="calculated">
              Costo unitario: ${unitCost(m).toFixed(4)} / {m.unit}
            </div>
          )}
        {a.feedback}
        <div className="actions">
          <button disabled={a.busy}>Guardar insumo</button>
          <button className="secondary" type="button" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  );
}
