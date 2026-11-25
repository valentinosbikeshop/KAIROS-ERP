# Graph Report - resilient-volta  (2026-11-25)

## Corpus Check
- 154 files · ~145,045 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .css 1, .tsbuildinfo 1)

## Summary
- 827 nodes · 3369 edges · 35 communities (26 shown, 9 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `116cf683`
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
- next
- allowScripts
- scripts
- Event
- react
- [id]/page.tsx
- adversarial-playwright-audit.mjs
- LocalQueryBuilder
- constants.ts
- local-demo-client.ts
- tailwind.config.ts
- industry-demo-datasets.ts
- client-quote-pdf-dialog.tsx

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
- `AiGuardResult` --references--> `Organization`  [EXTRACTED]
  src/lib/ai-optimizer.ts → src/types/database.ts
- `LoginPage()` --calls--> `LoginForm()`  [EXTRACTED]
  src/app/(auth)/login/page.tsx → src/components/auth/login-form.tsx
- `MfaChallengePage()` --calls--> `Button`  [EXTRACTED]
  src/app/(auth)/mfa-challenge/page.tsx → src/components/ui/button.tsx
- `MfaChallengePage()` --calls--> `Input`  [EXTRACTED]
  src/app/(auth)/mfa-challenge/page.tsx → src/components/ui/input.tsx

## Import Cycles
- None detected.

## Communities (35 total, 9 thin omitted)

### Community 0 - "(dashboard)/layout.tsx"
Cohesion: 0.09
Nodes (36): framer-motion, DashboardLayout(), FiguraGuideBot, TierWorkspaceBanner(), computePopoverPosition(), FiguraGuideBot(), FiguraMascot(), MascotMood (+28 more)

### Community 1 - "package.json"
Cohesion: 0.11
Nodes (18): name, private, version, autoprefixer, canvas-confetti, clsx, eslint, eslint-config-next (+10 more)

### Community 2 - "cn"
Cohesion: 0.09
Nodes (85): class-variance-authority, lucide-react, react, recharts, xlsx, LoginPage(), MfaChallengePage(), PendingPage() (+77 more)

### Community 3 - "ai-optimizer.ts"
Cohesion: 0.11
Nodes (34): @google/genai, POST(), runtime, POST(), runtime, POST(), runtime, ALLOWED_EXTENSIONS (+26 more)

### Community 4 - "createAdminClient"
Cohesion: 0.11
Nodes (37): BankInfoSchema, CreateCompanySchema, dynamic, EXTRA_STARTER_COSTS, generateInviteCode(), GET(), isAuthorizedSuperAdmin(), PATCH() (+29 more)

### Community 5 - "next"
Cohesion: 0.10
Nodes (24): zod, dynamic, generateInviteCode(), POST(), RegisterOwnerSchema, runtime, slugify(), AcceptQuoteSchema (+16 more)

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
Cohesion: 0.15
Nodes (12): dynamic, isAuthorizedSuperAdmin(), PatchBodySchema, runtime, UpdateAddonSchema, UpdateOrgSubscriptionSchema, UpdatePlanSchema, dynamic (+4 more)

### Community 19 - "database.ts"
Cohesion: 0.07
Nodes (56): BillingPage(), DemoEntryContent(), DemoEntryRedirectPage(), PublicQuoteData, INDUSTRY_ICONS, WelcomeLandingPage(), ALL_MODULES_ORDER, MODULE_DESCRIPTIONS (+48 more)

### Community 20 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, autoprefixer, eslint, eslint-config-next, playwright-core, postcss, tailwindcss, @types/canvas-confetti (+5 more)

### Community 22 - "next"
Cohesion: 0.27
Nodes (8): next, @supabase/ssr, GET(), updateSession(), createClient(), config, middleware(), Database

### Community 23 - "allowScripts"
Cohesion: 0.33
Nodes (6): allowScripts, core-js, @google/genai, protobufjs, unrs-resolver, wnrs-resolver

### Community 24 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, lint, start, test:e2e

### Community 25 - "Event"
Cohesion: 0.12
Nodes (21): react-dom, UserRow, EventTreasurySummary, AiSuggestionsGridProps, BankReconcilerProps, ConsolidateDialogProps, DistributeInsumoDialogProps, EditEventDialogProps (+13 more)

### Community 26 - "react"
Cohesion: 0.11
Nodes (74): @tanstack/react-table, CostsPage(), EventsPage(), GovernancePage(), UsersManagementSection(), getColumns(), RESOURCE_BADGE_STYLES, ResourceIcon() (+66 more)

### Community 27 - "[id]/page.tsx"
Cohesion: 0.26
Nodes (12): EventDetailPage(), FileUpload(), FileUploadProps, FloatingFinancialAdvisor(), Message, Tabs(), TabsContent(), TabsContext (+4 more)

### Community 28 - "adversarial-playwright-audit.mjs"
Cohesion: 0.31
Nodes (5): playwright-core, assert(), findBrowserExecutable(), runAudit(), waitForServer()

### Community 30 - "constants.ts"
Cohesion: 0.09
Nodes (30): @supabase/supabase-js, dynamic, GET(), runtime, POST(), runtime, POST(), runtime (+22 more)

### Community 31 - "local-demo-client.ts"
Cohesion: 0.19
Nodes (18): buildInitialDemoDatabase(), createLocalDemoSupabaseClient(), disableLocalDemoMode(), enableLocalDemoMode(), INDUSTRY_DEMO_COMPANIES, loadDb(), LOCAL_DEMO_CONSENT_KEY, LOCAL_DEMO_COOKIE (+10 more)

### Community 32 - "tailwind.config.ts"
Cohesion: 0.50
Nodes (3): tailwindcss, tailwindcss-animate, config

### Community 33 - "industry-demo-datasets.ts"
Cohesion: 0.10
Nodes (24): CHILE_HONORARIOS_RETENTION_2026, COMPANY_COST_TEMPLATES, CostResourceType, CostTaxBreakdown, CostTemplatePreset, formatCostMetadata(), INSUMO_KEYWORDS, LOGISTICS_KEYWORDS (+16 more)

### Community 34 - "client-quote-pdf-dialog.tsx"
Cohesion: 0.29
Nodes (8): jspdf, DEFAULT_VIDEO_PRESETS, VideoPreset, PdfGenerator(), useUser(), isFounderOrg(), tryAddOrgLogoToPdf(), hydrateOrganizationSaas()

## Knowledge Gaps
- **12 isolated node(s):** `next/core-web-vitals`, `html2canvas`, `@types/canvas-confetti`, `@types/node`, `@types/pdf-parse` (+7 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 306 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `(dashboard)/layout.tsx`, `package.json`, `cn`, `ai-optimizer.ts`, `createAdminClient`, `next`, `saas-storage.ts`, `app/layout.tsx`, `admin/plans/route.ts`, `database.ts`, `pay-deposit/route.ts`, `react`, `[id]/page.tsx`, `constants.ts`?**
  _High betweenness centrality (0.160) - this node is a cross-community bridge._
- **What connects `next/core-web-vitals`, `html2canvas`, `@types/canvas-confetti` to the rest of the system?**
  _12 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `(dashboard)/layout.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08879492600422834 - nodes in this community are weakly interconnected._
- **Why does `react` connect `cn` to `(dashboard)/layout.tsx`, `package.json`, `client-quote-pdf-dialog.tsx`, `database.ts`, `Event`, `react`, `[id]/page.tsx`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Should `cn` be split into smaller, more focused modules?**
  _Cohesion score 0.09104683195592286 - nodes in this community are weakly interconnected._