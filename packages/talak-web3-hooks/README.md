# @talak-web3/hooks

React hooks for talak-web3. Build Web3-enabled React applications with ease.

## Installation

```bash
npm install @talak-web3/hooks

yarn add @talak-web3/hooks

pnpm add @talak-web3/hooks
```

## Hooks

### useWallet

Manage wallet connections and state.

```typescript
import { useWallet } from '@talak-web3/hooks';

function WalletButton() {
  const { connect, disconnect, address, isConnected, chainId } = useWallet();

  return (
    <button onClick={isConnected ? disconnect : connect}>
      {isConnected ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Connect Wallet'}
    </button>
  );
}
```

### useSIWE

Sign-In with Ethereum authentication.

```typescript
import { useSIWE } from '@talak-web3/hooks';

function LoginButton() {
  const { signIn, signOut, isAuthenticated, user } = useSIWE({
    domain: 'myapp.com',
    uri: 'https://myapp.com/login',
  });

  return (
    <button onClick={isAuthenticated ? signOut : signIn}>
      {isAuthenticated ? `Welcome ${user.address}` : 'Sign In'}
    </button>
  );
}
```

### useContract

Interact with smart contracts.

```typescript
import { useContract } from '@talak-web3/hooks';

function TokenBalance() {
  const { read, write } = useContract({
    address: '0x1111111111111111111111111111111111111111',
    abi: ERC20_ABI,
  });

  const { data: balance } = read('balanceOf', [address]);

  return <div>Balance: {balance?.toString()}</div>;
}
```

### useBalance

Fetch native token balance.

```typescript
import { useBalance } from '@talak-web3/hooks';

function Balance() {
  const { data: balance, isLoading } = useBalance({
    address: '0x1111111111111111111111111111111111111111',
  });

  return <div>{isLoading ? 'Loading...' : `${balance} ETH`}</div>;
}
```

## License

MIT
