const fs = require('fs');
const path = require('path');

const packages = [
  'packages/talak-web3-errors',
  'packages/talak-web3-utils',
  'packages/talak-web3-types',
  'packages/talak-web3-client',
  'packages/talak-web3-hooks',
  'packages/talak-web3-middleware',
  'packages/talak-web3-handlers',
  'packages/talak-web3-identity',
  'packages/talak-web3-adapters',
  'packages/talak-web3-plugins',
  'packages/talak-web3-realtime',
  'packages/talak-web3-tx',
  'packages/talak-web3-rate-limit',
  'packages/talak-web3-test-utils',
  'packages/@talak-web3/analytics',
  'packages/@talak-web3/dashboard',
  'packages/@talak-web3/devtools',
];

packages.forEach(pkgPath => {
  const tsconfigPath = path.join(pkgPath, 'tsconfig.json');
  if (!fs.existsSync(tsconfigPath)) {
    console.log(`Skipping ${pkgPath} - no tsconfig.json`);
    return;
  }

  const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
  
  // Fix composite mode
  tsconfig.compilerOptions.composite = false;
  delete tsconfig.compilerOptions.tsBuildInfoFile;
  delete tsconfig.references;
  
  // Add baseUrl if missing
  if (!tsconfig.compilerOptions.baseUrl) {
    tsconfig.compilerOptions.baseUrl = '.';
  }
  
  // Clean up paths
  delete tsconfig.compilerOptions.paths;
  
  fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2) + '\n');
  console.log(`✓ Fixed ${pkgPath}`);
});

console.log('\nAll tsconfigs fixed!');
