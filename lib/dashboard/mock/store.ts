// MOCK IMPLEMENTATION: replace the body with the real Prisma query. Keep the signature.
// (In-memory store backing the mock functions. Delete with the rest of mock/.)
//
// One store per server process, cached on globalThis so it survives dev hot
// reloads (module re-evaluation) and resets when the server restarts. Mock
// mutations (Server Actions, Step 2+) change these objects in place, and the
// next read sees the change, like a database would.
//
// Only lib/dashboard/*.ts may import this. Pages and components never do.
import { buildFixtures, type MockFixtures } from "./fixtures";

const STORE_KEY = Symbol.for("kennelos.dashboard.mockStore");

type GlobalWithStore = typeof globalThis & { [STORE_KEY]?: MockFixtures };

export function getMockStore(): MockFixtures {
    const g = globalThis as GlobalWithStore;
    g[STORE_KEY] ??= buildFixtures();
    return g[STORE_KEY];
}

/** Deep copy so callers can't mutate the store by accident through a read. */
export function snapshot<T>(value: T): T {
    return structuredClone(value);
}
