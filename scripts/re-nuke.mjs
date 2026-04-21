import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const EXCLUDED_DIRS = ['node_modules', '.git', '.next', 'dist', 'build', '.turbo', 'coverage'];
const JS_LIKE_EXTS = ['.ts', '.tsx', '.js', '.jsx', '.cjs', '.mjs', '.css', '.scss', '.json'];
const HASH_COMMENT_EXTS = ['.yml', '.yaml', '.sh', '.env', '.gitignore', 'dockerfile', '.conf', '.example'];
const MD_EXTS = ['.md', '.mdx'];

function removeJsComments(content) {
  let result = '';
  let i = 0;
  let inString = null;
  let inRegex = false;
  let inLineComment = false;
  let inBlockComment = false;

  while (i < content.length) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (inLineComment) {
      if (char === '\n') {
        inLineComment = false;
        result += char;
      }
    } else if (inBlockComment) {
      if (char === '*' && nextChar === '/') {
        inBlockComment = false;
        i++;
      }
    } else if (inString) {
      result += char;
      if (char === '\\') {
        result += nextChar;
        i++;
      } else if (char === inString) {
        inString = null;
      }
    } else if (inRegex) {
      result += char;
      if (char === '\\') {
        result += nextChar;
        i++;
      } else if (char === '/') {
        inRegex = false;
      }
    } else {
      if (char === '/' && nextChar === '/') {
        inLineComment = true;
        i++;
      } else if (char === '/' && nextChar === '*') {
        inBlockComment = true;
        i++;
      } else if (char === "'" || char === '"' || char === '`') {
        inString = char;
        result += char;
      } else if (char === '/') {
        let prev = result.trimEnd().slice(-1);
        if ('([=: ,?!&|<>{;'.includes(prev) || result.trimEnd().endsWith('return')) {
          inRegex = true;
          result += char;
        } else {
          result += char;
        }
      } else {
        result += char;
      }
    }
    i++;
  }

  return cleanEmptyLines(result);
}

function removeHashComments(content) {
  let lines = content.split('\n');
  let newLines = lines.map(line => {
    let inString = null;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (inString) {
        if (char === '\\') {
          i++;
        } else if (char === inString) {
          inString = null;
        }
      } else {
        if (char === "'" || char === '"') {
          inString = char;
        } else if (char === '#') {
          return line.slice(0, i).trimEnd();
        }
      }
    }
    return line;
  });
  return cleanEmptyLines(newLines.join('\n'));
}

function removeMdComments(content) {
  let newContent = content.replace(/<!--[\s\S]*?-->/g, '');
  newContent = newContent.replace(/^\[\/\/\]: # \(.*?\)$/gm, '');

  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)\n```/g;
  newContent = newContent.replace(codeBlockRegex, (match, lang, code) => {
    let cleanedCode = code;
    if (['ts', 'typescript', 'js', 'javascript', 'tsx', 'jsx', 'json'].includes(lang)) {
      cleanedCode = removeJsComments(code);
    } else if (['bash', 'sh', 'yaml', 'yml', 'env'].includes(lang)) {
      cleanedCode = removeHashComments(code);
    }
    return `\`\`\`${lang || ''}\n${cleanedCode}\n\`\`\``;
  });

  return cleanEmptyLines(newContent);
}

function cleanEmptyLines(content) {
  return content.split('\n')
    .map(line => line.trimEnd())
    .filter((line, index, arr) => {
      if (line !== '') return true;
      return arr[index - 1] !== '' && arr[index - 1] !== undefined;
    })
    .join('\n');
}

async function processFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const basename = path.basename(filePath).toLowerCase();

  let content;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch (err) { return; }

  let newContent;
  if (JS_LIKE_EXTS.includes(ext) || basename === 'tsconfig.json') {
    newContent = removeJsComments(content);
  } else if (HASH_COMMENT_EXTS.includes(ext) || basename === 'dockerfile') {
    newContent = removeHashComments(content);
  } else if (MD_EXTS.includes(ext)) {
    newContent = removeMdComments(content);
  } else {
    return;
  }

  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent, 'utf-8');
  }
}

async function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (EXCLUDED_DIRS.includes(file)) continue;
    const stats = fs.statSync(fullPath);
    if (stats.isDirectory()) {
      await walk(fullPath);
    } else {
      await processFile(fullPath);
    }
  }
}

walk(rootDir).then(() => {
  console.log('Finished.');
});
