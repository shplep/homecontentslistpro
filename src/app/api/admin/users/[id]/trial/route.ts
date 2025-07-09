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

// POST /api/admin/users/[id]/trial - Grant or extend a trial for a user
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
    const { days } = await request.json();

    if (!days || days <= 0) {
      return NextResponse.json({ error: 'Valid number of days is required' }, { status: 400 });
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        email: true, 
        trialStartedAt: true, 
        trialEndsAt: true, 
        hasUsedTrial: true 
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const now = new Date();
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + days);

    // Update user trial information
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        trialStartedAt: user.trialStartedAt || now, // Keep existing start date if already started
        trialEndsAt: trialEnd,
        hasUsedTrial: true
      },
      select: {
        id: true,
        email: true,
        name: true,
        trialStartedAt: true,
        trialEndsAt: true,
        hasUsedTrial: true
      }
    });

    // Find the trial plan (usually the first/free plan)
    const trialPlan = await prisma.subscriptionPlan.findFirst({
      where: {
        name: 'trial',
        isActive: true
      }
    });

    if (!trialPlan) {
      return NextResponse.json({ error: 'Trial plan not found' }, { status: 400 });
    }

    // Check if user has an existing active trial subscription
    const existingTrialSubscription = await prisma.subscription.findFirst({
      where: {
        userId: userId,
        planId: trialPlan.id,
        status: 'TRIAL'
      }
    });

    let subscription;
    
    if (existingTrialSubscription) {
      // Update existing trial subscription
      subscription = await prisma.subscription.update({
        where: { id: existingTrialSubscription.id },
        data: {
          trialEndsAt: trialEnd,
          currentPeriodEnd: trialEnd
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
    } else {
      // Cancel any existing active subscriptions (trial takes precedence)
      await prisma.subscription.updateMany({
        where: {
          userId: userId,
          status: {
            in: ['ACTIVE', 'TRIAL']
          }
        },
        data: {
          status: 'CANCELED'
        }
      });

      // Create new trial subscription
      subscription = await prisma.subscription.create({
        data: {
          userId: userId,
          planId: trialPlan.id,
          status: 'TRIAL',
          trialEndsAt: trialEnd,
          currentPeriodStart: now,
          currentPeriodEnd: trialEnd
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
    }

    return NextResponse.json({ 
      message: `Trial ${existingTrialSubscription ? 'extended' : 'granted'} successfully`,
      user: updatedUser,
      subscription: subscription,
      trialDays: days
    });
  } catch (error) {
    console.error('Error granting trial:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 