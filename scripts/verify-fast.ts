import { spawn } from 'node:child_process';

function run(command: string, args: string[], cwd: string) {
  return new Promise<number>((resolve) => {
    const child = spawn(command, args, { cwd, stdio: 'inherit', shell: false });
    child.on('exit', (code) => resolve(code ?? 1));
  });
}

async function runPnpm(args: string[], cwd: string) {
  if (process.platform === 'win32') {
    const comspec = process.env.ComSpec ?? 'cmd.exe';
    return run(comspec, ['/d', '/s', '/c', 'pnpm', ...args], cwd);
  }
  return run('pnpm', args, cwd);
}

async function runNpm(args: string[], cwd: string) {
  if (process.platform === 'win32') {
    const comspec = process.env.ComSpec ?? 'cmd.exe';
    return run(comspec, ['/d', '/s', '/c', 'npm', ...args], cwd);
  }
  return run('npm', args, cwd);
}

async function main() {
  const repoRoot = process.cwd();
  const pkg = 'talak-web3';

  const buildDirect = await runPnpm(['--filter', pkg, 'build'], repoRoot);
  if (buildDirect !== 0) process.exit(buildDirect);

  const buildFast = await runPnpm(['build:fast', pkg], repoRoot);
  if (buildFast !== 0) process.exit(buildFast);

  const smokeCwd = `${repoRoot}\\smoke-test`;
  const smokeInstall = await runNpm(['install'], smokeCwd);
  if (smokeInstall !== 0) process.exit(smokeInstall);

  const smokeTest = await runNpm(['test'], smokeCwd);
  process.exit(smokeTest);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
