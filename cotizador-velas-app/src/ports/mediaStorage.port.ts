export interface IMediaStorage {
  uploadImage(file: File): Promise<{ imageUrl: string; imagePublicId: string }>;
  getOptimizedUrl(url: string, mode?: "web" | "pdf"): string;
}
