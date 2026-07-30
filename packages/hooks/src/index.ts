/**
 * Root provider that wraps your React tree with TalakWeb3 state.
 *
 * @param props.provider - TalakWeb3 instance to expose via context.
 * @param props.children - React children to render inside the provider.
 */
export { TalakWeb3Provider } from "./provider.js";
export type { TalakWeb3ProviderProps } from "./provider.js";

/**
 * Hook to access the connected wallet account and chain information.
 *
 * @returns Current wallet address, connection status, chain ID, and connect/disconnect actions.
 */
export { useAccount } from "./hooks/use-account.js";
export type { UseAccountReturn } from "./hooks/use-account.js";

/**
 * Hook to fetch the native token balance for an address.
 *
 * @param params.address - Address to query the balance for.
 * @param params.chainId - Optional chain ID; defaults to the active chain.
 * @returns Balance in wei, loading state, error message, and a refetch function.
 */
export { useBalance } from "./hooks/use-balance.js";
export type { UseBalanceParams, UseBalanceReturn } from "./hooks/use-balance.js";

/**
 * Hook to load and track the current authenticated session.
 *
 * @returns Current session payload (or null), loading state, authentication flag, error, and refresh/clear actions.
 */
export { useSession } from "./hooks/use-session.js";
export type { UseSessionReturn } from "./hooks/use-session.js";

/**
 * Escape-hatch hook that returns the full TalakWeb3 SDK instance.
 *
 * Use for advanced cases not covered by higher-level hooks (e.g., plugin access).
 */
export { useTalakWeb3 } from "./shared/use-talak.js";

/**
 * Hook that returns the TalakWeb3 browser HTTP client for direct RPC calls.
 */
export { useClient } from "./shared/use-talak.js";

/**
 * Reactive store that bridges the TalakWeb3 SDK to React's useSyncExternalStore.
 */
export { TalakWeb3Store } from "./store.js";
export type { TalakWeb3State } from "./store.js";

/**
 * React context for the TalakWeb3 store; used internally by hooks.
 */
export { StoreContext } from "./context.js";

/**
 * React context for the TalakWeb3 browser HTTP client; used internally by hooks.
 */
export { ClientContext } from "./context.js";
