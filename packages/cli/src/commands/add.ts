import fs from "node:fs";
import path from "node:path";

interface AddOptions {
  project?: string;
}

const integrations = [
  "walletconnect",
  "privy",
  "dynamic",
  "rainbowkit",
  "mfa",
  "oauth-google",
  "oauth-github",
  "oauth-twitter",
];

export async function addCommand(integration: string | undefined, options: AddOptions = {}) {
  const projectPath = options.project || ".";

  if (!integration) {
    console.log("📦 Available integrations:");
    integrations.forEach((i) => console.log(`  - ${i}`));
    console.log("\nUsage: talak add <integration>");
    return;
  }

  if (!integrations.includes(integration)) {
    console.error(`❌ Unknown integration: ${integration}`);
    console.log(`Available: ${integrations.join(", ")}`);
    process.exit(1);
  }

  console.log(`🔧 Adding ${integration} integration...`);

  const packageJsonPath = path.join(projectPath, "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    console.error(`❌ No package.json found in ${projectPath}`);
    process.exit(1);
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

  const deps = getIntegrationDependencies(integration);
  packageJson.dependencies = { ...packageJson.dependencies, ...deps };

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

  const configPath = path.join(projectPath, `talak-${integration}.config.ts`);
  const configContent = generateIntegrationConfig(integration);
  fs.writeFileSync(configPath, configContent);

  console.log(`✅ Added ${integration} integration!`);
  console.log(`📄 Generated: talak-${integration}.config.ts`);
  console.log("\nNext steps:");
  console.log("  npm install");
  console.log(`  Import the config in your talak.config.ts`);
}

function getIntegrationDependencies(integration: string): Record<string, string> {
  switch (integration) {
    case "walletconnect":
      return { "@walletconnect/ethereum-provider": "^2.0.0" };
    case "privy":
      return { "@privy-io/react-auth": "^1.0.0" };
    case "dynamic":
      return { "@dynamic-labs/sdk-react": "^1.0.0" };
    case "rainbowkit":
      return { "@rainbow-me/rainbowkit": "^2.0.0", wagmi: "^2.0.0" };
    case "mfa":
      return { otplib: "^12.0.0", "@simplewebauthn/browser": "^9.0.0" };
    case "oauth-google":
    case "oauth-github":
    case "oauth-twitter":
      return { arctic: "^1.0.0" };
    default:
      return {};
  }
}

function generateIntegrationConfig(integration: string): string {
  switch (integration) {
    case "walletconnect":
      return `// TODO: This is a scaffold for a WalletConnect integration built on top of
// \`@walletconnect/ethereum-provider\`. The talak-web3 SDK does not ship a
// \`WalletConnectPlugin\` (and does not expose a \`talak-web3/plugins\` subpath);
// you must implement the provider and wire it into your talak-web3 config.
import { EthereumProvider } from '@walletconnect/ethereum-provider';

export interface WalletConnectConfig {
  projectId: string;
  chains: number[];
}

export const walletConnectConfig: WalletConnectConfig = {
  projectId: process.env.WALLETCONNECT_PROJECT_ID ?? "YOUR_WALLETCONNECT_PROJECT_ID",
  chains: [1, 137, 42161],
};

export async function createWalletConnectProvider(): Promise<EthereumProvider> {
  return await EthereumProvider.init({
    projectId: walletConnectConfig.projectId,
    chains: walletConnectConfig.chains,
    showQrModal: true,
  });
}

// Example wiring in your talak.config.ts:
//   import { createWalletConnectProvider } from './talak-walletconnect.config';
//   const wc = await createWalletConnectProvider();
//   app.setAddress.bind(wc); // wire into your auth flow
`;
    case "mfa":
      return `// TODO: This is a SCAFFOLD only. The talak-web3 SDK does not ship an
// \`MfaPlugin\` (and does not expose a \`talak-web3/plugins\` subpath); you must
// implement TOTP and WebAuthn flows with the libraries below and gate them
// behind your auth flow.
import { authenticator } from 'otplib';
import {
  startRegistration,
  startAuthentication,
} from '@simplewebauthn/browser';

export const mfaConfig = {
  totp: {
    issuer: 'Your App',
    algorithm: 'SHA256' as const,
  },
  webauthn: {
    rpName: 'Your App',
    rpId: process.env.SIWE_DOMAIN ?? 'localhost',
  },
};

export function generateTotpSecret(): string {
  return authenticator.generateSecret();
}

export function verifyTotp(token: string, secret: string): boolean {
  return authenticator.verify({ token, secret });
}

export async function startWebAuthnRegistration(): Promise<unknown> {
  // Wire this to your server's WebAuthn challenge endpoint.
  const optionsJSON = await fetch('/api/webauthn/register/options').then((r) => r.json());
  return await startRegistration({ optionsJSON });
}

export async function startWebAuthnAuthentication(): Promise<unknown> {
  // Wire this to your server's WebAuthn challenge endpoint.
  const optionsJSON = await fetch('/api/webauthn/authenticate/options').then((r) => r.json());
  return await startAuthentication({ optionsJSON });
}
`;
    default:
      return `// ${integration} integration config
// See documentation for setup instructions
export const config = {};
`;
  }
}
