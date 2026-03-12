// Show the hex encoding of line 332
import { readFileSync } from 'fs';
const c = readFileSync('./src/pages/SetupWizardPage.tsx', 'utf8');
const lines = c.split('\n');
const line = lines[331]; // 0-indexed
console.log('Line 332:', JSON.stringify(line));
console.log('Hex:', Buffer.from(line).toString('hex'));
