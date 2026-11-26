# Graph Report - resilient-volta  (2026-11-26)

## Corpus Check
- 155 files · ~145,884 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .css 1, .tsbuildinfo 1)

## Summary
- 830 nodes · 3385 edges · 33 communities (24 shown, 9 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `91565e8c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- (dashboard)/layout.tsx
- package.json
- cn
- ai-optimizer.ts
- createAdminClient
- next
- 01 · Estrategia de Marca & Posicionamiento — FIGURA
- compilerOptions
- dependencies
- saas-storage.ts
- app/layout.tsx
- .eslintrc.json
- next.config.mjs
- autonomous_execution.md
- vercel.json
- admin/plans/route.ts
- database.ts
- devDependencies
- pay-deposit/route.ts
- entitlements.ts
- allowScripts
- scripts
- companies/route.ts
- react
- [token]/page.tsx
- adversarial-playwright-audit.mjs
- LocalQueryBuilder
- constants.ts
- Badge
- tailwind.config.ts

## God Nodes (most connected - your core abstractions)
1. `Button` - 102 edges
2. `cn()` - 92 edges
3. `react` - 67 edges
4. `formatCLP()` - 62 edges
5. `Badge()` - 57 edges
6. `lucide-react` - 56 edges
7. `next` - 55 edges
8. `createClient()` - 53 edges
9. `CardContent` - 51 edges
10. `Card` - 49 edges

## Surprising Connections (you probably didn't know these)
- `FloatingDraftAssistantProps` --references--> `EventItem`  [EXTRACTED]
  src/components/events/floating-draft-assistant.tsx → src/types/database.ts
- `TableCaption` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/table.tsx → src/lib/utils.ts
- `LoginPage()` --calls--> `LoginForm()`  [EXTRACTED]
  src/app/(auth)/login/page.tsx → src/components/auth/login-form.tsx
- `MfaChallengePage()` --calls--> `Button`  [EXTRACTED]
  src/app/(auth)/mfa-challenge/page.tsx → src/components/ui/button.tsx
- `MfaChallengePage()` --calls--> `Input`  [EXTRACTED]
  src/app/(auth)/mfa-challenge/page.tsx → src/components/ui/input.tsx

## Import Cycles
- None detected.

## Communities (33 total, 9 thin omitted)

### Community 0 - "(dashboard)/layout.tsx"
Cohesion: 0.10
Nodes (28): canvas-confetti, framer-motion, computePopoverPosition(), FiguraGuideBot(), FiguraMascot(), MascotMood, FIGURA_TOUR_STORAGE_KEY, FiguraTourContext (+20 more)

### Community 1 - "package.json"
Cohesion: 0.10
Nodes (19): name, private, version, autoprefixer, class-variance-authority, clsx, eslint, eslint-config-next (+11 more)

### Community 2 - "cn"
Cohesion: 0.10
Nodes (64): lucide-react, recharts, xlsx, LoginPage(), MfaChallengePage(), PendingPage(), RegisterPage(), BillingPageContent() (+56 more)

### Community 3 - "ai-optimizer.ts"
Cohesion: 0.11
Nodes (33): @google/genai, POST(), runtime, POST(), runtime, POST(), runtime, ALLOWED_EXTENSIONS (+25 more)

### Community 4 - "createAdminClient"
Cohesion: 0.12
Nodes (32): next, GET(), isAuthorizedSuperAdmin(), PATCH(), PATCH(), POST(), DELETE(), dynamic (+24 more)

### Community 5 - "next"
Cohesion: 0.12
Nodes (20): dynamic, generateInviteCode(), POST(), RegisterOwnerSchema, runtime, slugify(), dynamic, GET() (+12 more)

### Community 6 - "01 · Estrategia de Marca & Posicionamiento — FIGURA"
Cohesion: 0.04
Nodes (43): 01 · Estrategia de Marca & Posicionamiento — FIGURA, 1. Génesis del Nombre (Identidad del Fundador), 2. Declaración de Posicionamiento, 3. Territorio de Marca & Arquetipo, 4. Los 9 Verticales Oficiales de FIGURA, 5. Tono de Voz & Reglas Editoriales (Cero "AI Slop"), Lista Negra de Clichés ("AI Slop" Prohibido), Principios de Redacción (+35 more)

### Community 7 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, forceConsistentCasingInFileNames, incremental, isolatedModules, jsx, lib (+11 more)

### Community 8 - "dependencies"
Cohesion: 0.10
Nodes (21): dependencies, canvas-confetti, class-variance-authority, clsx, framer-motion, @google/genai, html2canvas, jspdf (+13 more)

### Community 9 - "saas-storage.ts"
Cohesion: 0.12
Nodes (27): CheckoutSchema, dynamic, POST(), runtime, dynamic, POST(), runtime, VerifyBillingSchema (+19 more)

### Community 10 - "app/layout.tsx"
Cohesion: 0.33
Nodes (3): instrumentSerif, metadata, plusJakarta

### Community 18 - "admin/plans/route.ts"
Cohesion: 0.12
Nodes (16): zod, dynamic, isAuthorizedSuperAdmin(), PatchBodySchema, runtime, UpdateAddonSchema, UpdateOrgSubscriptionSchema, UpdatePlanSchema (+8 more)

### Community 19 - "database.ts"
Cohesion: 0.07
Nodes (60): BillingPage(), INDUSTRY_ICONS, WelcomeLandingPage(), ALL_MODULES_ORDER, MODULE_DESCRIPTIONS, PERSUASIVE_PITCH, PlanDetailModal(), PlanDetailModalProps (+52 more)

### Community 20 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, autoprefixer, eslint, eslint-config-next, playwright-core, postcss, tailwindcss, @types/canvas-confetti (+5 more)

### Community 22 - "entitlements.ts"
Cohesion: 0.19
Nodes (12): dynamic, OnboardingSchema, POST(), runtime, ALL_MODULE_KEYS, buildModulesRecord(), calculateCheckoutAmountClp(), calculateCustomPriceClp() (+4 more)

### Community 23 - "allowScripts"
Cohesion: 0.33
Nodes (6): allowScripts, core-js, @google/genai, protobufjs, unrs-resolver, wnrs-resolver

### Community 24 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, lint, start, test:e2e

### Community 25 - "companies/route.ts"
Cohesion: 0.20
Nodes (11): BankInfoSchema, CreateCompanySchema, dynamic, EXTRA_STARTER_COSTS, generateInviteCode(), POST(), runtime, SafeLogoUrlSchema (+3 more)

### Community 26 - "react"
Cohesion: 0.08
Nodes (98): jspdf, react, @tanstack/react-table, CostsPage(), EventDetailPage(), GovernancePage(), UsersManagementSection(), OnboardingStudioPage() (+90 more)

### Community 27 - "[token]/page.tsx"
Cohesion: 0.27
Nodes (9): POST(), PublicQuoteData, PublicQuoteItem, PublicQuotePortalPage(), LOCAL_DEMO_STORAGE_KEY, formatRutCL(), validateRutCL(), QuoteCurrency (+1 more)

### Community 28 - "adversarial-playwright-audit.mjs"
Cohesion: 0.31
Nodes (5): playwright-core, assert(), findBrowserExecutable(), runAudit(), waitForServer()

### Community 30 - "constants.ts"
Cohesion: 0.06
Nodes (39): @supabase/ssr, @supabase/supabase-js, GET(), dynamic, GET(), runtime, POST(), runtime (+31 more)

### Community 31 - "Badge"
Cohesion: 0.07
Nodes (58): AnalyticsPage(), EventsPage(), DashboardLayout(), FiguraGuideBot, EventTreasurySummary, DemoEntryContent(), DemoEntryRedirectPage(), FeatureLockCard() (+50 more)

### Community 32 - "tailwind.config.ts"
Cohesion: 0.50
Nodes (3): tailwindcss, tailwindcss-animate, config

## Knowledge Gaps
- **12 isolated node(s):** `next/core-web-vitals`, `html2canvas`, `@types/canvas-confetti`, `@types/node`, `@types/pdf-parse` (+7 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 306 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `createAdminClient` to `(dashboard)/layout.tsx`, `package.json`, `cn`, `ai-optimizer.ts`, `next`, `saas-storage.ts`, `app/layout.tsx`, `admin/plans/route.ts`, `database.ts`, `pay-deposit/route.ts`, `entitlements.ts`, `companies/route.ts`, `react`, `[token]/page.tsx`, `constants.ts`, `Badge`?**
  _High betweenness centrality (0.159) - this node is a cross-community bridge._
- **What connects `next/core-web-vitals`, `html2canvas`, `@types/canvas-confetti` to the rest of the system?**
  _12 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `(dashboard)/layout.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10338680926916222 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `(dashboard)/layout.tsx`, `package.json`, `cn`, `database.ts`, `[token]/page.tsx`, `Badge`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Should `cn` be split into smaller, more focused modules?**
  _Cohesion score 0.09816849816849817 - nodes in this community are weakly interconnected._