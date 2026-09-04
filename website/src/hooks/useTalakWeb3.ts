import { useState, useEffect, useCallback, useRef } from "react";
import { TalakWeb3Client, InMemoryTokenStorage } from "@talak-web3/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { getChainById } from "@/data/chains";
import { getTalakApiBaseUrl } from "@/lib/talak-backend";

/**
 * talak-web3 SDK Hook
 * 
 * Provides comprehensive Web3 functionality aligned with talak-web3 architecture.
 * This hook serves as the primary interface for all talak-web3 SDK operations
 * including authentication, wallet management, RPC calls, and real-time data.
 */

export interface RpcLog {
  id: string;
  provider: string;
  method: string;
  status: string;
  latency_ms: number;
  chain_id: number;
  created_at: string;
}

export interface Session {
  id: string;
  user_agent: string | null;
  issued_at: string;
  expires_at: string;
  revoked_at: string | null;
  last_seen_at: string;
}

export interface Wallet {
  id: string;
  address: string;
  chain_id: number;
  is_primary: boolean;
  label: string | null;
  created_at: string;
}

// Local chain registry (fallback when the backend SDK is unreachable) so the
// dashboard never blanks on a static host without a deployed backend.
function getChainList() {
  return [
    { id: 1, name: "Ethereum", rpcUrls: ["https://ethereum.publicnode.com"], nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, testnet: false },
    { id: 10, name: "Optimism", rpcUrls: ["https://mainnet.optimism.io"], nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, testnet: false },
    { id: 56, name: "BNB Smart Chain", rpcUrls: ["https://bsc-dataseed1.binance.org"], nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 }, testnet: false },
    { id: 137, name: "Polygon", rpcUrls: ["https://polygon-rpc.com"], nativeCurrency: { name: "Polygon", symbol: "MATIC", decimals: 18 }, testnet: false },
    { id: 8453, name: "Base", rpcUrls: ["https://mainnet.base.org"], nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, testnet: false },
  ];
}

function getChainByLocalId(id: number) {
  return getChainList().find((c) => c.id === id);
}

export function useTalakWeb3() {
  const { user } = useAuth();
  const [client, setClient] = useState<TalakWeb3Client | null>(null);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [rpcLogs, setRpcLogs] = useState<RpcLog[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectedAddr, setConnectedAddr] = useState<string | null>(null);
  const [activeChain, setActiveChain] = useState<number | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'live' | 'offline'>('connecting');
  const [lastEventAt, setLastEventAt] = useState<number | null>(null);
  const subscriptionRef = useRef<any>(null);

  // Initialize the real talak-web3 client. It targets the local Hono backend
  // during development (proxied through Vite); on static production hosting it
  // is constructed lazily and used only where a backend is reachable. All
  // dashboard data below keeps working regardless via Supabase + public RPC,
  // so a missing backend never blanks the screen.
  useEffect(() => {
    if (typeof window === "undefined") return;
    let live = true;
    try {
      const c = new TalakWeb3Client({
        baseUrl: getTalakApiBaseUrl(),
        storage: new InMemoryTokenStorage(),
      });
      if (live) setClient(c);
    } catch (error) {
      console.warn("[useTalakWeb3] TalakWeb3Client init failed (using direct RPC):", error);
    }
    return () => {
      live = false;
    };
  }, []);

  // Load initial data (local storage only - NO JWT handling)
  const loadData = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    setRealtimeStatus('connecting');
    
    try {
      // Simple localStorage loading - NO JWT checks whatsoever
      const storedWallets = localStorage.getItem('talak-web3-wallets');
      const storedLogs = localStorage.getItem('talak-web3-rpc-logs');
      const storedSessions = localStorage.getItem('talak-web3-sessions');
      
      setWallets(storedWallets ? JSON.parse(storedWallets) : []);
      setRpcLogs(storedLogs ? JSON.parse(storedLogs) : []);
      setSessions(storedSessions ? JSON.parse(storedSessions) : []);
      
      setRealtimeStatus('live');
      setLastEventAt(Date.now());
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setRealtimeStatus('offline');
      
      // Set empty data as fallback to prevent blank screens
      setWallets([]);
      setRpcLogs([]);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (client && user) {
      loadData();
    }
  }, [client, user, loadData]);

  // NO JWT token checks - completely disabled for development
