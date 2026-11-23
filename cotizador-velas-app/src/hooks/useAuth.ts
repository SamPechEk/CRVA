import { useEffect, useState } from "react";
import { services } from "../services/container";
import type { User } from "../domain/types";
export function useAuth() {
  const [user, setUser] = useState<User | null>(
      services.demo ? { uid: "demo", email: "", emailVerified: true } : null,
    ),
    [loading, setLoading] = useState(!!services.auth);
  useEffect(() => {
    if (!services.auth) return;
    return services.auth.observe((u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);
  return { user, loading };
}
