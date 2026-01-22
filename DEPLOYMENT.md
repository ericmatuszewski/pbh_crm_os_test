# PBH CRM Deployment Guide

This guide covers deploying the PBH CRM application to production environments.

## Prerequisites

- Docker 24.0+ and Docker Compose 2.0+
- PostgreSQL 15+ (included in Docker setup)
- Redis 7+ (included in Docker setup)
- Node.js 20+ (for local development only)
- At least 4GB RAM for the full stack

## Quick Start

### Development (Local)

```bash
# Clone the repository
git clone <repository-url>
cd pbh-crm

# Copy environment file
cp .env.example .env

# Start with Docker Compose
docker-compose up -d

# Access at http://localhost:3000
```

### Production Deployment

```bash
# Copy and configure environment
cp .env.example .env
# Edit .env with production values (see Configuration section)

# Build and start production stack
docker-compose -f docker-compose.prod.yml up -d --build

# Run database migrations
docker-compose -f docker-compose.prod.yml exec app npx prisma migrate deploy

# Access at your configured domain
```

## Configuration

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@db:5432/crm` |
| `NEXTAUTH_URL` | Public URL of your application | `https://crm.yourdomain.com` |
| `NEXTAUTH_SECRET` | Secret for session encryption | Generate with `openssl rand -base64 32` |

### Database Configuration

```env
# PostgreSQL (used by docker-compose)
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<secure-password>
POSTGRES_DB=sales_crm

# Connection URL (app connects via this)
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}?schema=public
```

### Redis Configuration

Redis is optional but recommended for production. Without Redis, the app falls back to in-memory caching.

```env
# For Docker deployment
REDIS_URL=redis://redis:6379

# For external Redis
REDIS_URL=redis://username:password@redis-host:6379
```

### Authentication

```env
# Session security
NEXTAUTH_SECRET=<generate-secure-secret>
NEXTAUTH_URL=https://your-domain.com

# OAuth providers (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Microsoft integration (optional)
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_TENANT_ID=
```

### Email Configuration

```env
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASSWORD=<smtp-password>
SMTP_FROM=noreply@your-domain.com
```

### Storage Configuration

For file uploads (documents, attachments):

```env
# S3-compatible storage
S3_ENDPOINT=https://s3.eu-west-2.amazonaws.com
S3_BUCKET=your-bucket-name
S3_ACCESS_KEY=<access-key>
S3_SECRET_KEY=<secret-key>
S3_REGION=eu-west-2
```

## Docker Architecture

The production Docker setup includes:

```
+-------------------+     +-------------------+     +-------------------+
|                   |     |                   |     |                   |
|   PBH CRM App     |---->|   PostgreSQL 15   |     |   Redis 7        |
|   (Node.js 20)    |     |   (Primary DB)    |     |   (Cache Layer)  |
|                   |---->|                   |     |                   |
+-------------------+     +-------------------+     +-------------------+
        |                                                    ^
        |                                                    |
        +----------------------------------------------------+
```

### Resource Limits (Production)

| Service | CPU Limit | Memory Limit | Memory Reserved |
|---------|-----------|--------------|-----------------|
| app | 2 cores | 2GB | 512MB |
| db | 1 core | 1GB | 256MB |
| redis | 0.5 cores | 512MB | 128MB |

## Health Checks

All services include health checks:

- **App**: `GET /api/health` - Returns service status, database connectivity, cache status
- **PostgreSQL**: `pg_isready` command
- **Redis**: `redis-cli ping`

Health check endpoint response:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-20T10:30:00Z",
  "services": {
    "database": "connected",
    "cache": "redis" // or "memory"
  },
  "version": "1.0.0"
}
```

## Database Management

### Running Migrations

```bash
# Development
npx prisma migrate dev

# Production (via Docker)
docker-compose -f docker-compose.prod.yml exec app npx prisma migrate deploy
```

### Database Backup

```bash
# Backup database
docker-compose -f docker-compose.prod.yml exec db pg_dump -U postgres sales_crm > backup.sql

# Restore database
docker-compose -f docker-compose.prod.yml exec -T db psql -U postgres sales_crm < backup.sql
```

### Seed Data

```bash
# Run seed script (if available)
docker-compose exec app npx prisma db seed
```

## SSL/TLS Configuration

For production, use a reverse proxy (nginx, Traefik, or cloud load balancer) for SSL termination.

Example nginx configuration:

```nginx
server {
    listen 443 ssl http2;
    server_name crm.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Scaling Considerations

### Horizontal Scaling

The application is stateless and can be horizontally scaled:

1. Use an external Redis cluster for session storage
2. Use a managed PostgreSQL service (RDS, Cloud SQL)
3. Deploy multiple app instances behind a load balancer

### Caching Strategy

The app uses a hybrid cache with Redis and in-memory fallback:

- **Redis connected**: All instances share cache
- **Redis disconnected**: Each instance has independent in-memory cache

Cache TTLs:
- Entity data: 5 minutes
- Pipelines/Products: 1 hour
- User permissions: 5 minutes

## Monitoring

### Logs

```bash
# View all logs
docker-compose -f docker-compose.prod.yml logs -f

# View specific service
docker-compose -f docker-compose.prod.yml logs -f app
```

Logs are rotated automatically (max 10MB, 3 files per service).

### Metrics

The app tracks:
- API response times (stored in database)
- Cache hit/miss rates
- Database query performance

Access metrics via the admin dashboard or API endpoints.

## Troubleshooting

### App Won't Start

1. Check environment variables: `docker-compose config`
2. Check database connectivity: `docker-compose exec app npx prisma db push --preview-feature`
3. Check logs: `docker-compose logs app`

### Database Connection Issues

```bash
# Test database connection
docker-compose exec db pg_isready -U postgres

# Check database logs
docker-compose logs db
```

### Redis Connection Issues

```bash
# Test Redis connection
docker-compose exec redis redis-cli ping

# Check if Redis is accepting connections
docker-compose exec redis redis-cli info clients
```

### Performance Issues

1. Check resource usage: `docker stats`
2. Review slow queries in the performance logs
3. Verify Redis is connected: `GET /api/health`
4. Consider increasing resource limits

## Security Checklist

Before going live:

- [ ] Generate strong `NEXTAUTH_SECRET`
- [ ] Use strong database passwords
- [ ] Enable SSL/TLS termination
- [ ] Configure firewall rules
- [ ] Set up regular database backups
- [ ] Review CORS settings
- [ ] Enable rate limiting (`RATE_LIMIT_RPM`)
- [ ] Configure proper session timeout
- [ ] Review OAuth provider settings

## Migration from Another Host

To migrate to a new server:

1. **Export data**:
   ```bash
   # On old server
   docker-compose exec db pg_dump -U postgres sales_crm > backup.sql
   ```

2. **Transfer files**:
   - Copy `backup.sql`
   - Copy `.env` file (update URLs as needed)
   - Copy any uploaded files from storage

3. **Deploy on new server**:
   ```bash
   # Start services
   docker-compose -f docker-compose.prod.yml up -d

   # Restore database
   docker-compose -f docker-compose.prod.yml exec -T db psql -U postgres sales_crm < backup.sql
   ```

4. **Verify**:
   - Check health endpoint
   - Test authentication
   - Verify data integrity

## Support

For issues and feature requests, please open an issue on the project repository.
