import { env, configured } from "../config/env";
import { createFirebaseClient } from "../adapters/firebase/firebaseClient";
import { firebaseAuth } from "../adapters/firebase/firebaseAuth.adapter";
import { firestoreRepositories } from "../adapters/firebase/firestore.repositories";
import { localRepositories } from "../adapters/local/local.adapter";
import { cloudinary } from "../adapters/cloudinary/cloudinary.adapter";
import type { IAuth } from "../ports/auth.port";
import type { Repositories } from "../ports/repositories.port";
export const demo =
  env.VITE_DATA_PROVIDER === "demo" ||
  sessionStorage.getItem("velas-demo") === "true";
let auth: IAuth | null = null,
  repos: Repositories | null = null;
if (demo) {
  repos = localRepositories();
} else if (configured) {
  const client = createFirebaseClient();
  auth = firebaseAuth(client.auth);
  repos = firestoreRepositories(client.db);
}
export const services = { auth, repos, media: cloudinary, demo, configured };
