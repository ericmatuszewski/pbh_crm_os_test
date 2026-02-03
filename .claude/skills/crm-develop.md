# CRM Development Skill

Use this skill when working on PBH Sales CRM features, fixes, or improvements.

## Before Starting Any Task

1. **Read the codebase context**: Review `.claude/claude.md` for project conventions
2. **Check existing patterns**: Look at similar implementations before building new
3. **Plan first**: For 3+ step tasks, write plan to `tasks/todo.md`

---

## Development Checklist

### Adding a New Page

```
1. Create page at: src/app/(dashboard)/{feature}/page.tsx
2. Add to Sidebar navigation: src/components/layout/Sidebar.tsx
3. Create components in: src/components/{feature}/
4. Add API routes: src/app/api/{feature}/route.ts
5. Create React Query hooks: src/hooks/use-{feature}.ts
6. Export hooks from: src/hooks/index.ts
7. Add types to: src/types/index.ts
```

**Page Template:**
```tsx
"use client";

import { Suspense } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { LoadingState } from "@/components/shared";
import { useYourHook } from "@/hooks";

function PageContent() {
  const { data, isLoading } = useYourHook();

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Title" subtitle="Description" />
        <main className="flex-1 overflow-y-auto p-6">
          {/* Content */}
        </main>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingState />}>
      <PageContent />
    </Suspense>
  );
}
```

### Adding an API Route

```
1. Create route: src/app/api/{resource}/route.ts
2. Add Zod validation schema: src/lib/validations.ts
3. Include business scoping: getCurrentBusiness(request)
4. Return standard response format
```

**API Template:**
```typescript
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentBusiness, buildBusinessScopeFilter } from "@/lib/business";

export async function GET(request: NextRequest) {
  try {
    const business = await getCurrentBusiness(request);
    if (!business) {
      return NextResponse.json(
        { success: false, error: { code: "NO_BUSINESS", message: "No business selected" } },
        { status: 400 }
      );
    }

    const businessFilter = await buildBusinessScopeFilter(business.id, !business.parentId);

    const data = await prisma.yourModel.findMany({
      where: businessFilter,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch" } },
      { status: 500 }
    );
  }
}
```

### Adding a React Query Hook

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { YourType } from "@/types";

export function useYourData(filters?: { search?: string }) {
  return useQuery({
    queryKey: ["yourData", filters],
    queryFn: async (): Promise<YourType[]> => {
      const params = new URLSearchParams();
      if (filters?.search) params.set("search", filters.search);

      const response = await fetch(`/api/your-endpoint?${params}`);
      const data = await response.json();

      if (!data.success) throw new Error(data.error?.message);
      return data.data;
    },
  });
}

export function useCreateYourData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateInput) => {
      const response = await fetch("/api/your-endpoint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error?.message);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["yourData"] });
    },
  });
}
```

---

## Priority Improvement Tasks

### 🔴 Critical (Do These First)

#### 1. Remove Console Logs (223 files affected)
```bash
# Find all console statements
grep -r "console\." src/ --include="*.ts" --include="*.tsx" -l | wc -l
```
Replace with proper error handling or remove debugging statements.

#### 2. Fix Type Safety Issues
Files with `any` types:
- `src/app/api/users/sync-ad/route.ts`
- `src/app/api/activities/route.ts`
- `src/lib/auth/ldap.ts`
- `src/components/calls/CampaignForm.tsx`

#### 3. Add Transaction Handling
Wrap bulk operations in transactions:
```typescript
await prisma.$transaction(async (tx) => {
  // Multiple database operations here
});
```
Priority file: `src/app/api/bulk-actions/route.ts`

### 🟡 High Priority

#### 4. Add Missing API Tests
Create tests in `src/__tests__/api/` for all routes.

#### 5. Complete Missing APIs
- Notes CRUD: `src/app/api/notes/`
- Tags CRUD: `src/app/api/tags/`
- Audit log viewer: `src/app/api/audit-logs/`
- Login history: `src/app/api/login-history/`

#### 6. Server-Side Filtering
Update deals/contacts pages to filter on server, not client.

### 🟢 Medium Priority

#### 7. Implement Recurring Tasks UI
Schema fields exist in Task model. Add UI in tasks page form.

#### 8. Add Skeleton Loaders
Replace spinners with skeleton loaders for better UX.

#### 9. Real-Time Features
Add WebSocket or SSE for:
- Live notifications
- Pipeline updates
- Collaborative indicators

---

## Database Schema Patterns

### Adding a New Model
```prisma
model NewEntity {
  id          String    @id @default(cuid())
  name        String

  // Multi-business support (required)
  businessId  String?
  business    Business? @relation(fields: [businessId], references: [id])

  // Timestamps (required)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  // Indexes
  @@index([businessId])
}
```

After adding, run:
```bash
npx prisma generate
npx prisma db push  # or migrate
```

---

## Testing Patterns

### API Route Test
```typescript
import { GET } from "@/app/api/your-route/route";
import { NextRequest } from "next/server";

describe("GET /api/your-route", () => {
  it("returns data successfully", async () => {
    const request = new NextRequest("http://localhost/api/your-route");
    const response = await GET(request);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
  });
});
```

### Component Test
```typescript
import { render, screen } from "@testing-library/react";
import { YourComponent } from "./YourComponent";

describe("YourComponent", () => {
  it("renders correctly", () => {
    render(<YourComponent />);
    expect(screen.getByText("Expected Text")).toBeInTheDocument();
  });
});
```

---

## Common Mistakes to Avoid

1. **Don't skip business scoping** - Always filter by businessId
2. **Don't forget Suspense boundaries** - Required when using useSearchParams
3. **Don't mutate state directly** - Use React Query mutations
4. **Don't hardcode business logic** - Use configuration/settings
5. **Don't skip error handling** - Always catch and handle errors gracefully
6. **Don't leave console.logs** - Remove before committing

---

## Quick Reference

### Key Files
- Prisma schema: `prisma/schema.prisma`
- Type definitions: `src/types/index.ts`
- Validations: `src/lib/validations.ts`
- Business logic: `src/lib/business.ts`
- Auth utilities: `src/lib/auth/`
- React Query client: `src/lib/query-client.ts`

### Components
- Layout: `src/components/layout/` (Sidebar, Header)
- Shared: `src/components/shared/` (EmptyState, LoadingState, StatusBadge)
- Domain: `src/components/{domain}/` (ContactTable, DealKanban, etc.)

### Hooks
- All hooks exported from: `src/hooks/index.ts`
- Pattern: `use{Entity}`, `useCreate{Entity}`, `useUpdate{Entity}`, `useDelete{Entity}`

---

## Verification Checklist

Before marking any task complete:

- [ ] Code compiles without errors (`npm run build`)
- [ ] No TypeScript errors
- [ ] No ESLint warnings (`npm run lint`)
- [ ] Tested in browser (manual verification)
- [ ] Error states handled
- [ ] Loading states present
- [ ] Empty states handled
- [ ] Mobile responsive (if applicable)
- [ ] Business scoping applied
- [ ] No console.logs left in
