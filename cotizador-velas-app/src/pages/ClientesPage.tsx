import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useClients } from "../hooks/useClients";
import { services } from "../services/container";
import { clientSchema } from "../domain/validations";
import type { Client } from "../domain/types";
import { Field, Modal, Table, useAction } from "../components/common/UI";
export default function ClientesPage() {
  const { data: clients = [], error } = useClients(),
    [edit, setEdit] = useState<Client | null>(null),
    [search, setSearch] = useState(""),
    a = useAction(),
    cache = useQueryClient();
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">CADA CLIENTE, UNA RELACIÓN</p>
          <h1>Tu directorio.</h1>
          <p>Guarda los datos que necesitas para tu próxima propuesta.</p>
        </div>
        <button
          onClick={() =>
            setEdit({
              id: crypto.randomUUID(),
              name: "",
              phoneWhatsapp: "",
              email: "",
              notes: "",
            })
          }
        >
          <Plus size={18} />
          Nuevo cliente
        </button>
      </div>
      {a.feedback}
      {error && <p role="alert">{error.message}</p>}
      <section className="panel">
        <Field label="Buscar cliente">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nombre, teléfono o correo"
          />
        </Field>
        <Table heads={["Nombre", "WhatsApp", "Correo", "Notas", "Acciones"]}>
          {clients
            .filter((c) =>
              (c.name + " " + c.email + " " + c.phoneWhatsapp)
                .toLowerCase()
                .includes(search.toLowerCase()),
            )
            .map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.phoneWhatsapp || "—"}</td>
                <td>{c.email || "—"}</td>
                <td>{c.notes || "—"}</td>
                <td>
                  <div className="actions">
                    <button
                      className="text-button"
                      onClick={() => setEdit({ ...c })}
                    >
                      Editar
                    </button>
                    <Link
                      className="text-button"
                      to={"/cotizaciones?cliente=" + encodeURIComponent(c.id)}
                    >
                      Cotizaciones
                    </Link>
                    <button
                      className="text-button danger"
                      disabled={a.busy}
                      onClick={() => {
                        if (
                          confirm(
                            "¿Eliminar a " +
                              c.name +
                              " del directorio? Sus cotizaciones se conservan.",
                          )
                        )
                          void a.run(async () => {
                            await services.repos!.clients.remove(c.id);
                            await cache.invalidateQueries({
                              queryKey: ["clients"],
                            });
                          });
                      }}
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
        </Table>
        {!clients.length && (
          <div className="empty">
            Tu directorio está listo para recibir al primer cliente.
          </div>
        )}
      </section>
      {edit && (
        <ClientEditor
          value={edit}
          onClose={() => setEdit(null)}
          onSave={async (c) => {
            await services.repos!.clients.save(c);
            await cache.invalidateQueries({ queryKey: ["clients"] });
            setEdit(null);
          }}
        />
      )}
    </div>
  );
}
function ClientEditor({
  value,
  onSave,
  onClose,
}: {
  value: Client;
  onSave: (c: Client) => Promise<void>;
  onClose: () => void;
}) {
  const [c, setC] = useState(value),
    a = useAction();
  return (
    <Modal title="Datos del cliente" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void a.run(() => onSave(clientSchema.parse(c)));
        }}
      >
        {[
          ["name", "Nombre"],
          ["phoneWhatsapp", "WhatsApp (con código de país)"],
          ["email", "Correo electrónico"],
          ["notes", "Notas"],
        ].map(([key, label]) => (
          <Field key={key} label={label}>
            <input
              required={key === "name"}
              type={
                key === "email"
                  ? "email"
                  : key === "phoneWhatsapp"
                    ? "tel"
                    : "text"
              }
              value={c[key as keyof Client]}
              onChange={(e) => setC({ ...c, [key]: e.target.value })}
            />
          </Field>
        ))}
        {a.feedback}
        <button disabled={a.busy}>Guardar cliente</button>
      </form>
    </Modal>
  );
}
