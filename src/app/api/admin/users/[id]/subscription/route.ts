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

// POST /api/admin/users/[id]/subscription - Assign a plan to a user
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { isAdmin, error } = await checkAdminAccess(request);
    
    if (!isAdmin) {
      return NextResponse.json({ error: error || 'Admin access required' }, { status: 403 });
    }

    const userId = parseInt(params.id);
    const { planId } = await request.json();

    if (!planId) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify plan exists
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
      select: { id: true, name: true, displayName: true, isActive: true }
    });

    if (!plan || !plan.isActive) {
      return NextResponse.json({ error: 'Plan not found or inactive' }, { status: 400 });
    }

    // Cancel any existing active subscriptions
    await prisma.subscription.updateMany({
      where: {
        userId: userId,
        status: {
          in: ['ACTIVE', 'TRIAL']
        }
      },
      data: {
        status: 'CANCELED',
        cancelAtPeriodEnd: true
      }
    });

    // Create new subscription
    const startDate = new Date();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1); // 1 year subscription

    const subscription = await prisma.subscription.create({
      data: {
        userId: userId,
        planId: planId,
        status: 'ACTIVE',
        currentPeriodStart: startDate,
        currentPeriodEnd: endDate
      },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            displayName: true,
            price: true
          }
        }
      }
    });

    return NextResponse.json({ 
      message: 'Plan assigned successfully',
      subscription
    });
  } catch (error) {
    console.error('Error assigning plan:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 