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

