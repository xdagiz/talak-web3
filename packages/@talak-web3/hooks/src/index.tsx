import type { TalakWeb3Instance, IHookRegistry } from "@talak-web3/types";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type AnyHandler = (data: unknown) => void;

export class HookRegistry<Events extends Record<string, unknown>> implements IHookRegistry<Events> {
  private readonly map = new Map<keyof Events, Set<AnyHandler>>();

  on<K extends keyof Events>(event: K, handler: (data: Events[K]) => void): () => void {
    let handlers = this.map.get(event);
    if (!handlers) {
      handlers = new Set<AnyHandler>();
      this.map.set(event, handlers);
    }
    handlers.add(handler as AnyHandler);
    return () => this.off(event, handler);
  }

  off<K extends keyof Events>(event: K, handler: (data: Events[K]) => void): void {
    this.map.get(event)?.delete(handler as AnyHandler);
  }

  emit<K extends keyof Events>(event: K, data: Events[K]): void {
    const handlers = this.map.get(event);
    if (!handlers) return;
    for (const h of handlers) {
      try {
        h(data as unknown);
      } catch (err) {
        console.error(`[HookRegistry] Error in handler for "${String(event)}":`, err);
      }
    }
  }

  clear(): void {
    this.map.clear();
  }
}

const TalakWeb3ReactContext = createContext<TalakWeb3Instance | null>(null);

export interface TalakWeb3ProviderProps {
  instance: TalakWeb3Instance;
  children: ReactNode;
}

export function TalakWeb3Provider({ instance, children }: TalakWeb3ProviderProps) {
  return (
    <TalakWeb3ReactContext.Provider value={instance}>{children}</TalakWeb3ReactContext.Provider>
  );
}

export function useTalakWeb3(): TalakWeb3Instance {
  const ctx = useContext(TalakWeb3ReactContext);
  if (!ctx) throw new Error("useTalakWeb3 must be used within a TalakWeb3Provider");
  return ctx;
}

export function useChain() {
  const instance = useTalakWeb3();
  const [chainId, setChainId] = useState<number>(instance.config.chains[0]?.id ?? 1);

  useEffect(() => {
    return instance.context.hooks.on("chain-changed", setChainId);
  }, [instance]);

  return {
    chainId,
    chains: instance.config.chains,
    switchChain: (id: number) => instance.context.hooks.emit("chain-switch", id),
  };
}

export function useAccount() {
  const instance = useTalakWeb3();
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    return instance.context.hooks.on("account-changed", setAddress);
  }, [instance]);

  return {
    address,
    isConnected: address !== null,
    connect: (addr: string) => instance.context.hooks.emit("account-changed", addr),
    disconnect: () => instance.context.hooks.emit("account-changed", null),
  };
}

export function useRpc() {
  const instance = useTalakWeb3();
  return {
    request: <T = unknown,>(method: string, params: unknown[] = []) =>
      instance.context.rpc.request<T>(method, params),
  };
}

export function useGasless() {
  const instance = useTalakWeb3();
  const [loading, setLoading] = useState(false);
  const [lastHash, setLastHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sendGasless = async (to: string, callData: string) => {
    setLoading(true);
    setError(null);
    try {
      const aa = (instance.context as unknown as Record<string, unknown>)["aa"] as
        | { sendGasless(to: string, data: string): Promise<string> }
        | undefined;
      if (!aa) throw new Error("AccountAbstraction plugin not loaded");
      const hash = await aa.sendGasless(to, callData);
      setLastHash(hash);
      return hash;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { sendGasless, loading, lastHash, error };
}

export function useIdentity() {
  const instance = useTalakWeb3();
  const [profile, setProfile] = useState<{ did?: string; ens?: string; address?: string } | null>(
    null,
  );
  const [loading, setLoading] = useState(false);

  const resolve = async (addressOrDid: string) => {
    setLoading(true);
    try {
      const identity = (instance.context as unknown as Record<string, unknown>)["identity"] as
        | { resolve(input: string): Promise<{ did?: string; ens?: string; address?: string }> }
        | undefined;
      if (!identity) {
        setProfile({ address: addressOrDid });
        return;
      }
      const p = await identity.resolve(addressOrDid);
      setProfile(p);
    } finally {
      setLoading(false);
    }
  };

  return { profile, loading, resolve };
}
