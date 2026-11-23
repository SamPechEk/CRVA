import type { Quote } from "../../domain/types";
import { commercialQuote } from "../../services/commercial";
import { whatsappUrl, whatsappText } from "../../services/whatsappService";
import { Modal, Table, useAction } from "./UI";
export function ClientPreview({
  quote,
  onClose,
}: {
  quote: Quote;
  onClose: () => void;
}) {
  const c = commercialQuote(quote),
    a = useAction();
  return (
    <Modal title="Vista cliente" onClose={onClose}>
      <div className="client-paper">
        {c.logo && (
          <img className="business-logo" src={c.logo} alt={c.business} />
        )}
        <small>COTIZACIÓN</small>
        <h2>{c.business || "Velas artesanales"}</h2>
        <p>
          {c.folio} · {c.date}
        </p>
        {c.client && (
          <p>
            {c.client.name}
            <br />
            {c.client.phone}
            <br />
            {c.client.email}
          </p>
        )}
        {c.items
          .filter((i) => i.image)
          .map((i) => (
            <img
              className="preview-photo"
              key={i.name}
              src={i.image!}
              alt={i.name}
            />
          ))}
        <Table
          heads={[
            "Modelo / presentación",
            "Cantidad",
            "Unitario sin IVA",
            "Subtotal",
          ]}
        >
          {c.items.map((i, index) => (
            <tr key={index}>
              <td>
                {i.name}
                <small>{i.presentation}</small>
              </td>
              <td>{i.quantity}</td>
              <td>{i.unitPrice}</td>
              <td>{i.subtotal}</td>
            </tr>
          ))}
        </Table>
        <div className="invoice-totals">
          <p>
            Subtotal <b>{c.subtotal}</b>
          </p>
          <p>
            IVA ({c.taxRate}) <b>{c.tax}</b>
          </p>
          <h3>
            Total MXN <b>{c.total}</b>
          </h3>
        </div>
        <p className="preserve">{c.notes}</p>
      </div>
      {a.feedback}
      <div className="actions">
        <button
          disabled={a.busy}
          onClick={() =>
            a.run(
              async () =>
                (await import("../../services/pdfService")).downloadPdf(quote),
              "PDF descargado",
            )
          }
        >
          Descargar PDF
        </button>
        <a
          className="button secondary"
          href={whatsappUrl(quote)}
          target="_blank"
          rel="noreferrer"
        >
          WhatsApp
        </a>
        <button
          className="secondary"
          onClick={() =>
            a.run(
              () => navigator.clipboard.writeText(whatsappText(quote)),
              "Texto copiado",
            )
          }
        >
          Copiar texto
        </button>
      </div>
    </Modal>
  );
}
