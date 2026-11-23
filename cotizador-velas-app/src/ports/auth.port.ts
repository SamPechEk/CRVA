import type { User } from "../domain/types";
export interface IAuth {
  observe(fn: (user: User | null) => void): () => void;
  signIn(email: string, password: string): Promise<void>;
  signInGoogle(): Promise<void>;
  signOut(): Promise<void>;
}
