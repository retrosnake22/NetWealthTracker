const fs = require('fs');
const file = 'src/pages/AssetsPage.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove the misplaced flex div wrapper and markers
// Find the line with REMOVE_PREVIOUS_LINE and the flex div before it
const lines = content.split('\n');
const newLines = [];
let skipNextFlexDiv = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Skip the "REMOVE_PREVIOUS_LINE" marker line
  if (line.includes('REMOVE_PREVIOUS_LINE')) {
    // Also remove the previous line (the flex div)
    if (newLines.length > 0 && newLines[newLines.length - 1].includes('flex gap-2 justify-end')) {
      newLines.pop();
    }
    continue;
  }
  
  // Fix the CANCEL_MARKER - add flex div wrapper before Cancel button
  if (line.includes('CANCEL_MARKER')) {
    const cleaned = line.replace('{/* CANCEL_MARKER */}', '');
    // Add the flex div opening before the cancel button
    newLines.push('\t\t\t\t\t\t<div className="flex gap-2 justify-end">');
    newLines.push(cleaned);
    continue;
  }
  
  newLines.push(line);
}

fs.writeFileSync(file, newLines.join('\n'));
console.log('Fixed AssetsPage.tsx');
