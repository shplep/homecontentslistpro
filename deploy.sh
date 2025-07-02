#!/bin/bash

# HomeContentsListPro Deployment Script
# Run this script on your CloudPanel server

echo "🚀 Starting deployment..."

# Navigate to the correct directory
echo "📂 Navigating to app directory..."
cd /home/sp-ssh/htdocs/homecontentslistpro.com/app

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Error: Not in a git repository. Please check the directory path."
    exit 1
fi

# Pull latest changes
echo "📥 Pulling latest changes from GitHub..."
git pull origin fresh-start

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the application
echo "🔨 Building application..."
npm run build

# Restart PM2 process
echo "🔄 Restarting PM2 process..."
pm2 restart homecontentslistpro || pm2 restart all

# Clear Next.js cache (optional but recommended)
echo "🧹 Clearing caches..."
rm -rf .next/cache

echo "✅ Deployment complete!"
echo "🌐 Your app should now be updated at https://homecontentslistpro.com/app/" 