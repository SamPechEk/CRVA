import { beforeAll, afterAll, it, expect } from "vitest";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  doc,
  setDoc,
  updateDoc,
  getDoc,
  runTransaction,
} from "firebase/firestore";
import { readFileSync } from "node:fs";
import { seedV4 } from "../../domain/seedV4";
import { draftQuote } from "../../services/quoteService";
const enabled = !!process.env.FIRESTORE_EMULATOR_HOST;
let env: RulesTestEnvironment;
beforeAll(async () => {
  if (enabled)
    env = await initializeTestEnvironment({
      projectId: "demo-cotizador",
      firestore: {
        host: "127.0.0.1",
        port: 8787,
        rules: readFileSync("firestore.rules", "utf8"),
      },
    });
});
afterAll(async () => {
  if (env) await env.cleanup();
});
it.skipIf(!enabled)(
  "restringe correos verificados, valida insumos y congela cotizaciones",
  async () => {
    await env.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, "accessUsers", "first"), { active: true });
      await setDoc(doc(db, "accessUsers", "additional"), { active: true });
      await setDoc(doc(db, "accessUsers", "disabled"), { active: false });
      await setDoc(doc(db, "accessUsers", "unverified"), { active: true });
    });
    const a = env
      .authenticatedContext("first", {
        email: "member@example.com",
        email_verified: true,
      })
      .firestore();
    const extra = env
      .authenticatedContext("additional", {
        email: "another@example.com",
        email_verified: true,
      })
      .firestore();
    const bad = env
      .authenticatedContext("other", {
        email: "member@example.com",
        email_verified: true,
      })
      .firestore();
    const disabled = env
      .authenticatedContext("disabled", {
        email: "disabled@example.com",
        email_verified: true,
      })
      .firestore();
    const unverified = env
      .authenticatedContext("unverified", {
        email: "unverified@example.com",
        email_verified: false,
      })
      .firestore();
    await assertFails(getDoc(doc(bad, "settings", "global")));
    await assertFails(getDoc(doc(disabled, "settings", "global")));
    await assertFails(getDoc(doc(unverified, "settings", "global")));
    await assertFails(
      getDoc(
        doc(env.unauthenticatedContext().firestore(), "settings", "global"),
      ),
    );
    await assertSucceeds(getDoc(doc(a, "accessUsers", "first")));
    await assertFails(getDoc(doc(a, "accessUsers", "additional")));
    await assertFails(
      setDoc(doc(bad, "accessUsers", "other"), { active: true }),
    );
    await assertFails(
      updateDoc(doc(a, "accessUsers", "first"), { active: false }),
    );
    await assertSucceeds(setDoc(doc(a, "settings", "global"), seedV4.settings));
    await assertFails(
      setDoc(doc(a, "materials", "INS-01"), {
        ...seedV4.materials[0],
        quantityPurchased: "0",
      }),
    );
    await assertSucceeds(
      setDoc(doc(a, "materials", "INS-01"), seedV4.materials[0]),
    );
    const q = draftQuote(
      seedV4.models[0],
      seedV4.materials,
      seedV4.settings!,
      1,
      ".3",
      "0",
      null,
      "",
      "member@example.com",
      "Menudeo",
    );
    await assertSucceeds(setDoc(doc(a, "quotes", q.id), q));
    await assertFails(updateDoc(doc(a, "quotes", q.id), { total: "1" }));
    await assertSucceeds(
      updateDoc(doc(a, "quotes", q.id), {
        status: "ACEPTADA",
        updatedAt: new Date().toISOString(),
      }),
    );
    await assertFails(setDoc(doc(bad, "quotes", q.id), q));
    await assertSucceeds(getDoc(doc(extra, "settings", "global")));
    await env.withSecurityRulesDisabled(async (context) => {
      await updateDoc(doc(context.firestore(), "accessUsers", "additional"), {
        active: false,
      });
    });
    await assertFails(getDoc(doc(extra, "settings", "global")));
    const ref = doc(a, "counters", "quotes");
    await setDoc(ref, { year: 2026, seq: 0 });
    const next = () =>
      runTransaction(a, async (tx) => {
        const d = await tx.get(ref);
        const seq = d.data()!.seq + 1;
        tx.set(ref, { year: 2026, seq });
        return seq;
      });
    const results = await Promise.all([next(), next()]);
    expect(new Set(results).size).toBe(2);
  },
);
