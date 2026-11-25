# Graph Report - resilient-volta  (2026-11-24)

## Corpus Check
- 136 files · ~119,115 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .css 1, .tsbuildinfo 1)

## Summary
- 708 nodes · 2937 edges · 33 communities (25 shown, 8 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bbccca02`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- (dashboard)/layout.tsx
- package.json
- cn
- ai-optimizer.ts
- createAdminClient
- [id]/page.tsx
- demo-seed.ts
- compilerOptions
- dependencies
- createAdminClient
- app/layout.tsx
- .eslintrc.json
- next.config.mjs
- autonomous_execution.md
- vercel.json
- local-demo-client.ts
- database.ts
- devDependencies
- admin/plans/route.ts
- complete/route.ts
- allowScripts
- scripts
- next
- react
- next
- adversarial-playwright-audit.mjs
- LocalQueryBuilder
- industry-demo-datasets.ts
- cost-metadata.ts
- tailwind.config.ts

## God Nodes (most connected - your core abstractions)
1. `Button` - 94 edges
2. `cn()` - 83 edges
3. `react` - 62 edges
4. `lucide-react` - 52 edges
5. `Badge()` - 49 edges
6. `createClient()` - 49 edges
7. `formatCLP()` - 49 edges
8. `next` - 48 edges
9. `Input` - 42 edges
10. `CardContent` - 41 edges

## Surprising Connections (you probably didn't know these)
- `LoginPage()` --calls--> `LoginForm()`  [EXTRACTED]
  src/app/(auth)/login/page.tsx → src/components/auth/login-form.tsx
- `MfaChallengePage()` --calls--> `Button`  [EXTRACTED]
  src/app/(auth)/mfa-challenge/page.tsx → src/components/ui/button.tsx
- `MfaChallengePage()` --calls--> `Input`  [EXTRACTED]
  src/app/(auth)/mfa-challenge/page.tsx → src/components/ui/input.tsx
- `PendingPage()` --calls--> `Button`  [EXTRACTED]
  src/app/(auth)/pending/page.tsx → src/components/ui/button.tsx
- `RegisterPage()` --calls--> `RegisterForm()`  [EXTRACTED]
  src/app/(auth)/register/page.tsx → src/components/auth/register-form.tsx

## Import Cycles
- None detected.

## Communities (33 total, 8 thin omitted)

### Community 0 - "(dashboard)/layout.tsx"
Cohesion: 0.08
Nodes (41): canvas-confetti, framer-motion, jspdf, DashboardLayout(), KairosGuideBot, TierWorkspaceBanner(), computePopoverPosition(), KairosGuideBot() (+33 more)

### Community 1 - "package.json"
Cohesion: 0.11
Nodes (17): name, private, version, autoprefixer, class-variance-authority, clsx, eslint, eslint-config-next (+9 more)

### Community 2 - "cn"
Cohesion: 0.12
Nodes (55): lucide-react, react, recharts, LoginPage(), MfaChallengePage(), PendingPage(), RegisterPage(), AnalyticsPage() (+47 more)

### Community 3 - "ai-optimizer.ts"
Cohesion: 0.12
Nodes (24): @google/genai, pdf-parse, xlsx, POST(), runtime, POST(), runtime, POST() (+16 more)

### Community 4 - "createAdminClient"
Cohesion: 0.15
Nodes (28): BankInfoSchema, CreateCompanySchema, dynamic, EXTRA_STARTER_COSTS, generateInviteCode(), GET(), isAuthorizedSuperAdmin(), PATCH() (+20 more)

### Community 5 - "[id]/page.tsx"
Cohesion: 0.11
Nodes (25): react-dom, EventDetailPage(), AiSuggestionsGridProps, ConsolidateDialogProps, DistributeInsumoDialogProps, EventItemsTableProps, FileUpload(), FileUploadProps (+17 more)

### Community 6 - "demo-seed.ts"
Cohesion: 0.13
Nodes (24): POST(), runtime, POST(), runtime, dynamic, GET(), runtime, DEMO_MAX_COSTS (+16 more)

### Community 7 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, forceConsistentCasingInFileNames, incremental, isolatedModules, jsx, lib (+11 more)

### Community 8 - "dependencies"
Cohesion: 0.10
Nodes (21): dependencies, canvas-confetti, class-variance-authority, clsx, framer-motion, @google/genai, html2canvas, jspdf (+13 more)

### Community 9 - "createAdminClient"
Cohesion: 0.12
Nodes (28): CheckoutSchema, dynamic, POST(), runtime, dynamic, POST(), runtime, dynamic (+20 more)

### Community 10 - "app/layout.tsx"
Cohesion: 0.33
Nodes (3): instrumentSerif, metadata, plusJakarta

### Community 18 - "local-demo-client.ts"
Cohesion: 0.18
Nodes (20): EditEventDialogProps, EventCardProps, buildInitialDemoDatabase(), enableLocalDemoMode(), getLocalDemoStats(), INDUSTRY_DEMO_COMPANIES, loadDb(), LOCAL_DEMO_CONSENT_KEY (+12 more)

### Community 19 - "database.ts"
Cohesion: 0.08
Nodes (62): BillingPage(), DemoEntryContent(), DemoEntryRedirectPage(), OnboardingStudioPage(), INDUSTRY_ICONS, WelcomeLandingPage(), FeatureLockCardProps, TIER_VISUAL_META (+54 more)

### Community 20 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, autoprefixer, eslint, eslint-config-next, playwright-core, postcss, tailwindcss, @types/canvas-confetti (+5 more)

### Community 21 - "admin/plans/route.ts"
Cohesion: 0.11
Nodes (18): zod, dynamic, isAuthorizedSuperAdmin(), PatchBodySchema, runtime, UpdateAddonSchema, UpdateOrgSubscriptionSchema, UpdatePlanSchema (+10 more)

### Community 22 - "complete/route.ts"
Cohesion: 0.38
Nodes (6): dynamic, OnboardingSchema, POST(), runtime, formatCostMetadata(), getIndustryBlueprint()

### Community 23 - "allowScripts"
Cohesion: 0.33
Nodes (6): allowScripts, core-js, @google/genai, protobufjs, unrs-resolver, wnrs-resolver

### Community 24 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, lint, start, test:e2e

### Community 25 - "next"
Cohesion: 0.15
Nodes (14): next, @supabase/ssr, @supabase/supabase-js, GET(), dynamic, runtime, dynamic, GET() (+6 more)

### Community 26 - "react"
Cohesion: 0.11
Nodes (72): @tanstack/react-table, CostsPage(), EventsPage(), GovernancePage(), UsersManagementSection(), getColumns(), RESOURCE_BADGE_STYLES, ResourceIcon() (+64 more)

### Community 27 - "next"
Cohesion: 0.20
Nodes (11): CompanyRow, UserRow, UsersManagementSectionProps, CompanyBrandingDialogProps, PendingUsersTableProps, PlansAdminTabProps, AiGuardResult, AuthenticatedContext (+3 more)

### Community 28 - "adversarial-playwright-audit.mjs"
Cohesion: 0.31
Nodes (5): playwright-core, assert(), findBrowserExecutable(), runAudit(), waitForServer()

### Community 30 - "industry-demo-datasets.ts"
Cohesion: 0.18
Nodes (14): CostResourceType, StaffModality, DemoCostSeed, IndustryStarterCost, buildIndustryDemoDataset(), buildSynthesizedIndustryDataset(), INDUSTRY_DATASETS, IndustrySeedBlueprint (+6 more)

### Community 31 - "cost-metadata.ts"
Cohesion: 0.22
Nodes (8): COMPANY_COST_TEMPLATES, CostTaxBreakdown, CostTemplatePreset, INSUMO_KEYWORDS, LOGISTICS_KEYWORDS, ParsedCostMeta, STAFF_KEYWORDS, STAFF_MODALITY_LABELS

### Community 32 - "tailwind.config.ts"
Cohesion: 0.50
Nodes (3): tailwindcss, tailwindcss-animate, config

## Knowledge Gaps
- **12 isolated node(s):** `next/core-web-vitals`, `html2canvas`, `@types/canvas-confetti`, `@types/node`, `@types/pdf-parse` (+7 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 251 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `(dashboard)/layout.tsx`, `package.json`, `cn`, `ai-optimizer.ts`, `createAdminClient`, `[id]/page.tsx`, `demo-seed.ts`, `createAdminClient`, `app/layout.tsx`, `database.ts`, `admin/plans/route.ts`, `complete/route.ts`, `react`?**
  _High betweenness centrality (0.180) - this node is a cross-community bridge._
- **What connects `next/core-web-vitals`, `html2canvas`, `@types/canvas-confetti` to the rest of the system?**
  _12 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `(dashboard)/layout.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07619738751814223 - nodes in this community are weakly interconnected._
- **Why does `react` connect `cn` to `(dashboard)/layout.tsx`, `package.json`, `[id]/page.tsx`, `database.ts`, `react`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Should `cn` be split into smaller, more focused modules?**
  _Cohesion score 0.11803673592291479 - nodes in this community are weakly interconnected._