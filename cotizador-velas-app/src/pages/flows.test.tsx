// @vitest-environment jsdom
import { beforeEach, it, expect, vi, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { WorkspaceProvider } from "../hooks/useWorkspace";
import { seedV4 } from "../domain/seedV4";
import { localRepositories } from "../adapters/local/local.adapter";
vi.mock("../components/charts/Charts", () => ({
  Bars: () => null,
  Donut: () => null,
}));
vi.mock("../services/container", () => ({
  services: {
    repos: null,
    demo: true,
    media: { getOptimizedUrl: (u: string) => u },
  },
}));
import { services } from "../services/container";
import CotizadorPage from "./CotizadorPage";
import MayoreoPePage from "./MayoreoPePage";
beforeEach(async () => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  localStorage.clear();
  services.repos = localRepositories();
  await services.repos.backup.seed();
});
afterEach(cleanup);
function mount(children: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 300000 } },
  });
  client.setQueryData(["catalog"], structuredClone(seedV4));
  return render(
    <QueryClientProvider client={client}>
      <BrowserRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <WorkspaceProvider settings={seedV4.settings!}>
          {children}
        </WorkspaceProvider>
      </BrowserRouter>
    </QueryClientProvider>,
  );
}
it("sugiere volumen sin cambiar el margen y guarda snapshot", async () => {
  mount(<CotizadorPage />);
  await screen.findByText("Cada vela, bien cotizada.");
  fireEvent.change(screen.getByLabelText("Cantidad del pedido"), {
    target: { value: "35" },
  });
  expect(
    (screen.getByLabelText("Margen bruto") as HTMLSelectElement).value,
  ).toBe("0.3");
  fireEvent.click(
    screen.getByRole("button", { name: "Aplicar tarifa Mayoreo" }),
  );
  expect(
    (screen.getByLabelText("Margen bruto") as HTMLSelectElement).value,
  ).toBe("0.2");
  fireEvent.click(screen.getByRole("button", { name: "Guardar cotización" }));
  await screen.findByText("Cotización guardada");
  expect((await services.repos!.quotes.page()).items[0].marginPct).toBe("0.2");
  expect(
    screen
      .getByRole("button", { name: "Guardar cotización" })
      .hasAttribute("disabled"),
  ).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Vista cliente" }));
  await screen.findByRole("dialog");
  expect(screen.getByRole("dialog").textContent).not.toMatch(
    /Parafina|Costo por vela|Utilidad por vela/,
  );
});
it("bloquea márgenes invertidos y mezcla incompleta sin romper el formulario", async () => {
  mount(<MayoreoPePage />);
  await screen.findByText("Volumen y equilibrio.");
  fireEvent.change(screen.getByLabelText("Margen Medio Mayoreo"), {
    target: { value: "35" },
  });
  expect(
    screen
      .getByRole("button", { name: "Guardar ajustes" })
      .hasAttribute("disabled"),
  ).toBe(true);
  expect(screen.getByRole("alert").textContent).toMatch(
    /márgenes deben disminuir/,
  );
  fireEvent.change(screen.getByLabelText("Margen Medio Mayoreo"), {
    target: { value: "25" },
  });
  fireEvent.change(screen.getByLabelText("Mezcla VEL-01"), {
    target: { value: "20" },
  });
  await waitFor(() =>
    expect(screen.getByRole("alert").textContent).toMatch(/100%/),
  );
  fireEvent.change(screen.getByLabelText("Margen Menudeo"), {
    target: { value: "100" },
  });
  expect(
    screen
      .getByRole("button", { name: "Guardar ajustes" })
      .hasAttribute("disabled"),
  ).toBe(true);
});
