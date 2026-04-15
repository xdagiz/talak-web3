const fs = require('node:fs');
const path = require('node:path');

const REPO_URL = 'git+https://github.com/dagimabebe/talak-web3.git';

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

const packagesDir = path.join(process.cwd(), 'packages');
const repoRoot = process.cwd();

for (const file of walkPackageJsonFiles(packagesDir)) {
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (json.private) continue;
  if (!json.name) continue;

  const dir = path.dirname(file);
  const directory = path.relative(repoRoot, dir).split(path.sep).join('/');

  json.repository = {
    type: 'git',
    url: REPO_URL,
    directory,
  };

  if (!json.bugs) {
    json.bugs = { url: 'https://github.com/dagimabebe/talak-web3/issues' };
  }
  if (!json.homepage) {
    json.homepage = `https://github.com/dagimabebe/talak-web3/tree/main/${directory}#readme`;
  }

  fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n');
}

console.log('Synced repository / bugs / homepage for publishable packages under packages/.');
