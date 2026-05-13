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
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // 1. InstantPurchase
  if (file.includes('InstantPurchase.tsx')) {
    content = content.replace(/const nrt = amount \? \(parseFloat\(amount\) \/ NRT_RATE\)\.toFixed\(2\) : '0\.00';/, 'const nrt = amount ? (parseFloat(amount) / NRT_RATE) : 0;');
    content = content.replace(/\{nrt\} <span className="text-sm text-text-secondary font-normal">NRT<\/span>/g, '<NrtAmount value={nrt} />');
    content = content.replace(/\[\'You receive\', \`\$\{nrt\} NRT\`\]/, '[\'You receive\', <NrtAmountInline value={nrt} />]');
    content = content.replace(/<p className="text-4xl font-black text-accent-primary">\{nrt\} <span className="text-lg">NRT<\/span><\/p>/g, '<NrtAmount value={nrt} className="text-4xl font-black text-accent-primary" unitClassName="text-lg ml-1 font-normal" />');
    
    if (content !== original && !content.includes('NrtAmount')) {
      content = content.replace(/import \{ useState, useEffect \} from 'react';/, "import { useState, useEffect } from 'react';\nimport NrtAmount, { NrtAmountInline } from '@/components/ui/NrtAmount';");
    }
  }

  // 2. ScanToPay
  if (file.includes('ScanToPay.tsx')) {
    content = content.replace(/\{detectedSession\.amountNrt\.toFixed\(\d+\)\} NRT/g, '<NrtAmount value={detectedSession.amountNrt} />');
    content = content.replace(/\{balanceNRT\.toFixed\(\d+\)\} NRT/g, '<NrtAmount value={balanceNRT} />');
    if (content !== original && !content.includes('NrtAmount')) {
      content = content.replace(/import \{ useState, useEffect \} from 'react';/, "import { useState, useEffect } from 'react';\nimport NrtAmount from '@/components/ui/NrtAmount';");
    }
  }

  // 3. DeviceDetail
  if (file.includes('DeviceDetail.tsx')) {
    content = content.replace(/\{totalNrt\.toFixed\(\d+\)\} NRT/g, '<NrtAmount value={totalNrt} />');
    content = content.replace(/\{Number\(app\.nrt_earned\)\.toFixed\(\d+\)\} NRT/g, '<NrtAmount value={app.nrt_earned} />');
    if (content !== original && !content.includes('NrtAmount')) {
      content = content.replace(/import \{ useState, useEffect \} from 'react';/, "import { useState, useEffect } from 'react';\nimport NrtAmount from '@/components/ui/NrtAmount';");
    }
  }

  // 4. IspDevicesView & SpDevicesView
  if (file.includes('IspDevicesView.tsx') || file.includes('SpDevicesView.tsx')) {
    content = content.replace(/nrt: totalNrt\.toFixed\(\d+\)/, 'nrt: totalNrt');
    content = content.replace(/cashback: \(totalNrt \* 0\.05\)\.toFixed\(\d+\)/, 'cashback: totalNrt * 0.05');
  }

  // 5. P2PFlow
  if (file.includes('P2PFlow.tsx')) {
    content = content.replace(/const nrtAmountDisplay = nrtValue\.toFixed\(\d+\);/, 'const nrtAmountDisplay = nrtValue;');
    content = content.replace(/const usdAmountDisplay = usdValue\.toFixed\(\d+\);/, 'const usdAmountDisplay = usdValue;');
  }
  
  // 6. Generic JSX search for {var.toFixed(X)} NRT -> <NrtAmount value={var} />
  const reactNrtPattern = /\{([a-zA-Z0-9_$.]+?)\.toFixed\(\d+\)\}\s*NRT/g;
  if (reactNrtPattern.test(content)) {
    content = content.replace(reactNrtPattern, '<NrtAmount value={$1} />');
    if (!content.includes('NrtAmount')) {
      content = content.replace(/import (.*) from 'react';?/, "import $1 from 'react';\nimport NrtAmount from '@/components/ui/NrtAmount';");
    }
  }
  
  // 7. Generic Template String search for ${var.toFixed(X)} NRT -> ${formatNrtText(var)} NRT
  const tplNrtPattern = /\$\{([a-zA-Z0-9_$.]+?)\.toFixed\(\d+\)\}\s*NRT/g;
  if (tplNrtPattern.test(content)) {
    content = content.replace(tplNrtPattern, '${formatNrtText($1)} NRT');
    if (!content.includes('formatNrtText')) {
      content = content.replace(/import (.*) from 'react';?/, "import $1 from 'react';\nimport { formatNrtText } from '@/lib/formatNrt';");
    }
  }

  // Save if changed
  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
});
