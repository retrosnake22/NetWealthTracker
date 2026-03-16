const fs = require('fs');
let c = fs.readFileSync('src/pages/DashboardPage.tsx', 'utf8');

// Find "Total Expenses" marker
const idx = c.indexOf('Total Expenses');
if (idx === -1) { console.log('ERROR: Total Expenses not found'); process.exit(1); }

// Find next bg-slate-100 after Total Expenses (the track bar)
const old1 = 'bg-slate-100 dark:bg-white/10';
const pos1 = c.indexOf(old1, idx);
if (pos1 === -1) { console.log('ERROR: track class not found after marker'); process.exit(1); }

c = c.substring(0, pos1) + 'bg-blue-100 dark:bg-blue-950/50' + c.substring(pos1 + old1.length);

fs.writeFileSync('src/pages/DashboardPage.tsx', c);
console.log('Done - fixed expenses bar track to dark blue');
