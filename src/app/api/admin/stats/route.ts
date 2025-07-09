import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/admin/stats - Get system-wide statistics for admin dashboard
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

    // Get all stats in parallel for better performance
    const [
      totalUsers,
      totalActiveSubscriptions,
      totalPlans,
      totalHouses,
      totalRooms,
      totalItems,
      totalRevenue
    ] = await Promise.all([
      // Total users
      prisma.user.count(),
      
      // Active subscriptions (ACTIVE or TRIAL status)
      prisma.subscription.count({
        where: {
          status: {
            in: ['ACTIVE', 'TRIAL']
          }
        }
      }),
      
      // Total subscription plans
      prisma.subscriptionPlan.count({
        where: {
          isActive: true
        }
      }),
      
      // Total houses
      prisma.house.count(),
      
      // Total rooms
      prisma.room.count(),
      
      // Total items
      prisma.item.count(),
      
      // Calculate monthly revenue from active subscriptions
      prisma.subscription.findMany({
        where: {
          status: 'ACTIVE'
        },
        include: {
          plan: {
            select: {
              price: true
            }
          }
        }
      })
    ]);

    // Calculate total monthly revenue (convert annual to monthly)
    const monthlyRevenue = totalRevenue.reduce((sum, subscription) => {
      if (subscription.plan?.price) {
        // Assuming prices are stored as annual amounts, divide by 12 for monthly
        return sum + (subscription.plan.price / 12);
      }
      return sum;
    }, 0);

    return NextResponse.json({
      totalUsers,
      totalSubscriptions: totalActiveSubscriptions,
      totalPlans,
      totalRevenue: Math.round(monthlyRevenue), // Round to nearest cent
      additionalStats: {
        totalHouses,
        totalRooms,
        totalItems
      }
    });
    
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 