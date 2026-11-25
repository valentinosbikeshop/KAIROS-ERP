# Graph Report - resilient-volta  (2026-11-25)

## Corpus Check
- 147 files · ~137,244 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .css 1, .tsbuildinfo 1)

## Summary
- 774 nodes · 3312 edges · 32 communities (25 shown, 7 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c2bf9aea`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- (dashboard)/layout.tsx
- package.json
- cn
- ai-optimizer.ts
- getAuthenticatedContext
- utils.ts
- demo-seed.ts
- compilerOptions
- dependencies
- saas-storage.ts
- app/layout.tsx
- .eslintrc.json
- next.config.mjs
- autonomous_execution.md
- vercel.json
- checkout/route.ts
- database.ts
- devDependencies
- admin/plans/route.ts
- register-owner/route.ts
- allowScripts
- scripts
- next
- react
- companies/route.ts
- adversarial-playwright-audit.mjs
- local-demo-client.ts
- industry-demo-datasets.ts
- tailwind.config.ts

## God Nodes (most connected - your core abstractions)
1. `Button` - 102 edges
2. `cn()` - 91 edges
3. `react` - 66 edges
4. `formatCLP()` - 62 edges
5. `Badge()` - 57 edges
6. `lucide-react` - 56 edges
7. `next` - 55 edges
8. `createClient()` - 53 edges
9. `CardContent` - 51 edges
10. `Card` - 49 edges

## Surprising Connections (you probably didn't know these)
- `onSubmit()` --calls--> `parseDateSafe()`  [EXTRACTED]
  src/components/events/event-form.tsx → src/lib/utils.ts
- `TableCaption` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/table.tsx → src/lib/utils.ts
- `LoginPage()` --calls--> `LoginForm()`  [EXTRACTED]
  src/app/(auth)/login/page.tsx → src/components/auth/login-form.tsx
- `MfaChallengePage()` --calls--> `Input`  [EXTRACTED]
  src/app/(auth)/mfa-challenge/page.tsx → src/components/ui/input.tsx
- `MfaChallengePage()` --calls--> `Label`  [EXTRACTED]
  src/app/(auth)/mfa-challenge/page.tsx → src/components/ui/label.tsx

## Import Cycles
- None detected.

## Communities (32 total, 7 thin omitted)

### Community 0 - "(dashboard)/layout.tsx"
Cohesion: 0.09
Nodes (36): canvas-confetti, framer-motion, DashboardLayout(), KairosGuideBot, computePopoverPosition(), KairosGuideBot(), KairosMascot(), MascotMood (+28 more)

### Community 1 - "package.json"
Cohesion: 0.11
Nodes (18): name, private, version, autoprefixer, clsx, eslint, eslint-config-next, html2canvas (+10 more)

### Community 2 - "cn"
Cohesion: 0.09
Nodes (88): class-variance-authority, lucide-react, recharts, xlsx, LoginPage(), MfaChallengePage(), PendingPage(), RegisterPage() (+80 more)

### Community 3 - "ai-optimizer.ts"
Cohesion: 0.10
Nodes (36): @google/genai, POST(), runtime, POST(), runtime, POST(), runtime, ALLOWED_EXTENSIONS (+28 more)

### Community 4 - "getAuthenticatedContext"
Cohesion: 0.17
Nodes (25): GET(), PATCH(), POST(), DELETE(), dynamic, GET(), getAuthFlags(), PATCH() (+17 more)

### Community 5 - "utils.ts"
Cohesion: 0.13
Nodes (23): AcceptQuoteSchema, dynamic, POST(), runtime, EventDetailPage(), FileUpload(), FileUploadProps, FloatingDraftAssistant() (+15 more)

### Community 6 - "demo-seed.ts"
Cohesion: 0.12
Nodes (25): POST(), runtime, POST(), runtime, dynamic, GET(), runtime, COST_CATEGORIES (+17 more)

### Community 7 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, forceConsistentCasingInFileNames, incremental, isolatedModules, jsx, lib (+11 more)

### Community 8 - "dependencies"
Cohesion: 0.10
Nodes (21): dependencies, canvas-confetti, class-variance-authority, clsx, framer-motion, @google/genai, html2canvas, jspdf (+13 more)

### Community 9 - "saas-storage.ts"
Cohesion: 0.24
Nodes (15): dynamic, POST(), runtime, dynamic, POST(), runtime, getKhipuPaymentStatus(), verifyKhipuWebhookSignature() (+7 more)

### Community 10 - "app/layout.tsx"
Cohesion: 0.33
Nodes (3): instrumentSerif, metadata, plusJakarta

### Community 18 - "checkout/route.ts"
Cohesion: 0.10
Nodes (23): zod, dynamic, runtime, SwitchCompanySchema, CheckoutSchema, dynamic, runtime, dynamic (+15 more)

### Community 19 - "database.ts"
Cohesion: 0.08
Nodes (48): BillingPage(), DemoEntryContent(), DemoEntryRedirectPage(), PublicQuoteData, INDUSTRY_ICONS, ALL_MODULES_ORDER, MODULE_DESCRIPTIONS, PERSUASIVE_PITCH (+40 more)

### Community 20 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, autoprefixer, eslint, eslint-config-next, playwright-core, postcss, tailwindcss, @types/canvas-confetti (+5 more)

### Community 21 - "admin/plans/route.ts"
Cohesion: 0.25
Nodes (8): dynamic, isAuthorizedSuperAdmin(), PATCH(), PatchBodySchema, runtime, UpdateAddonSchema, UpdateOrgSubscriptionSchema, UpdatePlanSchema

### Community 22 - "register-owner/route.ts"
Cohesion: 0.38
Nodes (6): dynamic, generateInviteCode(), POST(), RegisterOwnerSchema, runtime, slugify()

### Community 23 - "allowScripts"
Cohesion: 0.33
Nodes (6): allowScripts, core-js, @google/genai, protobufjs, unrs-resolver, wnrs-resolver

### Community 24 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, lint, start, test:e2e

### Community 25 - "next"
Cohesion: 0.14
Nodes (15): next, @supabase/ssr, @supabase/supabase-js, GET(), dynamic, runtime, dynamic, GET() (+7 more)

### Community 26 - "react"
Cohesion: 0.10
Nodes (79): react, @tanstack/react-table, CostsPage(), GovernancePage(), UsersManagementSection(), getColumns(), RESOURCE_BADGE_STYLES, ResourceIcon() (+71 more)

### Community 27 - "companies/route.ts"
Cohesion: 0.13
Nodes (17): BankInfoSchema, CreateCompanySchema, dynamic, EXTRA_STARTER_COSTS, generateInviteCode(), isAuthorizedSuperAdmin(), POST(), runtime (+9 more)

### Community 28 - "adversarial-playwright-audit.mjs"
Cohesion: 0.31
Nodes (5): playwright-core, assert(), findBrowserExecutable(), runAudit(), waitForServer()

### Community 29 - "local-demo-client.ts"
Cohesion: 0.05
Nodes (40): jspdf, UserRow, EventTreasurySummary, AiSuggestionsGridProps, BankReconcilerProps, ConsolidateDialogProps, DistributeInsumoDialogProps, EditEventDialogProps (+32 more)

### Community 30 - "industry-demo-datasets.ts"
Cohesion: 0.10
Nodes (23): CHILE_HONORARIOS_RETENTION_2026, COMPANY_COST_TEMPLATES, CostResourceType, CostTaxBreakdown, CostTemplatePreset, INSUMO_KEYWORDS, LOGISTICS_KEYWORDS, ParsedCostMeta (+15 more)

### Community 32 - "tailwind.config.ts"
Cohesion: 0.50
Nodes (3): tailwindcss, tailwindcss-animate, config

## Knowledge Gaps
- **12 isolated node(s):** `next/core-web-vitals`, `html2canvas`, `@types/canvas-confetti`, `@types/node`, `@types/pdf-parse` (+7 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 272 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `(dashboard)/layout.tsx`, `package.json`, `cn`, `ai-optimizer.ts`, `getAuthenticatedContext`, `utils.ts`, `demo-seed.ts`, `saas-storage.ts`, `app/layout.tsx`, `checkout/route.ts`, `database.ts`, `admin/plans/route.ts`, `register-owner/route.ts`, `react`, `companies/route.ts`?**
  _High betweenness centrality (0.177) - this node is a cross-community bridge._
- **What connects `next/core-web-vitals`, `html2canvas`, `@types/canvas-confetti` to the rest of the system?**
  _12 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `(dashboard)/layout.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08773784355179703 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `(dashboard)/layout.tsx`, `package.json`, `cn`, `utils.ts`, `database.ts`, `local-demo-client.ts`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Should `cn` be split into smaller, more focused modules?**
  _Cohesion score 0.08935574229691877 - nodes in this community are weakly interconnected._