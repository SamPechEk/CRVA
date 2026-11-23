import { createContext, useContext, useState, type ReactNode } from "react";
import type { Settings } from "../domain/types";
const Context = createContext<{
  modelId: string;
  setModelId: (v: string) => void;
  margin: string;
  setMargin: (v: string) => void;
  iva: string;
  setIva: (v: string) => void;
}>(null!);
export function WorkspaceProvider({
  settings,
  children,
}: {
  settings: Settings;
  children: ReactNode;
}) {
  const [modelId, setModelId] = useState("VEL-01"),
    [margin, setMargin] = useState(settings.defaultMarginPct),
    [iva, setIva] = useState(settings.defaultIvaPct);
  return (
    <Context.Provider
      value={{ modelId, setModelId, margin, setMargin, iva, setIva }}
    >
      {children}
    </Context.Provider>
  );
}
export const useWorkspace = () => useContext(Context);
