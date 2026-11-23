import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type InputHTMLAttributes,
} from "react";
import { X, Upload, Flame } from "lucide-react";
import { services } from "../../services/container";
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function NumberInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input type="number" min="0" step="any" {...props} />;
}
export function Kpi({
  label,
  value,
  detail,
  accent = false,
}: {
  label: string;
  value: ReactNode;
  detail?: string;
  accent?: boolean;
}) {
  return (
    <article className={"kpi " + (accent ? "accent" : "")}>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </article>
  );
}
export function Table({
  heads,
  children,
}: {
  heads: string[];
  children: ReactNode;
}) {
  return (
    <div className="table-wrap" tabIndex={0} aria-label="Tabla desplazable">
      <table>
        <thead>
          <tr>
            {heads.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog ref={ref} onCancel={onClose}>
      <div className="modal-head">
        <h2>{title}</h2>
        <button className="icon-button" onClick={onClose} aria-label="Cerrar">
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Alert({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <div
      role={error ? "alert" : "status"}
      className={"alert " + (error ? "error" : "")}
    >
      {children}
    </div>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <Flame size={32} />
      <h2>{title}</h2>
      {children}
    </div>
  );
}
export function ImageUploader({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (url: string, id: string) => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <div className="uploader">
      {value ? (
        <img
          src={services.media.getOptimizedUrl(value)}
          alt="Fotografía guardada"
        />
      ) : (
        <Flame size={42} />
      )}
      <label className="button secondary">
        <Upload size={16} />
        {busy ? "Subiendo…" : "Subir imagen"}
        <input
          className="sr-only"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setBusy(true);
            setError("");
            try {
              const result = await services.media.uploadImage(file);
              onChange(result.imageUrl, result.imagePublicId);
            } catch (e) {
              setError(String(e));
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      <small>JPG, PNG o WebP · hasta 5 MB</small>
      {error && <Alert error>{error}</Alert>}
    </div>
  );
}
export function useAction() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  async function run(
    fn: () => Promise<unknown>,
    success = "Cambios guardados",
  ) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await fn();
      setMessage(success);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setBusy(false);
    }
  }
  return {
    busy,
    error,
    message,
    run,
    feedback: (
      <>
        {error && <Alert error>{error}</Alert>}
        {message && <Alert>{message}</Alert>}
      </>
    ),
  };
}
