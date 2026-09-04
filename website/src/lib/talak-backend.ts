import { TalakWeb3Client } from "@talak-web3/client";

const DEFAULT_TALAK_API_BASE_URL = "http://localhost:8787";

export function getTalakApiBaseUrl() {
  const fromEnv = import.meta.env.VITE_TALAK_API_BASE_URL;
  if (!fromEnv || fromEnv.trim().length === 0) {
    return DEFAULT_TALAK_API_BASE_URL;
  }
  return fromEnv;
}

export async function checkTalakBackendHealth() {
  const baseUrl = getTalakApiBaseUrl();
  const res = await fetch(`${baseUrl}/health`);
  if (!res.ok) {
    throw new Error(`Health check failed: HTTP ${res.status}`);
  }
  return res.json() as Promise<{ ok: boolean; now: number }>;
}

export async function checkTalakRpc(chainId = 1) {
  const client = new TalakWeb3Client({ baseUrl: getTalakApiBaseUrl() });
  return client.rpcCall(chainId, "eth_chainId", []);
}
