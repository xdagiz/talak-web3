# talak-web3 SDK Integration Guide

## Overview

The talak-web3 SDK provides a comprehensive interface for connecting your dApp with talak-web3 services, including authentication, wallet management, RPC calls, and real-time data synchronization. This guide ensures complete alignment with talak-web3 branding and architecture patterns.

## Installation

```bash
npm install @talak-web3/client
```

## Quick Start

### 1. Initialize the SDK

```typescript
import { TalakWeb3Client, InMemoryTokenStorage } from '@talak-web3/client';

const client = new TalakWeb3Client({
  baseUrl: import.meta.env.VITE_TALAK_WEB3_API_URL || 'http://localhost:3000',
  storage: new InMemoryTokenStorage(),
  fetchImpl: fetch.bind(window),
});

// For development without API server, you can use direct RPC calls:
import { getChainById } from '@/data/chains';

const chain = getChainById(1); // Ethereum mainnet
const response = await fetch(chain.rpc, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    jsonrpc: '2.0', 
    id: Date.now(), 
    method: 'eth_blockNumber', 
    params: [] 
  }),
});
const data = await response.json();
console.log('Block number:', data.result);
```

### 2. Authenticate with SIWE

```typescript
// Get nonce for signing
const { nonce } = await client.getNonce(walletAddress);

// Create SIWE message
const message = `${domain} wants you to sign in with your Ethereum account:
${walletAddress}

${statement}

URI: ${uri}
Version: 1
Chain ID: ${chainId}
Nonce: ${nonce}`;

// Sign with wallet
const signature = await window.ethereum.request({
  method: 'personal_sign',
  params: [message, walletAddress],
});

// Login
const loginResponse = await client.loginWithSiwe(message, signature);
```

### 3. Make RPC Calls

```typescript
// Simple RPC call
const blockNumber = await client.rpcCall(1, 'eth_blockNumber', []);

// Complex call with parameters
const balance = await client.rpcCall(1, 'eth_getBalance', [
  '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  'latest'
]);
```

## React Hook Integration

The dashboard includes a custom hook `useTalakWeb3` that provides a complete React interface:

```typescript
import { useTalakWeb3 } from '@/hooks/useTalakWeb3';

function MyComponent() {
  const {
    wallets,
    rpcLogs,
    sessions,
    loading,
    connectedAddr,
    activeChain,
    realtimeStatus,
    connectWallet,
    disconnectWallet,
    addWallet,
    removeWallet,
    makeRpcCall,
    getChains,
    loadData,
  } = useTalakWeb3();

  // Connect wallet
  const handleConnect = async () => {
    try {
      await connectWallet(walletAddress);
    } catch (error) {
      console.error('Connection failed:', error);
    }
  };

  // Make RPC call
  const handleRpcCall = async () => {
    try {
      const result = await makeRpcCall(1, 'eth_blockNumber', []);
      console.log('Block number:', result);
    } catch (error) {
      console.error('RPC call failed:', error);
    }
  };
}
```

## Features

### Authentication
- **SIWE (Sign-In with Ethereum)**: EIP-4361 compliant authentication
- **Token Management**: Automatic token refresh and storage
- **Session Verification**: Verify active sessions

### Wallet Management
- **Link Wallets**: Add multiple wallets to your account
- **Chain Support**: Multi-chain wallet management
- **Primary Wallet**: Set primary wallet for operations

### RPC Services
- **Multi-Chain Support**: RPC calls across different chains
- **Request Logging**: Automatic logging of all RPC calls
- **Error Handling**: Comprehensive error management
- **Performance Tracking**: Latency measurement

### Real-time Updates
- **WebSocket Subscriptions**: Real-time data updates
- **Event Streaming**: Live wallet and session updates
- **Status Monitoring**: Connection status tracking

## API Reference

### TalakWeb3Client

#### Constructor
```typescript
new TalakWeb3Client(options: {
  baseUrl: string;
  storage: TokenStorage;
  fetchImpl: (input: string | Request, init?: RequestInit) => Promise<Response>;
})
```

#### Methods

##### Authentication
- `getNonce(address: string): Promise<NonceResponse>`
- `loginWithSiwe(message: string, signature: string): Promise<LoginResponse>`
- `refresh(refreshToken: string): Promise<RefreshResponse>`
- `logout(): Promise<void>`
- `verifySession(): Promise<VerifyResponse>`

##### RPC Calls
- `rpcCall(chainId: number, method: string, params: unknown[]): Promise<unknown>`
- `getChain(id: number): Promise<unknown>`
- `listChains(): Promise<unknown>`

