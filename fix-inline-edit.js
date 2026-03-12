const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/pages/SetupWizardPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// First, normalize all indentation to spaces (replace tabs with 2 spaces)
content = content.replace(/\t/g, '  ');

// Fix 1: Income - wrap each non-salary income item with inline form
content = content.replace(
  /(\{nonSalaryIncomes\.map\(\(inc: IncomeItem\) => \()\s*(<Card key=\{inc\.id\} className="card-hover">)/,
  '$1\n              <div key={inc.id} className="space-y-2">\n              $2'.replace('<Card key={inc.id}', '<Card')
);

// Close the div wrapper after the income Card and add inline form
content = content.replace(
  /(<\/Card>\s*\)\)}\s*<\/div>\s*\)\}\s*\{\/\* Total \*\/)/,
  `</Card>
            {editingId === inc.id && showForm && renderIncomeForm()}
            </div>
            ))}
          </div>
        )}

        {/* Total */}`
);

// Actually this regex approach is fragile. Let me do line-by-line processing.

// Re-read original
content = fs.readFileSync(filePath, 'utf8');
// Normalize tabs
content = content.replace(/\t/g, '  ');

const lines = content.split('\n');
const result = [];

let i = 0;
while (i < lines.length) {
  const line = lines[i];
  const trimmed = line.trim();

  // === INCOME SECTION ===
  // Find: {nonSalaryIncomes.map((inc: IncomeItem) => (
  //          <Card key={inc.id} className="card-hover">
  // Replace with wrapper div
  if (trimmed === '{nonSalaryIncomes.map((inc: IncomeItem) => (') {
    result.push(line); // push the map line
    i++;
    // Next line should be <Card key={inc.id}...
    const nextLine = lines[i];
    const indent = nextLine.match(/^(\s*)/)[1];
    result.push(indent + '<div key={inc.id} className="space-y-2">');
    // Push the Card line but remove key={inc.id}
    result.push(nextLine.replace(' key={inc.id}', ''));
    i++;
    continue;
  }

  // Find the closing </Card> followed by ))} for income items
  // We need to detect this is the income section closing
  // Look for pattern: </Card> then ))} in income context
  // Use a marker: after we see the income map, track until we find the closing
  
  // === LIABILITIES - OTHER DEBTS ===
  // Find: {otherDebts.map(lia => (
  //          <Card key={lia.id}...
  if (trimmed === '{otherDebts.map(lia => (') {
    result.push(line);
    i++;
    const nextLine = lines[i];
    const indent = nextLine.match(/^(\s*)/)[1];
    result.push(indent + '<div key={lia.id} className="space-y-2">');
    result.push(nextLine.replace(' key={lia.id}', ''));
    i++;
    continue;
  }

  // === LIABILITIES - MORTGAGES ===
  if (trimmed === '{mortgages.map(m => (') {
    result.push(line);
    i++;
    const nextLine = lines[i];
    const indent = nextLine.match(/^(\s*)/)[1];
    result.push(indent + '<div key={m.id} className="space-y-2">');
    result.push(nextLine.replace(' key={m.id}', ''));
    i++;
    continue;
  }

  result.push(line);
  i++;
}

// Now we need to close the wrapper divs and add inline forms
// This is complex, so let's do a second pass looking for specific patterns

content = result.join('\n');

// For each section, find the </Card> + ))} pattern and insert the inline form + closing div

// INCOME: After income card closing, before ))}
// Pattern: </Card>\n            ))}  in the nonSalaryIncomes context
// We'll use a state machine approach

const lines2 = content.split('\n');
const result2 = [];
let inIncomeMap = false;
let inLiaMortgageMap = false;
let inLiaOtherMap = false;
let inPropertyMap = false;
let inAssetMap = false;

