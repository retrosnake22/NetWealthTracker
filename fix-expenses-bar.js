const fs = require('fs');
let content = fs.readFileSync('src/pages/DashboardPage.tsx', 'utf8');

// Fix the expenses bar track background (line ~501) - make it dark blue
// Find the specific bar after "Total Expenses" 
const marker = 'Total Expenses';
const markerIdx = content.indexOf(marker);
if (markerIdx === -1) { console.log('Marker not found'); process.exit(1); }

// Find the next bg-slate-100 after the marker
const searchFrom = content.indexOf('bg-slate-100 dark:bg-white/10', markerIdx);
if (searchFrom === -1) { console.log('Track class not found'); process.exit(1); }

content = content.substring(0, searchFrom) + 'bg-blue-100 dark:bg-blue-950/50' + content.substring(searchFrom + 'bg-slate-100 dark:bg-white/10'.length);

fs.writeFileSync('src/pages/DashboardPage.tsx', content);
console.log('Fixed expenses bar track');
