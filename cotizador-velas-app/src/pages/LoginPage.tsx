import { useState } from "react";
import { Flame } from "lucide-react";
import { services } from "../services/container";
import { Field, useAction } from "../components/common/UI";
export default function LoginPage() {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    a = useAction();
  return (
    <div className="login">
      <section>
        <span className="brand-icon">
          <Flame size={32} />
        </span>
        <p className="eyebrow">VELAS ARTESANALES</p>
        <h1>
          El valor de
          <br />
          lo que creas.
        </h1>
        <p>
          Un espacio para conocer tus costos,
          <br />
          cotizar con confianza y hacer crecer tu proyecto.
        </p>
        <small>Precisión en cada vela. Claridad en cada pedido.</small>
      </section>
      <div className="login-form">
        <h2>Bienvenida a tu estudio</h2>
        {services.configured ? (
          <>
            <p>Acceso exclusivo para cuentas autorizadas.</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void a.run(() => services.auth!.signIn(email, password), "");
              }}
            >
              <Field label="Correo electrónico">
                <input
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
              <Field label="Contraseña">
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
              <button disabled={a.busy}>Entrar al estudio</button>
            </form>
            <button
              className="secondary"
              disabled={a.busy}
              onClick={() => a.run(() => services.auth!.signInGoogle(), "")}
            >
              Continuar con Google
            </button>
          </>
        ) : (
          <>
            <p>
              Configura la conexión de tu proyecto Firebase en <code>.env</code>{" "}
              para comenzar.
            </p>
            <p>
              Puedes explorar primero con los datos exactos del Excel v4,
              guardados sólo en este navegador.
            </p>
            <button
              onClick={() => {
                sessionStorage.setItem("velas-demo", "true");
                location.reload();
              }}
            >
              Abrir modo de prueba local
            </button>
            <small>Inicializa el catálogo desde la siguiente pantalla.</small>
          </>
        )}
        {a.feedback}
      </div>
    </div>
  );
}
