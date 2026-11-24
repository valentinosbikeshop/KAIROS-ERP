# Graph Report - resilient-volta  (2026-11-24)

## Corpus Check
- 136 files · ~114,780 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .css 1, .tsbuildinfo 1)

## Summary
- 654 nodes · 2991 edges · 29 communities (22 shown, 7 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `21a91a1a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Button
- package.json
- createClient
- ai-optimizer.ts
- companies/route.ts
- checkout/route.ts
- demo-seed.ts
- compilerOptions
- dependencies
- createAdminClient
- app/layout.tsx
- .eslintrc.json
- next.config.mjs
- autonomous_execution.md
- vercel.json
- next
- database.ts
- devDependencies
- admin/plans/route.ts
- getAuthenticatedContext
- allowScripts
- scripts
- tailwind.config.ts
- react
- governance/page.tsx
- cost-metadata.ts

## God Nodes (most connected - your core abstractions)
1. `Button` - 100 edges
2. `cn()` - 91 edges
3. `react` - 62 edges
4. `Badge()` - 57 edges
5. `lucide-react` - 56 edges
6. `Input` - 52 edges
7. `formatCLP()` - 52 edges
8. `CardContent` - 49 edges
9. `next` - 47 edges
10. `Card` - 47 edges

## Surprising Connections (you probably didn't know these)
- `UserRow` --inherits--> `Profile`  [EXTRACTED]
  src/app/(dashboard)/governance/page.tsx → src/types/database.ts
- `LoginPage()` --calls--> `LoginForm()`  [EXTRACTED]
  src/app/(auth)/login/page.tsx → src/components/auth/login-form.tsx
- `MfaChallengePage()` --calls--> `Button`  [EXTRACTED]
  src/app/(auth)/mfa-challenge/page.tsx → src/components/ui/button.tsx
- `MfaChallengePage()` --calls--> `Input`  [EXTRACTED]
  src/app/(auth)/mfa-challenge/page.tsx → src/components/ui/input.tsx
- `PendingPage()` --calls--> `Button`  [EXTRACTED]
  src/app/(auth)/pending/page.tsx → src/components/ui/button.tsx

## Import Cycles
- None detected.

## Communities (29 total, 7 thin omitted)

### Community 0 - "Button"
Cohesion: 0.12
Nodes (29): DashboardLayout(), FeatureLockCardProps, TIER_VISUAL_META, TierWorkspaceBanner(), FAQ_ITEMS, FaqItem, InteractiveGuideBot(), ROUTE_GUIDES (+21 more)

### Community 1 - "package.json"
Cohesion: 0.11
Nodes (18): name, private, version, autoprefixer, class-variance-authority, clsx, eslint, eslint-config-next (+10 more)

### Community 2 - "createClient"
Cohesion: 0.09
Nodes (80): lucide-react, recharts, LoginPage(), MfaChallengePage(), PendingPage(), RegisterPage(), AnalyticsPage(), BillingPageContent() (+72 more)

### Community 3 - "ai-optimizer.ts"
Cohesion: 0.15
Nodes (17): @google/genai, POST(), runtime, POST(), runtime, POST(), runtime, AI_LRU_CACHE (+9 more)

### Community 4 - "companies/route.ts"
Cohesion: 0.21
Nodes (12): BankInfoSchema, CreateCompanySchema, dynamic, EXTRA_STARTER_COSTS, generateInviteCode(), GET(), isAuthorizedSuperAdmin(), POST() (+4 more)

### Community 5 - "checkout/route.ts"
Cohesion: 0.15
Nodes (16): CheckoutSchema, dynamic, POST(), runtime, dynamic, POST(), runtime, dynamic (+8 more)

### Community 6 - "demo-seed.ts"
Cohesion: 0.10
Nodes (28): dynamic, POST(), runtime, SwitchCompanySchema, POST(), runtime, dynamic, GET() (+20 more)

### Community 7 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, forceConsistentCasingInFileNames, incremental, isolatedModules, jsx, lib (+11 more)

### Community 8 - "dependencies"
Cohesion: 0.11
Nodes (19): dependencies, class-variance-authority, clsx, @google/genai, html2canvas, jspdf, lucide-react, next (+11 more)

### Community 9 - "createAdminClient"
Cohesion: 0.13
Nodes (27): zod, dynamic, generateInviteCode(), POST(), RegisterOwnerSchema, runtime, slugify(), dynamic (+19 more)

### Community 10 - "app/layout.tsx"
Cohesion: 0.29
Nodes (4): ibmPlexMono, instrumentSerif, manrope, metadata

### Community 18 - "next"
Cohesion: 0.16
Nodes (16): next, @supabase/ssr, @supabase/supabase-js, GET(), dynamic, GET(), runtime, POST() (+8 more)

### Community 19 - "database.ts"
Cohesion: 0.10
Nodes (41): BillingPage(), ALL_MODULES_ORDER, MODULE_DESCRIPTIONS, PERSUASIVE_PITCH, PlanDetailModal(), PlanDetailModalProps, PlansMatrix(), PlansMatrixProps (+33 more)

### Community 20 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, autoprefixer, eslint, eslint-config-next, postcss, tailwindcss, @types/node, @types/pdf-parse (+3 more)

### Community 21 - "admin/plans/route.ts"
Cohesion: 0.16
Nodes (12): dynamic, isAuthorizedSuperAdmin(), PATCH(), PatchBodySchema, runtime, UpdateAddonSchema, UpdateOrgSubscriptionSchema, UpdatePlanSchema (+4 more)

### Community 22 - "getAuthenticatedContext"
Cohesion: 0.21
Nodes (17): PATCH(), DELETE(), dynamic, GET(), getAuthFlags(), PATCH(), runtime, UpdateUserSchema (+9 more)

### Community 23 - "allowScripts"
Cohesion: 0.33
Nodes (6): allowScripts, core-js, @google/genai, protobufjs, unrs-resolver, wnrs-resolver

### Community 24 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, start

### Community 25 - "tailwind.config.ts"
Cohesion: 0.50
Nodes (3): tailwindcss, tailwindcss-animate, config

### Community 26 - "react"
Cohesion: 0.09
Nodes (88): jspdf, react, react-dom, @tanstack/react-table, CostsPage(), NewEventPage(), EventsPage(), UsersManagementSection() (+80 more)

### Community 27 - "governance/page.tsx"
Cohesion: 0.11
Nodes (30): EventDetailPage(), CompanyRow, GovernancePage(), UserRow, UsersManagementSectionProps, EditEventDialogProps, EventCardProps, FileUpload() (+22 more)

### Community 28 - "cost-metadata.ts"
Cohesion: 0.18
Nodes (12): COMPANY_COST_TEMPLATES, CostResourceType, CostTaxBreakdown, CostTemplatePreset, INSUMO_KEYWORDS, LOGISTICS_KEYWORDS, ParsedCostMeta, STAFF_KEYWORDS (+4 more)

## Knowledge Gaps
- **11 isolated node(s):** `next/core-web-vitals`, `html2canvas`, `@types/node`, `@types/pdf-parse`, `@types/react` (+6 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 215 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `Button`, `package.json`, `createClient`, `ai-optimizer.ts`, `companies/route.ts`, `checkout/route.ts`, `demo-seed.ts`, `createAdminClient`, `app/layout.tsx`, `database.ts`, `admin/plans/route.ts`, `getAuthenticatedContext`, `react`, `governance/page.tsx`?**
  _High betweenness centrality (0.186) - this node is a cross-community bridge._
- **What connects `next/core-web-vitals`, `html2canvas`, `@types/node` to the rest of the system?**
  _11 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Button` be split into smaller, more focused modules?**
  _Cohesion score 0.11746031746031746 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `Button`, `package.json`, `createClient`, `database.ts`, `governance/page.tsx`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `createClient` to `Button`, `package.json`, `database.ts`, `react`, `governance/page.tsx`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Should `createClient` be split into smaller, more focused modules?**
  _Cohesion score 0.09224353628023353 - nodes in this community are weakly interconnected._