for (let j = 0; j < lines2.length; j++) {
  const line = lines2[j];
  const trimmed = line.trim();

  // Track which map we're in
  if (trimmed.includes('nonSalaryIncomes.map((inc: IncomeItem)')) inIncomeMap = true;
  if (trimmed.includes('otherDebts.map(lia =>')) inLiaOtherMap = true;
  if (trimmed.includes('mortgages.map(m =>')) inLiaMortgageMap = true;
  if (trimmed.includes('tabProperties.map(prop =>')) inPropertyMap = true;
  if (trimmed.includes('tabAssets.map(asset =>')) inAssetMap = true;

  // When we hit </Card> inside a tracked map, check if next line closes the map
  if (trimmed === '</Card>' && j + 1 < lines2.length) {
    const nextTrimmed = lines2[j + 1].trim();
    const indent = line.match(/^(\s*)/)[1];

    if (inIncomeMap && nextTrimmed === '))}') {
      result2.push(line); // </Card>
      result2.push(indent + '{editingId === inc.id && showForm && renderIncomeForm()}');
      result2.push(indent + '</div>');
      inIncomeMap = false;
      // The ))} line will be pushed next iteration
      j++;
      result2.push(lines2[j]); // ))}
      continue;
    }

    if (inLiaMortgageMap && nextTrimmed === '))}') {
      result2.push(line);
      result2.push(indent + '{editingId === m.id && showForm && renderLiabilityForm()}');
      result2.push(indent + '</div>');
      inLiaMortgageMap = false;
      j++;
      result2.push(lines2[j]);
      continue;
    }

    if (inLiaOtherMap && nextTrimmed === '))}') {
      result2.push(line);
      result2.push(indent + '{editingId === lia.id && showForm && renderLiabilityForm()}');
      result2.push(indent + '</div>');
      inLiaOtherMap = false;
      j++;
      result2.push(lines2[j]);
      continue;
    }

    if (inPropertyMap && nextTrimmed === '))}') {
      result2.push(line);
      result2.push(indent + '{editingId === prop.id && showForm && renderPropertyForm()}');
      result2.push(indent + '</div>');
      inPropertyMap = false;
      j++;
      result2.push(lines2[j]);
      continue;
    }

    if (inAssetMap && nextTrimmed === '))}') {
      result2.push(line);
      result2.push(indent + '{editingId === asset.id && showForm && renderAssetForm()}');
      result2.push(indent + '</div>');
      inAssetMap = false;
      j++;
      result2.push(lines2[j]);
      continue;
    }
  }

  result2.push(line);
}

content = result2.join('\n');

// Now change the standalone form conditions to only show when adding new (not editing)
// Income: {showForm ? ( -> {showForm && !editingId ? (
// But we need to be specific about which showForm we're changing

// For Income step - find the comment "Add/Edit form for other income" and change the condition
content = content.replace(
  /\{\/\* Add\/Edit form for other income \*\/\}\s*\{showForm \? \(/,
  '{/* Add/Edit form for other income */}\n        {showForm && !editingId ? ('
);

// Actually, since we extracted renderIncomeForm, let's replace the entire old form with renderIncomeForm()
// Find the old inline form in the Income section and replace with renderIncomeForm()
// The old form starts after "Add/Edit form for other income" comment
// Let's find and replace it

// For the Income step, replace the old inline form with the render function call
const incomeFormStart = content.indexOf('{/* Add/Edit form for other income */}');
if (incomeFormStart !== -1) {
  // Find the section from the comment to the closing of the ternary
  const afterComment = content.indexOf('{showForm', incomeFormStart);
  // Find the matching closing - it ends with the "Add Other Income Source" button
  const addButtonEnd = content.indexOf('Add Other Income Source</span>', afterComment);
  const closingBrace = content.indexOf(')}\n', addButtonEnd);
  
  if (afterComment !== -1 && closingBrace !== -1) {
    const beforeForm = content.substring(0, afterComment);
    const afterForm = content.substring(closingBrace + 3); // skip )}\n
    const indent = '        ';
    content = beforeForm + 
      `{showForm && !editingId ? (\n` +
      `${indent}  {renderIncomeForm()}\n` +
      `${indent}) : !showForm && (\n` +
      `${indent}  <button\n` +
      `${indent}    onClick={() => { resetForm(); setShowForm(true) }}\n` +
      `${indent}    className="w-full p-4 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center justify-center gap-2 text-muted-foreground hover:text-primary"\n` +
      `${indent}  >\n` +
      `${indent}    <Plus className="w-5 h-5" />\n` +
      `${indent}    <span className="font-medium">Add Other Income Source</span>\n` +
      `${indent}  </button>\n` +
      `${indent})}` +
      afterForm;
  }
}

// For the Liabilities step, change standalone form condition
// Find: {showForm && ( after the liability category buttons
// Need to change to: {showForm && !editingId && (
const liaFormComment = content.indexOf('{showForm && (');
// Actually, the liabilities form uses {showForm && ( not {showForm ? (
// Let me check... The liability form at line 1370 was: {showForm && (
// We need: {showForm && !editingId && (
// But we also need to keep the form at bottom for new items and use renderLiabilityForm
// Actually the liabilities section doesn't have a ternary - it has:
// {!showForm && (<div of buttons>)} for category selection
// {showForm && (<Card>form</Card>)} for the form
// We need: {showForm && !editingId && (<Card>form</Card>)} 

// For now, let's just change the condition. We'll handle render functions separately.
// Actually, this is getting too complex for regex. Let me simplify.

// The cleanest approach: for each section's standalone form:
// - Change {showForm ? ( to {showForm && !editingId ? ( (for ternary patterns)
// - Change {showForm && ( to {showForm && !editingId && ( (for non-ternary patterns)

// But only in the right context. Let me be more precise.

// Save the file with just the structural changes so far
fs.writeFileSync(filePath, content, 'utf8');
console.log('Phase 1 done: wrapper divs and inline form calls added');
console.log('File length:', content.length, 'chars,', content.split('\n').length, 'lines');
