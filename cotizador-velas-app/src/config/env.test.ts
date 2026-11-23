import { afterEach, it, expect, vi } from "vitest";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});
it("configura Firebase sin lista de correos en el frontend", async () => {
  vi.stubEnv("VITE_FIREBASE_API_KEY", "example");
  vi.stubEnv("VITE_FIREBASE_PROJECT_ID", "example");
  vi.stubEnv("VITE_FIREBASE_AUTH_DOMAIN", "example.firebaseapp.com");
  vi.stubEnv("VITE_FIREBASE_APP_ID", "example");
  vi.stubEnv("VITE_ALLOWED_EMAILS", "");
  vi.resetModules();
  expect((await import("./env")).configured).toBe(true);
});
it.each([
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_APP_ID",
])("detecta configuración incompleta: %s", async (key) => {
  for (const name of [
    "VITE_FIREBASE_API_KEY",
    "VITE_FIREBASE_PROJECT_ID",
    "VITE_FIREBASE_AUTH_DOMAIN",
    "VITE_FIREBASE_APP_ID",
  ])
    vi.stubEnv(name, "example");
  vi.stubEnv(key, "");
  vi.resetModules();
  expect((await import("./env")).configured).toBe(false);
});
