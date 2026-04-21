#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const INIT_BANNER = `
  _          _   _                                  _   ____
 | |__   ___| |_| |_ ___ _ __      __      __ ___| |__ |___ \\
 | '_ \\ / _ \\ __| __/ _ \\ '__|____ \\ \\ /\\ / // _ \\ '_ \\  __) |
 | |_) |  __/ |_| ||  __/ | |_____| \\ V  V /|  __/ |_) |/ __/
 |_.__/ \\___|\\__|\\__\\___|_|          \\_/\\_/  \\___|_.__/|_____|

  > Initializing talak-web3 environment...
`;

console.log(INIT_BANNER);

const targetDir = process.cwd();
const envExamplePath = path.join(targetDir, '.env.example');
const envPath = path.join(targetDir, '.env');

const envTemplate = `
# talak-web3 Hardened Environment
NODE_ENV=development
PORT=8787

# Authentication (Mandatory Asymmetric RS256)
JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----"
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\\n...\\n-----END PUBLIC KEY-----"
SIWE_DOMAIN=localhost

# Storage (Mandatory Redis for production)
REDIS_URL=redis://localhost:6379

# Cross-Origin Security
ALLOWED_ORIGINS=http://localhost:3000

# Observability
LOG_LEVEL=info
`;

if (!fs.existsSync(envExamplePath)) {
  fs.writeFileSync(envExamplePath, envTemplate.trim() + '\n');
  console.log('✅ Created .env.example');
} else {
  console.log('ℹ️  .env.example already exists, skipping.');
}

if (!fs.existsSync(envPath)) {
  fs.writeFileSync(envPath, envTemplate.trim() + '\n');
  console.log('✅ Created .env');
} else {
  console.log('ℹ️  .env already exists. Remember to configure JWT asymmetric keys and REDIS_URL for production.');
}

console.log('\\n🚀 Initialization complete. Review your .env to get started.');
