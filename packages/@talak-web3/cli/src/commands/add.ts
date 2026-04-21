import fs from 'node:fs';
import path from 'node:path';

interface AddOptions {
  project?: string;
}

const integrations = [
  'walletconnect',
  'privy',
  'dynamic',
  'rainbowkit',
  'mfa',
  'oauth-google',
  'oauth-github',
  'oauth-twitter',
];

export async function addCommand(integration: string | undefined, options: AddOptions = {}) {
  const projectPath = options.project || '.';

  if (!integration) {
    console.log('📦 Available integrations:');
    integrations.forEach(i => console.log(`  - ${i}`));
    console.log('\nUsage: talak add <integration>');
    return;
  }

  if (!integrations.includes(integration)) {
    console.error(`❌ Unknown integration: ${integration}`);
    console.log(`Available: ${integrations.join(', ')}`);
    process.exit(1);
  }

  console.log(`🔧 Adding ${integration} integration...`);

  const packageJsonPath = path.join(projectPath, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    console.error(`❌ No package.json found in ${projectPath}`);
    process.exit(1);
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

  const deps = getIntegrationDependencies(integration);
  packageJson.dependencies = { ...packageJson.dependencies, ...deps };

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

  const configPath = path.join(projectPath, `talak-${integration}.config.ts`);
  const configContent = generateIntegrationConfig(integration);
  fs.writeFileSync(configPath, configContent);

  console.log(`✅ Added ${integration} integration!`);
  console.log(`📄 Generated: talak-${integration}.config.ts`);
  console.log('\nNext steps:');
  console.log('  npm install');
  console.log(`  Import the config in your talak.config.ts`);
}

function getIntegrationDependencies(integration: string): Record<string, string> {
  switch (integration) {
    case 'walletconnect':
      return { '@walletconnect/ethereum-provider': '^2.0.0' };
    case 'privy':
      return { '@privy-io/react-auth': '^1.0.0' };
    case 'dynamic':
      return { '@dynamic-labs/sdk-react': '^1.0.0' };
    case 'rainbowkit':
      return { '@rainbow-me/rainbowkit': '^2.0.0', wagmi: '^2.0.0' };
    case 'mfa':
      return { 'otplib': '^12.0.0', '@simplewebauthn/browser': '^9.0.0' };
    case 'oauth-google':
    case 'oauth-github':
    case 'oauth-twitter':
      return { 'arctic': '^1.0.0' };
    default:
      return {};
  }
}

function generateIntegrationConfig(integration: string): string {
  switch (integration) {
    case 'walletconnect':
      return `import { WalletConnectPlugin } from 'talak-web3/plugins';

export const walletConnectConfig = {
  projectId: process.env.WALLETCONNECT_PROJECT_ID!,
  chains: [1, 137, 42161],
};

export const walletConnectPlugin = WalletConnectPlugin(walletConnectConfig);
`;
    case 'mfa':
      return `import { MfaPlugin } from 'talak-web3/plugins';

export const mfaConfig = {
  totp: {
    issuer: 'Your App',
    algorithm: 'SHA256',
  },
  webauthn: {
    rpName: 'Your App',
    rpId: process.env.SIWE_DOMAIN!,
  },
};

export const mfaPlugin = MfaPlugin(mfaConfig);
`;
    default:
      return `// ${integration} integration config
// See documentation for setup instructions
export const config = {};
`;
  }
}
