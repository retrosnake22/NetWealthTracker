const fs = require('fs');
const path = './src/pages/AssetsPage.tsx';
let content = fs.readFileSync(path, 'utf8');

// Fix: Move the margin loan section out of the button group div
// Current: <div className="flex gap-2 justify-end">\n\t\t\t\t\t\t\t{/* Stocks Margin Loan...
// Desired: {/* Stocks Margin Loan... (before the button div)

const oldPattern = '\t\t\t\t\t\t<div className="flex gap-2 justify-end">\n\t\t\t\t\t\t\t{/* Stocks Margin Loan Section — only for stock assets */}\n';
const newPattern = '\t\t\t\t\t\t{/* Stocks Margin Loan Section — only for stock assets */}\n';

content = content.replace(oldPattern, newPattern);

// Fix: The Cancel button is misplaced - it needs to be inside the button div
// Current: ...})}\n\t\t\t\t\t</div>\n\t\t\t\t)}\n\n\t\t\t\t<Button variant="outline"...>Cancel</Button>
// Need to add the button group div wrapper back around the Cancel and Save buttons
const oldButtons = '\t\t\t\t)}\n\n\t\t\t\t<Button variant="outline" onClick={() => setShowAddAsset(false)}>Cancel</Button>';
const newButtons = '\t\t\t\t)}\n\n\t\t\t\t\t\t<div className="flex gap-2 justify-end">\n\t\t\t\t\t\t\t<Button variant="outline" onClick={() => setShowAddAsset(false)}>Cancel</Button>';

content = content.replace(oldButtons, newButtons);

fs.writeFileSync(path, content);
console.log('Fixed AssetsPage.tsx');
