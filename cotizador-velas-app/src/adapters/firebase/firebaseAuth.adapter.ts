import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendEmailVerification,
  type Auth,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, type Firestore } from "firebase/firestore";
import type { IAuth } from "../../ports/auth.port";
import type { User } from "../../domain/types";

export function firebaseAuth(auth: Auth, db: Firestore): IAuth {
  async function authorizedUser(user: FirebaseUser): Promise<User> {
    if (!user.emailVerified || !user.email)
      throw Error("Verifica tu correo para entrar.");
    const membership = await getDoc(doc(db, "accessUsers", user.uid));
    if (!membership.exists() || membership.data().active !== true)
      throw Error(
        "Tu cuenta aún no tiene acceso al cotizador. Solicita su habilitación en Firebase.",
      );
    return { uid: user.uid, email: user.email, emailVerified: true };
  }
  async function finishSignIn(user: FirebaseUser) {
    try {
      if (!user.emailVerified) {
        await sendEmailVerification(user);
        throw Error(
          "Te enviamos un enlace de verificación. Revisa tu correo y vuelve a entrar después de verificarlo.",
        );
      }
      await authorizedUser(user);
    } catch (error) {
      await signOut(auth);
      throw error;
    }
  }
  return {
    observe(fn) {
      let generation = 0,
        live = true;
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        const current = ++generation;
        if (!user || !user.emailVerified) {
          fn(null);
          return;
        }
        void authorizedUser(user)
          .then((value) => {
            if (
              live &&
              current === generation &&
              auth.currentUser?.uid === user.uid
            )
              fn(value);
          })
          .catch(() => {
            if (live && current === generation) {
              fn(null);
              if (auth.currentUser?.uid === user.uid) void signOut(auth);
            }
          });
      });
      return () => {
        live = false;
        generation++;
        unsubscribe();
      };
    },
    async signIn(email, password) {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      await finishSignIn(user);
    },
    async signInGoogle() {
      const { user } = await signInWithPopup(auth, new GoogleAuthProvider());
      await finishSignIn(user);
    },
    signOut: () => signOut(auth),
  };
}
