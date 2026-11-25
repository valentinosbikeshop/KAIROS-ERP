# Graph Report - resilient-volta  (2026-11-25)

## Corpus Check
- 148 files · ~138,090 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .css 1, .tsbuildinfo 1)

## Summary
- 776 nodes · 3315 edges · 30 communities (22 shown, 8 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `899c15c4`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- (dashboard)/layout.tsx
- package.json
- cn
- ai-optimizer.ts
- getAuthenticatedContext
- next
- getAuthenticatedContext
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
- pay-deposit/route.ts
- allowScripts
- scripts
- react
- companies/route.ts
- adversarial-playwright-audit.mjs
- local-demo-client.ts
- constants.ts
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
- `CompanyRow` --inherits--> `Organization`  [EXTRACTED]
  src/app/(dashboard)/governance/page.tsx → src/types/database.ts
- `UsersManagementSectionProps` --references--> `Organization`  [EXTRACTED]
  src/app/(dashboard)/governance/page.tsx → src/types/database.ts
- `CompanyBrandingDialogProps` --references--> `Organization`  [EXTRACTED]
  src/components/governance/company-branding-dialog.tsx → src/types/database.ts
- `LoginPage()` --calls--> `LoginForm()`  [EXTRACTED]
  src/app/(auth)/login/page.tsx → src/components/auth/login-form.tsx
- `MfaChallengePage()` --calls--> `Input`  [EXTRACTED]
  src/app/(auth)/mfa-challenge/page.tsx → src/components/ui/input.tsx

## Import Cycles
- None detected.

## Communities (30 total, 8 thin omitted)

### Community 0 - "(dashboard)/layout.tsx"
Cohesion: 0.06
Nodes (55): canvas-confetti, framer-motion, DashboardLayout(), KairosGuideBot, FeatureLockCardProps, TIER_VISUAL_META, TierWorkspaceBanner(), FileUpload() (+47 more)

### Community 1 - "package.json"
Cohesion: 0.11
Nodes (18): name, private, version, autoprefixer, clsx, eslint, eslint-config-next, html2canvas (+10 more)

### Community 2 - "cn"
Cohesion: 0.10
Nodes (81): class-variance-authority, lucide-react, recharts, xlsx, LoginPage(), MfaChallengePage(), PendingPage(), RegisterPage() (+73 more)

### Community 3 - "ai-optimizer.ts"
Cohesion: 0.11
Nodes (34): @google/genai, POST(), runtime, POST(), runtime, POST(), runtime, ALLOWED_EXTENSIONS (+26 more)

### Community 4 - "getAuthenticatedContext"
Cohesion: 0.16
Nodes (26): PATCH(), DELETE(), dynamic, GET(), getAuthFlags(), PATCH(), runtime, UpdateUserSchema (+18 more)

### Community 5 - "next"
Cohesion: 0.11
Nodes (23): next, dynamic, generateInviteCode(), POST(), RegisterOwnerSchema, runtime, slugify(), dynamic (+15 more)

### Community 6 - "getAuthenticatedContext"
Cohesion: 0.29
Nodes (10): POST(), POST(), runtime, dynamic, GET(), runtime, ensureDemoEnvironment(), getDemoQuotaStats() (+2 more)

### Community 7 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, forceConsistentCasingInFileNames, incremental, isolatedModules, jsx, lib (+11 more)

### Community 8 - "dependencies"
Cohesion: 0.10
Nodes (21): dependencies, canvas-confetti, class-variance-authority, clsx, framer-motion, @google/genai, html2canvas, jspdf (+13 more)

### Community 9 - "saas-storage.ts"
Cohesion: 0.13
Nodes (20): dynamic, POST(), runtime, VerifyBillingSchema, dynamic, GET(), runtime, dynamic (+12 more)

### Community 10 - "app/layout.tsx"
Cohesion: 0.33
Nodes (3): instrumentSerif, metadata, plusJakarta

### Community 18 - "checkout/route.ts"
Cohesion: 0.12
Nodes (17): zod, dynamic, isAuthorizedSuperAdmin(), PATCH(), PatchBodySchema, runtime, UpdateAddonSchema, UpdateOrgSubscriptionSchema (+9 more)

### Community 19 - "database.ts"
Cohesion: 0.09
Nodes (46): BillingPage(), INDUSTRY_ICONS, ALL_MODULES_ORDER, MODULE_DESCRIPTIONS, PERSUASIVE_PITCH, PlanDetailModal(), PlanDetailModalProps, PLAN_MISSING_HIGHLIGHTS (+38 more)

### Community 20 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, autoprefixer, eslint, eslint-config-next, playwright-core, postcss, tailwindcss, @types/canvas-confetti (+5 more)

### Community 23 - "allowScripts"
Cohesion: 0.33
Nodes (6): allowScripts, core-js, @google/genai, protobufjs, unrs-resolver, wnrs-resolver

### Community 24 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, lint, start, test:e2e

### Community 26 - "react"
Cohesion: 0.09
Nodes (84): jspdf, react, @tanstack/react-table, CostsPage(), CompanyRow, GovernancePage(), UsersManagementSection(), UsersManagementSectionProps (+76 more)

### Community 27 - "companies/route.ts"
Cohesion: 0.19
Nodes (13): BankInfoSchema, CreateCompanySchema, dynamic, EXTRA_STARTER_COSTS, generateInviteCode(), GET(), isAuthorizedSuperAdmin(), POST() (+5 more)

### Community 28 - "adversarial-playwright-audit.mjs"
Cohesion: 0.31
Nodes (5): playwright-core, assert(), findBrowserExecutable(), runAudit(), waitForServer()

### Community 29 - "local-demo-client.ts"
Cohesion: 0.05
Nodes (46): UserRow, EventTreasurySummary, DemoEntryContent(), DemoEntryRedirectPage(), PublicQuoteData, PublicQuoteItem, AiSuggestionsGridProps, ConsolidateDialogProps (+38 more)

### Community 30 - "constants.ts"
Cohesion: 0.05
Nodes (50): @supabase/ssr, @supabase/supabase-js, GET(), dynamic, GET(), runtime, POST(), runtime (+42 more)

### Community 32 - "tailwind.config.ts"
Cohesion: 0.50
Nodes (3): tailwindcss, tailwindcss-animate, config

## Knowledge Gaps
- **12 isolated node(s):** `next/core-web-vitals`, `html2canvas`, `@types/canvas-confetti`, `@types/node`, `@types/pdf-parse` (+7 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 275 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `(dashboard)/layout.tsx`, `package.json`, `cn`, `ai-optimizer.ts`, `getAuthenticatedContext`, `getAuthenticatedContext`, `saas-storage.ts`, `app/layout.tsx`, `checkout/route.ts`, `database.ts`, `pay-deposit/route.ts`, `react`, `companies/route.ts`, `local-demo-client.ts`, `constants.ts`?**
  _High betweenness centrality (0.181) - this node is a cross-community bridge._
- **What connects `next/core-web-vitals`, `html2canvas`, `@types/canvas-confetti` to the rest of the system?**
  _12 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `(dashboard)/layout.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06169772256728778 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `(dashboard)/layout.tsx`, `package.json`, `cn`, `database.ts`, `local-demo-client.ts`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Should `cn` be split into smaller, more focused modules?**
  _Cohesion score 0.0959228824273072 - nodes in this community are weakly interconnected._