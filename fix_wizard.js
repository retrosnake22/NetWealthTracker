const fs = require('fs');

const file = fs.readFileSync('src/pages/SetupWizardPage.tsx', 'utf8');
const lines = file.split('\n');

// Find marker lines
const assetEndIdx = lines.findIndex(l => l.includes('__END_ASSET_HANDLERS__'));
const liabIdx = lines.findIndex(l => l.includes('__LIAB_START__'));

if (assetEndIdx === -1 || liabIdx === -1) {
  console.error('Markers not found:', assetEndIdx, liabIdx);
  process.exit(1);
}

// Read the new AssetsStep
const newStep = fs.readFileSync('temp_assets_step.tsx', 'utf8');

// Part 1: everything up to and including the line before __END_ASSET_HANDLERS__
// We want to keep the resetForm + handleTabChange + startEditAsset + handleAddAsset 
// that's BEFORE __END_ASSET_HANDLERS__
// But actually the old code still has bad stuff mixed in.
// Better approach: keep everything from line 0 to 850 (before the old AssetsStep comment)

const step3Idx = lines.findIndex(l => l.includes('Step 3: Other Assets'));

if (step3Idx === -1) {
  console.error('Step 3 marker not found');
  process.exit(1);
}

// Part 1: lines 0 to step3Idx-1 (before Step 3 comment)  
const part1 = lines.slice(0, step3Idx);

// Part 2: new AssetsStep content
const part2Lines = newStep.split('\n');

// Part 3: everything from __LIAB_START__ onward, but replace the marker
const part3 = lines.slice(liabIdx);
part3[0] = '// -- Step 4: Liabilities --';

// Combine
const result = [...part1, ...part2Lines, ...part3].join('\n');
fs.writeFileSync('src/pages/SetupWizardPage.tsx', result);

// Clean up temp files
try { fs.unlinkSync('temp_assets_step.tsx'); } catch(e) {}
try { fs.unlinkSync('fix_wizard.js'); } catch(e) {}

console.log('Done! File rewritten successfully.');
console.log(`Part 1: ${part1.length} lines, Part 2: ${part2Lines.length} lines, Part 3: ${part3.length} lines`);
console.log(`Total: ${part1.length + part2Lines.length + part3.length} lines`);
