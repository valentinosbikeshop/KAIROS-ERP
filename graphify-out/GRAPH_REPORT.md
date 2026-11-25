# Graph Report - resilient-volta  (2026-11-25)

## Corpus Check
- 154 files · ~143,613 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .css 1, .tsbuildinfo 1)

## Summary
- 826 nodes · 3368 edges · 36 communities (27 shown, 9 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b8cffccc`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- (dashboard)/layout.tsx
- package.json
- cn
- ai-optimizer.ts
- getAuthenticatedContext
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
- createAdminClient
- database.ts
- devDependencies
- pay-deposit/route.ts
- next
- allowScripts
- scripts
- Event
- react
- companies/route.ts
- adversarial-playwright-audit.mjs
- LocalQueryBuilder
- constants.ts
- local-demo-client.ts
- tailwind.config.ts
- industry-demo-datasets.ts
- cost-metadata.ts
- [token]/page.tsx

## God Nodes (most connected - your core abstractions)
1. `Button` - 102 edges
2. `cn()` - 92 edges
3. `react` - 66 edges
4. `formatCLP()` - 62 edges
5. `Badge()` - 57 edges
6. `lucide-react` - 56 edges
7. `next` - 55 edges
8. `createClient()` - 53 edges
9. `CardContent` - 51 edges
10. `Card` - 49 edges

## Surprising Connections (you probably didn't know these)
- `TableCaption` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/table.tsx → src/lib/utils.ts
- `LoginPage()` --calls--> `LoginForm()`  [EXTRACTED]
  src/app/(auth)/login/page.tsx → src/components/auth/login-form.tsx
- `MfaChallengePage()` --calls--> `FiguraLogo()`  [EXTRACTED]
  src/app/(auth)/mfa-challenge/page.tsx → src/components/ui/figura-logo.tsx
- `MfaChallengePage()` --calls--> `Input`  [EXTRACTED]
  src/app/(auth)/mfa-challenge/page.tsx → src/components/ui/input.tsx
- `MfaChallengePage()` --calls--> `Label`  [EXTRACTED]
  src/app/(auth)/mfa-challenge/page.tsx → src/components/ui/label.tsx

## Import Cycles
- None detected.

## Communities (36 total, 9 thin omitted)

### Community 0 - "(dashboard)/layout.tsx"
Cohesion: 0.09
Nodes (36): canvas-confetti, framer-motion, DashboardLayout(), FiguraGuideBot, TierWorkspaceBanner(), computePopoverPosition(), FiguraGuideBot(), FiguraMascot() (+28 more)

### Community 1 - "package.json"
Cohesion: 0.10
Nodes (19): name, private, version, autoprefixer, class-variance-authority, clsx, eslint, eslint-config-next (+11 more)

### Community 2 - "cn"
Cohesion: 0.09
Nodes (81): jspdf, recharts, xlsx, LoginPage(), MfaChallengePage(), PendingPage(), RegisterPage(), AnalyticsPage() (+73 more)

### Community 3 - "ai-optimizer.ts"
Cohesion: 0.11
Nodes (33): @google/genai, POST(), runtime, POST(), runtime, POST(), runtime, ALLOWED_EXTENSIONS (+25 more)

### Community 4 - "getAuthenticatedContext"
Cohesion: 0.16
Nodes (21): zod, PATCH(), DELETE(), dynamic, GET(), getAuthFlags(), PATCH(), runtime (+13 more)

### Community 5 - "next"
Cohesion: 0.15
Nodes (16): dynamic, generateInviteCode(), POST(), RegisterOwnerSchema, runtime, slugify(), AcceptQuoteSchema, dynamic (+8 more)

### Community 6 - "01 · Estrategia de Marca & Posicionamiento — FIGURA"
Cohesion: 0.04
Nodes (42): 01 · Estrategia de Marca & Posicionamiento — FIGURA, 1. Génesis del Nombre (Identidad del Fundador), 2. Declaración de Posicionamiento, 3. Territorio de Marca & Arquetipo, 4. Los 9 Verticales Oficiales de FIGURA, 5. Tono de Voz & Reglas Editoriales (Cero "AI Slop"), Lista Negra de Clichés ("AI Slop" Prohibido), Principios de Redacción (+34 more)

### Community 7 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, forceConsistentCasingInFileNames, incremental, isolatedModules, jsx, lib (+11 more)

### Community 8 - "dependencies"
Cohesion: 0.10
Nodes (21): dependencies, canvas-confetti, class-variance-authority, clsx, framer-motion, @google/genai, html2canvas, jspdf (+13 more)

### Community 9 - "saas-storage.ts"
Cohesion: 0.15
Nodes (17): CheckoutSchema, dynamic, POST(), runtime, dynamic, POST(), runtime, VerifyBillingSchema (+9 more)

### Community 10 - "app/layout.tsx"
Cohesion: 0.33
Nodes (3): instrumentSerif, metadata, plusJakarta

### Community 18 - "createAdminClient"
Cohesion: 0.15
Nodes (23): dynamic, isAuthorizedSuperAdmin(), PATCH(), PatchBodySchema, runtime, UpdateAddonSchema, UpdateOrgSubscriptionSchema, UpdatePlanSchema (+15 more)

### Community 19 - "database.ts"
Cohesion: 0.07
Nodes (67): BillingPage(), DemoEntryContent(), DemoEntryRedirectPage(), OnboardingStudioPage(), INDUSTRY_ICONS, WelcomeLandingPage(), FeatureLockCardProps, TIER_VISUAL_META (+59 more)

### Community 20 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, autoprefixer, eslint, eslint-config-next, playwright-core, postcss, tailwindcss, @types/canvas-confetti (+5 more)

### Community 22 - "next"
Cohesion: 0.14
Nodes (16): next, @supabase/ssr, GET(), CompanyRow, UsersManagementSectionProps, CompanyBrandingDialogProps, PlansAdminTabProps, AiGuardResult (+8 more)

### Community 23 - "allowScripts"
Cohesion: 0.33
Nodes (6): allowScripts, core-js, @google/genai, protobufjs, unrs-resolver, wnrs-resolver

### Community 24 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, lint, start, test:e2e

### Community 25 - "Event"
Cohesion: 0.14
Nodes (18): UserRow, EventTreasurySummary, AiSuggestionsGridProps, ConsolidateDialogProps, DistributeInsumoDialogProps, EditEventDialogProps, EventCardProps, EventItemsTableProps (+10 more)

### Community 26 - "react"
Cohesion: 0.09
Nodes (84): lucide-react, react, @tanstack/react-table, CostsPage(), EventsPage(), GovernancePage(), UsersManagementSection(), getColumns() (+76 more)

### Community 27 - "companies/route.ts"
Cohesion: 0.19
Nodes (13): BankInfoSchema, CreateCompanySchema, dynamic, EXTRA_STARTER_COSTS, generateInviteCode(), GET(), isAuthorizedSuperAdmin(), POST() (+5 more)

### Community 28 - "adversarial-playwright-audit.mjs"
Cohesion: 0.31
Nodes (5): playwright-core, assert(), findBrowserExecutable(), runAudit(), waitForServer()

### Community 30 - "constants.ts"
Cohesion: 0.08
Nodes (34): @supabase/supabase-js, dynamic, POST(), runtime, SwitchCompanySchema, dynamic, GET(), runtime (+26 more)

### Community 31 - "local-demo-client.ts"
Cohesion: 0.22
Nodes (16): buildInitialDemoDatabase(), enableLocalDemoMode(), getLocalDemoStats(), INDUSTRY_DEMO_COMPANIES, loadDb(), LOCAL_DEMO_CONSENT_KEY, LOCAL_DEMO_COOKIE, LOCAL_DEMO_EMAIL (+8 more)

### Community 32 - "tailwind.config.ts"
Cohesion: 0.50
Nodes (3): tailwindcss, tailwindcss-animate, config

### Community 33 - "industry-demo-datasets.ts"
Cohesion: 0.17
Nodes (15): CostResourceType, formatCostMetadata(), StaffModality, DemoCostSeed, IndustryStarterCost, buildIndustryDemoDataset(), buildSynthesizedIndustryDataset(), INDUSTRY_DATASETS (+7 more)

### Community 34 - "cost-metadata.ts"
Cohesion: 0.20
Nodes (9): CHILE_HONORARIOS_RETENTION_2026, COMPANY_COST_TEMPLATES, CostTaxBreakdown, CostTemplatePreset, INSUMO_KEYWORDS, LOGISTICS_KEYWORDS, ParsedCostMeta, STAFF_KEYWORDS (+1 more)

### Community 35 - "[token]/page.tsx"
Cohesion: 0.47
Nodes (5): PublicQuoteData, PublicQuoteItem, LOCAL_DEMO_STORAGE_KEY, QuoteCurrency, QuotePortalStatus

## Knowledge Gaps
- **12 isolated node(s):** `next/core-web-vitals`, `html2canvas`, `@types/canvas-confetti`, `@types/node`, `@types/pdf-parse` (+7 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 306 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `(dashboard)/layout.tsx`, `package.json`, `cn`, `ai-optimizer.ts`, `getAuthenticatedContext`, `next`, `[token]/page.tsx`, `saas-storage.ts`, `app/layout.tsx`, `createAdminClient`, `database.ts`, `pay-deposit/route.ts`, `react`, `companies/route.ts`, `constants.ts`?**
  _High betweenness centrality (0.160) - this node is a cross-community bridge._
- **What connects `next/core-web-vitals`, `html2canvas`, `@types/canvas-confetti` to the rest of the system?**
  _12 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `(dashboard)/layout.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08773784355179703 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `(dashboard)/layout.tsx`, `package.json`, `cn`, `[token]/page.tsx`, `database.ts`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Should `cn` be split into smaller, more focused modules?**
  _Cohesion score 0.09003831417624521 - nodes in this community are weakly interconnected._