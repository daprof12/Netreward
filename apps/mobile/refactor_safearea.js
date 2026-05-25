const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('./src');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // 1. If it imports SafeAreaView from react-native
  const rnImportRegex = /import\s+{([^}]*)}\s+from\s+['"]react-native['"]/;
  const match = content.match(rnImportRegex);
  
  if (match) {
    const imports = match[1].split(',').map(s => s.trim()).filter(Boolean);
    if (imports.includes('SafeAreaView')) {
      // Remove SafeAreaView
      const newImports = imports.filter(i => i !== 'SafeAreaView');
      
      let newImportStatement = '';
      if (newImports.length > 0) {
        newImportStatement = `import { ${newImports.join(', ')} } from 'react-native';`;
      }
      
      content = content.replace(match[0], newImportStatement);
      
      // Now add import for safe-area-context if not exists
      if (!content.includes("from 'react-native-safe-area-context'")) {
         // Insert after the react-native import line or at the top
         content = `import { SafeAreaView } from 'react-native-safe-area-context';\n` + content;
      }
      
      changed = true;
    }
  }

  // 2. Also fix some files where SafeAreaView is imported as RNSafeAreaView
  // e.g. import { View, Text, StyleSheet, Pressable, Switch, ScrollView, Modal, SafeAreaView as RNSafeAreaView } from 'react-native';
  const rnSafeAreaAsRegex = /SafeAreaView\s+as\s+\w+/g;
  if (content.match(rnSafeAreaAsRegex)) {
     // I'll just let those be, since they renamed it explicitly, probably to use the context one for the main wrapper.
     // Let's check if there's an actual issue.
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
