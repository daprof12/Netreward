import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('src');

files.forEach(file => {
  if (file.includes('ui/NrtAmount.tsx')) return;
  
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  if (content.includes('<NrtAmount') || content.includes('NrtAmountInline')) {
    if (!content.includes("import NrtAmount") && !content.includes("import { NrtAmount")) {
      // Find the last import
      const lines = content.split('\n');
      let lastImportIdx = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('import ')) {
          lastImportIdx = i;
        }
      }

      const importString = content.includes('NrtAmountInline') 
        ? "import NrtAmount, { NrtAmountInline } from '@/components/ui/NrtAmount';"
        : "import NrtAmount from '@/components/ui/NrtAmount';";

      if (lastImportIdx !== -1) {
        lines.splice(lastImportIdx + 1, 0, importString);
        content = lines.join('\n');
      } else {
        content = importString + '\n' + content;
      }
    }
  }

  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log(`Fixed imports in ${file}`);
  }
});
