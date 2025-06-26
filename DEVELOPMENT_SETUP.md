# HomeContentsListPro - Development Setup Guide

## 🚀 Quick Start (For Returning to Development)

### Daily Startup Commands
```bash
# 1. Navigate to project directory
cd /Users/shawnplep/WebProjects/HomeContentsListProV2

# 2. Start the development server
npm run dev

# 3. Open in browser: http://localhost:3000
```

## 📋 First-Time Setup Instructions

### Prerequisites
- **Node.js** (v18 or higher)
- **npm** (comes with Node.js)
- **Git** (for version control)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Environment Configuration
Create a `.env` file in the root directory:
```bash
# Database Configuration (SQLite for development)
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

### Step 3: Database Setup
```bash
# Generate Prisma client
npx prisma generate

# Create and setup database
npx prisma db push

# Optional: View database in browser
npx prisma studio
```

### Step 4: Start Development
```bash
npm run dev
```

## 🛠️ Development Commands

### Primary Commands
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Code Quality Commands
```bash
# Run linting
npm run lint

# Fix linting issues automatically
npm run lint:fix

# Format code with Prettier
npm run format

# Check formatting without fixing
npm run format:check

# TypeScript type checking
npm run type-check

# Run all checks at once
npm run check-all
```

### Database Commands
```bash
# Generate Prisma client (after schema changes)
npx prisma generate

# Apply schema changes to database
npx prisma db push

# Reset database (WARNING: deletes all data)
npx prisma db push --force-reset

# Open database GUI
npx prisma studio

# View current database schema
npx prisma db pull
```

## 📁 Project Structure Overview

```
HomeContentsListProV2/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/               # API routes
│   │   ├── auth/              # Authentication pages
│   │   ├── dashboard/         # Main app dashboard
│   │   └── page.tsx           # Home page
│   ├── components/            # Reusable components
│   ├── lib/                   # Utility libraries
│   └── types/                 # TypeScript type definitions
├── prisma/
│   └── schema.prisma          # Database schema
├── tasks.md                   # Development task list
└── package.json               # Dependencies and scripts
```

## 🔧 Current Development Status

### ✅ Completed Features
- User authentication (register/login/password recovery)
- User dashboard
- House management (add/edit/delete houses)
- Room management (add/edit/delete rooms)
- Profile management

### 🚧 Next Tasks (from tasks.md)
- [ ] Item Management Functionality
- [ ] Item Import/Export
- [ ] Admin Interface
- [ ] Subscription Management
- [ ] Email Notifications

## 🌐 Application URLs

### Development URLs
- **Main App**: http://localhost:3000
- **Login**: http://localhost:3000/auth/login
- **Register**: http://localhost:3000/auth/register
- **Dashboard**: http://localhost:3000/dashboard
- **Database GUI**: http://localhost:5555 (when running `npx prisma studio`)

## 🐛 Troubleshooting

### Common Issues

#### 1. Database Connection Issues
```bash
# Reset and recreate database
rm prisma/dev.db
npx prisma db push
```

#### 2. Node Modules Issues
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

#### 3. Prisma Client Issues
```bash
# Regenerate Prisma client
npx prisma generate
```

#### 4. Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

#### 5. TypeScript Errors
```bash
# Check for type issues
npm run type-check
```

### Authentication Testing
1. Go to: http://localhost:3000/auth/register
2. Create a test account
3. Login at: http://localhost:3000/auth/login
4. Access dashboard: http://localhost:3000/dashboard

## 📝 Development Workflow

### Starting a Coding Session
1. Open terminal and navigate to project:
   ```bash
   cd /Users/shawnplep/WebProjects/HomeContentsListProV2
   ```

2. Check git status:
   ```bash
   git status
   git pull origin master
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

4. Check current tasks:
   ```bash
   cat tasks.md
   ```

### Before Committing Changes
```bash
# Run all code quality checks
npm run check-all

# Add and commit changes
git add .
git commit -m "Your commit message"
git push origin master
```

## 🔐 Environment Variables Reference

### Required for Basic Functionality
- `DATABASE_URL`: SQLite database file path
- `NEXTAUTH_URL`: App URL for authentication
- `NEXTAUTH_SECRET`: Secret key for NextAuth

### Optional (for full functionality)
- `SMTP_*`: Email configuration for password recovery
- `APP_URL`: Base URL for the application

## 📚 Additional Resources

- **Next.js Documentation**: https://nextjs.org/docs
- **Prisma Documentation**: https://www.prisma.io/docs
- **NextAuth.js Documentation**: https://next-auth.js.org
- **Project Tasks**: Check `tasks.md` for current development status

## 🎯 Quick Commands Cheat Sheet

```bash
# Most common commands for daily development
npm run dev              # Start development
npm run lint:fix         # Fix code issues
npm run format           # Format code
npx prisma studio        # View database
git status               # Check git status
```

---

**💡 Tip**: Bookmark this file and refer to it each time you start a coding session! 