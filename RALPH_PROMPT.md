# Enterprise CRM Build Prompt

Build this Sales CRM into a full enterprise-grade system. Fix all existing bugs first, then implement the following features systematically:

## Phase 1: Fix Existing Issues & Stabilize
- Fix all broken links and navigation errors
- Ensure all CRUD operations work for: Contacts, Companies, Deals, Quotes, Calls, Tasks
- Fix form validation errors and Select component issues
- Test every page and API endpoint

## Phase 2: Visual Pipeline & Kanban
- Drag-and-drop deal pipeline board (Kanban view)
- Stage progression with win probability auto-update
- Pipeline analytics and conversion metrics
- Multiple pipelines support (Sales, Partnerships, etc.)

## Phase 3: Product Catalog & Enhanced Quotes
- Products/Services table with SKUs, pricing tiers
- Price books (different pricing for different customer segments)
- Quote templates with merge fields
- E-signature integration ready (DocuSign/HelloSign webhook structure)
- Quote versioning and revision history
- Auto-convert accepted quotes to deals

## Phase 4: Advanced Reporting & Dashboards
- Executive dashboard with KPIs (revenue, pipeline value, win rate, avg deal size)
- Sales rep performance leaderboards
- Pipeline velocity metrics
- Revenue forecasting with weighted probability
- Custom report builder (filter any entity by any field)
- Chart types: funnel, bar, line, pie, area
- Exportable reports (CSV, PDF)
- Scheduled report emails

## Phase 5: Activity Timeline & Communication Hub
- Unified activity timeline on every record
- Email logging (BCC dropbox address)
- Email templates with merge fields
- Meeting scheduler with calendar integration
- Call recording notes with transcription-ready structure
- Automatic activity creation from emails/calls

## Phase 6: Workflow Automation Engine
- Visual workflow builder
- Triggers: record created, field changed, date-based, stage change
- Actions: send email, create task, update field, send webhook, assign owner
- Lead assignment rules (round-robin, territory, load-balanced)
- Auto-follow-up sequences
- SLA escalation rules

## Phase 7: Lead Scoring & Qualification
- Point-based lead scoring model
- Scoring rules (email opened +5, meeting booked +20, etc.)
- Automatic status progression based on score thresholds
- Lead source attribution tracking
- Marketing campaign ROI tracking

## Phase 8: Custom Fields & Entity Customization
- Admin UI to add custom fields to any entity
- Field types: text, number, date, dropdown, multi-select, lookup, formula
- Required/optional validation rules
- Field-level permissions
- Custom field search and filtering

## Phase 9: Role-Based Access Control (RBAC)
- Roles: Admin, Sales Manager, Sales Rep, Read-Only
- Object-level permissions (view, create, edit, delete per entity)
- Record-level permissions (own records only vs all records)
- Field-level permissions (hide sensitive fields)
- Team/Territory hierarchy
- Data sharing rules

## Phase 10: Audit & Compliance
- Full audit log (who changed what, when, old vs new values)
- Login history tracking
- Data export for compliance (GDPR)
- Record deletion with soft-delete and recovery
- Field history tracking on key fields
- IP-based access logging

## Phase 11: Notifications & Alerts
- In-app notification center
- Email notifications (configurable per user)
- @mentions in notes and comments
- Deal stage change alerts
- Task due date reminders
- Overdue task escalations

## Phase 12: Advanced Search & Saved Views
- Global search across all entities
- Advanced filter builder (AND/OR conditions)
- Saved searches/views per user
- Quick filters and faceted search
- Recently viewed records
- Bulk actions on search results (mass update, mass delete, mass email)

## Phase 13: Document Management
- File attachments on any record
- Document templates (proposals, contracts)
- Version control for documents
- Preview in-browser (PDF, images)
- Storage via S3-compatible API

## Phase 14: API & Integrations
- RESTful API with OpenAPI/Swagger docs
- API key management
- Webhook subscriptions (record events)
- Rate limiting
- OAuth2 for third-party apps
- Zapier/Make integration ready structure

## Phase 15: Performance & Scale
- Redis caching for hot data
- Database query optimization with proper indexes
- Pagination everywhere
- Background job queue (for emails, reports, imports)
- Database connection pooling
- Response time monitoring hooks

## Technical Requirements:
- TypeScript strict mode throughout
- Comprehensive error handling with user-friendly messages
- Loading states and optimistic updates
- Mobile-responsive design (already using Tailwind)
- Proper form validation with helpful error messages
- Consistent UI patterns using shadcn/ui
- Database transactions for multi-step operations
- Soft deletes with restore capability

## Docker Production-Ready:
- Multi-stage Dockerfile optimized for production
- Health checks for all services
- Environment-based configuration
- Redis container added to docker-compose
- Proper logging configuration
- Graceful shutdown handling

Start with Phase 1 (fixing bugs), then proceed through each phase sequentially. After each phase, verify all functionality works before moving to the next. Prioritize stability over features.
