const fs = require('node:fs');
const path = require('node:path');

function listPackageJsonFiles(dir) {

  let out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out = out.concat(listPackageJsonFiles(p));
    else if (ent.isFile() && ent.name === 'package.json') out.push(p);
  }
  return out;
}

function rel(p) {
  return path.relative(process.cwd(), p).replace(/\\/g, '/');
}

function isWorkspacePkg(name) {
  return name === 'talak-web3' || name.startsWith('@talak-web3/');
}

function isLooseRange(depName, v) {
  if (isWorkspacePkg(depName) && v === 'workspace:*') {
    return false;
  }
  return (
    v === '*' ||
    v.startsWith('^') ||
    v.startsWith('~') ||
    v.includes('workspace:*') ||
    v.includes('workspace:^') ||
    v.includes('workspace:~')
  );
}

const packagesDir = path.join(process.cwd(), 'packages');
const packageJsonPaths = listPackageJsonFiles(packagesDir).sort();

const issues = [];

for (const p of packageJsonPaths) {
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  const pkg = rel(p);
  const publishable = !j.private;
  const exp = j.exports;
  const files = j.files || [];

  if (publishable) {
    const entryProblems = [];
    if (!j.main) entryProblems.push('missing main');
    if (!j.module) entryProblems.push('missing module');
    if (!j.types) entryProblems.push('missing types');
    if (entryProblems.length) issues.push({ pkg, type: 'entrypoints', msg: entryProblems.join(', ') });
    if (!exp || !exp['.']) issues.push({ pkg, type: 'exports', msg: 'missing exports["."]' });

    if (Array.isArray(files) && files.length) {
      const hasSrc = files.some((f) => /^src\b/.test(f) || f.includes('src/'));
      const hasTests = files.some((f) => /test/i.test(f));
      const hasConfigs = files.some((f) => /tsconfig|vitest|eslint|prettier|turbo|tsup/i.test(f));
      if (hasSrc || hasTests || hasConfigs) {
        issues.push({
          pkg,
          type: 'files',
          msg: `files includes unwanted entries (src:${hasSrc}, tests:${hasTests}, configs:${hasConfigs})`,
        });
      }
    } else {
      issues.push({ pkg, type: 'files', msg: 'missing/empty files field (risk: ships everything)' });
    }
  }

  const deps = Object.assign({}, j.dependencies, j.devDependencies, j.peerDependencies, j.optionalDependencies);
  for (const [k, v] of Object.entries(deps || {})) {
    if (typeof v !== 'string') continue;
    if (isLooseRange(k, v)) issues.push({ pkg, type: 'dep-range', msg: `${k}@${v}` });
  }
}

const byPkg = new Map();
for (const it of issues) {
  const list = byPkg.get(it.pkg) || [];
  list.push(it);
  byPkg.set(it.pkg, list);
}

console.log('packages scanned:', packageJsonPaths.length);
console.log('packages with issues:', byPkg.size);
for (const pkg of Array.from(byPkg.keys()).sort()) {
  console.log(`\n- ${pkg}`);
  for (const it of byPkg.get(pkg) || []) {
    console.log(`  [${it.type}] ${it.msg}`);
  }
}

process.exitCode = byPkg.size ? 2 : 0;
