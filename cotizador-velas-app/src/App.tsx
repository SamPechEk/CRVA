import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { useCatalogData, useRefresh } from "./hooks/useCatalogData";
import { WorkspaceProvider } from "./hooks/useWorkspace";
import { services } from "./services/container";
import { AppShell } from "./components/layout/AppShell";
import { Empty, useAction, Alert } from "./components/common/UI";
import LoginPage from "./pages/LoginPage";
import CotizadorPage from "./pages/CotizadorPage";
import CatalogoPage from "./pages/CatalogoPage";
import InsumosPage from "./pages/InsumosPage";
import MayoreoPePage from "./pages/MayoreoPePage";
import ResumenPage from "./pages/ResumenPage";
import HistorialPage from "./pages/HistorialPage";
import ClientesPage from "./pages/ClientesPage";
import ParametrosPage from "./pages/ParametrosPage";
function Content() {
  const c = useCatalogData(),
    refresh = useRefresh(),
    a = useAction();
  if (c.isPending) return <Empty title="Preparando tu espacio…" />;
  if (c.error)
    return (
      <Alert error>
        {c.error.message}
        <button onClick={() => c.refetch()}>Reintentar</button>
      </Alert>
    );
  if (!c.data.settings)
    return (
      <Empty title="Tu estudio comienza aquí">
        <p>Carga los 18 insumos, 4 modelos y parámetros reales del Excel v4.</p>
        <p>Sin clientes ni proveedores ficticios.</p>
        {a.feedback}
        <button
          disabled={a.busy}
          onClick={() =>
            a.run(async () => {
              await services.repos!.backup.seed();
              await refresh();
            }, "Datos v4 cargados")
          }
        >
          {a.busy ? "Cargando…" : "Cargar datos iniciales del Excel (v4)"}
        </button>
      </Empty>
    );
  return (
    <WorkspaceProvider settings={c.data.settings}>
      <BrowserRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<CotizadorPage />} />
            <Route path="modelos" element={<CatalogoPage />} />
            <Route path="insumos" element={<InsumosPage />} />
            <Route path="mayoreo-equilibrio" element={<MayoreoPePage />} />
            <Route path="resumen" element={<ResumenPage />} />
            <Route path="cotizaciones" element={<HistorialPage />} />
            <Route path="clientes" element={<ClientesPage />} />
            <Route path="parametros" element={<ParametrosPage />} />
            <Route
              path="*"
              element={
                <Empty title="Página no encontrada">
                  <a href="/">Volver al cotizador</a>
                </Empty>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </WorkspaceProvider>
  );
}
export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <Empty title="Verificando acceso…" />;
  return user ? <Content /> : <LoginPage />;
}
