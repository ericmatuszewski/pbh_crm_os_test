# PBH Sales CRM - Claude Development Guidelines

## Project Overview
Enterprise CRM system for a 10-agent call center team handling 300+ contacts/day. Built with Next.js 14, Prisma, PostgreSQL, React Query, and shadcn/ui.

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **State**: React Query (@tanstack/react-query)
- **UI**: shadcn/ui + Tailwind CSS + Lucide icons
- **Auth**: NextAuth.js
- **PDF**: @react-pdf/renderer
- **Charts**: Recharts

## Architecture Patterns
- Multi-business tenant isolation via `businessId` field
- RBAC with roles, permissions, territories
- Polymorphic task relationships (`relatedType`, `relatedId`)
- Custom fields system for flexibility
- API response format: `{ success: boolean, data?: T, error?: { code: string, message: string } }`

## Key Directories
- `src/app/(dashboard)/` - Protected dashboard pages with Sidebar + Header
- `src/app/api/` - API routes (110+ endpoints)
- `src/components/` - React components organized by domain
- `src/hooks/` - Custom React hooks (React Query wrappers)
- `src/lib/` - Utilities, validations, business logic
- `prisma/schema.prisma` - Database schema (3,900+ lines)

---

## Workflow Orchestration

### 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately - don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes - don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests - then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

---

## Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections

---

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.

---

## Known Improvement Areas

### Critical (Fix First)
- Remove 223 files with console.log statements - implement proper logging
- Fix 4 files with `any` types (LDAP, activities, forms)
- Add transaction handling to bulk operations
- Implement API rate limiting

### High Priority
- Add comprehensive API tests (110+ routes untested)
- Standardize error handling across all routes
- Complete missing APIs: notes, tags, audit logs, login history
- Server-side filtering for large lists (deals, contacts)

### Medium Priority
- Implement recurring tasks UI (schema exists)
- Task dependencies UI
- Lead scoring UI enhancements
- Real-time notifications (WebSocket)

### Testing Gaps
- Only 9 unit test files exist
- 1 E2E test file
- Target: 80% API coverage, critical path E2E tests

---

## Development Commands
```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint
npx prisma generate  # Regenerate Prisma client
npx prisma db push   # Push schema changes
docker compose up -d # Start with Docker
```

## File Naming Conventions
- Pages: `page.tsx` in route directories
- Components: PascalCase (`ContactTable.tsx`)
- Hooks: camelCase with `use` prefix (`use-contacts.ts`)
- API routes: `route.ts` in route directories
- Types: exported from `src/types/index.ts`
