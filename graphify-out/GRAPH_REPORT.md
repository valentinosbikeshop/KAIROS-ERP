# Graph Report - resilient-volta  (2026-11-26)

## Corpus Check
- 169 files · ~184,016 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .css 1, .tsbuildinfo 1)

## Summary
- 992 nodes · 4426 edges · 37 communities (30 shown, 7 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ba4c40b1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- (dashboard)/layout.tsx
- package.json
- cn
- ai-optimizer.ts
- next
- createAdminClient
- 01 · Estrategia de Marca & Posicionamiento — FIGURA
- compilerOptions
- dependencies
- saas-storage.ts
- app/layout.tsx
- .eslintrc.json
- next.config.mjs
- autonomous_execution.md
- vercel.json
- register-owner/route.ts
- database.ts
- devDependencies
- admin.ts
- industry-demo-datasets.ts
- allowScripts
- scripts
- companies/route.ts
- react
- useWorkspaceConfig
- adversarial-playwright-audit.mjs
- createAdminClient
- constants.ts
- LocalQueryBuilder
- bank-reconciler.tsx
- floating-draft-assistant.tsx
- Event
- audit.ts
- local-demo-client.ts

## God Nodes (most connected - your core abstractions)
1. `Button` - 110 edges
2. `cn()` - 100 edges
3. `react` - 72 edges
4. `useWorkspaceConfig()` - 72 edges
5. `Badge()` - 70 edges
6. `formatCLP()` - 64 edges
7. `next` - 63 edges
8. `lucide-react` - 61 edges
9. `createClient()` - 57 edges
10. `CardContent` - 53 edges

## Surprising Connections (you probably didn't know these)
- `FloatingDraftAssistantProps` --references--> `EventItem`  [EXTRACTED]
  src/components/events/floating-draft-assistant.tsx → src/types/database.ts
- `LoginPage()` --calls--> `LoginForm()`  [EXTRACTED]
  src/app/(auth)/login/page.tsx → src/components/auth/login-form.tsx
- `MfaChallengePage()` --calls--> `Input`  [EXTRACTED]
  src/app/(auth)/mfa-challenge/page.tsx → src/components/ui/input.tsx
- `MfaChallengePage()` --calls--> `Label`  [EXTRACTED]
  src/app/(auth)/mfa-challenge/page.tsx → src/components/ui/label.tsx
- `MfaChallengePage()` --calls--> `createClient()`  [EXTRACTED]
  src/app/(auth)/mfa-challenge/page.tsx → src/lib/supabase/client.ts

## Import Cycles
- 3-file cycle: `src/lib/cost-metadata.ts -> src/lib/utils.ts -> src/lib/finance-core.ts -> src/lib/cost-metadata.ts`

## Communities (37 total, 7 thin omitted)

### Community 0 - "(dashboard)/layout.tsx"
Cohesion: 0.09
Nodes (38): canvas-confetti, framer-motion, DashboardLayout(), FiguraGuideBot, TierWorkspaceBanner(), computePopoverPosition(), FiguraGuideBot(), FiguraMascot() (+30 more)

### Community 1 - "package.json"
Cohesion: 0.10
Nodes (20): name, private, version, autoprefixer, clsx, eslint, eslint-config-next, html2canvas (+12 more)

### Community 2 - "cn"
Cohesion: 0.11
Nodes (67): class-variance-authority, react, recharts, LoginPage(), MfaChallengePage(), PendingPage(), RegisterPage(), BillingPageContent() (+59 more)

### Community 3 - "ai-optimizer.ts"
Cohesion: 0.11
Nodes (36): @google/genai, DELETE(), POST(), runtime, POST(), runtime, POST(), runtime (+28 more)

### Community 4 - "next"
Cohesion: 0.14
Nodes (13): next, @supabase/ssr, GET(), dynamic, runtime, dynamic, metadata, WelcomeLandingPage() (+5 more)

### Community 5 - "createAdminClient"
Cohesion: 0.10
Nodes (39): zod, PATCH(), dynamic, isAuthorizedSuperAdmin(), PATCH(), PatchBodySchema, runtime, UpdateAddonSchema (+31 more)

### Community 6 - "01 · Estrategia de Marca & Posicionamiento — FIGURA"
Cohesion: 0.04
Nodes (41): 01 · Estrategia de Marca & Posicionamiento — FIGURA, 1. Génesis del Nombre (Identidad del Fundador), 2. Declaración de Posicionamiento, 3. Territorio de Marca & Arquetipo, 4. Los 9 Verticales Oficiales de FIGURA, 5. Tono de Voz & Reglas Editoriales (Cero "AI Slop"), Lista Negra de Clichés ("AI Slop" Prohibido), Principios de Redacción (+33 more)

### Community 7 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, forceConsistentCasingInFileNames, incremental, isolatedModules, jsx, lib (+11 more)

### Community 8 - "dependencies"
Cohesion: 0.10
Nodes (21): dependencies, canvas-confetti, class-variance-authority, clsx, framer-motion, @google/genai, html2canvas, jspdf (+13 more)

### Community 9 - "saas-storage.ts"
Cohesion: 0.13
Nodes (16): CheckoutSchema, dynamic, runtime, dynamic, POST(), runtime, VerifyBillingSchema, dynamic (+8 more)

### Community 10 - "app/layout.tsx"
Cohesion: 0.33
Nodes (3): instrumentSerif, metadata, plusJakarta

### Community 18 - "register-owner/route.ts"
Cohesion: 0.19
Nodes (13): dynamic, generateInviteCode(), POST(), RegisterOwnerSchema, runtime, slugify(), AcceptQuoteSchema, dynamic (+5 more)

### Community 19 - "database.ts"
Cohesion: 0.07
Nodes (79): lucide-react, BillingPage(), OnboardingStudioPage(), BeforeAfterSection(), BeforeAfterSectionProps, TICKET_STEPS, BenchmarkAndEnterpriseSection(), BenchmarkAndEnterpriseSectionProps (+71 more)

### Community 20 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, autoprefixer, eslint, eslint-config-next, playwright-core, postcss, tailwindcss, @types/canvas-confetti (+5 more)

### Community 21 - "admin.ts"
Cohesion: 0.19
Nodes (12): CompanyRow, UserRow, CompanyBrandingDialogProps, PlansAdminTabProps, AiGuardResult, AuthenticatedContext, DEMO_ORG_LABELS, resolveDemoIndustryFromRequest() (+4 more)

### Community 22 - "industry-demo-datasets.ts"
Cohesion: 0.19
Nodes (13): CostResourceType, StaffModality, DemoCostSeed, IndustryStarterCost, buildIndustryDemoDataset(), INDUSTRY_DATASETS, IndustrySeedBlueprint, RawCostSpec (+5 more)

### Community 23 - "allowScripts"
Cohesion: 0.33
Nodes (6): allowScripts, core-js, @google/genai, protobufjs, unrs-resolver, wnrs-resolver

### Community 24 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, lint, start, test:e2e

### Community 25 - "companies/route.ts"
Cohesion: 0.17
Nodes (14): BankInfoSchema, CreateCompanySchema, dynamic, EXTRA_STARTER_COSTS, generateInviteCode(), GET(), isAuthorizedSuperAdmin(), POST() (+6 more)

### Community 26 - "react"
Cohesion: 0.08
Nodes (76): jspdf, CostsPage(), CostFormDialog(), CostFormDialogProps, CostsTableProps, buildDuoPresetOverride(), buildProposalRow(), currIsBoleta() (+68 more)

### Community 27 - "useWorkspaceConfig"
Cohesion: 0.06
Nodes (117): @tanstack/react-table, xlsx, AnalyticsPage(), DashboardData, DashboardPage(), ShowcaseEvent, EventDetailPage(), ReportPage() (+109 more)

### Community 28 - "adversarial-playwright-audit.mjs"
Cohesion: 0.31
Nodes (5): playwright-core, assert(), findBrowserExecutable(), runAudit(), waitForServer()

### Community 29 - "createAdminClient"
Cohesion: 0.17
Nodes (18): CreateUserSchema, dynamic, GET(), getAuthFlags(), GRANULAR_ONLY_ROLES, PATCH(), POST(), resolveTargetOrgEntitlements() (+10 more)

### Community 30 - "constants.ts"
Cohesion: 0.08
Nodes (36): @supabase/supabase-js, dynamic, POST(), runtime, SwitchCompanySchema, dynamic, GET(), runtime (+28 more)

### Community 31 - "LocalQueryBuilder"
Cohesion: 0.10
Nodes (4): evaluateSingleCondition(), getColumnValue(), LocalQueryBuilder, matchLikePattern()

### Community 32 - "bank-reconciler.tsx"
Cohesion: 0.33
Nodes (8): BankReconciler(), ExpenseDocMode, normalizeChileanDate(), normalizeChileanNumber(), ParsedMovementRow, ReconcileKind, scoreEventMatch(), honorariosGrossUp()

### Community 33 - "floating-draft-assistant.tsx"
Cohesion: 0.36
Nodes (6): react-dom, FloatingDraftAssistant(), FloatingDraftAssistantProps, Message, FormattedChatText(), renderInlineTokens()

### Community 34 - "Event"
Cohesion: 0.24
Nodes (12): EventTreasurySummary, BankReconcilerProps, ConsolidateDialogProps, DistributeInsumoDialogProps, EditEventDialogProps, EventCardProps, FloatingFinancialAdvisorProps, DateConflict (+4 more)

### Community 35 - "audit.ts"
Cohesion: 0.15
Nodes (18): appendLocalDemoAuditLog(), AUDIT_ACTION_LABELS, AUDIT_ENTITY_LABELS, AuditAction, AuditActorContext, AuditEntityRef, AuditEntityType, AuditLogQueryFilters (+10 more)

### Community 36 - "local-demo-client.ts"
Cohesion: 0.18
Nodes (20): DemoEntryContent(), DemoEntryRedirectPage(), buildInitialDemoDatabase(), enableLocalDemoMode(), getLocalDemoStats(), INDUSTRY_DEMO_COMPANIES, loadDb(), LOCAL_DEMO_CONSENT_KEY (+12 more)

## Knowledge Gaps
- **12 isolated node(s):** `next/core-web-vitals`, `html2canvas`, `@types/canvas-confetti`, `@types/node`, `@types/pdf-parse` (+7 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 338 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `(dashboard)/layout.tsx`, `package.json`, `cn`, `ai-optimizer.ts`, `local-demo-client.ts`, `createAdminClient`, `saas-storage.ts`, `app/layout.tsx`, `register-owner/route.ts`, `database.ts`, `admin.ts`, `companies/route.ts`, `react`, `useWorkspaceConfig`, `createAdminClient`, `constants.ts`?**
  _High betweenness centrality (0.145) - this node is a cross-community bridge._
- **What connects `next/core-web-vitals`, `html2canvas`, `@types/canvas-confetti` to the rest of the system?**
  _12 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `(dashboard)/layout.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08599033816425121 - nodes in this community are weakly interconnected._
- **Why does `react` connect `cn` to `(dashboard)/layout.tsx`, `package.json`, `bank-reconciler.tsx`, `floating-draft-assistant.tsx`, `local-demo-client.ts`, `database.ts`, `react`, `useWorkspaceConfig`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `database.ts` to `(dashboard)/layout.tsx`, `package.json`, `cn`, `bank-reconciler.tsx`, `local-demo-client.ts`, `floating-draft-assistant.tsx`, `react`, `useWorkspaceConfig`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Should `cn` be split into smaller, more focused modules?**
  _Cohesion score 0.11136079900124844 - nodes in this community are weakly interconnected._