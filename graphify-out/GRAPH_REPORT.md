# Graph Report - resilient-volta  (2026-11-24)

## Corpus Check
- 130 files · ~106,680 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .css 1, .tsbuildinfo 1)

## Summary
- 624 nodes · 2732 edges · 27 communities (20 shown, 7 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `95e22ae0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Button
- package.json
- createClient
- ai-optimizer.ts
- createAdminClient
- checkout/route.ts
- demo-seed.ts
- compilerOptions
- dependencies
- checkout/route.ts
- app/layout.tsx
- .eslintrc.json
- next.config.mjs
- autonomous_execution.md
- vercel.json
- complete/route.ts
- database.ts
- devDependencies
- admin/plans/route.ts
- allowScripts
- scripts
- tailwind.config.ts
- react
- admin.ts

## God Nodes (most connected - your core abstractions)
1. `Button` - 94 edges
2. `cn()` - 87 edges
3. `react` - 59 edges
4. `lucide-react` - 51 edges
5. `Badge()` - 49 edges
6. `createClient()` - 47 edges
7. `next` - 46 edges
8. `Input` - 46 edges
9. `formatCLP()` - 46 edges
10. `CardContent` - 41 edges

## Surprising Connections (you probably didn't know these)
- `EventCardProps` --references--> `Event`  [EXTRACTED]
  src/components/events/event-card.tsx → src/types/database.ts
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

## Communities (27 total, 7 thin omitted)

### Community 0 - "Button"
Cohesion: 0.09
Nodes (43): EventDetailPage(), DashboardLayout(), FeatureLockCard(), FeatureLockCardProps, TIER_VISUAL_META, TierWorkspaceBanner(), FileUpload(), FileUploadProps (+35 more)

### Community 1 - "package.json"
Cohesion: 0.11
Nodes (18): name, private, version, autoprefixer, class-variance-authority, clsx, eslint, eslint-config-next (+10 more)

### Community 2 - "createClient"
Cohesion: 0.11
Nodes (52): recharts, xlsx, LoginPage(), MfaChallengePage(), PendingPage(), RegisterPage(), AnalyticsPage(), BillingPageContent() (+44 more)

### Community 3 - "ai-optimizer.ts"
Cohesion: 0.13
Nodes (23): @google/genai, POST(), runtime, POST(), runtime, POST(), runtime, ALLOWED_EXTENSIONS (+15 more)

### Community 4 - "createAdminClient"
Cohesion: 0.14
Nodes (28): BankInfoSchema, CreateCompanySchema, dynamic, EXTRA_STARTER_COSTS, generateInviteCode(), GET(), isAuthorizedSuperAdmin(), PATCH() (+20 more)

### Community 5 - "checkout/route.ts"
Cohesion: 0.20
Nodes (13): CheckoutSchema, dynamic, POST(), runtime, dynamic, GET(), runtime, createKhipuPayment() (+5 more)

### Community 6 - "demo-seed.ts"
Cohesion: 0.06
Nodes (47): @supabase/ssr, @supabase/supabase-js, GET(), dynamic, GET(), runtime, POST(), runtime (+39 more)

### Community 7 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, forceConsistentCasingInFileNames, incremental, isolatedModules, jsx, lib (+11 more)

### Community 8 - "dependencies"
Cohesion: 0.11
Nodes (19): dependencies, class-variance-authority, clsx, @google/genai, html2canvas, jspdf, lucide-react, next (+11 more)

### Community 9 - "checkout/route.ts"
Cohesion: 0.24
Nodes (15): dynamic, POST(), runtime, dynamic, POST(), runtime, getKhipuPaymentStatus(), verifyKhipuWebhookSignature() (+7 more)

### Community 10 - "app/layout.tsx"
Cohesion: 0.29
Nodes (4): ibmPlexMono, instrumentSerif, manrope, metadata

### Community 18 - "complete/route.ts"
Cohesion: 0.20
Nodes (10): zod, dynamic, generateInviteCode(), POST(), RegisterOwnerSchema, runtime, slugify(), dynamic (+2 more)

### Community 19 - "database.ts"
Cohesion: 0.09
Nodes (46): BillingPage(), WelcomeLandingPage(), ALL_MODULES_ORDER, MODULE_DESCRIPTIONS, PERSUASIVE_PITCH, PlanDetailModal(), PlanDetailModalProps, PlansMatrix() (+38 more)

### Community 20 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, autoprefixer, eslint, eslint-config-next, postcss, tailwindcss, @types/node, @types/pdf-parse (+3 more)

### Community 21 - "admin/plans/route.ts"
Cohesion: 0.15
Nodes (13): dynamic, isAuthorizedSuperAdmin(), PATCH(), PatchBodySchema, runtime, UpdateAddonSchema, UpdateOrgSubscriptionSchema, UpdatePlanSchema (+5 more)

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
Cohesion: 0.08
Nodes (97): jspdf, lucide-react, react, @tanstack/react-table, CostsPage(), NewEventPage(), EventsPage(), GovernancePage() (+89 more)

### Community 27 - "admin.ts"
Cohesion: 0.15
Nodes (14): next, dynamic, runtime, runtime, CompanyRow, UserRow, UsersManagementSectionProps, CompanyBrandingDialogProps (+6 more)

## Knowledge Gaps
- **11 isolated node(s):** `next/core-web-vitals`, `html2canvas`, `@types/node`, `@types/pdf-parse`, `@types/react` (+6 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 213 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `admin.ts` to `Button`, `package.json`, `createClient`, `ai-optimizer.ts`, `createAdminClient`, `checkout/route.ts`, `demo-seed.ts`, `checkout/route.ts`, `app/layout.tsx`, `complete/route.ts`, `database.ts`, `admin/plans/route.ts`, `react`?**
  _High betweenness centrality (0.194) - this node is a cross-community bridge._
- **What connects `next/core-web-vitals`, `html2canvas`, `@types/node` to the rest of the system?**
  _11 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Button` be split into smaller, more focused modules?**
  _Cohesion score 0.08636363636363636 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `Button`, `package.json`, `createClient`, `database.ts`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Should `createClient` be split into smaller, more focused modules?**
  _Cohesion score 0.11366160681229175 - nodes in this community are weakly interconnected._