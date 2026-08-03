/** Adapter interface for Ceramic Network profile operations. */
export interface CeramicAdapter {
  createProfile(input: { did: string }): Promise<{ id: string }>;
}

/** Adapter interface for Tableland SQL query operations. */
export interface TablelandAdapter {
  query(sql: string, params?: unknown[]): Promise<unknown[]>;
}

/** Adapter interface for decentralized storage (IPFS, Filecoin, etc.). */
export interface StorageAdapter {
  put(path: string, data: Uint8Array): Promise<{ uri: string }>;
  get(uri: string): Promise<Uint8Array>;
}

export { CeramicPlugin } from "./ceramic";
export { TablelandPlugin } from "./tableland";
export { PinataStorageAdapter, type PinataStorageOptions } from "./storage";
