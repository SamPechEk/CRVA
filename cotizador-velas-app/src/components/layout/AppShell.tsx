import { useState, useEffect } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  Flame,
  Calculator,
  Shapes,
  Package,
  ChartNoAxesCombined,
  ChartPie,
  History,
  Users,
  Settings,
  Menu,
  X,
  LogOut,
  WifiOff,
} from "lucide-react";
import { services } from "../../services/container";
const links = [
  ["/", "Cotizador", Calculator],
  ["/modelos", "Modelos", Shapes],
  ["/insumos", "Insumos", Package],
  ["/mayoreo-equilibrio", "Mayoreo y equilibrio", ChartNoAxesCombined],
  ["/resumen", "Resumen", ChartPie],
  ["/cotizaciones", "Cotizaciones", History],
  ["/clientes", "Clientes", Users],
  ["/parametros", "Parámetros", Settings],
] as const;
export function AppShell() {
  const [open, setOpen] = useState(false),
    [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return (
    <div className="shell">
      <a className="skip" href="#main">
        Saltar al contenido
      </a>
      <header className="mobile-header">
        <span>
          <Flame /> Cotizador de velas
        </span>
        <button
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </header>
      <aside className={open ? "sidebar open" : "sidebar"}>
        <div className="brand">
          <span className="brand-icon">
            <Flame size={28} />
          </span>
          <div>
            Velas artesanales<small>ESTUDIO DE COSTOS</small>
          </div>
        </div>
        <p className="nav-label">TU ESPACIO DE TRABAJO</p>
        <nav aria-label="Principal">
          {links.map(([path, label, Icon]) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/"}
              onClick={() => setOpen(false)}
            >
              <Icon size={19} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          {services.demo ? (
            <div className="demo-label">
              Modo local de prueba<small>Datos en este navegador</small>
            </div>
          ) : (
            <div className="connection">
              {online ? (
                "Conectada"
              ) : (
                <>
                  <WifiOff size={16} /> Sin conexión
                </>
              )}
              <small>
                {online
                  ? "Tu trabajo, bien guardado"
                  : "Consulta los datos en caché"}
              </small>
            </div>
          )}
          <button
            className="secondary"
            onClick={() => {
              if (services.demo) {
                sessionStorage.removeItem("velas-demo");
                location.reload();
              } else void services.auth?.signOut();
            }}
          >
            <LogOut size={16} />
            {services.demo ? "Salir del modo de prueba" : "Cerrar sesión"}
          </button>
        </div>
      </aside>
      <main id="main">
        <header className="topbar">
          <span>Hecho a mano. Calculado con precisión.</span>
          <span>MXN · {online ? "En línea" : "Sin conexión"}</span>
        </header>
        {services.demo && (
          <div className="demo-banner">
            Prueba local · los folios DEMO no son cotizaciones de producción
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}
