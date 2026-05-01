import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function getConcurrency() {
  const cpuCount = os.cpus()?.length ?? 4;
  return Math.max(2, Math.min(16, cpuCount));
}

function runNpm(args, cwd) {
  const comspec = process.platform === "win32" ? (process.env.ComSpec ?? "cmd.exe") : null;
  const command = process.platform === "win32" ? comspec : "npm";
  const commandArgs = process.platform === "win32" ? ["/d", "/s", "/c", "npm.cmd", ...args] : args;

  return new Promise((resolve) => {
    const child = spawn(command, commandArgs, { cwd, stdio: "inherit", shell: false });
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

async function runInDir(task, cwd) {
  return runNpm(["run", task, "--if-present"], cwd);
}

const task = process.argv[2];
if (!task) {
  console.error("Usage: node scripts/ws.mjs <build|typecheck|lint|test|dev|clean>");
  process.exit(1);
}

const repoRoot = process.cwd();

const buildOrder = [
  "packages/talak-web3-types",
  "packages/talak-web3-utils",
  "packages/talak-web3-errors",
  "packages/talak-web3-config",
  "packages/talak-web3-auth",
  "packages/talak-web3-core",
  "packages/talak-web3-client",
  "packages/talak-web3-hooks",
  "packages/talak-web3-middleware",
  "packages/talak-web3-rpc",
  "packages/talak-web3-handlers",
  "packages/talak-web3-identity",
  "packages/talak-web3-analytics",
  "packages/talak-web3-orgs",
  "packages/talak-web3-ai",
  "packages/talak-web3-adapters",
  "packages/talak-web3-plugins",
  "packages/talak-web3-realtime",
  "packages/talak-web3-tx",
  "packages/talak-web3-rate-limit",
  "packages/talak-web3-test-utils",
  "packages/@talak-web3/analytics",
  "packages/@talak-web3/dashboard",
  "packages/@talak-web3/devtools",
  "packages/@talak-web3/cli",
  "packages/talak-web3",
  "apps/hono-backend",
];

async function main() {
  for (const relativePath of buildOrder) {
    const absPath = path.join(repoRoot, relativePath);
    if (!fs.existsSync(absPath)) {
      console.warn(`[ws] Skipping missing path: ${relativePath}`);
      continue;
    }
    console.log(`[ws] Running ${task} in ${relativePath}...`);
    const code = await runInDir(task, absPath);
    if (code !== 0) {
      console.error(`[ws] Task ${task} failed in ${relativePath} with code ${code}`);
      process.exit(code);
    }
  }
  console.log(`[ws] Task ${task} completed successfully across all packages.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
