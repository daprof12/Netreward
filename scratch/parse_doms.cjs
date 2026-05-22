const fs = require('fs');
const path = require('path');

const dir = '/Users/apple/.gemini/antigravity/brain/8c8f9a05-739a-45e9-a19f-5dbfdc60dffc/.tempmediaStorage';

function parse() {
  const files = fs.readdirSync(dir)
    .filter(f => f.startsWith('dom_') && f.endsWith('.txt') && parseInt(f.split('_')[1]) > 1779300000000)
    .map(f => {
      const p = path.join(dir, f);
      const stat = fs.statSync(p);
      return { name: f, path: p, mtime: stat.mtimeMs };
    })
    .sort((a, b) => a.mtime - b.mtime);

  console.log(`Found ${files.length} DOM files from this run. Parsing:\n`);
  
  files.forEach(f => {
    const content = fs.readFileSync(f.path, 'utf8');
    
    // Check if there is an <input> or button text or specific page items
    let pageState = "Unknown";
    if (content.includes("NetReward")) pageState = "NetReward Platform";
    if (content.includes("Musiq")) pageState = "Musiq Player";
    if (content.includes("Store") || content.includes("Upgrade")) pageState += " (Store/Player)";
    if (content.includes("Log Out")) pageState += " (Logged In)";
    if (content.includes("Email") || content.includes("Password")) pageState += " (Auth/Login)";
    
    // Extract non-interactive lines
    const textLines = content.split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('<') && !l.startsWith('[') && !l.startsWith('\t'))
      .join(' | ');

    console.log(`- ${f.name} (${new Date(f.mtime).toLocaleTimeString()}): State: ${pageState} | Text: ${textLines.substring(0, 100)}`);
  });
}

parse();
