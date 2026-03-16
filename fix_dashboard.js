const fs = require('fs');

// Fix DashboardPage.tsx
let dash = fs.readFileSync('src/pages/DashboardPage.tsx', 'utf8');

// Add dynamic label after debtRatio line
dash = dash.replace(
  /const debtRatio = calculateDebtToAssetRatio\(assets, properties, liabilities\)/,
  `const debtRatio = calculateDebtToAssetRatio(assets, properties, liabilities)
\tconst isEstimate = (userProfile?.budgetMode ?? 'estimate') === 'estimate'
\tconst livingExpenseLabel = isEstimate ? 'Living Expenses (estimate)' : usingActuals ? 'Living Expenses (actuals)' : 'Living Expenses (budget)'`
);

// Replace hardcoded "Living Expenses" label in CashflowBar
dash = dash.replace(
  '<CashflowBar label="Living Expenses" amount={metrics.baseExpenses}',
  '<CashflowBar label={livingExpenseLabel} amount={metrics.baseExpenses}'
);

fs.writeFileSync('src/pages/DashboardPage.tsx', dash);
console.log('DashboardPage.tsx fixed');
