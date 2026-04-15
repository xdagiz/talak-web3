const fs = require('node:fs');
const path = require('node:path');

function walkPackageJsonFiles(dir) {
  /** @type {string[]} */
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules') continue;
      out.push(...walkPackageJsonFiles(p));
    } else if (ent.isFile() && ent.name === 'package.json') {
      out.push(p);
    }
  }
  return out;
}

function shieldVersionUrl(npmName) {
  const enc = encodeURIComponent(npmName);
  return `https://img.shields.io/npm/v/${enc}?logo=npm&label=npm`;
}

const packagesDir = path.join(process.cwd(), 'packages');
const rows = [];

for (const file of walkPackageJsonFiles(packagesDir)) {
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (json.private) continue;
  if (!json.name || !json.version) continue;
  const dir = path.dirname(file);
  const rel = path.relative(process.cwd(), dir).split(path.sep).join('/');
  rows.push({
    name: json.name,
    version: json.version,
    path: rel,
    mdPath: `../${rel}`,
    shield: shieldVersionUrl(json.name),
    npm: `https://www.npmjs.com/package/${encodeURIComponent(json.name)}`,
  });
}

rows.sort((a, b) => a.name.localeCompare(b.name));

const lines = [
  '# npm registry (live versions)',
  '',
  'Badges load the **current latest version from the public npm registry** (same data as [npmjs.com](https://www.npmjs.com/)), not from this repo’s `package.json`.',
  '',
  '| Package | npm | Version (live) | Source |',
  '|---------|-----|----------------|--------|',
];

for (const r of rows) {
  lines.push(
    `| \`${r.name}\` | [npm](${r.npm}) | [![npm](${r.shield})](${r.npm}) | [\`${r.path}\`](${r.mdPath}/) |`,
  );
}

lines.push('', `**Count:** ${rows.length} publishable workspace packages.`, '');

const outPath = path.join(process.cwd(), 'docs', 'NPM_REGISTRY.md');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, lines.join('\n'));
console.log('Wrote', path.relative(process.cwd(), outPath));
