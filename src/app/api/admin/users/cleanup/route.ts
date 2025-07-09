import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper function to check if user is admin
async function checkAdminAccess(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');
    
    if (!userEmail) {
      return { isAdmin: false, error: 'User email required' };
    }

    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { role: true }
    });

    return { 
      isAdmin: user?.role === 'ADMIN',
      error: user ? null : 'User not found'
    };
  } catch (error) {
    return { isAdmin: false, error: 'Authentication error' };
  }
}

// DELETE /api/admin/users/cleanup - Clean up old canceled subscriptions
export async function DELETE(request: NextRequest) {
  try {
    const { isAdmin, error } = await checkAdminAccess(request);
    
    if (!isAdmin) {
      return NextResponse.json({ error: error || 'Admin access required' }, { status: 403 });
    }

    // Get cutoff date (keep subscriptions from last 30 days)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);

    // Delete old canceled subscriptions
    const deletedSubscriptions = await prisma.subscription.deleteMany({
      where: {
        status: 'CANCELED',
        updatedAt: {
          lt: cutoffDate
        }
      }
    });

    return NextResponse.json({ 
      message: 'Cleanup completed successfully',
      deletedCount: deletedSubscriptions.count
    });
  } catch (error) {
    console.error('Error cleaning up subscriptions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 