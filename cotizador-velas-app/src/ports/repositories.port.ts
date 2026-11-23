import type {
  Settings,
  Material,
  CandleModel,
  PricingTier,
  FixedCost,
  Client,
  Quote,
  QuoteStatus,
  Backup,
  DataSet,
} from "../domain/types";
export interface IRepository<T> {
  list(): Promise<T[]>;
  save(value: T): Promise<void>;
}
export interface ISettingsRepo {
  get(): Promise<Settings | null>;
  save(settings: Settings): Promise<void>;
}
export interface IMaterialRepo extends IRepository<Material> {
  deactivate(id: string): Promise<void>;
}
export interface IModelRepo extends IRepository<CandleModel> {
  deactivate(id: string): Promise<void>;
  saveMix(models: CandleModel[]): Promise<void>;
}
export interface IPricingRepo extends IRepository<PricingTier> {
  saveAll(tiers: PricingTier[], settings: Settings): Promise<void>;
}
export interface IClientRepo extends IRepository<Client> {
  remove(id: string): Promise<void>;
}
export interface IQuoteRepo {
  page(
    cursor?: string,
    filter?: { status?: string; clientId?: string; folio?: string },
  ): Promise<{ items: Quote[]; nextCursor?: string }>;
  create(quote: Quote): Promise<Quote>;
  setStatus(id: string, status: QuoteStatus): Promise<void>;
}
export interface IBackupRepo {
  export(): Promise<Backup>;
  restore(backup: Backup): Promise<void>;
  seed(): Promise<void>;
}
export interface Repositories {
  settings: ISettingsRepo;
  materials: IMaterialRepo;
  models: IModelRepo;
  pricing: IPricingRepo;
  fixedCosts: IRepository<FixedCost>;
  clients: IClientRepo;
  quotes: IQuoteRepo;
  backup: IBackupRepo;
}
export type Catalog = Omit<DataSet, "quotes" | "counter">;
