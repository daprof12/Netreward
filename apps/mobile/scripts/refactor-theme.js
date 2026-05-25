const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.tsx') || file.endsWith('.ts')) results.push(file);
    }
  });
  return results;
}

const files = walk('./src');

files.forEach(file => {
  if (file.includes('theme.ts')) return;
  let content = fs.readFileSync(file, 'utf8');
  
  // Check if file uses static colors
  if (content.includes('import { colors } from') || content.includes('import { colors, shadows } from')) {
    
    // 1. Update imports
    content = content.replace(/import \{ colors \} from ['"]@\/theme['"];?/g, "import { useThemeColors } from '@/theme';");
    content = content.replace(/import \{ colors, shadows \} from ['"]@\/theme['"];?/g, "import { useThemeColors, shadows } from '@/theme';");
    
    // 2. Change styles definition
    content = content.replace(/const styles = StyleSheet\.create\(\{/g, "const createStyles = (colors: any) => StyleSheet.create({");

    // 3. Inject colors and styles initialization inside default export component
    // Assuming pattern: export default function X() {
    content = content.replace(/(export default function \w+\([^)]*\)\s*\{)/g, "$1\n  const colors = useThemeColors();\n  const styles = createStyles(colors);");
    
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
});
