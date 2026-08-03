import fs from "node:fs";
import path from "node:path";

import { Templates, TEMPLATE_IDS } from "@talak-web3/templates";

interface InitOptions {
  template?: string;
  force?: boolean;
}

export async function initCommand(name: string = ".", options: InitOptions = {}) {
  const template = options.template || "nextjs";

  const tpl = Templates[template];
  if (!tpl) {
    console.error(`❌ Unknown template: ${template}`);
    console.log(`Available templates: ${TEMPLATE_IDS.join(", ")}`);
    process.exit(1);
  }

  const targetDir = path.resolve(process.cwd(), name);

  if (fs.existsSync(targetDir)) {
    const files = fs.readdirSync(targetDir);
    if (files.length > 0 && !options.force) {
      console.error(`❌ Directory ${name} is not empty. Use --force to overwrite.`);
      process.exit(1);
    }
  } else {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  console.log(`🚀 Initializing talak-web3 project in ${name}...`);
  console.log(`📦 Using template: ${template}\n`);

  const packageJson = {
    name: path.basename(targetDir),
    version: "0.1.0",
    private: true,
    type: "module",
    scripts: { ...tpl.scripts },
    dependencies: {
      "talak-web3": "^1.0.0",
      ...tpl.dependencies,
    },
    devDependencies: {
      "@types/node": "^20.0.0",
      typescript: "^5.0.0",
      ...tpl.devDependencies,
    },
  };

  fs.writeFileSync(path.join(targetDir, "package.json"), JSON.stringify(packageJson, null, 2));

  const configContent = generateConfig(template);
  fs.writeFileSync(path.join(targetDir, "talak.config.ts"), configContent);

  const envContent = generateEnv();
  fs.writeFileSync(path.join(targetDir, ".env"), envContent);
  fs.writeFileSync(path.join(targetDir, ".env.example"), envContent);

  const readmeContent = generateReadme(template, path.basename(targetDir));
  fs.writeFileSync(path.join(targetDir, "README.md"), readmeContent);

  const tsConfig = {
    compilerOptions: {
      target: "ES2022",
      module: "NodeNext",
      moduleResolution: "NodeNext",
      esModuleInterop: true,
      strict: true,
      skipLibCheck: true,
      outDir: "./dist",
      rootDir: "./src",
    },
    include: ["src/**/*"],
  };
  fs.writeFileSync(path.join(targetDir, "tsconfig.json"), JSON.stringify(tsConfig, null, 2));

  console.log("✅ Project initialized successfully!\n");
  console.log("Next steps:");
  console.log(`  cd ${name}`);
  console.log("  npm install");
  console.log("  npm run dev");
}

function generateConfig(template: string): string {
  const storesBlock = `// DEV ONLY: InMemory stores are rejected when NODE_ENV=production.
    // Production: use RedisNonceStore / RedisRefreshStore / RedisRevocationStore from @talak-web3/auth/stores
    nonceStore: new InMemoryNonceStore(),
    refreshStore: new InMemoryRefreshStore(),
    revocationStore: new InMemoryRevocationStore(),`;

  if (Templates[template]?.isNextjs === true) {
    return `import { talakWeb3 } from "talak-web3";
import { nextCookies } from "talak-web3/nextjs";
import {
  InMemoryNonceStore,
  InMemoryRefreshStore,
  InMemoryRevocationStore,
} from "@talak-web3/auth";

export const app = talakWeb3({
  chains: [
    {
      id: 1,
      name: "Ethereum",
      rpcUrls: ["https://cloudflare-eth.com"],
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    },
  ],
  auth: {
    domain: process.env.SIWE_DOMAIN || "localhost:3000",
    ${storesBlock}
  },
  plugins: [nextCookies()],
});
`;
  }

  return `import { talakWeb3 } from "talak-web3";
import {
  InMemoryNonceStore,
  InMemoryRefreshStore,
  InMemoryRevocationStore,
} from "@talak-web3/auth";

export const app = talakWeb3({
  preset: "mainnet",
  auth: {
    domain: process.env.SIWE_DOMAIN || "localhost:3000",
    ${storesBlock}
  },
});
`;
}

function generateEnv(): string {
  return `# talak-web3 Environment Configuration (Production-Hardened)
# Generated on ${new Date().toISOString()}

# JWT Asymmetric Keys (RS256) - Generate with OpenSSL
JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----"
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\\n...\\n-----END PUBLIC KEY-----"

# Redis URL for session storage (Mandatory)
REDIS_URL=redis://localhost:6379

# SIWE Domain
SIWE_DOMAIN=localhost:3000

# Allowed CORS origins (comma-separated)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Log level (debug, info, warn, error)
LOG_LEVEL=info

# Node environment
NODE_ENV=development
`;
}

function generateReadme(template: string, name: string): string {
  return `# ${name}

Generated with talak-web3 CLI using the ${template} template.

## Getting Started

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Set up environment variables:
   \`\`\`bash
   cp .env.example .env
   # Edit .env with your configuration
   \`\`\`

3. Start the development server:
   \`\`\`bash
   npm run dev
   \`\`\`

## Project Structure

- \`talak.config.ts\` - talak-web3 configuration
- \`src/\` - Source code
- \`.env\` - Environment variables (not committed)

## Learn More

- [talak-web3 Documentation](https://github.com/dagimabebe/talak-web3)
- [Next.js integration](https://docs.talak.dev/docs/nextjs)
- [SIWE Specification](https://eips.ethereum.org/EIPS/eip-4361)
`;
}
