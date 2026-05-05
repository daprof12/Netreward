const fs = require('fs');
const path = require('path');

const files = [
  'src/pages/admin/AdminWallets.tsx',
  'src/pages/admin/AdminEarnings.tsx',
  'src/pages/admin/AdminUsers.tsx',
  'src/pages/admin/AdminP2P.tsx',
  'src/pages/admin/AdminTransactions.tsx',
  'src/pages/admin/AdminExchangers.tsx',
  'src/pages/admin/AdminReferrals.tsx',
  'src/pages/admin/AdminNetworks.tsx',
  'src/pages/admin/AdminCheckout.tsx',
  'src/pages/admin/AdminServices.tsx',
  'src/pages/admin/AdminDevices.tsx',
  'src/pages/admin/AdminPayments.tsx'
];

files.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (!fs.existsSync(fullPath)) return;
  
  let content = fs.readFileSync(fullPath, 'utf8');
  
  // 1. Add import
  if (!content.includes('import LocationSearch')) {
    content = content.replace(/(import .* from 'lucide-react';)/, "$1\nimport LocationSearch from '@/components/LocationSearch';");
  }

  // 2. Default state
  content = content.replace(/const \[countryFilter, setCountryFilter\] = useState\('All'\);/g, "const [countryFilter, setCountryFilter] = useState('Global');");

  // 3. Replace <select value={countryFilter} ...> ... </select>
  // This might span multiple lines if options are inside.
  content = content.replace(/<select value=\{countryFilter\}.*?>[\s\S]*?<\/select>/g, `<div className="min-w-[200px] flex-1 sm:flex-none"><LocationSearch value={countryFilter} onChange={setCountryFilter} /></div>`);

  // 4. Update filter logic
  content = content.replace(/countryFilter === 'All'/g, "countryFilter === 'Global'");

  // Custom fixes for specific files like AdminUsers.tsx that has another select for form.country
  content = content.replace(/<select value=\{form.country\}.*?>[\s\S]*?<\/select>/g, `<LocationSearch value={form.country} onChange={v => setForm({ ...form, country: v })} />`);

  fs.writeFileSync(fullPath, content);
  console.log('Updated ' + file);
});
