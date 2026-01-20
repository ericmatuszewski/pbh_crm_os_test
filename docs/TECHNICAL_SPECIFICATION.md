# Sales CRM System - Technical Specification

## 1. Project Overview

A modern, responsive CRM (Customer Relationship Management) system designed for sales teams to manage leads, contacts, deals, and sales pipelines effectively.

### 1.1 Objectives
- Centralize customer and lead data management
- Track sales pipeline and deal progress
- Provide actionable insights through dashboards
- Enable team collaboration on deals
- Automate routine sales tasks

### 1.2 Target Users
- Sales Representatives
- Sales Managers
- Account Executives
- Business Development Representatives

---

## 2. Technology Stack

### 2.1 Frontend
| Technology | Purpose |
|------------|---------|
| **Next.js 14** | React framework with App Router |
| **TypeScript** | Type safety and developer experience |
| **Tailwind CSS** | Utility-first styling |
| **shadcn/ui** | Component library |
| **React Query** | Server state management |
| **Zustand** | Client state management |
| **React Hook Form** | Form handling |
| **Zod** | Schema validation |
| **Recharts** | Data visualization |

### 2.2 Backend (API)
| Technology | Purpose |
|------------|---------|
| **Next.js API Routes** | REST API endpoints |
| **Prisma** | ORM and database management |
| **PostgreSQL** | Primary database |
| **NextAuth.js** | Authentication |

### 2.3 Infrastructure
| Technology | Purpose |
|------------|---------|
| **Vercel** | Hosting and deployment |
| **Supabase/Neon** | Managed PostgreSQL |
| **Uploadthing** | File uploads |

---

## 3. Core Features

### 3.1 Dashboard
- Key metrics overview (revenue, deals, conversion rates)
- Sales pipeline visualization
- Recent activities feed
- Task reminders and notifications
- Performance charts

### 3.2 Contact Management
- Contact CRUD operations
- Contact categorization (Lead, Customer, Partner)
- Contact timeline and activity history
- Import/Export contacts (CSV)
- Contact search and filtering
- Contact notes and tags

### 3.3 Company/Account Management
- Company profiles with hierarchy
- Associated contacts and deals
- Company-level notes and documents
- Industry and size categorization

### 3.4 Deal/Opportunity Management
- Kanban board pipeline view
- Deal stages (customizable)
- Deal value and probability tracking
- Expected close date
- Deal activities and notes
- Win/loss tracking with reasons

### 3.5 Lead Management
- Lead capture forms
- Lead scoring
- Lead qualification workflow
- Lead to contact conversion
- Lead source tracking

### 3.6 Task & Activity Management
- Task creation and assignment
- Activity logging (calls, emails, meetings)
- Calendar integration
- Reminders and notifications
- Activity reports

### 3.7 Reporting & Analytics
- Sales performance reports
- Pipeline analytics
- Revenue forecasting
- Team performance metrics
- Custom report builder

### 3.8 User Management
- Role-based access control (Admin, Manager, Rep)
- Team management
- User activity logs
- Permission management

---

## 4. Data Models

