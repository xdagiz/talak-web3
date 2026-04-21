import fs from 'node:fs';
import path from 'node:path';

interface DoctorOptions {
  project?: string;
}

interface CheckResult {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  fix?: string;
}

export async function doctorCommand(options: DoctorOptions = {}) {
  const projectPath = options.project || '.';

  console.log('🔍 Running talak-web3 health checks...\n');

  const results: CheckResult[] = [];

  const packageJsonPath = path.join(projectPath, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    results.push({ name: 'package.json', status: 'pass', message: 'Found package.json' });
  } else {
    results.push({ name: 'package.json', status: 'fail', message: 'Missing package.json', fix: 'Run "npm init" to create one' });
  }

  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const hasTalakWeb3 = packageJson.dependencies?.['talak-web3'] || packageJson.devDependencies?.['talak-web3'];
    if (hasTalakWeb3) {
      results.push({ name: 'talak-web3 dependency', status: 'pass', message: `Version: ${hasTalakWeb3}` });
    } else {
      results.push({ name: 'talak-web3 dependency', status: 'fail', message: 'talak-web3 not installed', fix: 'Run "npm install talak-web3"' });
    }
  }

  const envPath = path.join(projectPath, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const hasPrivKey = envContent.includes('JWT_PRIVATE_KEY=') && !envContent.includes('JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----"');
    const hasPubKey = envContent.includes('JWT_PUBLIC_KEY=') && !envContent.includes('JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\\n...\\n-----END PUBLIC KEY-----"');
    const hasRedisUrl = envContent.includes('REDIS_URL=');

    if (hasPrivKey && hasPubKey) {
      results.push({ name: 'JWT Asymmetric Keys', status: 'pass', message: 'JWT_PRIVATE_KEY and JWT_PUBLIC_KEY configured' });
    } else {
      results.push({ name: 'JWT Asymmetric Keys', status: 'fail', message: 'JWT_PRIVATE_KEY or JWT_PUBLIC_KEY missing or using default', fix: 'Generate and set RS256 keys in .env' });
    }

    if (hasRedisUrl) {
      results.push({ name: 'REDIS_URL', status: 'pass', message: 'REDIS_URL configured' });
    } else {
      results.push({ name: 'REDIS_URL', status: 'fail', message: 'REDIS_URL not set', fix: 'Set REDIS_URL in .env (Mandatory for production)' });
    }
  } else {
    results.push({ name: '.env file', status: 'fail', message: 'Missing .env file', fix: 'Copy .env.example to .env and configure' });
  }

  const tsConfigPath = path.join(projectPath, 'tsconfig.json');
  if (fs.existsSync(tsConfigPath)) {
    results.push({ name: 'tsconfig.json', status: 'pass', message: 'Found tsconfig.json' });
  } else {
    results.push({ name: 'tsconfig.json', status: 'warn', message: 'Missing tsconfig.json', fix: 'Create a tsconfig.json for TypeScript' });
  }

  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0] ?? '0');
  if (majorVersion >= 20) {
    results.push({ name: 'Node.js version', status: 'pass', message: `Version: ${nodeVersion}` });
  } else {
    results.push({ name: 'Node.js version', status: 'warn', message: `Version: ${nodeVersion} (recommended: 20+)`, fix: 'Upgrade to Node.js 20 or later' });
  }

  const passCount = results.filter(r => r.status === 'pass').length;
  const warnCount = results.filter(r => r.status === 'warn').length;
  const failCount = results.filter(r => r.status === 'fail').length;

  results.forEach(result => {
    const icon = result.status === 'pass' ? '✅' : result.status === 'warn' ? '⚠️' : '❌';
    console.log(`${icon} ${result.name}: ${result.message}`);
    if (result.fix) {
      console.log(`   💡 Fix: ${result.fix}`);
    }
  });

  console.log(`\n📊 Summary: ${passCount} passed, ${warnCount} warnings, ${failCount} errors`);

  if (failCount > 0) {
    console.log('\n❌ Please fix the errors above before continuing.');
    process.exit(1);
  } else if (warnCount > 0) {
    console.log('\n⚠️  Please review the warnings above.');
  } else {
    console.log('\n✅ All checks passed! Your project looks great.');
  }
}
