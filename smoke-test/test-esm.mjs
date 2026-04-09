import { talakWeb3, MainnetPreset } from 'talak-web3';

console.log('Testing ESM Import...');
try {
  const app = talakWeb3(MainnetPreset);
  console.log('ESM Import Success: app created');
} catch (e) {
  console.error('ESM Import Failed:', e);
  process.exit(1);
}
