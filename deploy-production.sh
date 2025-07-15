#!/bin/bash

# Production Deployment Script for HomeContentsListPro V2
# This script handles database migrations and application deployment

echo "🚀 Starting production deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root directory."
    exit 1
fi

# Step 1: Pull latest changes
print_status "Pulling latest changes from GitHub..."
# Get current branch name
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
print_status "Current branch: $CURRENT_BRANCH"

# Configure git to handle divergent branches
git config pull.ff only 2>/dev/null || true
git fetch origin
git reset --hard origin/$CURRENT_BRANCH
if [ $? -ne 0 ]; then
    print_error "Failed to update to latest changes from origin/$CURRENT_BRANCH"
    exit 1
fi

# Step 2: Install dependencies
print_status "Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    print_error "Failed to install dependencies"
    exit 1
fi

# Step 3: Generate Prisma client
print_status "Generating Prisma client..."
npx prisma generate
if [ $? -ne 0 ]; then
    print_error "Failed to generate Prisma client"
    exit 1
fi

# Step 4: Backup current database
print_status "Creating database backup..."
BACKUP_DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="backup_production_${BACKUP_DATE}.sql"

# Create backups directory if it doesn't exist
mkdir -p backups

# Backup database (adjust this command based on your database setup)
print_warning "Please manually backup your database before proceeding!"
print_warning "Example MySQL backup command:"
print_warning "mysqldump -u username -p database_name > backups/${BACKUP_FILE}"
echo ""
read -p "Have you backed up your database? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_error "Database backup is required before proceeding. Exiting."
    exit 1
fi

# Step 5: Run database migrations
print_status "Running database migrations..."
npx prisma db push
if [ $? -ne 0 ]; then
    print_error "Database migration failed"
    print_error "Please check your database connection and try again"
    exit 1
fi

# Step 6: Seed initial data if needed
print_status "Checking for initial data setup..."
if [ -f "prisma/seed.js" ] || [ -f "prisma/seed.ts" ]; then
    print_status "Running database seed..."
    npx prisma db seed
fi

# Step 7: Build the application
print_status "Building the application..."
npm run build
if [ $? -ne 0 ]; then
    print_error "Build failed"
    exit 1
fi

# Step 8: Restart the application
print_status "Restarting the application..."

# Check if PM2 is available
if command -v pm2 &> /dev/null; then
    print_status "Restarting with PM2..."
    pm2 restart all
    pm2 save
elif command -v systemctl &> /dev/null; then
    print_status "Restarting with systemctl..."
    sudo systemctl restart your-app-name
else
    print_warning "No process manager detected. Please manually restart your application."
    print_warning "You may need to run: npm start or your custom start command"
fi

# Step 9: Health check
print_status "Performing health check..."
sleep 5

# Check if the application is responding
if command -v curl &> /dev/null; then
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ || echo "000")
    if [ "$HTTP_STATUS" = "200" ]; then
        print_status "✅ Application is running successfully!"
    else
        print_warning "⚠️  Application may not be responding properly (HTTP $HTTP_STATUS)"
    fi
else
    print_warning "curl not available for health check. Please verify manually."
fi

echo ""
print_status "🎉 Deployment completed!"
print_status "Please verify the following:"
print_status "1. Admin dashboard is accessible at /admin/dashboard"
print_status "2. Database tables have been created successfully"
print_status "3. All admin API endpoints are working"
print_status "4. User authentication is functioning properly"
echo ""
print_warning "If you encounter any issues, check the application logs and database connectivity." 