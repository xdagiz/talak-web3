import {
  talakWeb3,
  __resetTalakWeb3,
  TalakWeb3Client,
  InMemoryTokenStorage,
  CookieTokenStorage,
  MainnetPreset,
  PolygonPreset,
  ConfigManager,
  MultiChainRouter,
  estimateEip1559Fees
} from '../packages/talak-web3/dist/index.js';

console.log('=== ESM Bundle Smoke Test ===\n');

if (typeof talakWeb3 !== 'function') {
  console.error('❌ FAIL: talakWeb3 is not a function');
  process.exit(1);
}
console.log('✓ talakWeb3 is imported as a function');

if (typeof __resetTalakWeb3 !== 'function') {
  console.error('❌ FAIL: __resetTalakWeb3 is not a function');
  process.exit(1);
}
console.log('✓ __resetTalakWeb3 is imported for testing');

if (typeof MainnetPreset !== 'object' || !MainnetPreset.chains) {
  console.error('❌ FAIL: MainnetPreset is not properly structured');
  process.exit(1);
}
console.log('✓ MainnetPreset is properly structured');

try {
  new InMemoryTokenStorage();
  console.log('✓ InMemoryTokenStorage can be instantiated');
} catch (error) {
  console.error('❌ FAIL: InMemoryTokenStorage cannot be instantiated:', error.message);
  process.exit(1);
}

if (typeof ConfigManager.validate !== 'function') {
  console.error('❌ FAIL: ConfigManager.validate is not a function');
  process.exit(1);
}
console.log('✓ ConfigManager has validate method');

if (typeof estimateEip1559Fees !== 'function') {
  console.error('❌ FAIL: estimateEip1559Fees is not a function');
  process.exit(1);
}
console.log('✓ estimateEip1559Fees is a function');

console.log('\n✅ All ESM smoke tests passed!');
process.exit(0);