##### HTTP Requests
- `request<T>(path: string, options?: RequestOptions, retryOnUnauthorized?: boolean): Promise<T>`

### Token Storage

#### InMemoryTokenStorage
- `getAccessToken(): string | null`
- `setAccessToken(token: string): void`
- `getRefreshToken(): string | null`
- `setRefreshToken(token: string): void`
- `clear(): void`

#### CookieTokenStorage
- Browser-based token storage with HTTP-only cookies
- Automatic refresh token management

## Dashboard Integration

The dashboard fully integrates with the talak-web3 SDK:

### Features
- **Wallet Connection**: Connect and manage multiple wallets
- **Live RPC Monitoring**: Real-time RPC call tracking
- **Session Management**: Active session monitoring
- **Chain Status**: Live network status across chains
- **Balance Tracking**: On-chain balance display
- **Message Signing**: Arbitrary message signing

### Components
- **Dashboard**: Main dashboard with SDK integration
- **Web3Tools**: Network status and wallet tools
- **LiveNetworks**: Real-time chain monitoring
- **WalletBalances**: Balance tracking across chains

## Error Handling

The SDK provides comprehensive error handling:

```typescript
try {
  const result = await client.rpcCall(1, 'eth_blockNumber', []);
} catch (error) {
  if (error.message.includes('HTTP 401')) {
    // Authentication error - re-authenticate
    await client.loginWithSiwe(message, signature);
  } else {
    // Other error
    console.error('RPC call failed:', error);
  }
}
```

## Best Practices

### 1. Error Handling
- Always wrap SDK calls in try-catch blocks
- Handle authentication errors gracefully
- Implement retry logic for network errors

### 2. Token Management
- Use appropriate token storage for your environment
- Handle token refresh automatically
- Clear tokens on logout

### 3. Performance
- Batch RPC calls when possible
- Use caching for frequently accessed data
- Monitor RPC call latency

### 4. Security
- Never expose access tokens in client-side code
- Validate all user inputs
- Use HTTPS in production

## Environment Variables

```bash
# talak-web3 API Configuration (for development)
VITE_TALAK_WEB3_API_URL=http://localhost:3000

# Production (when domain is purchased)
VITE_TALAK_WEB3_API_URL=https://api.talak-web3.com

# Note: For development without API server, the app uses direct RPC calls
```

## Troubleshooting

### Common Issues

#### 1. Authentication Errors
- **Problem**: "HTTP 401" errors
- **Solution**: Re-authenticate with SIWE

#### 2. Network Errors
- **Problem**: RPC call timeouts
- **Solution**: Check network connectivity and API status

#### 3. Wallet Connection
- **Problem**: Wallet not detected
- **Solution**: Ensure MetaMask or compatible wallet is installed

#### 4. Token Issues
- **Problem**: Token expiration
- **Solution**: Implement automatic token refresh

### Debug Mode

Enable debug logging:

```typescript
const client = new TalakWeb3Client({
  baseUrl: 'https://api.talak-web3.com',
  storage: new InMemoryTokenStorage(),
  fetchImpl: fetch,
  debug: true, // Enable debug logging
});
```

## Examples

### Complete dApp Integration

```typescript
import { TalakWeb3Client, InMemoryTokenStorage } from '@talak-web3/client';
import { useTalakWeb3 } from '@/hooks/useTalakWeb3';

function App() {
  const {
    connectWallet,
    makeRpcCall,
    wallets,
    loading,
  } = useTalakWeb3();

  const handleConnect = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask');
      return;
    }

    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts'
    });

    await connectWallet(accounts[0]);
  };

  const getBalance = async (address: string) => {
    try {
      const balance = await makeRpcCall(1, 'eth_getBalance', [address, 'latest']);
      return balance;
    } catch (error) {
      console.error('Failed to get balance:', error);
      return null;
    }
  };

  return (
    <div>
      <button onClick={handleConnect}>
        Connect Wallet
      </button>
      
      {wallets.map(wallet => (
        <div key={wallet.id}>
          <p>{wallet.address}</p>
          <button onClick={() => getBalance(wallet.address)}>
            Get Balance
          </button>
        </div>
      ))}
    </div>
  );
}
```

## Support

For support and questions:
- GitHub Issues: [talak-web3/issues](https://github.com/dagimabebe/talak-web3/issues)
- Documentation: [talak-web3 docs](https://docs.talak-web3.com)
- Community: [Discord](https://discord.gg/talak-web3)
