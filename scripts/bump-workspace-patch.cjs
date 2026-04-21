const fs = require('node:fs');
const path = require('node:path');

function walkPackageJsonFiles(dir) {

  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walkPackageJsonFiles(p));
    else if (ent.isFile() && ent.name === 'package.json') out.push(p);
  }
  return out;
}

function bumpPatch(version) {
  const parts = version.split('.');
  if (parts.length !== 3) throw new Error(`Unsupported semver: ${version}`);
  const patch = Number(parts[2]);
  if (!Number.isFinite(patch)) throw new Error(`Bad patch: ${version}`);
  return `${parts[0]}.${parts[1]}.${patch + 1}`;
}

function isWorkspacePackageName(name) {
  return name === 'talak-web3' || name.startsWith('@talak-web3/');
}

function updateDeps(obj, map) {
  if (!obj) return;
  for (const section of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
    const deps = obj[section];
    if (!deps) continue;
    for (const [pkg, ver] of Object.entries(deps)) {
      if (typeof ver !== 'string') continue;
      if (!isWorkspacePackageName(pkg)) continue;
      const next = map.get(pkg);
      if (!next) continue;

      if (ver === next.oldVersion) {
        deps[pkg] = next.newVersion;
      }
    }
  }
}

const packagesDir = path.join(process.cwd(), 'packages');
const files = walkPackageJsonFiles(packagesDir).sort();

const map = new Map();

for (const file of files) {
  const raw = fs.readFileSync(file, 'utf8');
  const json = JSON.parse(raw);
  if (json.private) continue;
  if (!json.name || !json.version) continue;
  const oldVersion = json.version;
  const newVersion = bumpPatch(oldVersion);
  map.set(json.name, { oldVersion, newVersion });
}

for (const file of files) {
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (json.private) {
    updateDeps(json, map);
    fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n');
    continue;
  }

  if (!json.version || !json.name) continue;
  const entry = map.get(json.name);
  if (!entry) continue;
  json.version = entry.newVersion;
  updateDeps(json, map);
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n');
}

console.log(`Bumped ${map.size} publishable workspace packages (patch).`);
