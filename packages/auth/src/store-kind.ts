import { TalakWeb3Error, AUTH_ERROR_CODES } from "@talak-web3/errors";

/** Brand kinds for production safety checks (avoid constructor.name). */
export type TalakStoreKind = "memory" | "redis" | "custom";

export const TALAK_STORE_KIND = Symbol.for("talak.web3.storeKind");

export type StoreKindCarrier = {
  readonly [TALAK_STORE_KIND]?: TalakStoreKind;
  /** Optional string brand for JSON-friendly introspection */
  readonly talakStoreKind?: TalakStoreKind;
};

export function getStoreKind(store: unknown): TalakStoreKind {
  if (!store || typeof store !== "object") return "custom";
  const s = store as StoreKindCarrier;
  return s[TALAK_STORE_KIND] ?? s.talakStoreKind ?? "custom";
}

export function isMemoryStore(store: unknown): boolean {
  return getStoreKind(store) === "memory";
}

export function assertProductionSafeStores(
  stores: { nonceStore: unknown; refreshStore: unknown; revocationStore: unknown },
  opts: { allowInsecureMemoryStores?: boolean } = {},
): void {
  if (opts.allowInsecureMemoryStores) return;
  if (typeof process !== "undefined" && process.env?.["NODE_ENV"] !== "production") return;

  const bad: string[] = [];
  if (isMemoryStore(stores.nonceStore)) bad.push("nonceStore");
  if (isMemoryStore(stores.refreshStore)) bad.push("refreshStore");
  if (isMemoryStore(stores.revocationStore)) bad.push("revocationStore");

  if (bad.length > 0) {
    throw new TalakWeb3Error(
      `Production forbids in-memory auth stores (${bad.join(", ")}). Use Redis stores from @talak-web3/auth/stores or set allowInsecureMemoryStores only for controlled tests.`,
      { code: AUTH_ERROR_CODES.STORES_MISSING, status: 500, data: { stores: bad } },
    );
  }
}
