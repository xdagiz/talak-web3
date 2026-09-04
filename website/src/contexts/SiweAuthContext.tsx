import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import {
  connectAndLinkWallet,
  unlinkWallet as siweUnlinkWallet,
  isWalletAvailable,
  detectWalletName,
  getCurrentChainId,
} from "@/lib/siwe";

/**
 * SIWE (wallet) auth context.
 *
 * Coexists with the Supabase AuthContext: the Supabase user remains the source
 * of truth for the account (email/password), while this context tracks the
 * linked browser wallet + an in-browser SIWE session. Since this is a static
 * SPA there is no JWT server — "authentication" means a verified EIP-4361
 * signature persisted as a Supabase session row.
 */

export interface SiweLinkResult {
  address: string;
  chainId: number;
  message: string;
  signature: string;
  nonce: string;
  walletId: string | null;
  sessionId: string | null;
}

interface SiweAuthContextType {
  connectedAddr: string | null;
  activeChain: number | null;
  isWalletConnected: boolean;
  siweLoading: boolean;
  siweError: string | null;
  lastSiwe: SiweLinkResult | null;
  linkWallet: (opts?: { setPrimaryIfFirst?: boolean }) => Promise<SiweLinkResult>;
  unlinkWallet: (walletId: string) => Promise<void>;
  refreshChain: () => Promise<void>;
}

const SiweAuthContext = createContext<SiweAuthContextType | undefined>(undefined);

export const SiweAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [connectedAddr, setConnectedAddr] = useState<string | null>(null);
  const [activeChain, setActiveChain] = useState<number | null>(null);
  const [siweLoading, setSiweLoading] = useState(false);
  const [siweError, setSiweError] = useState<string | null>(null);
  const [lastSiwe, setLastSiwe] = useState<SiweLinkResult | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // On mount, request the current chain id (best-effort) and listen to
  // wallet account/chain changes.
  useEffect(() => {
    if (!isWalletAvailable()) return;
    let cancelled = false;
    (async () => {
      const id = await getCurrentChainId().catch(() => null);
      if (!cancelled && id != null) setActiveChain(id);
    })();
    const handleChain = (_args: unknown) => {
      const hex = _args as string;
      setActiveChain(parseInt(hex, 16));
    };
    const handleAccounts = (_args: unknown) => {
      const accts = _args as string[];
      setConnectedAddr(accts?.[0]?.toLowerCase() ?? null);
    };
    window.ethereum?.on?.("chainChanged", handleChain);
    window.ethereum?.on?.("accountsChanged", handleAccounts);
    return () => {
      cancelled = true;
      window.ethereum?.removeListener?.("chainChanged", handleChain);
      window.ethereum?.removeListener?.("accountsChanged", handleAccounts);
    };
  }, []);

  const refreshChain = useCallback(async () => {
    const id = await getCurrentChainId().catch(() => null);
    if (id != null) setActiveChain(id);
  }, []);

  const linkWallet = useCallback(
    async (opts?: { setPrimaryIfFirst?: boolean }): Promise<SiweLinkResult> => {
      if (!user) throw new Error("Sign in with a talak-web3 account first.");
      if (!isWalletAvailable()) {
        throw new Error("No browser wallet detected. Install MetaMask or another EVM wallet.");
      }
      setSiweLoading(true);
      setSiweError(null);
      try {
        const result = await connectAndLinkWallet({
          userId: user.id,
          setPrimaryIfFirst: opts?.setPrimaryIfFirst,
        });
        if (!mounted.current) return result;
        setConnectedAddr(result.address);
        setActiveChain(result.chainId);
        setLastSiwe(result);
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "SIWE connect failed.";
        if (mounted.current) setSiweError(msg);
        throw err;
      } finally {
        if (mounted.current) setSiweLoading(false);
      }
    },
    [user],
  );

  const unlinkWallet = useCallback(
    async (walletId: string) => {
      if (!user) return;
      setSiweLoading(true);
      setSiweError(null);
      try {
        await siweUnlinkWallet(user.id, walletId);
        if (mounted.current) {
          setLastSiwe((prev) => (prev?.walletId === walletId ? null : prev));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to unlink wallet.";
        if (mounted.current) setSiweError(msg);
        throw err;
      } finally {
        if (mounted.current) setSiweLoading(false);
      }
    },
    [user],
  );

  const isWalletConnected = useMemo(() => Boolean(connectedAddr), [connectedAddr]);

  const value = useMemo<SiweAuthContextType>(
    () => ({
      connectedAddr,
      activeChain,
      isWalletConnected,
      siweLoading,
      siweError,
      lastSiwe,
      linkWallet,
      unlinkWallet,
      refreshChain,
    }),
    [connectedAddr, activeChain, isWalletConnected, siweLoading, siweError, lastSiwe, linkWallet, unlinkWallet, refreshChain],
  );

  return <SiweAuthContext.Provider value={value}>{children}</SiweAuthContext.Provider>;
};

export const useSiweAuth = () => {
  const ctx = useContext(SiweAuthContext);
  if (!ctx) throw new Error("useSiweAuth must be used within SiweAuthProvider");
  return ctx;
};

export { detectWalletName };
