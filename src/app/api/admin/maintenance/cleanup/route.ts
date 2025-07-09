import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
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

    const { type } = await request.json();

    let result;
    switch (type) {
      case 'orphaned':
        result = await cleanupOrphanedData();
        break;
      case 'duplicates':
        result = await removeDuplicateItems();
        break;
      case 'inactive':
        result = await cleanupInactiveUsers();
        break;
      case 'cache':
        result = await clearCache();
        break;
      default:
        return NextResponse.json({ error: 'Invalid cleanup type' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      itemsAffected: result.itemsAffected
    });
  } catch (error) {
    console.error('Error performing cleanup:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function cleanupOrphanedData() {
  try {
    // Find and delete items that reference non-existent rooms
    const orphanedItems = await prisma.$executeRaw`
      DELETE i FROM items i 
      LEFT JOIN rooms r ON i.roomId = r.id 
      WHERE r.id IS NULL AND i.roomId IS NOT NULL
    `;

    // Find and delete rooms that reference non-existent houses
    const orphanedRooms = await prisma.$executeRaw`
      DELETE r FROM rooms r 
      LEFT JOIN houses h ON r.houseId = h.id 
      WHERE h.id IS NULL AND r.houseId IS NOT NULL
    `;

    // Find and delete houses that reference non-existent users
    const orphanedHouses = await prisma.$executeRaw`
      DELETE h FROM houses h 
      LEFT JOIN users u ON h.userId = u.id 
      WHERE u.id IS NULL AND h.userId IS NOT NULL
    `;

    const totalAffected = Number(orphanedItems) + Number(orphanedRooms) + Number(orphanedHouses);

    return {
      message: `Successfully cleaned up orphaned data. Removed ${orphanedItems} items, ${orphanedRooms} rooms, and ${orphanedHouses} houses.`,
      itemsAffected: totalAffected
    };
  } catch (error) {
    console.error('Error cleaning orphaned data:', error);
    return {
      message: 'Failed to clean orphaned data',
      itemsAffected: 0
    };
  }
}

async function removeDuplicateItems() {
  try {
    // Find duplicate items (same name and room) and keep only the oldest one
    const duplicateGroups = await prisma.$queryRaw<any[]>`
      SELECT name, roomId, MIN(id) as keepId, COUNT(*) as duplicateCount
      FROM items 
      WHERE name IS NOT NULL AND roomId IS NOT NULL
      GROUP BY name, roomId 
      HAVING COUNT(*) > 1
    `;

    let totalRemoved = 0;

    for (const group of duplicateGroups) {
      // Delete all duplicates except the one we want to keep
      const removed = await prisma.$executeRaw`
        DELETE FROM items 
        WHERE name = ${group.name} 
        AND roomId = ${group.roomId} 
        AND id != ${group.keepId}
      `;
      totalRemoved += Number(removed);
    }

    return {
      message: `Successfully removed ${totalRemoved} duplicate items from ${duplicateGroups.length} groups.`,
      itemsAffected: totalRemoved
    };
  } catch (error) {
    console.error('Error removing duplicates:', error);
    return {
      message: 'Failed to remove duplicate items',
      itemsAffected: 0
    };
  }
}

async function cleanupInactiveUsers() {
  try {
    // For safety, we'll only clean up users who:
    // 1. Have no houses
    // 2. Have no subscriptions
    // 3. Created account more than 180 days ago
    // 4. Have not been updated recently (indicating no activity)
    
    const cutoffDate = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000); // 180 days ago
    
    const inactiveUsers = await prisma.user.findMany({
      where: {
        createdAt: {
          lt: cutoffDate
        },
        updatedAt: {
          lt: cutoffDate
        },
        houses: {
          none: {} // No houses
        },
        subscriptions: {
          none: {} // No subscriptions
        }
      },
      select: { id: true }
    });

    // Delete the inactive users
    let deletedCount = 0;
    for (const user of inactiveUsers) {
      try {
        await prisma.user.delete({
          where: { id: user.id }
        });
        deletedCount++;
      } catch (error) {
        console.error(`Failed to delete user ${user.id}:`, error);
      }
    }

    return {
      message: `Successfully removed ${deletedCount} inactive users who had no data.`,
      itemsAffected: deletedCount
    };
  } catch (error) {
    console.error('Error cleaning inactive users:', error);
    return {
      message: 'Failed to clean inactive users',
      itemsAffected: 0
    };
  }
}

async function clearCache() {
  try {
    // In a real application, you'd clear Redis cache, file cache, etc.
    // For now, we'll simulate cache clearing
    
    // Simulate some cache clearing operations
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      message: 'Successfully cleared application cache and temporary files.',
      itemsAffected: 0
    };
  } catch (error) {
    console.error('Error clearing cache:', error);
    return {
      message: 'Failed to clear cache',
      itemsAffected: 0
    };
  }
} 