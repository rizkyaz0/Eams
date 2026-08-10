# Coding Conventions

**Analysis Date:** 2026-08-10

## Naming Patterns

**Files:**
- `kebab-case.tsx` / `kebab-case.ts` for all app code: `create-asset-dialog.tsx`, `assets-table.tsx`, `bast-actions.ts`, `api-response.ts`
- Pages are per-feature directories under `app/(authenticated)/<feature>/page.tsx` (e.g. `app/(authenticated)/assets/page.tsx`)
- API route handlers: `app/api/<resource>/route.ts`; dynamic routes use `[id]` folders: `app/api/assets/[id]/route.ts`
- Prisma schema models: `PascalCase` singular (`Division`, `BastDetail`, `AuditLog`); Prisma enums `SCREAMING_SNAKE_CASE` (`SUPER_ADMIN`, `IN_MAINTENANCE`, `MAINTENANCE_OUT`)
- Seed/script files: `scripts/*.mjs` or `scripts/*.ts` (`generate-hash.mjs`, `reset-admin-password.ts`)

**Functions:**
- `camelCase` for all functions: `fetchAssets`, `handleSubmit`, `createBast`, `generateToken`, `getCurrentUser`
- Event handlers prefixed `handle*`: `handleImageChange`, `handleSubmit`, `handleExport`, `handleSearch`
- Data fetchers prefixed `fetch*`: `fetchAssets`, `fetchCategories`, `fetchLocations`
- Page components `PascalCase` with `Page` suffix, exported as default: `export default function AssetsPage()` (`app/(authenticated)/assets/page.tsx`)
- Hooks prefixed `use`: `useIsMobile` (`hooks/use-mobile.ts`), `useToast` (`hooks/use-toast.ts`)

**Variables:**
- `camelCase`: `existingCount`, `bastNumber`, `isValidPassword`, `formData`, `imagePreview`
- Module-level constants: `SCREAMING_SNAKE_CASE`: `TOKEN_NAME` (`lib/auth.ts`), `MOBILE_BREAKPOINT` (`hooks/use-mobile.ts`), `ROLE_HIERARCHY` (`lib/auth.ts`)
- Component state reflects API response shape loosely, often `any[]`: `const [assets, setAssets] = useState<any[]>([]);` (`app/(authenticated)/assets/page.tsx`)

**Types:**
- Interfaces `PascalCase`, component props suffixed `Props`: `CreateAssetDialogProps` (`components/create-asset-dialog.tsx`), `CreateBastInput` (`lib/actions/bast-actions.ts`), `JWTPayload` (`lib/auth.ts`), `ApiResponse<T>` (`lib/api-response.ts`)
- Interface-based (not `type` aliases) for props and payloads; `z.infer<typeof formSchema>` used for form types (`components/create-category-dialog.tsx`)
- `T = any` default generic used in `ApiResponse<T = any>` (`lib/api-response.ts`)

## Code Style

**Formatting:**
- No Prettier config detected (no `.prettierrc*` at repo root); formatting is manual. Two coexisting styles:
  - **Hand-written app code** (all `app/`, `components/*.tsx` non-UI, `lib/`, `scripts/`, `prisma/seed.ts`): semicolons, trailing commas, 2-space indent, double quotes — e.g. `components/create-category-dialog.tsx`, `lib/api-response.ts`
  - **shadcn-generated code** (`components/ui/*`, `hooks/use-mobile.ts`, generated blocks like `components/data-table.tsx`): ASI (no semicolons), no trailing commas, double quotes — e.g. `components/ui/button.tsx`, `hooks/use-mobile.ts`

**Linting:**
- ESLint 9 flat config: `eslint.config.mjs` — extends `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`
- Run via `npm run lint` (`eslint`). No custom rules beyond next defaults; no style rules enforced (no semicolon rule, so both styles lint clean)

**TypeScript:**
- `tsconfig.json`: `strict: true`, `moduleResolution: "bundler"`, `jsx: "react-jsx"`, `target: ES2017`
- Path alias `@/*` maps to `./*` (project root)

