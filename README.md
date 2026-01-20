# Sales CRM System

A modern, responsive CRM (Customer Relationship Management) system designed for sales teams.

## Features

- 📊 **Dashboard** - Real-time metrics and KPIs
- 👥 **Contact Management** - Track leads and customers
- 🏢 **Company Management** - Organize accounts
- 🎯 **Deal Pipeline** - Visual Kanban-style deal tracking
- ✅ **Task Management** - Stay on top of follow-ups
- 📈 **Reports** - Sales analytics and insights

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: NextAuth.js
- **State**: React Query + Zustand

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- npm or pnpm

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. Set up the database:
   ```bash
   npm run db:push
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/                 # Next.js App Router pages
├── components/          # React components
│   ├── ui/             # Base UI components
│   ├── layout/         # Layout components
│   ├── dashboard/      # Dashboard components
│   ├── contacts/       # Contact components
│   └── deals/          # Deal components
├── lib/                # Utilities and config
├── hooks/              # Custom React hooks
├── services/           # API service functions
└── types/              # TypeScript types
```

## Development

```bash
# Run development server
npm run dev

# Generate Prisma client
npm run db:generate

# Push schema changes
npm run db:push

# Open Prisma Studio
npm run db:studio

# Run linting
npm run lint
```

## Documentation

See [Technical Specification](./docs/TECHNICAL_SPECIFICATION.md) for detailed architecture and feature documentation.

## License

MIT
