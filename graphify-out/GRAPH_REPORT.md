# Graph Report - resilient-volta  (2026-11-24)

## Corpus Check
- 127 files · ~102,456 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .css 1, .tsbuildinfo 1)

## Summary
- 609 nodes · 2673 edges · 28 communities (21 shown, 7 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5b46beda`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Button
- package.json
- createClient
- ai-optimizer.ts
- createAdminClient
- utils.ts
- demo-seed.ts
- compilerOptions
- dependencies
- checkout/route.ts
- app/layout.tsx
- .eslintrc.json
- next.config.mjs
- autonomous_execution.md
- vercel.json
- companies/route.ts
- database.ts
- devDependencies
- checkout/route.ts
- next
- allowScripts
- scripts
- tailwind.config.ts
- react
- admin.ts

## God Nodes (most connected - your core abstractions)
1. `Button` - 92 edges
2. `cn()` - 80 edges
3. `react` - 57 edges
4. `lucide-react` - 50 edges
5. `Badge()` - 47 edges
6. `createClient()` - 47 edges
7. `next` - 46 edges
8. `Input` - 46 edges
9. `formatCLP()` - 45 edges
10. `Card` - 41 edges

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

## Communities (28 total, 7 thin omitted)

### Community 0 - "Button"
Cohesion: 0.09
Nodes (43): class-variance-authority, EventsPage(), DashboardLayout(), FeatureLockCard(), FeatureLockCardProps, TIER_VISUAL_META, TierWorkspaceBanner(), FileUpload() (+35 more)

### Community 1 - "package.json"
Cohesion: 0.11
Nodes (17): name, private, version, autoprefixer, clsx, eslint, eslint-config-next, html2canvas (+9 more)

### Community 2 - "createClient"
Cohesion: 0.12
Nodes (61): recharts, LoginPage(), MfaChallengePage(), PendingPage(), RegisterPage(), AnalyticsPage(), BillingPageContent(), EventDetailPage() (+53 more)

### Community 3 - "ai-optimizer.ts"
Cohesion: 0.14
Nodes (17): @google/genai, POST(), runtime, POST(), runtime, POST(), runtime, AI_LRU_CACHE (+9 more)

### Community 4 - "createAdminClient"
Cohesion: 0.12
Nodes (28): pdf-parse, xlsx, PATCH(), DELETE(), dynamic, GET(), getAuthFlags(), PATCH() (+20 more)

### Community 5 - "utils.ts"
Cohesion: 0.11
Nodes (45): getColumns(), RESOURCE_BADGE_STYLES, ResourceIcon(), CostFormDialog(), CostFormDialogProps, RESOURCE_OPTIONS, CostsTable(), CostsTableProps (+37 more)

### Community 6 - "demo-seed.ts"
Cohesion: 0.10
Nodes (32): @supabase/supabase-js, dynamic, POST(), runtime, SwitchCompanySchema, dynamic, GET(), runtime (+24 more)

### Community 7 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, forceConsistentCasingInFileNames, incremental, isolatedModules, jsx, lib (+11 more)

### Community 8 - "dependencies"
Cohesion: 0.11
Nodes (19): dependencies, class-variance-authority, clsx, @google/genai, html2canvas, jspdf, lucide-react, next (+11 more)

### Community 9 - "checkout/route.ts"
Cohesion: 0.16
Nodes (18): dynamic, POST(), runtime, dynamic, GET(), runtime, dynamic, POST() (+10 more)

### Community 10 - "app/layout.tsx"
Cohesion: 0.29
Nodes (4): inter, jakarta, jetbrainsMono, metadata

### Community 18 - "companies/route.ts"
Cohesion: 0.21
Nodes (12): BankInfoSchema, CreateCompanySchema, dynamic, EXTRA_STARTER_COSTS, generateInviteCode(), GET(), isAuthorizedSuperAdmin(), POST() (+4 more)

### Community 19 - "database.ts"
Cohesion: 0.11
Nodes (40): BillingPage(), WelcomeLandingPage(), PlansMatrix(), PlansMatrixProps, adminLinks, navLinks, SidebarProps, COST_CATEGORIES (+32 more)

### Community 20 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, autoprefixer, eslint, eslint-config-next, postcss, tailwindcss, @types/node, @types/pdf-parse (+3 more)

### Community 21 - "checkout/route.ts"
Cohesion: 0.11
Nodes (24): zod, dynamic, isAuthorizedSuperAdmin(), PATCH(), PatchBodySchema, runtime, UpdateAddonSchema, UpdateOrgSubscriptionSchema (+16 more)

### Community 22 - "next"
Cohesion: 0.27
Nodes (8): next, @supabase/ssr, GET(), updateSession(), createClient(), config, middleware(), Database

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
Cohesion: 0.11
Nodes (51): jspdf, lucide-react, react, CostsPage(), NewEventPage(), calcularBruto5050(), calcularLiquido5050(), calcularRetencionSII() (+43 more)

### Community 27 - "admin.ts"
Cohesion: 0.22
Nodes (10): CompanyRow, UserRow, UsersManagementSectionProps, CompanyBrandingDialogProps, PendingUsersTableProps, PlansAdminTabProps, AiGuardResult, AuthenticatedContext (+2 more)

## Knowledge Gaps
- **11 isolated node(s):** `next/core-web-vitals`, `html2canvas`, `@types/node`, `@types/pdf-parse`, `@types/react` (+6 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 206 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `Button`, `package.json`, `createClient`, `ai-optimizer.ts`, `createAdminClient`, `utils.ts`, `demo-seed.ts`, `checkout/route.ts`, `app/layout.tsx`, `companies/route.ts`, `database.ts`, `checkout/route.ts`, `react`, `admin.ts`?**
  _High betweenness centrality (0.199) - this node is a cross-community bridge._
- **What connects `next/core-web-vitals`, `html2canvas`, `@types/node` to the rest of the system?**
  _11 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Button` be split into smaller, more focused modules?**
  _Cohesion score 0.08709273182957393 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `Button`, `package.json`, `createClient`, `utils.ts`, `database.ts`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Should `createClient` be split into smaller, more focused modules?**
  _Cohesion score 0.11547714514835605 - nodes in this community are weakly interconnected._