## Import Organization

**Order:**
1. React/external framework first: `import { useState } from "react"`; `"use client"` directive on line 1 for client components
2. Third-party libraries: `@prisma/client`, `jose`, `bcryptjs`, `react-hook-form`, `sonner`, `lucide-react` icons
3. Local `@/` imports: `@/components/ui/*` → `@/lib/*` → `@/components/*` (roughly UI-primitives before feature components)

**Path Aliases:**
- `@/components/ui/...` — shadcn primitives
- `@/components/...` — feature components
- `@/lib/...` — server-side utilities
- `@/hooks/...` — React hooks
- Configured in `components.json` aliases and `tsconfig.json` `paths`

## Error Handling

**Patterns:**
- **API routes** (`app/api/**/route.ts`): try/catch around DB work; `console.error("Operation error:", error)` in catch; return `errorResponse("User-facing message", 500)` for generic failures. Named `export async function GET/POST/PUT/DELETE(request: NextRequest)`.
- **Response helpers** centralized in `lib/api-response.ts`: `successResponse(data, message?, status?)`, `errorResponse(msg, status?)`, `unauthorizedResponse()`, `forbiddenResponse()`, `notFoundResponse()`, `validationErrorResponse(errors)`. All responses use the shape `{ success: boolean, data?, error?, message? }`.
- **Auth guards**: every API route starts with `const user = await getCurrentUser(); if (!user) return unauthorizedResponse();` then role checks via `hasMinimumRole(user.role, UserRole.ADMIN_INSTANSI)` returning `forbiddenResponse(...)` (`app/api/users/route.ts`).
- **Server actions** (`lib/actions/bast-actions.ts`): `"use server"` directive; throw `new Error("Unauthorized")` for auth failure; return `{ success: true, data }` / `{ success: false, error: error.message }` objects; `revalidatePath()` after mutations.
- **Client components**: try/catch around `fetch`; `toast.success(...)` / `toast.error(...)` (sonner) for user feedback; `console.error("Failed to fetch X:", error)` in catch; `finally { setLoading(false) }`.
- **Validation**: manual inline checks in API routes (`if (!name || !tagNumber || !purchaseDate...) return errorResponse(..., 400)`) — no zod on the server. zod + react-hook-form only on client forms (`components/create-category-dialog.tsx`), and duplicate-field checks return 409 (`app/api/assets/route.ts`).
- `catch (error: any)` used pervasively (53 occurrences of `: any`/`as any` across `app/`, `components/`, `lib/`) to access `error.message`.

## Logging

**Framework:** No logging library — raw `console` API.

**Patterns:**
- `console.error("X error:", error)` — all API route catch blocks and client fetch failures (`app/api/assets/route.ts`, `app/(authenticated)/assets/page.tsx`)
- `console.error("Create BAST Action Error:", error)` — server actions (`lib/actions/bast-actions.ts`)
- `console.log("Start seeding...")` — `prisma/seed.ts` and `scripts/*`
- `console.error` passed directly as `.catch(console.error)` in `components/qr-scanner-dialog.tsx`

## Comments

**When to Comment:**
- JSDoc `/** ... */` block on every exported function in `lib/` and on route handlers, describing what it does: `/** GET /api/assets - Get all assets with filters */` (`app/api/assets/route.ts`), `/** Approve a BAST and update asset statuses */` (`lib/actions/bast-actions.ts`)
- Inline `//` comments for step labels: `// Build where clause`, `// Generate BAST Number`, `// Validation`, `// Check if tag number already exists`
- Mixed language: code identifiers and most inline comments are English, but some files carry Indonesian comments — `lib/auth.ts`, `proxy.ts`, `scripts/generate-hash.mjs` (e.g. `// Secret key untuk JWT`, `// Routes yang memerlukan authentication`)

**JSDoc/TSDoc:**
- Used on exported lib functions (`lib/auth.ts`, `lib/api-response.ts`) — optional params noted in text, no `@param`/`@returns` tags

