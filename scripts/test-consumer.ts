import { spawn } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync, readdirSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";

function run(command: string, args: string[], cwd: string) {
  return new Promise<{ code: number; stdout: string }>((resolve) => {
    let stdout = "";
    const child = spawn(command, args, { cwd, shell: false });
    child.stdout?.on("data", (d) => {
      const s = String(d);
      stdout += s;
      process.stdout.write(s);
    });
    child.stderr?.on("data", (d) => process.stderr.write(d));
    child.on("exit", (code) => resolve({ code: code ?? 1, stdout }));
  });
}

async function runCmd(args: string[], cwd: string) {
  const comspec = process.env.ComSpec ?? "cmd.exe";
  return run(comspec, ["/d", "/s", "/c", ...args], cwd);
}

async function runPnpm(args: string[], cwd: string) {
  return runCmd(["pnpm", ...args], cwd);
}

async function runNpm(args: string[], cwd: string) {
  return runCmd(["npm", ...args], cwd);
}

async function main() {
  const repoRoot = process.cwd();
  const pkgName = "talak-web3";
  const pkgDir = path.join(repoRoot, "packages", "talak-web3");
  const resultPath = path.join(repoRoot, "test-consumer.latest.json");

  const state: Record<string, unknown> = {
    ok: false,
    package: pkgName,
    step: "start",
  };

  const writeState = () => writeFileSync(resultPath, JSON.stringify(state, null, 2));
  writeState();

  console.log("[consumer] building package");
  state.step = "build";
  writeState();

  const build = await runPnpm(["--filter", pkgName, "build"], repoRoot);
  if (build.code !== 0) process.exit(build.code);
  state.step = "build_ok";
  writeState();

  console.log("[consumer] packing tgz");
  state.step = "pack";
  writeState();
  for (const name of readdirSync(pkgDir)) {
    if (name.endsWith(".tgz")) rmSync(path.join(pkgDir, name), { force: true });
  }

  const packed = await runCmd(["npm", "pack", "--silent"], pkgDir);
  if (packed.code !== 0) process.exit(packed.code);
  console.log("[consumer] pack ok");

  const tgzs = readdirSync(pkgDir)
    .filter((n) => n.endsWith(".tgz"))
    .map((n) => ({ name: n, mtimeMs: statSync(path.join(pkgDir, n)).mtimeMs }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  const tgzName = tgzs[0]?.name ?? "";

  if (!tgzName) {
    console.error("Failed to parse npm pack output");
    process.exit(1);
  }

  state.step = "pack_ok";
  state.tgz = tgzName;
  writeState();

  const tgzPath = path.join(pkgDir, tgzName);
  const tempDir = path.join(os.tmpdir(), `talak-web3-consumer-${Date.now()}`);
  mkdirSync(tempDir, { recursive: true });
  const keepTemp = process.env.KEEP_TEMP === "1";
  state.step = "temp_ready";
  state.tempDir = keepTemp ? tempDir : undefined;
  writeState();

  try {
    writeFileSync(
      path.join(tempDir, "package.json"),
      JSON.stringify({ name: "talak-web3-consumer", private: true, version: "0.0.0" }, null, 2),
    );

    console.log("[consumer] installing tgz in clean folder");
    state.step = "install";
    writeState();
    const install = await runNpm(["install", tgzPath, "typescript", "tsx"], tempDir);
    if (install.code !== 0) process.exit(install.code);
    console.log("[consumer] install ok");
    state.step = "install_ok";
    writeState();

    writeFileSync(
      path.join(tempDir, "test-esm.mjs"),
      "import { talakWeb3, MainnetPreset } from 'talak-web3';\n\nconst app = talakWeb3(MainnetPreset);\nconsole.log('esm ok', typeof app.init);\n",
    );

    writeFileSync(
      path.join(tempDir, "test-cjs.cjs"),
      "const { talakWeb3, MainnetPreset } = require('talak-web3');\nconst app = talakWeb3(MainnetPreset);\nconsole.log('cjs ok', typeof app.init);\n",
    );

    writeFileSync(
      path.join(tempDir, "test-ts.ts"),
      "import { talakWeb3, MainnetPreset } from 'talak-web3';\nimport type { TalakWeb3Instance } from 'talak-web3';\n\nconst app: TalakWeb3Instance = talakWeb3(MainnetPreset);\nconsole.log('ts ok', typeof app.init);\n",
    );

    console.log("[consumer] files written");
    state.step = "files_written";
    writeState();

    console.log("[consumer] running esm");
    state.step = "esm";
    writeState();
    const esm = await runCmd(["node", "test-esm.mjs"], tempDir);
    if (esm.code !== 0) process.exit(esm.code);
    state.step = "esm_ok";
    writeState();

    console.log("[consumer] running cjs");
    state.step = "cjs";
    writeState();
    const cjs = await runCmd(["node", "test-cjs.cjs"], tempDir);
    if (cjs.code !== 0) process.exit(cjs.code);
    state.step = "cjs_ok";
    writeState();

    console.log("[consumer] running ts");
    state.step = "ts";
    writeState();
    const ts = await runCmd(["npx", "--yes", "tsx", "test-ts.ts"], tempDir);
    if (ts.code !== 0) process.exit(ts.code);
    state.step = "ts_ok";
    writeState();

    console.log("[consumer] ok");
    state.ok = true;
    state.step = "done";
    writeState();
  } finally {
    if (keepTemp) {
      console.log(`[consumer] temp kept: ${tempDir}`);
    } else {
      rmSync(tempDir, { recursive: true, force: true });
    }
  }
}

main().catch((e) => {
  try {
    const repoRoot = process.cwd();
    const resultPath = path.join(repoRoot, "test-consumer.latest.json");
    writeFileSync(resultPath, JSON.stringify({ ok: false, error: String(e) }, null, 2));
  } catch {}
  console.error(e);
  process.exit(1);
});
