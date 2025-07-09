import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

// GET /api/admin/backup - Get backup history and status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');
    
    if (!userEmail) {
      return NextResponse.json({ error: 'User email required' }, { status: 401 });
    }

    // Verify admin user
    const adminUser = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { id: true, role: true }
    });

    if (!adminUser || adminUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get backup directory
    const backupDir = path.join(process.cwd(), 'backups');
    
    // Ensure backup directory exists
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Read backup files
    const backupFiles = fs.readdirSync(backupDir)
      .filter(file => file.endsWith('.sql') || file.endsWith('.db'))
      .map(file => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        };
      })
      .sort((a, b) => b.created.getTime() - a.created.getTime());

    return NextResponse.json({
      backups: backupFiles,
      backupDirectory: backupDir,
      totalBackups: backupFiles.length,
      totalSize: backupFiles.reduce((sum, file) => sum + file.size, 0)
    });
    
  } catch (error) {
    console.error('Error fetching backup info:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/backup - Create a new backup
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');
    
    if (!userEmail) {
      return NextResponse.json({ error: 'User email required' }, { status: 401 });
    }

    // Verify admin user
    const adminUser = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { id: true, role: true }
    });

    if (!adminUser || adminUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get database URL from environment
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      return NextResponse.json({ error: 'Database URL not configured' }, { status: 500 });
    }

    // Parse database URL to get connection details
    const url = new URL(databaseUrl);
    const dbHost = url.hostname;
    const dbPort = url.port || '3306';
    const dbName = url.pathname.slice(1); // Remove leading slash
    const dbUser = url.username;
    const dbPassword = url.password;

    // Create backup directory if it doesn't exist
    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Generate backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilename = `backup_${dbName}_${timestamp}.sql`;
    const backupPath = path.join(backupDir, backupFilename);

    try {
      // Create MySQL dump command
      const mysqldumpCmd = `mysqldump -h ${dbHost} -P ${dbPort} -u ${dbUser} -p${dbPassword} ${dbName}`;
      
      // Execute backup command
      const { stdout, stderr } = await execAsync(mysqldumpCmd);
      
      if (stderr && !stderr.includes('Warning')) {
        throw new Error(`Backup failed: ${stderr}`);
      }

      // Write backup to file
      fs.writeFileSync(backupPath, stdout);

      // Get file stats
      const stats = fs.statSync(backupPath);

      return NextResponse.json({
        success: true,
        message: 'Backup created successfully',
        backup: {
          filename: backupFilename,
          path: backupPath,
          size: stats.size,
          created: stats.birthtime
        }
      });

    } catch (backupError) {
      // If mysqldump fails, try alternative backup method for development
      console.warn('mysqldump failed, attempting alternative backup method:', backupError);
      
      try {
        // For development with SQLite or when mysqldump is not available
        // Create a simple SQL export using Prisma
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fallbackFilename = `backup_prisma_${timestamp}.sql`;
        const fallbackPath = path.join(backupDir, fallbackFilename);

        // Get all table data (simplified backup)
        const users = await prisma.user.findMany();
        const houses = await prisma.house.findMany();
        const rooms = await prisma.room.findMany();
        const items = await prisma.item.findMany();
        const subscriptions = await prisma.subscription.findMany();
        const subscriptionPlans = await prisma.subscriptionPlan.findMany();

        const backupData = {
          timestamp: new Date().toISOString(),
          tables: {
            users: users.length,
            houses: houses.length,
            rooms: rooms.length,
            items: items.length,
            subscriptions: subscriptions.length,
            subscriptionPlans: subscriptionPlans.length
          },
          data: {
            users,
            houses,
            rooms,
            items,
            subscriptions,
            subscriptionPlans
          }
        };

        const sqlContent = `-- HomeContentsListPro Database Backup
-- Generated: ${new Date().toISOString()}
-- Method: Prisma Export (Development)

-- Statistics:
-- Users: ${users.length}
-- Houses: ${houses.length}
-- Rooms: ${rooms.length}
-- Items: ${items.length}
-- Subscriptions: ${subscriptions.length}
-- Subscription Plans: ${subscriptionPlans.length}

-- Data exported as JSON for development backup
-- This backup can be used for reference but may require manual restoration

${JSON.stringify(backupData, null, 2)}
`;

        fs.writeFileSync(fallbackPath, sqlContent);
        const stats = fs.statSync(fallbackPath);

        return NextResponse.json({
          success: true,
          message: 'Development backup created successfully',
          backup: {
            filename: fallbackFilename,
            path: fallbackPath,
            size: stats.size,
            created: stats.birthtime,
            method: 'prisma-export'
          }
        });

      } catch (fallbackError) {
        console.error('Fallback backup method also failed:', fallbackError);
        return NextResponse.json({ 
          error: 'Backup failed with both methods', 
          details: fallbackError instanceof Error ? fallbackError.message : 'Unknown error'
        }, { status: 500 });
      }
    }
    
  } catch (error) {
    console.error('Error creating backup:', error);
    return NextResponse.json({ 
      error: 'Failed to create backup', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE /api/admin/backup - Delete old backups
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');
    const filename = searchParams.get('filename');
    const olderThan = searchParams.get('olderThan'); // days
    
    if (!userEmail) {
      return NextResponse.json({ error: 'User email required' }, { status: 401 });
    }

    // Verify admin user
    const adminUser = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { id: true, role: true }
    });

    if (!adminUser || adminUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const backupDir = path.join(process.cwd(), 'backups');
    
    if (!fs.existsSync(backupDir)) {
      return NextResponse.json({ error: 'Backup directory not found' }, { status: 404 });
    }

    let deletedFiles = 0;

    if (filename) {
      // Delete specific file
      const filePath = path.join(backupDir, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        deletedFiles = 1;
      } else {
        return NextResponse.json({ error: 'Backup file not found' }, { status: 404 });
      }
    } else if (olderThan) {
      // Delete files older than specified days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - parseInt(olderThan));

      const files = fs.readdirSync(backupDir);
      for (const file of files) {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.birthtime < cutoffDate) {
          fs.unlinkSync(filePath);
          deletedFiles++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Deleted ${deletedFiles} backup file(s)`,
      deletedCount: deletedFiles
    });
    
  } catch (error) {
    console.error('Error deleting backups:', error);
    return NextResponse.json({ error: 'Failed to delete backups' }, { status: 500 });
  }
} 