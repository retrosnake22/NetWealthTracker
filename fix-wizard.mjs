import { readFileSync, writeFileSync } from 'fs';

const file = '/Users/johnwanis/Projects/NWT/src/pages/SetupWizardPage.tsx';
let content = readFileSync(file, 'utf8');

// 1. Add individual name input before household section
const householdMarker = `{userProfile.profileType === 'household' && (`;
const individualSection = `{userProfile.profileType === 'individual' && (
          <Card>
            <CardContent className="p-5 space-y-3">
              <div>
                <h3 className="font-semibold mb-1">What's your name?</h3>
                <p className="text-sm text-muted-foreground">
                  We'll use this to personalise your experience.
                </p>
              </div>
              <Input
                placeholder="e.g. John"
                value={userProfile.individualName || ''}
                onChange={(e) => setIndividualName(e.target.value)}
              />
            </CardContent>
          </Card>
        )}

        `;

content = content.replace(householdMarker, individualSection + householdMarker);

// 2. Update salary label - use individual name
// Find: isHousehold ? `${person.name}'s Salary` : 'Your Salary'
// Replace with: isHousehold ? `${person.name}'s Salary` : (userProfile.individualName ? `${userProfile.individualName}'s Salary` : 'Your Salary')
content = content.replace(
  /isHousehold \? `\$\{person\.name\}'s Salary` : 'Your Salary'/,
  "isHousehold ? `${person.name}'s Salary` : (userProfile.individualName ? `${userProfile.individualName}'s Salary` : 'Your Salary')"
);

// 3. Update the salaryPeople array for individual case to use name
content = content.replace(
  /: \[\{ id: '__individual__', name: 'Your' \}\]/,
  ": [{ id: '__individual__', name: userProfile.individualName || 'Your' }]"
);

// 4. Update income step salary name to use individual name
content = content.replace(
  /isHousehold \? `\$\{person\.name\}'s Salary` : 'Salary'/,
  "isHousehold ? `${person.name}'s Salary` : (userProfile.individualName ? `${userProfile.individualName}'s Salary` : 'Salary')"
);

writeFileSync(file, content, 'utf8');
console.log('Done! Changes applied.');
