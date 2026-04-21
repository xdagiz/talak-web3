const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');
const { execSync } = require('node:child_process');

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

console.log('Generating TypeScript declarations...');
try {

  const tempTsConfig = {
    compilerOptions: {
      declaration: true,
      emitDeclarationOnly: true,
      outDir: './dist',
      rootDir: './src',
      moduleResolution: 'bundler',
      module: 'ESNext',
      target: 'ES2022',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
    },
    include: ['src/**/*.ts', 'src/**/*.tsx'],
    exclude: ['node_modules', 'dist', '**/*.test.ts'],
  };

  const tempConfigPath = path.join(__dirname, 'tsconfig.declgen.tmp.json');
  fs.writeFileSync(tempConfigPath, JSON.stringify(tempTsConfig, null, 2));

  execSync(`node ${path.resolve(__dirname, '../../node_modules/typescript/bin/tsc')} -p ${tempConfigPath}`, {
    stdio: 'inherit',
    cwd: __dirname,
  });

  fs.unlinkSync(tempConfigPath);

  console.log('TypeScript declarations generated successfully!');
} catch (error) {
  console.error('Failed to generate TypeScript declarations:', error.message);
  console.warn('Falling back to manual type generation...');

  const typesPath = path.resolve(__dirname, '../talak-web3-types/src/index.ts');
  const corePath = path.resolve(__dirname, '../talak-web3-core/src/index.ts');

  const indexDts = [
    '// Auto-generated type declarations for talak-web3',
    'export { talakWeb3, __resetTalakWeb3 } from \'@talak-web3/core\';',
    'export type {',
    '  TalakWeb3Instance,',
    '  TalakWeb3Context,',
    '  TalakWeb3Plugin,',
    '  TalakWeb3BaseConfig,',
    '  TalakWeb3EventsMap,',
    '  Logger,',
    '  RpcCache,',
    '  IRpc,',
    '  RpcOptions,',
    '} from \'@talak-web3/types\';',
    'export { TalakWeb3Client } from \'@talak-web3/client\';',
    'export { InMemoryTokenStorage, CookieTokenStorage } from \'@talak-web3/client\';',
    'export { MainnetPreset, PolygonPreset, ConfigManager } from \'@talak-web3/config\';',
    'export { MultiChainRouter, estimateEip1559Fees } from \'./multichain\';',
    'export type { ChainRef, MultiChainRequest, Eip1559Fees } from \'./multichain\';',
    '',
  ].join('\n');

  fs.writeFileSync(path.join(distDir, 'index.d.ts'), indexDts, 'utf8');

  const multichainDts = [
    'export type ChainRef = string | number;',
    'export interface MultiChainRequest {',
    '  method: string;',
    '  params: unknown[];',
    '  chainId?: number;',
    '}',
    'export interface Eip1559Fees {',
    '  maxFeePerGas: bigint;',
    '  maxPriorityFeePerGas: bigint;',
    '  baseFee?: bigint;',
    '}',
    'export declare const MultiChainRouter: {',
    '  route(request: MultiChainRequest, chains: ChainRef[]): Promise<unknown>;',
    '};',
    'export declare function estimateEip1559Fees(chainId: number): Promise<Eip1559Fees>;',
    '',
  ].join('\n');

  fs.writeFileSync(path.join(distDir, 'multichain.d.ts'), multichainDts, 'utf8');

  const reactDts = [
    'import type { FC, ReactNode } from \'react\';',
    'import type { TalakWeb3Instance } from \'@talak-web3/types\';',
    '',
    'export interface TalakWeb3ProviderProps {',
    '  children: ReactNode;',
    '  config?: unknown;',
    '}',
    '',
    'export declare const TalakWeb3Provider: FC<TalakWeb3ProviderProps>;',
    'export declare function useTalakWeb3(): TalakWeb3Instance;',
    'export declare function useChain(): { chainId: number; name: string };',
    'export declare function useAccount(): { address?: string; isConnected: boolean };',
    'export declare function useRpc(): { request: (method: string, params?: unknown[]) => Promise<unknown> };',
    'export declare function useGasless(): { isSupported: boolean; estimate: () => Promise<bigint> };',
    'export declare function useIdentity(): { ens?: string; avatar?: string };',
    '',
  ].join('\n');

  fs.writeFileSync(path.join(distDir, 'react.d.ts'), reactDts, 'utf8');
}

console.log('Build completed successfully!');
