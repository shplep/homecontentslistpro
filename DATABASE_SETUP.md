# Database Setup Guide

This project supports both SQLite (for development) and MySQL (for production). The configuration is controlled through environment variables and the Prisma schema.

## Current Setup: SQLite (Development)

The project is currently configured to use SQLite for local development. This requires no additional setup - the database file (`dev.db`) is created automatically.

### Environment Variables (.env)

```env
# SQLite Database for Development
DATABASE_URL="file:./dev.db"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="development-secret-key-change-in-production"

# App Configuration
APP_URL="http://localhost:3000"

# Email Configuration (optional for development)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="HomeContentsListPro <noreply@homecontentslistpro.com>"
```

### Quick Start with SQLite

1. The `.env` file is already configured
2. The SQLite database `dev.db` has been created
3. All tables are set up and ready to use
4. Start the development server: `npm run dev`
5. Navigate to `http://localhost:3000` and test registration/login

## Switching to MySQL (Production)

When you're ready to deploy to production with MySQL, follow these steps:

### Step 1: Update Prisma Schema

Edit `prisma/schema.prisma` and change the datasource:

```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
```

### Step 2: Update Database-Specific Fields

For MySQL, you can add back the more specific field types:

```prisma
// In the Item model
price         Decimal?      @db.Decimal(10, 2)
dateAcquired  DateTime?     @map("date_acquired") @db.Date

// In the InsuranceInfo model  
maxCoverage   Decimal?      @map("max_coverage") @db.Decimal(12, 2)
notes         String?       @db.Text

// In the Room model
notes         String?       @db.Text

// In the Item model
notes         String?       @db.Text

// In the Notification model
message       String        @db.Text

// In the AdminLog model
action        String        @db.Text

// In the DiscountCode model
promoFee      Decimal       @map("promo_fee") @db.Decimal(10, 2)
```

### Step 3: Update Environment Variables

Replace your `.env` file with MySQL credentials:

```env
# MySQL Database for Production
DATABASE_URL="mysql://username:password@host:port/database_name"

# NextAuth Configuration
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="your-secure-production-secret-key"

# App Configuration
APP_URL="https://yourdomain.com"

# Email Configuration (Production)
SMTP_HOST="your-smtp-server.com"
SMTP_PORT=587
SMTP_USER="your-production-email@yourdomain.com"
SMTP_PASS="your-production-email-password"
SMTP_FROM="HomeContentsListPro <noreply@yourdomain.com>"
```

### Step 4: Deploy Database Schema

```bash
# Generate new Prisma client
npx prisma generate

# Push schema to MySQL database
npx prisma db push

# Or use migrations for production
npx prisma migrate deploy
```

## Database URL Examples

### SQLite (Current)
```
DATABASE_URL="file:./dev.db"
```

### MySQL (Production Options)

**Local MySQL:**
```
DATABASE_URL="mysql://root:password@localhost:3306/homecontentslistpro"
```

**PlanetScale:**
```
DATABASE_URL="mysql://username:password@host.planetscale.com/database_name?sslaccept=strict"
```

**AWS RDS:**
```
DATABASE_URL="mysql://username:password@your-rds-endpoint.amazonaws.com:3306/database_name"
```

**Google Cloud SQL:**
```
DATABASE_URL="mysql://username:password@your-cloud-sql-ip:3306/database_name"
```

**DigitalOcean Managed Database:**
```
DATABASE_URL="mysql://username:password@your-db-cluster.db.ondigitalocean.com:25060/database_name?sslmode=require"
```

## Migration Strategy

### From SQLite to MySQL

1. **Export Data (if needed):**
   ```bash
   npx prisma db seed  # If you have seed data
   ```

2. **Update Schema:**
   - Change provider to "mysql"
   - Add back MySQL-specific field types
   - Update any SQLite-specific configurations

3. **Generate and Deploy:**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Test Thoroughly:**
   - Test user registration/login
   - Test password recovery
   - Verify all database operations

## Environment Management

### Development (.env)
- Use SQLite
- Local configuration
- Test email settings optional

### Staging (.env.staging)
```env
DATABASE_URL="mysql://staging_user:staging_pass@staging-db.com:3306/homecontents_staging"
NEXTAUTH_URL="https://staging.yourdomain.com"
APP_URL="https://staging.yourdomain.com"
```

### Production (.env.production)
```env
DATABASE_URL="mysql://prod_user:secure_pass@prod-db.com:3306/homecontents_production"
NEXTAUTH_URL="https://yourdomain.com"
APP_URL="https://yourdomain.com"
```

## Security Notes

### Development
- ✅ SQLite file is gitignored
- ✅ `.env` file is gitignored
- ✅ Development secrets are safe for local use

### Production
- 🔒 Use strong, unique database passwords
- 🔒 Enable SSL for database connections
- 🔒 Use environment variables, never hardcode credentials
- 🔒 Regularly rotate database passwords
- 🔒 Limit database user permissions to minimum required

## Backup Strategy

### SQLite (Development)
```bash
# Backup
cp dev.db dev.db.backup

# Restore
cp dev.db.backup dev.db
```

### MySQL (Production)
```bash
# Backup
mysqldump -u username -p database_name > backup.sql

# Restore
mysql -u username -p database_name < backup.sql
```

## Troubleshooting

### Common Issues

**"Cannot fetch data from service"**
- Check DATABASE_URL format
- Verify database server is running
- Check network connectivity

**"Table doesn't exist"**
- Run `npx prisma db push`
- Check schema matches database

**"Connection refused"**
- Verify database server is running
- Check host/port in DATABASE_URL
- Verify firewall settings

### Verification Commands

```bash
# Check Prisma client generation
npx prisma generate

# Verify database connection
npx prisma db push --accept-data-loss

# View database in Prisma Studio
npx prisma studio
```

## Quick Reference

| Command | Purpose |
|---------|---------|
| `npx prisma generate` | Generate Prisma client |
| `npx prisma db push` | Push schema to database |
| `npx prisma studio` | Open database browser |
| `npx prisma db seed` | Run seed data |
| `npx prisma migrate dev` | Create and apply migration |
| `npx prisma migrate deploy` | Apply migrations in production |

The current SQLite setup is perfect for development and testing. When you're ready for production, simply follow the MySQL setup steps above! 