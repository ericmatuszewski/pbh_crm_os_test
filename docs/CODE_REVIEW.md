# Code Review Checklist - Sales CRM

## TypeScript & Type Safety

- [ ] **Strict Mode**: `tsconfig.json` has `strict: true`
- [ ] **No `any` Types**: Avoid `any`, use `unknown` or proper types
- [ ] **Null Safety**: Proper null/undefined handling
- [ ] **Type Exports**: All API types properly defined in `/types`

## React Best Practices

### Component Structure
- [ ] Components are focused and single-purpose
- [ ] Proper separation of container/presentation components
- [ ] Custom hooks for reusable logic
- [ ] Memoization where appropriate (`useMemo`, `useCallback`)

### State Management
- [ ] TanStack Query for server state
- [ ] Zustand for client state
- [ ] No prop drilling beyond 2 levels
- [ ] Proper loading/error states

### Performance
- [ ] Images optimized with `next/image`
- [ ] Dynamic imports for heavy components
- [ ] Proper React key usage in lists
- [ ] No unnecessary re-renders

## Error Handling

- [ ] All async operations wrapped in try/catch
- [ ] User-friendly error messages
- [ ] Error boundaries for component failures
- [ ] Toast notifications for operations

## Accessibility (a11y)

- [ ] Semantic HTML elements
- [ ] ARIA labels on interactive elements
- [ ] Keyboard navigation support
- [ ] Focus management in modals
- [ ] Color contrast compliance

## Form Handling

- [ ] React Hook Form for all forms
- [ ] Zod validation schemas
- [ ] Proper error display
- [ ] Loading states during submission
- [ ] Disabled states for invalid forms

## API Routes

- [ ] Proper HTTP methods (GET, POST, PATCH, DELETE)
- [ ] Consistent response format
- [ ] Error responses with proper status codes
- [ ] Input validation before processing
- [ ] Authentication middleware

## Database (Prisma)

- [ ] Proper indexes on frequently queried fields
- [ ] Efficient queries (avoid N+1)
- [ ] Transactions for multi-step operations
- [ ] Soft deletes where appropriate

## Code Organization

- [ ] Consistent file naming conventions
- [ ] Logical folder structure
- [ ] Shared utilities in `/utils` or `/lib`
- [ ] Constants extracted

## Documentation

- [ ] README with setup instructions
- [ ] API documentation
- [ ] Component prop documentation
- [ ] Environment variable documentation

---

## Review Process

### Before Review
1. Run `npm run lint`
2. Run `npm run build`
3. Run `npm test`
4. Check for console errors in dev

### During Review
1. Read through all changed files
2. Check for logic errors
3. Verify edge cases handled
4. Test manually if complex logic

### After Review
1. Address all comments
2. Re-run tests
3. Get approval from reviewer
