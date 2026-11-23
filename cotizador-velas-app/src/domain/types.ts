export const categories = [
  "Insumos directos",
  "Empaque",
  "Costos indirectos",
] as const;
export const units = [
  "g",
  "kg",
  "ml",
  "L",
  "pza",
  "m",
  "kWh",
  "min",
  "hr",
  "vela",
] as const;
export type Category = (typeof categories)[number];
export type Unit = (typeof units)[number];
export type Num = string;
export interface Material {
  id: string;
  code: string;
  name: string;
  category: Category;
  unit: Unit;
  quantityPurchased: Num;
  totalPrice: Num;
  isWax: boolean;
  systemRole: "NONE" | "ENERGY" | "LABOR";
  isActive: boolean;
  supplierName?: string | null;
}
export interface BatchConfig {
  candlesPerBatch: number;
  meltPourMinutesBatch: Num;
  unmoldPackMinutesBatch: Num;
  curingHoursPassive: Num;
  energyKwhBatch: Num;
}
export interface RecipeItem {
  modelId: string;
  materialId: string;
  quantityPerCandle: Num;
}
export interface CandleModel {
  id: string;
  code: string;
  name: string;
  presentation: string;
  batchConfig: BatchConfig;
  recipeItems: RecipeItem[];
  salesMixPct: Num;
  imageUrl: string | null;
  imagePublicId: string | null;
  isReferenceTemplate: boolean;
  isActive: boolean;
}
export interface PricingTier {
  id: string;
  name: string;
  minQty: number;
  maxQty: number | null;
  marginPct: Num;
  isRetailBase: boolean;
  description: string;
  sortOrder: number;
}
export interface FixedCost {
  id: string;
  name: string;
  monthlyAmount: Num;
}
export interface Settings {
  id: "global";
  currencyCode: "MXN";
  defaultMarginPct: Num;
  defaultIvaPct: Num;
  dropsPerMl: Num;
  maxDropsPer100gWax: Num;
  monthlyTargetProfit: Num;
  activeMixChannel: string;
  businessName: string;
  businessLogoUrl: string | null;
  businessLogoPublicId: string | null;
  quoteDefaultNotes: string;
}
export interface Client {
  id: string;
  name: string;
  phoneWhatsapp: string;
  email: string;
  notes: string;
}
export interface CostLine {
  materialId: string;
  name: string;
  category: Category;
  unit: Unit;
  quantityPurchased: Num;
  totalPrice: Num;
  unitCost: Num;
  quantityPerCandle: Num;
  cost: Num;
  profit: Num;
}
export const statuses = [
  "BORRADOR",
  "ENVIADA",
  "ACEPTADA",
  "CANCELADA",
] as const;
export type QuoteStatus = (typeof statuses)[number];
export interface QuoteItem {
  id: string;
  quoteId: string;
  modelId: string;
  modelName: string;
  presentation: string;
  imageUrl: string | null;
  quantity: number;
  unitPrice: Num;
  subtotal: Num;
}
export interface Quote {
  id: string;
  folio: string;
  status: QuoteStatus;
  clientId: string | null;
  clientSnapshot: Client | null;
  pricingTierName: string;
  marginPct: Num;
  ivaPct: Num;
  items: QuoteItem[];
  costBreakdownSnapshot: CostLine[];
  subtotal: Num;
  iva: Num;
  total: Num;
  productionCost: Num;
  profit: Num;
  businessSnapshot: { name: string; logoUrl: string | null };
  notes: string;
  createdAt: string;
  updatedAt: string;
  createdByEmail: string;
}
export interface DataSet {
  settings: Settings | null;
  materials: Material[];
  models: CandleModel[];
  pricingTiers: PricingTier[];
  fixedCosts: FixedCost[];
  clients: Client[];
  quotes: Quote[];
  counter: { year: number; seq: number };
}
export interface Backup {
  version: 1;
  exportedAt: string;
  data: DataSet;
}
export interface User {
  uid: string;
  email: string;
  emailVerified: boolean;
}
