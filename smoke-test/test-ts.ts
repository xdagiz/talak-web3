import { talakWeb3, MainnetPreset } from 'talak-web3';
import type { TalakWeb3Instance } from 'talak-web3';

console.log('Testing TS Import...');
try {
  const app: TalakWeb3Instance = talakWeb3(MainnetPreset);
  console.log('TS Import Success: app created with type safety');
} catch (e) {
  console.error('TS Import Failed:', e);
  process.exit(1);
}
