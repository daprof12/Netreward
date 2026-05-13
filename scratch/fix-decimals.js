const fs = require('fs');
const glob = require('glob');
const path = require('path');

const files = glob.sync('src/**/*.{ts,tsx}');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Fix InstantPurchase specifically first since it's easy
  if (file.includes('InstantPurchase.tsx')) {
    content = content.replace(/const nrt = amount \? \(parseFloat\(amount\) \/ NRT_RATE\)\.toFixed\(2\) : '0\.00';/, 'const nrt = amount ? (parseFloat(amount) / NRT_RATE) : 0;');
    content = content.replace(/\{nrt\} <span className="text-sm text-text-secondary font-normal">NRT<\/span>/g, '<NrtAmount value={nrt} />');
    content = content.replace(/\[\'You receive\', \`\$\{nrt\} NRT\`\]/, '[\'You receive\', <NrtAmountInline value={nrt} />]');
    content = content.replace(/\{nrt\} <span className="text-lg">NRT<\/span>/g, '<NrtAmount value={nrt} className="text-4xl font-black text-accent-primary" unitClassName="text-lg text-text-secondary ml-1 font-normal" />');
    
    // Add import if needed
    if (!content.includes('NrtAmount')) {
      content = content.replace(/import \{ useState, useEffect \} from 'react';/, "import { useState, useEffect } from 'react';\nimport NrtAmount, { NrtAmountInline } from '@/components/ui/NrtAmount';");
    }
  }

  // Generic replacements for .toFixed() related to NRT
  // Look for {someVar.toFixed(2)} NRT and replace with <NrtAmount value={someVar} />
  const reactNrtPattern = /\{([a-zA-Z0-9_$.]+?)\.toFixed\(\d+\)\}\s*NRT/g;
  if (reactNrtPattern.test(content)) {
    content = content.replace(reactNrtPattern, '<NrtAmount value={$1} />');
    if (!content.includes('import NrtAmount')) {
      content = content.replace(/import (.*) from 'react';?/, "import $1 from 'react';\nimport NrtAmount from '@/components/ui/NrtAmount';");
    }
  }
  
  // Generic template string replacements: `${someVar.toFixed(2)} NRT` -> `${formatNrtText(someVar)} NRT`
  const tplNrtPattern = /\$\{([a-zA-Z0-9_$.]+?)\.toFixed\(\d+\)\}\s*NRT/g;
  if (tplNrtPattern.test(content)) {
    content = content.replace(tplNrtPattern, '${formatNrtText($1)} NRT');
    if (!content.includes('formatNrtText')) {
      content = content.replace(/import (.*) from 'react';?/, "import $1 from 'react';\nimport { formatNrtText } from '@/lib/formatNrt';");
    }
  }

  // P2PFlow specific
  if (file.includes('P2PFlow.tsx')) {
    content = content.replace(/const nrtAmountDisplay = nrtValue\.toFixed\(2\);/, 'const nrtAmountDisplay = nrtValue;');
    content = content.replace(/value=\{nrtAmountDisplay\}/, 'value={formatNrtText(nrtValue)}');
  }

  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
});
