# Security Audit Checklist - Sales CRM

## 1. Authentication & Authorization

### NextAuth Configuration
- [ ] **Session Strategy**: Verify JWT or database sessions are properly configured
- [ ] **CSRF Protection**: Ensure CSRF tokens are enabled (default in NextAuth)
- [ ] **Secure Cookies**: Check `httpOnly`, `secure`, and `sameSite` flags
- [ ] **Session Expiry**: Verify reasonable session timeout (recommend 24h max)
- [ ] **Callback URLs**: Validate allowed redirect URLs

### Authorization
- [ ] **Role-Based Access**: Verify UserRole (ADMIN, MANAGER, REP) enforcement
- [ ] **API Route Protection**: All /api routes check session
- [ ] **Data Scoping**: Users can only access their own/team data
- [ ] **Prisma Queries**: Include ownerId/teamId filters

## 2. Input Validation & Sanitization

### Current Status: ✅ Zod Validation in Place
- `createContactSchema` - firstName, lastName required, email validation
- `createCompanySchema` - name required, URL validation
- `createDealSchema` - value positive, probability 0-100
- `createTaskSchema` - title required, enum validation

### Recommendations
- [ ] Add rate limiting to API routes
- [ ] Implement request size limits
- [ ] Validate file uploads (if any)
- [ ] Sanitize HTML in note content

## 3. SQL Injection Prevention

### Current Status: ✅ Prisma ORM
Prisma uses parameterized queries by default, preventing SQL injection.

### Verify
- [ ] No raw SQL queries (`$queryRaw`, `$executeRaw`)
- [ ] If raw queries exist, ensure parameterization

## 4. XSS Prevention

### React/Next.js Built-in Protection
- React escapes content by default
- Avoid `dangerouslySetInnerHTML`

### Check
- [ ] No `dangerouslySetInnerHTML` usage
- [ ] User content properly escaped in emails/exports
- [ ] CSP headers configured

## 5. Security Headers

### Recommended Next.js Configuration
```javascript
// next.config.js
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  },
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
  }
];
```

## 6. Sensitive Data Exposure

### Environment Variables
- [ ] `DATABASE_URL` not exposed to client
- [ ] `NEXTAUTH_SECRET` is cryptographically random
- [ ] API keys not in client bundles

### Data Privacy
- [ ] Passwords hashed (bcrypt/argon2)
- [ ] PII encrypted at rest
- [ ] Audit logging for sensitive operations

## 7. API Security

### Rate Limiting
- [ ] Implement per-IP rate limiting
- [ ] Implement per-user rate limiting for authenticated routes

### Error Handling
- [ ] Don't expose stack traces in production
- [ ] Generic error messages (don't reveal system info)

## 8. Dependency Security

### Audit Commands
```bash
npm audit
npx @prisma/client check
```

### Recommendations
- [ ] Run `npm audit` regularly
- [ ] Update dependencies with known vulnerabilities
- [ ] Use Dependabot or Renovate

## 9. File Upload Security (If Applicable)
- [ ] Validate file types
- [ ] Limit file sizes
- [ ] Store outside public directory
- [ ] Scan for malware

## 10. Logging & Monitoring
- [ ] Log authentication events
- [ ] Log failed login attempts
- [ ] Monitor for suspicious patterns
- [ ] Don't log sensitive data (passwords, tokens)

---

## Priority Fixes

### High Priority
1. Add security headers to `next.config.js`
2. Implement API rate limiting
3. Verify all API routes check authentication

### Medium Priority
1. Add audit logging
2. Review data scoping in Prisma queries
3. Implement CORS policy

### Low Priority
1. Add CSP reporting
2. Implement security monitoring
3. Document security procedures

---

## Testing Security

### Automated Testing
```bash
# Run OWASP ZAP scan
# Run npm audit
npm audit --production

# Check for exposed secrets
npx secretlint "**/*"
```

### Manual Testing
- [ ] Test authentication bypass attempts
- [ ] Test authorization escalation
- [ ] Test input validation boundaries
- [ ] Test for IDOR vulnerabilities
