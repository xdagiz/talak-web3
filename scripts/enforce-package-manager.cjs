const userAgent = process.env.npm_config_user_agent || '';

const isPnpm = userAgent.startsWith('pnpm/');
const isNpm = userAgent.startsWith('npm/');
const isYarn = userAgent.startsWith('yarn/');

if (isYarn) {
  console.error('This repository does not support yarn. Use npm or pnpm.');
  console.error('Use: npm install or pnpm install');
  process.exit(1);
}

if (!isPnpm && !isNpm) {
  console.error('This repository must be installed with npm or pnpm.');
  console.error('Use: npm install or pnpm install');
  process.exit(1);
}

console.log(`Installing with ${isNpm ? 'npm' : 'pnpm'}...`);
