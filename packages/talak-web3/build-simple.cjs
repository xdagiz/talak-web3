const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');

const distDir = path.join(__dirname, 'dist');

if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

const entries = ['src/index.ts', 'src/multichain.ts', 'src/react.ts'];
const shared = {
  entryPoints: entries,
  bundle: true,
  platform: 'node',
  target: 'es2022',
  sourcemap: false,
  logLevel: 'info',
  outdir: distDir,
  external: ['react', 'react-dom', 'viem', 'jose', 'ioredis', 'zod'],
  alias: {
    '@talak-web3/auth': path.resolve(__dirname, '../talak-web3-auth/src/index.ts'),
    '@talak-web3/client': path.resolve(__dirname, '../talak-web3-client/src/index.ts'),
    '@talak-web3/config': path.resolve(__dirname, '../talak-web3-config/src/index.ts'),
    '@talak-web3/core': path.resolve(__dirname, '../talak-web3-core/src/index.ts'),
    '@talak-web3/errors': path.resolve(__dirname, '../talak-web3-errors/src/index.ts'),
    '@talak-web3/hooks': path.resolve(__dirname, '../talak-web3-hooks/src/index.tsx'),
    '@talak-web3/rpc': path.resolve(__dirname, '../talak-web3-rpc/src/index.ts'),
    '@talak-web3/types': path.resolve(__dirname, '../talak-web3-types/src/index.ts'),
    '@talak-web3/utils': path.resolve(__dirname, '../talak-web3-utils/src/index.ts'),
  },
};

esbuild.buildSync({
  ...shared,
  format: 'esm',
  outExtension: { '.js': '.js' },
});

esbuild.buildSync({
  ...shared,
  format: 'cjs',
  outExtension: { '.js': '.cjs' },
});

fs.writeFileSync(
  path.join(distDir, 'index.d.ts'),
  [
    'export type TalakWeb3Instance = any;',
    'export type TalakWeb3Context = any;',
    'export type TalakWeb3Plugin = any;',
    'export type TalakWeb3BaseConfig = any;',
    'export type TokenStorage = any;',
    'export type NonceResponse = any;',
    'export type LoginResponse = any;',
    'export type RefreshResponse = any;',
    'export type VerifyResponse = any;',
    'export declare const talakWeb3: (...args: any[]) => TalakWeb3Instance;',
    'export declare const TalakWeb3Client: any;',
    'export declare const InMemoryTokenStorage: any;',
    'export declare const CookieTokenStorage: any;',
    'export declare const MainnetPreset: any;',
    'export declare const PolygonPreset: any;',
    'export declare const ConfigManager: any;',
    'export declare const MultiChainRouter: any;',
    'export declare const estimateEip1559Fees: any;',
    '',
  ].join('\n'),
  'utf8'
);
fs.writeFileSync(
  path.join(distDir, 'multichain.d.ts'),
  'export type ChainRef = any;\nexport type MultiChainRequest = any;\nexport type Eip1559Fees = any;\nexport declare const MultiChainRouter: any;\nexport declare const estimateEip1559Fees: any;\n',
  'utf8'
);
fs.writeFileSync(
  path.join(distDir, 'react.d.ts'),
  'export declare const TalakWeb3Provider: any;\nexport declare const useTalakWeb3: any;\nexport declare const useChain: any;\nexport declare const useAccount: any;\nexport declare const useRpc: any;\nexport declare const useGasless: any;\nexport declare const useIdentity: any;\n',
  'utf8'
);

console.log('Build completed successfully!');
