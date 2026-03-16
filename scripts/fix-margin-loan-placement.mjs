import { readFileSync, writeFileSync } from 'fs';

const path = './src/pages/AssetsPage.tsx';
let lines = readFileSync(path, 'utf8').split('\n');

// Find the line with '<div className="flex gap-2 justify-end">' that precedes the margin loan section
// It's at line 1034 (0-indexed: 1033)
const buttonDivIdx = lines.findIndex((l, i) => i > 1000 && l.includes('flex gap-2 justify-end'));
console.log('Found button div at line', buttonDivIdx + 1);

// Find the cancel button line (the wrongly placed one)
const cancelBtnIdx = lines.findIndex((l, i) => i > buttonDivIdx && l.includes('<Button variant="outline" onClick={() => setShowAddAsset(false)}>Cancel'));
console.log('Found cancel button at line', cancelBtnIdx + 1);

if (buttonDivIdx === -1 || cancelBtnIdx === -1) {
  console.error('Could not find the markers');
  process.exit(1);
}

// Extract the margin loan comment + section (lines between buttonDiv+1 and cancelBtn-1)
const marginLoanLines = lines.slice(buttonDivIdx + 1, cancelBtnIdx);

// Build the new section:
// 1. Margin loan section (moved before the button div)
// 2. Button div with Cancel + Save buttons
const newSection = [
  ...marginLoanLines,
  '',
  '\t\t\t\t\t\t<div className="flex gap-2 justify-end">',
  '\t\t\t\t\t\t\t<Button variant="outline" onClick={() => setShowAddAsset(false)}>Cancel</Button>',
];

// Replace from buttonDivIdx to cancelBtnIdx (inclusive) with the new section
lines.splice(buttonDivIdx, cancelBtnIdx - buttonDivIdx + 1, ...newSection);

writeFileSync(path, lines.join('\n'));
console.log('Fixed margin loan placement');
