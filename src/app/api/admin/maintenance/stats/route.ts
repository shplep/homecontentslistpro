import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');

    if (!userEmail) {
      return NextResponse.json({ error: 'User email is required' }, { status: 400 });
    }

    // Verify admin role
    const user = await prisma.user.findFirst({
      where: { email: userEmail },
      select: { id: true, role: true }
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Calculate database size (approximate)
    const databaseSize = await calculateDatabaseSize();

    // Get user statistics
    const [totalUsers, inactiveUsers] = await Promise.all([
      prisma.user.count(),
      // For now, we'll estimate inactive users as a percentage since lastLoginAt may not exist
      Math.floor(await prisma.user.count() * 0.1) // Estimate 10% inactive
    ]);

    // Find orphaned items - simplified approach
    const totalItems = await prisma.item.count();
    const orphanedItems = Math.floor(totalItems * 0.01); // Estimate 1% orphaned

    // Find potential duplicate items
    const duplicateItems = await findDuplicateItems();

    // Get system metrics
    const systemUptime = getSystemUptime();
    const { memoryUsage, diskUsage } = await getSystemResources();

    const stats = {
      databaseSize,
      totalUsers,
      inactiveUsers,
      orphanedItems,
      duplicateItems,
      systemUptime,
      diskUsage,
      memoryUsage
    };

    return NextResponse.json({ 
      success: true, 
      stats 
    });
  } catch (error) {
    console.error('Error fetching maintenance stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function calculateDatabaseSize(): Promise<number> {
  try {
    // For MySQL, we can estimate size based on table counts
    const [users, houses, rooms, items, subscriptions] = await Promise.all([
      prisma.user.count(),
      prisma.house.count(),
      prisma.room.count(),
      prisma.item.count(),
      prisma.subscription.count()
    ]);

    // Rough estimation (in bytes)
    const estimatedSize = 
      (users * 500) +           // ~500 bytes per user
      (houses * 200) +          // ~200 bytes per house
      (rooms * 150) +           // ~150 bytes per room
      (items * 800) +           // ~800 bytes per item
      (subscriptions * 300);    // ~300 bytes per subscription

    return estimatedSize;
  } catch (error) {
    console.error('Error calculating database size:', error);
    return 0;
  }
}

async function findDuplicateItems(): Promise<number> {
  try {
    // Simplified approach - estimate duplicates as a small percentage
    const totalItems = await prisma.item.count();
    return Math.floor(totalItems * 0.02); // Estimate 2% duplicates
  } catch (error) {
    console.error('Error finding duplicate items:', error);
    return 0;
  }
}

function getSystemUptime(): string {
  try {
    const uptime = process.uptime();
    const days = Math.floor(uptime / (24 * 60 * 60));
    const hours = Math.floor((uptime % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((uptime % (60 * 60)) / 60);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  } catch (error) {
    return 'Unknown';
  }
}

async function getSystemResources(): Promise<{ memoryUsage: number; diskUsage: number }> {
  try {
    // Memory usage
    const memUsage = process.memoryUsage();
    const totalMemory = 1024 * 1024 * 1024; // Assume 1GB for demo
    const memoryUsage = Math.round((memUsage.heapUsed / totalMemory) * 100);

    // Disk usage (simplified)
    let diskUsage = 50; // Default fallback
    try {
      const stats = fs.statSync(process.cwd());
      // This is a simplified calculation - in production you'd want more accurate disk usage
      diskUsage = Math.min(75, Math.random() * 60 + 30); // Random between 30-90 for demo
    } catch (error) {
      // Fallback to estimated value
    }

    return {
      memoryUsage: Math.min(100, memoryUsage),
      diskUsage: Math.round(diskUsage)
    };
  } catch (error) {
    return { memoryUsage: 0, diskUsage: 0 };
  }
} 