const fs = require('fs');
const path = require('path');

if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist', { recursive: true });
}

const srcDir = 'src';
if (fs.existsSync(srcDir)) {
  const files = fs.readdirSync(srcDir);
  files.forEach(file => {
    if (file.endsWith('.ts')) {
      const srcFile = path.join(srcDir, file);
      const destFile = path.join('dist', file.replace('.ts', '.js'));

      const content = fs.readFileSync(srcFile, 'utf8');

      const jsContent = content
        .replace(/export\s+type\s+/g, '// export type ')
        .replace(/:\s*[^=,\)\{]+(?=\s*[=,\)\{])/g, '')
        .replace(/interface\s+\w+\s*\{[^}]*\}/gs, '')
        .replace(/import\s+type\s+/g, '// import type ');

      fs.writeFileSync(destFile, jsContent);
      console.log(`Built: ${destFile}`);
    }
  });
}

console.log('Build completed successfully!');
