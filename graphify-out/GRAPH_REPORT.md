# Graph Report - resilient-volta  (2026-11-24)

## Corpus Check
- 132 files · ~108,849 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .css 1, .tsbuildinfo 1)

## Summary
- 675 nodes · 2817 edges · 30 communities (23 shown, 7 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1c923afe`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- interactive-guide-bot.tsx
- package.json
- cn
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
- local-demo-client.ts
- database.ts
- devDependencies
- admin/plans/route.ts
- getAuthenticatedContext
- allowScripts
- scripts
- useWorkspaceConfig
- react
- next
- adversarial-playwright-audit.mjs
- register-owner/route.ts

## God Nodes (most connected - your core abstractions)
1. `Button` - 92 edges
2. `cn()` - 85 edges
3. `react` - 59 edges
4. `lucide-react` - 51 edges
5. `Badge()` - 47 edges
6. `createClient()` - 47 edges
7. `next` - 46 edges
8. `Input` - 44 edges
9. `formatCLP()` - 44 edges
10. `CardContent` - 39 edges

## Surprising Connections (you probably didn't know these)
- `TableCaption` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/table.tsx → src/lib/utils.ts
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

## Communities (30 total, 7 thin omitted)

### Community 0 - "interactive-guide-bot.tsx"
Cohesion: 0.29
Nodes (6): FAQ_ITEMS, FaqItem, ROUTE_GUIDES, RouteGuide, TOUR_STEPS, TourStep

### Community 1 - "package.json"
Cohesion: 0.11
Nodes (18): name, private, version, autoprefixer, clsx, eslint, eslint-config-next, html2canvas (+10 more)

### Community 2 - "cn"
Cohesion: 0.08
Nodes (78): lucide-react, recharts, LoginPage(), MfaChallengePage(), PendingPage(), RegisterPage(), BillingPageContent(), EventDetailPage() (+70 more)

### Community 3 - "ai-optimizer.ts"
Cohesion: 0.12
Nodes (24): @google/genai, pdf-parse, xlsx, POST(), runtime, POST(), runtime, POST() (+16 more)

### Community 4 - "companies/route.ts"
Cohesion: 0.21
Nodes (12): BankInfoSchema, CreateCompanySchema, dynamic, EXTRA_STARTER_COSTS, generateInviteCode(), GET(), isAuthorizedSuperAdmin(), POST() (+4 more)

### Community 5 - "checkout/route.ts"
Cohesion: 0.20
Nodes (13): CheckoutSchema, dynamic, POST(), runtime, dynamic, GET(), runtime, createKhipuPayment() (+5 more)

### Community 6 - "demo-seed.ts"
Cohesion: 0.06
Nodes (44): @supabase/ssr, @supabase/supabase-js, GET(), dynamic, GET(), runtime, POST(), runtime (+36 more)

### Community 7 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, forceConsistentCasingInFileNames, incremental, isolatedModules, jsx, lib (+11 more)

### Community 8 - "dependencies"
Cohesion: 0.11
Nodes (19): dependencies, class-variance-authority, clsx, @google/genai, html2canvas, jspdf, lucide-react, next (+11 more)

### Community 9 - "createAdminClient"
Cohesion: 0.20
Nodes (19): dynamic, GET(), runtime, dynamic, POST(), runtime, dynamic, POST() (+11 more)

### Community 10 - "app/layout.tsx"
Cohesion: 0.33
Nodes (3): instrumentSerif, metadata, plusJakarta

### Community 18 - "local-demo-client.ts"
Cohesion: 0.05
Nodes (39): jspdf, react-dom, DemoEntryRedirectPage(), AiSuggestionsGridProps, ConsolidateDialogProps, DistributeInsumoDialogProps, EditEventDialogProps, EventCardProps (+31 more)

### Community 19 - "database.ts"
Cohesion: 0.09
Nodes (52): class-variance-authority, BillingPage(), WelcomeLandingPage(), FeatureLockCardProps, TIER_VISUAL_META, ALL_MODULES_ORDER, MODULE_DESCRIPTIONS, PERSUASIVE_PITCH (+44 more)

### Community 20 - "devDependencies"
Cohesion: 0.17
Nodes (12): devDependencies, autoprefixer, eslint, eslint-config-next, playwright-core, postcss, tailwindcss, @types/node (+4 more)

### Community 21 - "admin/plans/route.ts"
Cohesion: 0.14
Nodes (14): dynamic, isAuthorizedSuperAdmin(), PATCH(), PatchBodySchema, runtime, UpdateAddonSchema, UpdateOrgSubscriptionSchema, UpdatePlanSchema (+6 more)

### Community 22 - "getAuthenticatedContext"
Cohesion: 0.21
Nodes (16): PATCH(), DELETE(), dynamic, GET(), getAuthFlags(), PATCH(), runtime, UpdateUserSchema (+8 more)

### Community 23 - "allowScripts"
Cohesion: 0.33
Nodes (6): allowScripts, core-js, @google/genai, protobufjs, unrs-resolver, wnrs-resolver

### Community 24 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, lint, start, test:e2e

### Community 25 - "useWorkspaceConfig"
Cohesion: 0.24
Nodes (11): AnalyticsPage(), NewEventPage(), EventForm(), onSubmit(), useWorkspaceConfig(), COST_CATEGORIES, getMonthName(), parseDateSafe() (+3 more)

### Community 26 - "react"
Cohesion: 0.10
Nodes (78): react, @tanstack/react-table, CostsPage(), EventsPage(), GovernancePage(), UsersManagementSection(), FeatureLockCard(), getColumns() (+70 more)

### Community 27 - "next"
Cohesion: 0.16
Nodes (13): next, POST(), runtime, CompanyRow, UserRow, UsersManagementSectionProps, CompanyBrandingDialogProps, PendingUsersTableProps (+5 more)

### Community 28 - "adversarial-playwright-audit.mjs"
Cohesion: 0.31
Nodes (5): playwright-core, assert(), findBrowserExecutable(), runAudit(), waitForServer()

### Community 29 - "register-owner/route.ts"
Cohesion: 0.32
Nodes (7): zod, dynamic, generateInviteCode(), POST(), RegisterOwnerSchema, runtime, slugify()

## Knowledge Gaps
- **11 isolated node(s):** `next/core-web-vitals`, `html2canvas`, `@types/node`, `@types/pdf-parse`, `@types/react` (+6 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 235 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `interactive-guide-bot.tsx`, `package.json`, `cn`, `ai-optimizer.ts`, `companies/route.ts`, `checkout/route.ts`, `demo-seed.ts`, `createAdminClient`, `app/layout.tsx`, `local-demo-client.ts`, `database.ts`, `admin/plans/route.ts`, `getAuthenticatedContext`, `useWorkspaceConfig`, `react`, `register-owner/route.ts`?**
  _High betweenness centrality (0.179) - this node is a cross-community bridge._
- **What connects `next/core-web-vitals`, `html2canvas`, `@types/node` to the rest of the system?**
  _11 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `interactive-guide-bot.tsx`, `package.json`, `cn`, `local-demo-client.ts`, `database.ts`, `useWorkspaceConfig`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Should `cn` be split into smaller, more focused modules?**
  _Cohesion score 0.07839866555462886 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `cn` to `interactive-guide-bot.tsx`, `package.json`, `local-demo-client.ts`, `database.ts`, `useWorkspaceConfig`, `react`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Should `ai-optimizer.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11931818181818182 - nodes in this community are weakly interconnected._