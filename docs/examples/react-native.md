# react-native-dapp - Logic

> Status: broken (missing esbuild devDependency)
> Last verified: 2026-04-19

## Dependencies

- expo: ^51.0.39
- react: ^18.3.1
- react-native: 0.74.5
- @react-navigation/native: ^6.1.18
- @react-navigation/native-stack: ^6.10.0
- @talak-web3/core: workspace:*
- @talak-web3/hooks: workspace:*

## Source Code

### src/App.tsx

```tsx
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TalakWeb3Provider } from '@talak-web3/hooks';
import { talakWeb3 } from '@talak-web3/core';
import HomeScreen from './screens/HomeScreen';
import RpcDemoScreen from './screens/RpcDemoScreen';

const Stack = createNativeStackNavigator();

const instance = talakWeb3({
  debug: true,
  chains: [
    {
      id: 1,
      name: 'Ethereum',
      rpcUrls: ['https://cloudflare-eth.com'],
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      testnet: false,
    },
  ] as const,
  rpc: { retries: 2, timeout: 10_000 },
} as any);

void instance.init();

export default function App() {
  return (
    <TalakWeb3Provider instance={instance}>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="RPC Demo" component={RpcDemoScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </TalakWeb3Provider>
  );
}
```

### src/screens/HomeScreen.tsx

```tsx
import { View, Text, Button } from 'react-native';
import { useAccount, useChain } from '@talak-web3/hooks';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export default function HomeScreen({ navigation }: any) {
  const account = useAccount();
  const chain = useChain();

  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: '600' }}>talak-web3 React Native Dapp</Text>
      <Text>ChainId: {chain.chainId}</Text>
      <Text>Address: {account.address ?? '—'}</Text>
      <Button
        title={account.isConnected ? 'Disconnect' : 'Connect (mock)'}
        onPress={() => (account.isConnected ? account.disconnect() : account.connect('0x000000000000000000000000000000000000dEaD'))}
      />
      <Button title="Go to RPC demo" onPress={() => navigation.navigate('RPC Demo')} />
    </View>
  );
}
```

### src/screens/RpcDemoScreen.tsx

```tsx
import { useState } from 'react';
import { View, Text, TextInput, Button } from 'react-native';
import { useRpc } from '@talak-web3/hooks';

export default function RpcDemoScreen() {
  const rpc = useRpc();
  const [method, setMethod] = useState('eth_blockNumber');
  const [params, setParams] = useState('[]');
  const [result, setResult] = useState<string>('—');

  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 18, fontWeight: '600' }}>RPC Demo</Text>
      <TextInput value={method} onChangeText={setMethod} style={{ borderWidth: 1, padding: 8 }} />
      <TextInput value={params} onChangeText={setParams} style={{ borderWidth: 1, padding: 8 }} />
      <Button
        title="Run"
        onPress={async () => {
          let parsed: unknown[] = [];
          try { parsed = JSON.parse(params) as unknown[]; } catch { parsed = []; }
          const res = await rpc.request(method, parsed);
          setResult(JSON.stringify(res));
        }}
      />
      <Text selectable>{result}</Text>
    </View>
  );
}
```

---

## How to Run

```bash
cd apps/react-native-dapp
pnpm install
expo start

expo start --ios
```

## Package.json Scripts

```json
{
  "dev": "expo start",
  "build": "tsc --noEmit || true",
  "typecheck": "node ../../node_modules/typescript/bin/tsc -p tsconfig.json --noEmit",
  "test": "node ../../node_modules/vitest/vitest.mjs run --passWithNoTests",
  "lint": "node -e \"process.exit(0)\"",
  "clean": "node -e \"process.exit(0)\""
}
```

## Key Features

1. React Navigation setup with native stack navigator
2. TalakWeb3Provider wrapper for React Native
3. Two screens: HomeScreen and RpcDemoScreen
4. Demonstrates:
   - Wallet connection (mock)
   - Chain information
   - RPC request interface

## Notes

- Uses Expo for development
- React Native 0.74.5
- Navigation using @react-navigation/native-stack
- Uses same hooks as web (useAccount, useChain, useRpc)
- Mock connect uses hardcoded address `0x000000000000000000000000000000000000dEaD`