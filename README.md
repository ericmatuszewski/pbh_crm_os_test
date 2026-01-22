# PBH CRM

A modern, enterprise-grade CRM (Customer Relationship Management) system designed for UK sales teams.

## Features

- **Dashboard** - Real-time metrics and KPIs
- **Contact Management** - Track leads and customers with lead scoring
- **Company Management** - Organize accounts and relationships
- **Deal Pipeline** - Visual Kanban-style deal tracking
- **Task Management** - Stay on top of follow-ups
- **Quote Builder** - Professional quote generation with PDF export
- **Reports** - Sales analytics and insights
- **Call Centre** - Campaign management and scheduled calls
- **Document Management** - File storage and templates
- **Workflow Automation** - Automate repetitive tasks
- **User Management** - Teams, roles, and permissions (RBAC)
- **Audit Logging** - Track all user activity
- **UK Localisation** - GBP currency, UK date formats, British English

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: PostgreSQL 15 + Prisma ORM
- **Cache**: Redis 7 (with in-memory fallback)
- **Auth**: NextAuth.js
- **State**: React Query + Zustand
- **Containerisation**: Docker + Docker Compose

## Quick Start

### Option 1: Docker (Recommended)

The fastest way to get started - includes PostgreSQL and Redis automatically.

```bash
# Clone the repository
git clone <repository-url>
cd pbh-crm

# Copy environment file
cp .env.example .env

# Start all services
docker-compose up -d

# Run database migrations
docker-compose exec app npx prisma migrate deploy

# Open http://localhost:3000
```

### Option 2: Local Development

For development without Docker:

```bash
# Prerequisites: Node.js 20+, PostgreSQL 15+

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials

# Set up the database
npm run db:push

# Run the development server
npm run dev

# Open http://localhost:3000
```

## Docker Deployment

### Development

```bash
docker-compose up -d
```

### Production

```bash
# Configure production environment
cp .env.example .env
# Edit .env with production values

# Build and start
docker-compose -f docker-compose.prod.yml up -d --build

# Run migrations
docker-compose -f docker-compose.prod.yml exec app npx prisma migrate deploy
```

### Services

| Service | Port | Description |
|---------|------|-------------|
| app | 3000 | Next.js application |
| db | 5432 | PostgreSQL database |
| redis | 6379 | Redis cache |

### Health Check

```bash
curl http://localhost:3000/api/health
```

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## Project Structure

```
src/
├── app/                 # Next.js App Router pages
│   ├── api/            # API routes
│   └── (dashboard)/    # Dashboard pages
├── components/          # React components
│   ├── ui/             # Base UI components (shadcn)
│   ├── layout/         # Layout components
│   ├── dashboard/      # Dashboard widgets
│   ├── contacts/       # Contact management
│   ├── deals/          # Deal pipeline
│   └── quotes/         # Quote builder
├── lib/                # Utilities and services
│   ├── cache/          # Redis/memory caching
│   ├── rbac/           # Role-based access control
│   ├── jobs/           # Background job handlers
│   └── locale/         # UK localisation
├── hooks/              # Custom React hooks
├── services/           # API service functions
└── types/              # TypeScript types
```

## Development Commands

```bash
# Run development server
npm run dev

# Run tests
npm test

# Run linting
npm run lint

# Build for production
npm run build

# Database commands
npm run db:generate    # Generate Prisma client
npm run db:push        # Push schema changes
npm run db:studio      # Open Prisma Studio
npm run db:migrate     # Run migrations
```

## Configuration

Key environment variables (see `.env.example` for full list):

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection (optional) |
| `NEXTAUTH_SECRET` | Session encryption key |
| `NEXTAUTH_URL` | Public application URL |

## Documentation

- [Deployment Guide](./DEPLOYMENT.md) - Production deployment instructions
- [Technical Specification](./docs/TECHNICAL_SPECIFICATION.md) - Architecture documentation

## License

MIT
