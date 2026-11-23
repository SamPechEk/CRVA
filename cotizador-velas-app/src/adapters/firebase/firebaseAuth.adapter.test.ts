import { beforeEach, it, expect, vi } from "vitest";
const sdk = vi.hoisted(() => ({
  getDoc: vi.fn(),
  signIn: vi.fn(),
  google: vi.fn(),
  signOut: vi.fn(),
  verification: vi.fn(),
  observe: vi.fn(),
}));
vi.mock("firebase/auth", () => ({
  onAuthStateChanged: sdk.observe,
  signInWithEmailAndPassword: sdk.signIn,
  signInWithPopup: sdk.google,
  signOut: sdk.signOut,
  sendEmailVerification: sdk.verification,
  GoogleAuthProvider: class {},
}));
vi.mock("firebase/firestore", () => ({
  doc: (_db: unknown, ...parts: string[]) => parts.join("/"),
  getDoc: sdk.getDoc,
}));
import { firebaseAuth } from "./firebaseAuth.adapter";
const user = {
  uid: "member-uid",
  email: "member@example.com",
  emailVerified: true,
};
const client = () => firebaseAuth({ currentUser: user } as never, {} as never);
beforeEach(() => {
  vi.resetAllMocks();
  sdk.signIn.mockResolvedValue({ user });
  sdk.google.mockResolvedValue({ user });
  sdk.signOut.mockResolvedValue(undefined);
  sdk.verification.mockResolvedValue(undefined);
  sdk.getDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({ active: true }),
  });
});
it("autoriza por UID activo, sin lista de correos compilada", async () => {
  await client().signIn(user.email, "test-password");
  expect(sdk.getDoc).toHaveBeenCalledWith("accessUsers/member-uid");
  expect(sdk.signOut).not.toHaveBeenCalled();
});
it.each([
  { exists: false, active: true },
  { exists: true, active: false },
  { exists: true, active: "true" },
])("rechaza membresía ausente o inactiva: %o", async ({ exists, active }) => {
  sdk.getDoc.mockResolvedValue({
    exists: () => exists,
    data: () => ({ active }),
  });
  await expect(client().signIn(user.email, "test-password")).rejects.toThrow(
    "aún no tiene acceso",
  );
  expect(sdk.signOut).toHaveBeenCalled();
});
it("Google también requiere membresía activa", async () => {
  sdk.getDoc.mockResolvedValue({ exists: () => false });
  await expect(client().signInGoogle()).rejects.toThrow("aún no tiene acceso");
  expect(sdk.signOut).toHaveBeenCalled();
});
it("envía verificación antes de permitir correo y contraseña", async () => {
  const pending = { ...user, emailVerified: false };
  sdk.signIn.mockResolvedValue({ user: pending });
  await expect(client().signIn(user.email, "test-password")).rejects.toThrow(
    "enlace de verificación",
  );
  expect(sdk.verification).toHaveBeenCalledWith(pending);
  expect(sdk.getDoc).not.toHaveBeenCalled();
  expect(sdk.signOut).toHaveBeenCalled();
});
it("no publica una autorización que termina después de cerrar la suscripción", async () => {
  let done!: (value: unknown) => void;
  const lookup = new Promise((resolve) => {
    done = resolve;
  });
  sdk.getDoc.mockReturnValue(lookup);
  sdk.observe.mockImplementation((_auth, callback) => {
    callback(user);
    return vi.fn();
  });
  const listener = vi.fn(),
    stop = client().observe(listener);
  stop();
  done({ exists: () => true, data: () => ({ active: true }) });
  await lookup;
  await Promise.resolve();
  expect(listener).not.toHaveBeenCalled();
});