### 4.1 Core Entities

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String
  role          UserRole  @default(REP)
  avatar        String?
  teamId        String?
  team          Team?     @relation(fields: [teamId], references: [id])
  deals         Deal[]
  tasks         Task[]
  activities    Activity[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Contact {
  id            String    @id @default(cuid())
  firstName     String
  lastName      String
  email         String?
  phone         String?
  title         String?
  companyId     String?
  company       Company?  @relation(fields: [companyId], references: [id])
  status        ContactStatus @default(LEAD)
  source        String?
  ownerId       String?
  tags          Tag[]
  deals         Deal[]
  activities    Activity[]
  notes         Note[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Company {
  id            String    @id @default(cuid())
  name          String
  website       String?
  industry      String?
  size          CompanySize?
  address       String?
  contacts      Contact[]
  deals         Deal[]
  notes         Note[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Deal {
  id            String    @id @default(cuid())
  title         String
  value         Decimal   @db.Decimal(12, 2)
  currency      String    @default("USD")
  stage         DealStage @default(QUALIFICATION)
  probability   Int       @default(0)
  expectedCloseDate DateTime?
  closedAt      DateTime?
  closedReason  String?
  contactId     String?
  contact       Contact?  @relation(fields: [contactId], references: [id])
  companyId     String?
  company       Company?  @relation(fields: [companyId], references: [id])
  ownerId       String
  owner         User      @relation(fields: [ownerId], references: [id])
  activities    Activity[]
  notes         Note[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Task {
  id            String    @id @default(cuid())
  title         String
  description   String?
  dueDate       DateTime?
  priority      Priority  @default(MEDIUM)
  status        TaskStatus @default(TODO)
  assigneeId    String
  assignee      User      @relation(fields: [assigneeId], references: [id])
  relatedType   String?
  relatedId     String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Activity {
  id            String    @id @default(cuid())
  type          ActivityType
  title         String
  description   String?
  userId        String
  user          User      @relation(fields: [userId], references: [id])
  contactId     String?
  contact       Contact?  @relation(fields: [contactId], references: [id])
  dealId        String?
  deal          Deal?     @relation(fields: [dealId], references: [id])
  createdAt     DateTime  @default(now())
}

model Note {
  id            String    @id @default(cuid())
  content       String
  contactId     String?
  contact       Contact?  @relation(fields: [contactId], references: [id])
  companyId     String?
  company       Company?  @relation(fields: [companyId], references: [id])
  dealId        String?
  deal          Deal?     @relation(fields: [dealId], references: [id])
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Team {
  id            String    @id @default(cuid())
  name          String
  members       User[]
  createdAt     DateTime  @default(now())
}

model Tag {
  id            String    @id @default(cuid())
  name          String    @unique
  color         String?
  contacts      Contact[]
}

enum UserRole {
  ADMIN
  MANAGER
  REP
}

enum ContactStatus {
  LEAD
  QUALIFIED
  CUSTOMER
  CHURNED
  PARTNER
}

enum CompanySize {
  STARTUP
  SMALL
  MEDIUM
  ENTERPRISE
}

enum DealStage {
  QUALIFICATION
  DISCOVERY
  PROPOSAL
  NEGOTIATION
  CLOSED_WON
  CLOSED_LOST
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

enum ActivityType {
  CALL
  EMAIL
  MEETING
  NOTE
  TASK
  DEAL_UPDATE
}
```

---

## 5. API Structure

### 5.1 REST Endpoints

```
/api/auth/*           - Authentication (NextAuth)
/api/users            - User management
/api/contacts         - Contact CRUD
/api/companies        - Company CRUD
/api/deals            - Deal CRUD
/api/tasks            - Task CRUD
/api/activities       - Activity logging
/api/dashboard        - Dashboard metrics
/api/reports          - Report generation
```

### 5.2 API Response Format

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    page: number;
    limit: number;
    total: number;
  };
}
```

---

## 6. UI/UX Architecture

### 6.1 Layout Structure
```
├── Sidebar (collapsible)
│   ├── Logo
│   ├── Navigation Links
│   └── User Menu
├── Header
│   ├── Search
│   ├── Notifications
│   └── Quick Actions
└── Main Content Area
    └── Page-specific content
```

### 6.2 Page Structure
```
/                     - Dashboard
/contacts             - Contacts list
/contacts/[id]        - Contact detail
/contacts/new         - Create contact
/companies            - Companies list
/companies/[id]       - Company detail
/deals                - Pipeline (Kanban)
/deals/[id]           - Deal detail
/tasks                - Task list
/reports              - Reports
/settings             - Settings
/settings/team        - Team management
/settings/profile     - User profile
```

### 6.3 Design System
- **Colors**: Blue primary (#3B82F6), neutral grays
- **Typography**: Inter font family
- **Spacing**: 4px base unit (Tailwind defaults)
- **Border Radius**: 6px (rounded-md)
- **Shadows**: Subtle, layered shadows

---

## 7. Component Architecture

### 7.1 Component Categories

```
components/
├── ui/                 # Base UI components (shadcn)
│   ├── button.tsx
│   ├── input.tsx
│   ├── card.tsx
│   └── ...
├── layout/             # Layout components
│   ├── Sidebar.tsx
│   ├── Header.tsx
│   └── PageWrapper.tsx
├── contacts/           # Contact-related components
│   ├── ContactCard.tsx
│   ├── ContactForm.tsx
│   └── ContactList.tsx
├── deals/              # Deal-related components
│   ├── DealCard.tsx
│   ├── DealPipeline.tsx
│   └── DealForm.tsx
├── dashboard/          # Dashboard components
│   ├── MetricsCard.tsx
│   ├── RevenueChart.tsx
│   └── ActivityFeed.tsx
└── shared/             # Shared components
    ├── DataTable.tsx
    ├── SearchInput.tsx
    └── EmptyState.tsx
```

---

## 8. State Management

### 8.1 Server State (React Query)
- Contacts, Companies, Deals data
- User data
- Dashboard metrics
- Cached with automatic revalidation

### 8.2 Client State (Zustand)
- UI state (sidebar open/closed)
- Filter and sort preferences
- Selected items
- Modal/dialog states

---

## 9. Security Considerations

- Authentication via NextAuth.js with secure sessions
- Role-based access control on all endpoints
- Input validation with Zod
- CSRF protection
- Rate limiting on API routes
- Data encryption at rest (database level)

---

## 10. Performance Optimizations

- Server-side rendering for initial page loads
- Optimistic updates for better UX
- Infinite scrolling for large lists
- Image optimization with Next.js Image
- Code splitting and lazy loading
- Database query optimization with Prisma

---

## 11. Development Phases

### Phase 1: Foundation (Week 1-2)
- [x] Project setup and configuration
- [ ] Authentication system
- [ ] Database schema and migrations
- [ ] Base UI components
- [ ] Layout and navigation

### Phase 2: Core Features (Week 3-4)
- [ ] Contact management
- [ ] Company management
- [ ] Dashboard with metrics
- [ ] Basic search and filtering

### Phase 3: Sales Pipeline (Week 5-6)
- [ ] Deal management
- [ ] Kanban pipeline view
- [ ] Task management
- [ ] Activity logging

### Phase 4: Advanced Features (Week 7-8)
- [ ] Reporting and analytics
- [ ] Team management
- [ ] Import/Export functionality
- [ ] Notifications system

### Phase 5: Polish (Week 9-10)
- [ ] Performance optimization
- [ ] Testing and bug fixes
- [ ] Documentation
- [ ] Deployment

---

## 12. File Structure

```
sales-crm/
├── prisma/
│   └── schema.prisma
├── public/
│   └── assets/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   ├── (dashboard)/
│   │   ├── api/
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   ├── services/
│   ├── types/
│   └── utils/
├── .env.example
├── .eslintrc.json
├── next.config.js
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```
