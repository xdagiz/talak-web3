/**
 * SIWE (EIP-4361) helpers — purely client-side message construction and
 * browser wallet glue. Verification is intentionally NOT done in the
 * browser; the canonical pattern is to verify the signed message on a
 * server with the user's public address. We expose the helpers so the
 * UI can demonstrate the full flow against window.ethereum.
 */

import { supabase } from "@/integrations/supabase/client";
import { getChainById } from "@/data/chains";
import {
  parseSiweMessage,
  verifySiweSignature,
  generateSessionToken,
} from "./siwe-verify";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on?: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
      isMetaMask?: boolean;
      isCoinbaseWallet?: boolean;
      isRainbow?: boolean;
      isPhantom?: boolean;
      providers?: unknown[];
    };
  }
}

export type SiweMessageInput = {
  domain: string;
  address: string;
  uri: string;
  chainId: number;
  nonce: string;
  issuedAt: string;
  statement?: string;
};

export function isWalletAvailable(): boolean {
  return typeof window !== "undefined" && Boolean(window.ethereum);
}

export function detectWalletName(): string {
  if (typeof window === "undefined" || !window.ethereum) return "browser wallet";
  if (window.ethereum.isMetaMask) return "MetaMask";
  if (window.ethereum.isCoinbaseWallet) return "Coinbase Wallet";
  if (window.ethereum.isRainbow) return "Rainbow";
  if (window.ethereum.isPhantom) return "Phantom";
  return "browser wallet";
}

export function buildSiweMessage(input: SiweMessageInput): string {
  const { domain, address, uri, chainId, nonce, issuedAt } = input;
  const statement =
    input.statement ?? "Sign in with Ethereum to talak-web3 to authenticate this session.";
  return [
    `${domain} wants you to sign in with your Ethereum account:`,
    address,
    "",
    statement,
    "",
    `URI: ${uri}`,
    "Version: 1",
    `Chain ID: ${chainId}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
  ].join("\n");
}

export function generateNonce(): string {
  // 17 chars, EIP-4361 minimum is 8
  const arr = new Uint8Array(12);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(36).padStart(2, "0")).join("").slice(0, 17);
}

export async function requestAccounts(): Promise<string[]> {
  if (!window.ethereum) throw new Error("No browser wallet detected.");
  const accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];
  return accounts ?? [];
}

export async function getCurrentChainId(): Promise<number | null> {
  if (!window.ethereum) return null;
  try {
    const hex = (await window.ethereum.request({ method: "eth_chainId" })) as string;
    return parseInt(hex, 16);
  } catch {
    return null;
  }
}

export async function switchChain(chainId: number): Promise<boolean> {
  if (!window.ethereum) return false;
  const chain = getChainById(chainId);
  if (!chain) return false;
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chain.hex }],
    });
    return true;
  } catch (err: unknown) {
    const code = (err as { code?: number })?.code;
    // 4902 = chain not added; try to add it
    if (code === 4902) {
      try {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: chain.hex,
            chainName: chain.name,
            rpcUrls: [chain.rpc],
            blockExplorerUrls: [chain.explorer],
            nativeCurrency: { name: chain.symbol, symbol: chain.symbol, decimals: 18 },
          }],
        });
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
}

export async function signMessage(address: string, message: string): Promise<string> {
  if (!window.ethereum) throw new Error("No browser wallet detected.");
  const signature = (await window.ethereum.request({
    method: "personal_sign",
    params: [message, address],
  })) as string;
  return signature;
}

/**
 * High-level connect helper: requests accounts, builds + signs an EIP-4361
 * message, verifies the signature in-browser, persists the linked wallet to
 * Supabase, and records a session row (audit trail for the Sessions table).
 *
 * Returns the full SIWE payload plus the created session id and token hash.
 */
export async function connectAndLinkWallet(opts: {
  userId: string;
  setPrimaryIfFirst?: boolean;
}): Promise<{
  address: string;
  chainId: number;
  message: string;
  signature: string;
  nonce: string;
  walletId: string | null;
  sessionId: string | null;
}> {
  const accounts = await requestAccounts();
  const address = (accounts[0] ?? "").toLowerCase();
  if (!address) throw new Error("No account returned by wallet.");
  const chainId = (await getCurrentChainId()) ?? 1;

  const nonce = generateNonce();
  const issuedAt = new Date().toISOString();
  const message = buildSiweMessage({
    domain: window.location.host,
    address,
    uri: window.location.origin,
    chainId,
    nonce,
    issuedAt,
  });

  const signature = await signMessage(address, message);

  // Verify the signature in-browser (static SPA has no server-side verifier).
  // Throws if the address didn't actually sign the message — prevents linking
  // a wallet the user does not control.
  try {
    await verifySiweSignature(message, signature, address);
  } catch (err) {
    // rethrow with a friendly message
    throw new Error(err instanceof Error ? err.message : "Signature verification failed.");
  }

  // Record the nonce for audit (nonces table accepts anon inserts).
  try {
    await supabase.from("nonces").insert({
      nonce,
      address,
      chain_id: chainId,
      issued_at: issuedAt,
    });
  } catch { /* nonces table may have stricter constraints — non-fatal */ }

  // Upsert wallet for the user.
  let walletId: string | null = null;
  const existing = await supabase
    .from("wallets")
    .select("id, is_primary")
    .eq("user_id", opts.userId)
    .eq("address", address)
    .maybeSingle();

  if (existing.data) {
    walletId = existing.data.id;
    await supabase.from("wallets").update({ chain_id: chainId }).eq("id", existing.data.id);
  } else {
    const totalRes = await supabase
      .from("wallets")
      .select("id", { count: "exact", head: true })
      .eq("user_id", opts.userId);
    const isPrimary = opts.setPrimaryIfFirst === false ? false : (totalRes.count ?? 0) === 0;
    const ins = await supabase.from("wallets").insert({
      user_id: opts.userId,
      address,
      chain_id: chainId,
      is_primary: isPrimary,
      label: detectWalletName(),
    }).select("id").single();
    walletId = ins.data?.id ?? null;
  }

  // Persist a session row (only the SHA-256 hash of the token is stored,
  // so leakage of the DB does not expose live sessions). Non-fatal.
  let sessionId: string | null = null;
  try {
    const { tokenHash } = await generateSessionToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const ses = await supabase.from("sessions").insert({
      user_id: opts.userId,
      wallet_id: walletId,
      token_hash: tokenHash,
      user_agent: navigator.userAgent,
      expires_at: expiresAt,
    }).select("id").single();
    sessionId = ses.data?.id ?? null;
  } catch (err) {
    console.warn("[siwe] Failed to persist session row:", err);
  }

  // Log the SIWE attempt to rpc_logs for the realtime dashboard.
  try {
    await supabase.from("rpc_logs").insert({
      user_id: opts.userId,
      method: "siwe.signIn",
      provider: "siwe",
      chain_id: chainId,
      status: "200",
      latency_ms: 0,
    });
  } catch { /* logs may be append-only via RLS */ }

  return { address, chainId, message, signature, nonce, walletId, sessionId };
}

/**
 * Unlink a wallet from the user: removes the wallet row and revokes any
 * sessions associated with it.
 */
export async function unlinkWallet(userId: string, walletId: string): Promise<void> {
  try {
    await supabase
      .from("sessions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("wallet_id", walletId)
      .eq("revoked_at", null);
  } catch (err) {
    console.warn("[siwe] Failed to revoke sessions for wallet:", err);
  }
  const { error } = await supabase.from("wallets").delete().eq("id", walletId).eq("user_id", userId);
  if (error) throw error;
}
