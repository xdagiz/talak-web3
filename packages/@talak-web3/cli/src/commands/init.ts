import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface InitOptions {
  template?: string;
  force?: boolean;
}

const templates = ['nextjs', 'react', 'hono', 'express', 'nestjs', 'sveltekit'];

export async function initCommand(name: string = '.', options: InitOptions = {}) {
  const template = options.template || 'nextjs';

  if (!templates.includes(template)) {
    console.error(`❌ Unknown template: ${template}`);
    console.log(`Available templates: ${templates.join(', ')}`);
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
    version: '0.1.0',
    private: true,
    type: 'module',
    scripts: getScripts(template),
    dependencies: {
      'talak-web3': '^1.0.0',
      ...getTemplateDependencies(template),
    },
    devDependencies: {
      '@types/node': '^20.0.0',
      typescript: '^5.0.0',
      ...getTemplateDevDependencies(template),
    },
  };

  fs.writeFileSync(
    path.join(targetDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );

  const configContent = generateConfig(template);
  fs.writeFileSync(path.join(targetDir, 'talak.config.ts'), configContent);

  const envContent = generateEnv();
  fs.writeFileSync(path.join(targetDir, '.env'), envContent);
  fs.writeFileSync(path.join(targetDir, '.env.example'), envContent);

  const readmeContent = generateReadme(template, path.basename(targetDir));
  fs.writeFileSync(path.join(targetDir, 'README.md'), readmeContent);

  const tsConfig = {
    compilerOptions: {
      target: 'ES2022',
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
      esModuleInterop: true,
      strict: true,
      skipLibCheck: true,
      outDir: './dist',
      rootDir: './src',
    },
    include: ['src/**/*'],
  };
  fs.writeFileSync(
    path.join(targetDir, 'tsconfig.json'),
    JSON.stringify(tsConfig, null, 2)
  );

  console.log('✅ Project initialized successfully!\n');
  console.log('Next steps:');
  console.log(`  cd ${name}`);
  console.log('  npm install');
  console.log('  npm run dev');
}

function getScripts(template: string): Record<string, string> {
  const base = {
    build: 'tsc',
    typecheck: 'tsc --noEmit',
    lint: 'eslint src/',
  };

  switch (template) {
    case 'nextjs':
      return { ...base, dev: 'next dev', start: 'next start' };
    case 'react':
      return { ...base, dev: 'vite', build: 'tsc && vite build', preview: 'vite preview' };
    case 'hono':
      return { ...base, dev: 'tsx watch src/index.ts', start: 'node dist/index.js' };
    case 'express':
      return { ...base, dev: 'tsx watch src/index.ts', start: 'node dist/index.js' };
    case 'nestjs':
      return { ...base, dev: 'nest start --watch', start: 'node dist/main.js' };
    case 'sveltekit':
      return { ...base, dev: 'vite dev', build: 'vite build', preview: 'vite preview' };
    default:
      return base;
  }
}

function getTemplateDependencies(template: string): Record<string, string> {
  switch (template) {
    case 'nextjs':
      return { next: '^14.0.0', react: '^18.0.0', 'react-dom': '^18.0.0' };
    case 'react':
      return { react: '^18.0.0', 'react-dom': '^18.0.0' };
    case 'hono':
      return { hono: '^4.0.0' };
    case 'express':
      return { express: '^4.18.0' };
    case 'nestjs':
      return {
        '@nestjs/common': '^10.0.0',
        '@nestjs/core': '^10.0.0',
        '@nestjs/platform-express': '^10.0.0',
      };
    case 'sveltekit':
      return {};
    default:
      return {};
  }
}

function getTemplateDevDependencies(template: string): Record<string, string> {
  switch (template) {
    case 'nextjs':
      return { '@types/react': '^18.0.0', '@types/react-dom': '^18.0.0' };
    case 'react':
      return { '@types/react': '^18.0.0', '@types/react-dom': '^18.0.0', vite: '^5.0.0' };
    case 'hono':
      return { tsx: '^4.0.0' };
    case 'express':
      return { '@types/express': '^4.17.0', tsx: '^4.0.0' };
    case 'nestjs':
      return { '@nestjs/cli': '^10.0.0', tsx: '^4.0.0' };
    case 'sveltekit':
      return { vite: '^5.0.0' };
    default:
      return {};
  }
}

function generateConfig(template: string): string {
  return `import { createTalakWeb3 } from 'talak-web3';
import { MainnetPreset } from 'talak-web3/presets';

// Application configuration
export const app = createTalakWeb3({
  ...MainnetPreset,
  auth: {
    domain: process.env.SIWE_DOMAIN || 'localhost:3000',
    // Stores are mandatory in production
    nonceStore: undefined, // Provide Redis-backed store
    refreshStore: undefined, // Provide Redis-backed store
    revocationStore: undefined, // Provide Redis-backed store
  },
});

// Initialize on startup (Mandatory)
await app.init();
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

function generateSecret(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
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
- [SIWE Specification](https://eips.ethereum.org/EIPS/eip-4361)
`;
}
