const KEYS = [
  'JWT_PRIVATE_KEY',
  'JWT_PUBLIC_KEY',
  'REDIS_URL',
  'SIWE_DOMAIN',
  'ALLOWED_ORIGINS',
  'NODE_ENV',
] as const;

export async function envCommand() {
  console.log('Environment (presence only — values not shown)\n');

  for (const key of KEYS) {
    if (key === 'VITE_*') {
      const vite = Object.keys(process.env).filter((k) => k.startsWith('VITE_'));
      console.log(`  ${key}: ${vite.length ? `${vite.length} set (${vite.join(', ')})` : 'none'}`);
      continue;
    }
    const v = process.env[key];
    console.log(`  ${key}: ${v !== undefined && v !== '' ? 'set' : 'not set'}`);
  }

  console.log('\n  Tip: use `talak doctor` to validate .env in a project directory.');
}
