import fs from 'fs';
import path from 'path';

const renames = {
    'talak-web3-core': '@talak-web3/core',
    'talak-web3-auth': '@talak-web3/auth',
    'talak-web3-client': '@talak-web3/client',
    'talak-web3-config': '@talak-web3/config',
    'talak-web3-hooks': '@talak-web3/hooks',
    'talak-web3-types': '@talak-web3/types',
    'talak-web3-rpc': '@talak-web3/rpc',
    'talak-web3-errors': '@talak-web3/errors',
    'talak-web3-middleware': '@talak-web3/middleware',
    'talak-web3-adapters': '@talak-web3/adapters',
    'talak-web3-identity': '@talak-web3/identity',
    'talak-web3-orgs': '@talak-web3/orgs',
    'talak-web3-realtime': '@talak-web3/realtime',
    'talak-web3-tx': '@talak-web3/tx',
    'talak-web3-ai': '@talak-web3/ai',
    'talak-web3-analytics': '@talak-web3/analytics-engine',
    'talak-web3-utils': '@talak-web3/utils',
    'talak-web3-handlers': '@talak-web3/handlers',
    'talak-web3-plugins': '@talak-web3/plugins',
    'talak-web3': 'talak-web3'
};

const extensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.md'];
const exclude = ['node_modules', '.git', '.trae', 'pnpm-lock.yaml'];

function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (exclude.some(ex => fullPath.includes(ex))) continue;

        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
            walk(fullPath);
        } else if (extensions.includes(path.extname(fullPath))) {
            updateFile(fullPath);
        }
    }
}

function updateFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    const sortedKeys = Object.keys(renames).sort((a, b) => b.length - a.length);

    for (const oldName of sortedKeys) {
        const newName = renames[oldName];

        const regex1 = new RegExp(`'${oldName}'`, 'g');
        const regex2 = new RegExp(`"${oldName}"`, 'g');

        if (regex1.test(content) || regex2.test(content)) {
            content = content.replace(regex1, `'${newName}'`);
            content = content.replace(regex2, `"${newName}"`);
            changed = true;
        }
    }

    if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${filePath}`);
    }
}

const rootDir = process.argv[2] || '.';
walk(rootDir);
