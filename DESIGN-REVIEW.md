# NWT Design Review — Professional Assessment

## Current Design Audit

### What's Working ✅
- **Surface depth system** (5 levels) is well-architected — creates proper card hierarchy
- **Sidebar layout** is clean with good section grouping and the net-wealth mini widget is clever
- **Staggered animations** (fade-up with delays) add polish without being distracting
- **Left accent bars** on KPI cards create a nice visual anchor
- **Tabular-nums** applied globally for financial data — correct typographic practice
- **Dark mode as default** — right call for a financial dashboard used repeatedly

### Issues Identified 🔴

#### 1. **Monochromatic Green Overload**
The single biggest issue. Emerald is used for: primary buttons, active nav, sidebar glow, hero card gradient-top, chart lines, KPI accents, positive indicators, the sparkline, and the brand icon. When everything is green, nothing stands out.

| Element | Current | Problem |
|---------|---------|---------|
| Brand icon | Emerald gradient | Competes with primary actions |
| Active nav item | Emerald bg + text | Same color as data-positive |
| Hero card top bar | Emerald→Blue→Purple gradient | Introduces colors used nowhere else |
| Net wealth (positive) | Emerald-500 | Same as nav active state |
| Chart: Net Wealth line | Emerald | Same weight as Assets line |
| Chart: Assets line | Also emerald/green | Indistinguishable role from net wealth |
| Sidebar NW widget | Emerald border + glow | Another green element competing |

**Impact:** User can't instantly distinguish "brand/navigation" from "data is positive" from "this is the important number."

#### 2. **Chart Hierarchy Problem**
The wealth chart draws 3 area fills of similar visual weight. Users reported the top line (assets) looks like "your projected wealth" when it's actually just assets. The net wealth line — the most important one — gets lost in the middle.

#### 3. **Expense Page Colors in Dark Mode**
`text-blue-600` and `text-cyan-600` were designed for light backgrounds. On dark surfaces they appear washed out or oddly saturated. The `-400` variants were partially addressed but inconsistently.

#### 4. **Excessive Whitespace in Tables**
`justify-between` on expense rows pushes the category label and dollar value to opposite edges of a wide container. On a 1440px screen, there's 600+ pixels of dead space between "Groceries" and "$850.00" — the eye has to travel too far to associate them.

#### 5. **Surface Contrast is Tight**
Dark mode surfaces: `#09090b` → `#111214` → `#18191c` → `#1e2024`. That's a delta of only ~8 lightness units across 4 levels. Cards barely separate from the background, especially on lower-quality monitors.

#### 6. **Hero Gradient Top Bar Introduces Orphan Colors**
The `linear-gradient(90deg, #10b981, #3b82f6, #8b5cf6)` hero border introduces blue and purple, but these colors don't appear anywhere else in the regular UI. It creates visual noise without semantic meaning.

#### 7. **Font Weight Hierarchy**
Almost every number uses `font-extrabold` (800 weight). When everything is extra-bold, the hierarchy flattens. The hero 42px number has the same weight as a 24px KPI number — size alone isn't enough differentiation.

---

## Two Redesign Options

### Option A: "Midnight Sapphire" — [mockup-option-a.html](mockup-option-a.html)

**Concept:** Premium banking feel. Shifts primary from emerald to sapphire blue.

| Aspect | Details |
|--------|---------|
| **Primary** | Sapphire Blue (#3B82F6 / #60A5FA) |
| **Background** | Navy-black (#060B18) with blue-tinted surfaces |
| **Semantic Colors** | Green = positive only, Gold = warning, Red = negative, Teal = secondary |
| **Font** | Inter (sharper tabular nums, wider weight range) |
| **Chart** | Net wealth = bold solid blue + gradient fill; Assets/Liabilities = thin dashed lines |
| **Cards** | Color-coded left accent bars per meaning |
| **Mood** | Professional, institutional, trust-building |

**Best for:** Users who want the app to feel like a private banking portal. High trust, high polish.

### Option B: "Warm Minimal" — [mockup-option-b.html](mockup-option-b.html)

**Concept:** Editorial minimalism. Content-forward, decoration-minimal.

| Aspect | Details |
|--------|---------|
| **Primary** | Teal (#0D9488 / #2DD4BF) — fresh without being generic |
| **Background** | Warm neutral (#111111) — no blue/green tint |
| **Semantic Colors** | Green, Amber, Red-soft, Purple, Teal — 5 total |
| **Font** | DM Sans (labels) + JetBrains Mono (all numbers) |
| **Hero** | No card container — typographic statement with horizontal divider |
| **Stats** | Connected strip (unified row) instead of floating cards |
| **Asset Chart** | Horizontal stacked bar replaces donut/pie — cleaner comparison |
| **Mood** | Calm, confident, Bloomberg-meets-Notion |

**Best for:** Daily use without visual fatigue. Data-forward, minimal decoration.

---

## Recommendation

**I'd recommend Option B (Warm Minimal)** for NWT because:

1. A personal finance tool is used daily — visual calm matters more than visual impact
2. The monospaced number font (JetBrains Mono) is genuinely better for scanning financial data
3. The connected stat strip reduces card fatigue (the current design has 4+ card components competing)
4. The stacked bar is objectively better than a donut for showing allocation proportions
5. The warm neutrals are easier on the eyes for evening use (when most people check their finances)

However, Option A's chart treatment (bold primary line + dashed secondary lines) should be adopted regardless of which palette you choose.

### Quick Wins (Either Option)
1. **Different color for navigation vs data-positive** — even just making nav active = primary blue/teal and keeping green exclusively for "positive values"
2. **Monospaced font for numbers** — biggest single improvement for financial legibility
3. **Widen surface level contrast** — bump dark mode levels to 10+ lightness delta
4. **Remove the rainbow gradient hero border** — replace with single-color or remove entirely
5. **Tighten table layouts** — `max-w-md` or `gap-8` instead of `justify-between` at full width

---

*Open `mockup-option-a.html` and `mockup-option-b.html` in your browser to see the full interactive mockups.*