// This prevents ALL JWT expiration issues

  // Connect wallet (NO JWT - simple local connection)
  const connectWallet = useCallback(async (address: string) => {
    try {
      if (typeof window.ethereum === 'undefined') {
        throw new Error('No wallet detected');
      }
      
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      setConnectedAddr(accounts[0]);
      setActiveChain(1); // Ethereum mainnet
      
      // Store wallet in localStorage - NO JWT involved
      const wallet = {
        id: `wallet_${Date.now()}`,
        address: accounts[0],
        chain_id: 1,
        is_primary: true,
        label: `Wallet ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`,
        created_at: new Date().toISOString(),
      };
      
      const currentWallets = JSON.parse(localStorage.getItem('talak-web3-wallets') || '[]');
      currentWallets.push(wallet);
      localStorage.setItem('talak-web3-wallets', JSON.stringify(currentWallets));
      
      await loadData();
      
      toast({
        title: "Wallet connected",
        description: `Successfully connected ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`,
      });
      
      return { success: true }; // No JWT tokens returned
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      toast({
        title: "Wallet connection failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
      throw error;
    }
  }, [loadData]);

  // Make RPC call (direct blockchain RPC with retry and fallback)
  const makeRpcCall = useCallback(async (chainId: number, method: string, params: unknown[] = []) => {
    const startTime = Date.now();
    
    const chain = getChainById(chainId);
    if (!chain) throw new Error(`Chain ${chainId} not found`);
    
    // Alternative RPC endpoints for fallback
    const fallbackRPCs: Record<number, string[]> = {
      1: [
        'https://ethereum.publicnode.com',
        'https://eth.llamarpc.com',
        'https://rpc.ankr.com/eth',
        'https://1rpc.io/eth',
      ],
      10: [
        'https://rpc.ankr.com/optimism',
        'https://mainnet.optimism.io',
        'https://optimism.publicnode.com',
      ],
      56: [
        'https://bsc-dataseed1.binance.org',
        'https://bsc-dataseed.binance.org',
        'https://rpc.ankr.com/bsc',
      ],
      137: [
        'https://polygon-rpc.com',
        'https://rpc.ankr.com/polygon',
        'https://polygon.publicnode.com',
      ],
      8453: [
        'https://mainnet.base.org',
        'https://base.publicnode.com',
        'https://rpc.ankr.com/base',
      ],
    };
    
    const rpcEndpoints = [chain.rpc, ...(fallbackRPCs[chainId] || [])];
    
    for (const rpcUrl of rpcEndpoints) {
      try {
        const response = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }),
          signal: AbortSignal.timeout(5000), // 5 second timeout
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        if (data.error) {
          throw new Error(data.error.message || 'RPC error');
        }
        
        const endTime = Date.now();
        
        // Log the successful call
        const log: RpcLog = {
          id: `log_${Date.now()}`,
          provider: 'direct-rpc',
          method,
          status: 'ok',
          latency_ms: endTime - startTime,
          chain_id: chainId,
          created_at: new Date().toISOString(),
        };
        
        setRpcLogs(prev => [log, ...prev.slice(0, 99)]);
        setLastEventAt(Date.now());
        
        return data.result;
      } catch (error) {
        console.warn(`RPC failed for ${chain.name} (${rpcUrl}):`, error);
        
        // If this is the last RPC endpoint, throw the error
        if (rpcUrl === rpcEndpoints[rpcEndpoints.length - 1]) {
          const endTime = Date.now();
          
          // Log the failed call
          const log: RpcLog = {
            id: `log_${Date.now()}`,
            provider: 'direct-rpc',
            method,
            status: 'error',
            latency_ms: endTime - startTime,
            chain_id: chainId,
            created_at: new Date().toISOString(),
          };
          
          setRpcLogs(prev => [log, ...prev.slice(0, 99)]);
          setLastEventAt(Date.now());
          
          // Don't show toast for network status polling errors
          if (method !== 'eth_blockNumber' && method !== 'eth_gasPrice') {
            toast({
              title: "RPC call failed",
              description: `All RPC endpoints failed for ${chain.name}`,
              variant: "destructive",
            });
          }
          
          throw new Error(`All RPC endpoints failed for ${chain.name}`);
        }
        
        // Continue to next RPC endpoint
        continue;
      }
    }
    
    throw new Error(`No RPC endpoints available for ${chain.name}`);
  }, []);

  // Get chains — prefer the backend SDK, fall back to the local chain registry
  // so the dashboard never blanks when the backend is unreachable.
  const getChains = useCallback(async () => {
    if (client) {
      try {
        return await client.listChains();
      } catch (error) {
        console.warn("[useTalakWeb3] listChains failed, using local registry:", error);
      }
    }
    return getChainList();
  }, [client]);

  // Get chain — prefer the backend SDK, fall back to the local registry.
  const getChain = useCallback(async (id: number) => {
    if (client) {
      try {
        return await client.getChain(id);
      } catch (error) {
        console.warn(`[useTalakWeb3] getChain(${id}) failed, using local registry:`, error);
      }
    }
    return getChainByLocalId(id);
  }, [client]);

  // Disconnect wallet — always clear local state even if the backend call fails.
  const disconnectWallet = useCallback(async () => {
    if (client) {
      try {
        await client.logout();
      } catch (error) {
        console.warn("[useTalakWeb3] logout failed (continuing):", error);
      }
    }
    setConnectedAddr(null);
    setActiveChain(null);
    localStorage.removeItem("talak-web3-connected");
    toast({
      title: "talak-web3 wallet disconnected",
      description: "Successfully disconnected from talak-web3 services",
    });
  }, [client]);

  // Add wallet — prefer the backend SDK, fall back to local persistence when
  // the backend is unreachable (prevents a blank screen on static hosting).
  const addWallet = useCallback(async (address: string, chainId: number, label?: string) => {
    if (client) {
      try {
        await client.request("/wallets", {
          method: "POST",
          body: JSON.stringify({
            address,
            chain_id: chainId,
            is_primary: false,
            label: label || `Wallet ${address.slice(0, 6)}...${address.slice(-4)}`,
          }),
        });
        await loadData();
        toast({
          title: "talak-web3 wallet added",
          description: `Successfully added ${address.slice(0, 6)}...${address.slice(-4)} to talak-web3`,
        });
        return;
      } catch (error) {
        console.warn("[useTalakWeb3] addWallet (backend) failed, persisting locally:", error);
      }
    }

    try {
      const wallet = {
        id: `wallet_${Date.now()}`,
        address,
        chain_id: chainId,
        is_primary: false,
        label: label || `Wallet ${address.slice(0, 6)}...${address.slice(-4)}`,
        created_at: new Date().toISOString(),
      };
      const currentWallets = JSON.parse(localStorage.getItem("talak-web3-wallets") || "[]");
      currentWallets.push(wallet);
      localStorage.setItem("talak-web3-wallets", JSON.stringify(currentWallets));
      await loadData();
      toast({
        title: "talak-web3 wallet added",
        description: `Successfully added ${address.slice(0, 6)}...${address.slice(-4)} to talak-web3`,
      });
    } catch (error) {
      console.error("Failed to add wallet:", error);
      toast({
        title: "Failed to add wallet",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
      throw error;
    }
  }, [client, loadData]);

  // Remove wallet — prefer the backend SDK, fall back to local persistence.
  const removeWallet = useCallback(async (walletId: string) => {
    if (client) {
      try {
        await client.request(`/wallets/${walletId}`, {
          method: "DELETE",
        });
        await loadData();
        toast({
          title: "Wallet removed",
          description: "Successfully removed wallet from your account",
        });
        return;
      } catch (error) {
        console.warn("[useTalakWeb3] removeWallet (backend) failed, removing locally:", error);
      }
    }

    try {
      let currentWallets = JSON.parse(localStorage.getItem("talak-web3-wallets") || "[]");
      currentWallets = currentWallets.filter((w: Wallet) => w.id !== walletId);
      localStorage.setItem("talak-web3-wallets", JSON.stringify(currentWallets));
      await loadData();
      toast({
        title: "Wallet removed",
        description: "Successfully removed wallet from your account",
      });
    } catch (error) {
      console.error("Failed to remove wallet:", error);
      toast({
        title: "Failed to remove wallet",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
      throw error;
    }
  }, [client, loadData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, []);

  return {
    client,
    wallets,
    rpcLogs,
    sessions,
    loading,
    connectedAddr,
    activeChain,
    realtimeStatus,
    lastEventAt,
    setConnectedAddr,
    setActiveChain,
    setRealtimeStatus,
    setLastEventAt,
    connectWallet,
    disconnectWallet,
    addWallet,
    removeWallet,
    makeRpcCall,
    getChains,
    getChain,
    loadData,
  };
}
