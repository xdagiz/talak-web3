"use client";

import type { SessionPayload } from "@talak-web3/types";
import { useCallback, useContext, useEffect, useRef, useState } from "react";

import { ClientContext, StoreContext } from "../context.js";
import { assertContext } from "../shared/assert.js";

export interface UseSessionReturn {
  session: SessionPayload | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  clear: () => void;
}

interface SessionState {
  session: SessionPayload | null;
  isLoading: boolean;
  error: Error | null;
}

const initialState: SessionState = {
  session: null,
  isLoading: true,
  error: null,
};

export function useSession(): UseSessionReturn {
  const store = useContext(StoreContext);
  assertContext(store, "StoreContext");

  const client = useContext(ClientContext);
  const [state, setState] = useState<SessionState>(initialState);

  const resolveIdRef = useRef(0);

  const resolve = useCallback(async (): Promise<void> => {
    if (!client) {
      setState({ session: null, isLoading: false, error: null });
      return;
    }

    const id = ++resolveIdRef.current;
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      const result = await client.verifySession();
      if (id !== resolveIdRef.current) return;
      if (result.ok && result.payload) {
        setState({
          session: {
            address: result.payload.address,
            chainId: result.payload.chainId,
          },
          isLoading: false,
          error: null,
        });
      } else {
        setState({ session: null, isLoading: false, error: null });
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      if (id !== resolveIdRef.current) return;
      console.error("[useSession] verifySession failed:", error);
      setState({ session: null, isLoading: false, error });
    }
  }, [client]);

  useEffect(() => {
    void resolve();
  }, [resolve]);

  useEffect(() => {
    const unsubscribe = store.instance.hooks.on("account-changed", () => {
      void resolve();
    });
    return unsubscribe;
  }, [store, resolve]);

  const refresh = useCallback(async () => {
    await resolve();
  }, [resolve]);

  const clear = useCallback(() => {
    setState({ session: null, isLoading: false, error: null });
  }, []);

  return {
    session: state.session,
    isLoading: state.isLoading,
    isAuthenticated: state.session !== null,
    error: state.error,
    refresh,
    clear,
  };
}
