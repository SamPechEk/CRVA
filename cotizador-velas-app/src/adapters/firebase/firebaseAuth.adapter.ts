import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  type Auth,
} from "firebase/auth";
import type { IAuth } from "../../ports/auth.port";
import { allowedEmails } from "../../config/env";
export function firebaseAuth(auth: Auth): IAuth {
  return {
    observe(fn) {
      return onAuthStateChanged(auth, (user) => {
        if (
          user &&
          user.emailVerified &&
          allowedEmails.includes(user.email?.toLowerCase() ?? "")
        ) {
          fn({ uid: user.uid, email: user.email!, emailVerified: true });
        } else {
          fn(null);
          if (user) void signOut(auth);
        }
      });
    },
    async signIn(email, password) {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      if (
        !user.emailVerified ||
        !allowedEmails.includes(user.email?.toLowerCase() ?? "")
      ) {
        await signOut(auth);
        throw Error(
          "Acceso denegado. Usa uno de los dos correos autorizados y verifica tu correo.",
        );
      }
    },
    async signInGoogle() {
      const { user } = await signInWithPopup(auth, new GoogleAuthProvider());
      if (!allowedEmails.includes(user.email?.toLowerCase() ?? "")) {
        await signOut(auth);
        throw Error("Este correo no está autorizado");
      }
    },
    signOut: () => signOut(auth),
  };
}