## Function Design

**Size:**
- Route handlers typically 60–170 lines each; page components 30–200 lines. No enforced limit.
- Small named helper functions inside components (`handleImageChange`, `handleSubmit`) rather than inline closures where reuse occurs

**Parameters:**
- Component props passed as a single destructured `Props` interface object: `export function CreateAssetDialog({ open, onOpenChange, onSuccess, categories }: CreateAssetDialogProps)`
- Server actions take a single typed input object: `createBast(input: CreateBastInput)` (`lib/actions/bast-actions.ts`)
- Status/role strings cast from Prisma enums at boundaries: `(role as UserRole) || UserRole.EMPLOYEE`

**Return Values:**
- API routes return `NextResponse<ApiResponse<T>>` via helpers
- Server actions return `{ success: boolean; data?: T; error?: string }`
- Auth lib functions return `Promise<JWTPayload | null>` (`verifyToken`, `getCurrentUser`)
- Components return JSX; pages `export default function` returning JSX

## Module Design

**Exports:**
- Named exports everywhere for components and lib functions
- Default exports ONLY for Next.js pages/layouts: `export default function AssetsPage()`, `export default function RootLayout()` (`app/layout.tsx`)
- `lib/db.ts` exports both named (`export const db`) and `export default db`
- API routes export named handlers only: `export async function GET`, `POST`, etc.

**Barrel Files:**
- Not used. Imports are direct per-file: `import { Button } from "@/components/ui/button";` — no `components/ui/index.ts`
- Prisma enums/types imported directly from `@prisma/client`: `import { UserRole } from "@prisma/client"`

## Domain Conventions

**Server vs Client Splitting:**
- `"use client"` on components using hooks/state: dialogs, tables, pages with fetch (`components/create-asset-dialog.tsx`, `app/(authenticated)/assets/page.tsx`)
- Server components are async default exports: `export default async function AuthenticatedLayout({ children }: { children: React.ReactNode })` (`app/(authenticated)/layout.tsx`)
- `"use server"` on action modules (`lib/actions/bast-actions.ts`)

**Data Flow Conventions:**
- Server actions (`lib/actions/`) coexist with REST API (`app/api/`); current client code prefers `fetch("/api/...")` + `{ success, data, error }` envelope over direct action imports
- After mutations via server actions: `revalidatePath("/bast")` (`lib/actions/bast-actions.ts`)
- Prisma access goes through the singleton `db` from `lib/db.ts`, never `new PrismaClient()` in route handlers
- Foreign-key lookups use `include`/`select` for shaping; list endpoints return `{ data, pagination: { page, limit, total, totalPages } }`

**UI Conventions:**
- shadcn/ui (new-york style, `components.json`) with Tailwind v4; `cn()` from `lib/utils.ts` for class merging; lucide-react icons on feature components, `@tabler/icons-react` in dashboard/data-table blocks; `sonner` toasts via `Toaster` in `app/layout.tsx`; `react-hook-form` + `zodResolver` for validated forms (`components/create-category-dialog.tsx`)

## Conventions Checklist for New Code

- Add `"use client"` as line 1 for any component using hooks/state
- Use `@/` alias for all internal imports; never relative imports in `components/` or `lib/`
- Hand-written files: double quotes, semicolons, trailing commas, 2-space indent (match `lib/` and `components/*.tsx`, not shadcn generated files)
- Add `/** ... */` JSDoc above every exported lib function and route handler
- Guard API routes with `getCurrentUser()` + `unauthorizedResponse()`, then `hasMinimumRole(...)` + `forbiddenResponse()` for admin routes
- Use response helpers from `lib/api-response.ts` — never build `NextResponse.json` inline (exception: `proxy.ts`)
- Wrap DB work in try/catch; log with `console.error("Context error:", error)`; return user-safe error messages
- Server components: `async` default export; client pages: `export default function XxxPage()`
- Prefer extracted props interfaces `<Name>Props`; type form state with `z.infer<typeof formSchema>`

---

*Convention analysis: 2026-08-10*