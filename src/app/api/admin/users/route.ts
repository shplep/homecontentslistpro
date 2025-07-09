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

// GET /api/admin/users - Get all users with stats
export async function GET(request: NextRequest) {
  try {
    const { isAdmin, error } = await checkAdminAccess(request);
    
    if (!isAdmin) {
      return NextResponse.json({ error: error || 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const includeSubscriptions = searchParams.get('includeSubscriptions') === 'true';

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            houses: true,
            subscriptions: true
          }
        },
        ...(includeSubscriptions && {
          subscriptions: {
            select: {
              id: true,
              status: true,
              stripeSubscriptionId: true,
              currentPeriodStart: true,
              currentPeriodEnd: true,
              plan: {
                select: {
                  id: true,
                  name: true,
                  displayName: true,
                  price: true
                }
              }
            },
            orderBy: {
              createdAt: 'desc'
            }
          }
        })
      }
    });

    // Remove password from response
    const safeUsers = users.map(user => {
      const { password, ...safeUser } = user;
      return safeUser;
    });

    return NextResponse.json({ users: safeUsers });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 