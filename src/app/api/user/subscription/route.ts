import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper function to get user by email
async function getUserByEmail(email: string) {
  return await prisma.user.findUnique({
    where: { email },
    include: {
      subscriptions: {
        where: { status: { in: ['ACTIVE', 'TRIAL'] } },
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    }
  });
}

// GET /api/user/subscription - Get current subscription info
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');
    
    if (!userEmail) {
      return NextResponse.json({ error: 'User email required' }, { status: 401 });
    }

    const user = await getUserByEmail(userEmail);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const activeSubscription = user.subscriptions[0] || null;
    const now = new Date();
    
    // Check trial status
    const isOnTrial = user.trialStartedAt && user.trialEndsAt && now < user.trialEndsAt;
    const trialExpired = user.trialStartedAt && user.trialEndsAt && now >= user.trialEndsAt;
    
    // Calculate days left in trial
    let daysLeftInTrial = null;
    if (user.trialEndsAt && isOnTrial) {
      const timeDiff = user.trialEndsAt.getTime() - now.getTime();
      daysLeftInTrial = Math.ceil(timeDiff / (1000 * 3600 * 24));
    }

    const hasActiveSubscription = activeSubscription?.status === 'ACTIVE';

    // Get usage statistics
    const houses = await prisma.house.findMany({
      where: { userId: user.id },
      include: {
        rooms: {
          include: {
            items: { select: { id: true } }
          }
        }
      }
    });

    const roomCounts: { [houseId: number]: number } = {};
    const itemCounts: { [roomId: number]: number } = {};
    let totalRooms = 0;
    let totalItems = 0;

    houses.forEach(house => {
      const roomCount = house.rooms.length;
      roomCounts[house.id] = roomCount;
      totalRooms += roomCount;
      
      house.rooms.forEach(room => {
        const itemCount = room.items.length;
        itemCounts[room.id] = itemCount;
        totalItems += itemCount;
      });
    });

    const subscriptionInfo = {
      hasActiveSubscription,
      isOnTrial: !!isOnTrial,
      trialExpired: !!trialExpired,
      currentPlan: activeSubscription?.plan || null,
      subscription: activeSubscription || null,
      requiresUpgrade: user.requiresUpgrade,
      daysLeftInTrial,
      usage: {
        houses: houses.length,
        totalRooms,
        totalItems,
        roomsByHouse: roomCounts,
        itemsByRoom: itemCounts
      },
      limits: activeSubscription?.plan ? {
        maxHouses: activeSubscription.plan.maxHouses,
        maxRoomsPerHouse: activeSubscription.plan.maxRoomsPerHouse,
        maxItemsPerRoom: activeSubscription.plan.maxItemsPerRoom
      } : null
    };

    return NextResponse.json({ subscriptionInfo });
  } catch (error) {
    console.error('Error fetching subscription info:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/user/subscription - Start trial for new user
export async function POST(request: NextRequest) {
  try {
    const { userEmail, action } = await request.json();
    
    if (!userEmail) {
      return NextResponse.json({ error: 'User email required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (action === 'start-trial') {
      if (user.hasUsedTrial) {
        return NextResponse.json({ error: 'User has already used their trial' }, { status: 400 });
      }

      // Get the trial plan
      const trialPlan = await prisma.subscriptionPlan.findFirst({
        where: { name: 'trial', isActive: true }
      });

      if (!trialPlan) {
        return NextResponse.json({ error: 'Trial plan not found' }, { status: 500 });
      }

      const trialStartDate = new Date();
      const trialEndDate = new Date(trialStartDate.getTime() + (10 * 24 * 60 * 60 * 1000)); // 10 days

      // Update user trial status
      await prisma.user.update({
        where: { id: user.id },
        data: {
          trialStartedAt: trialStartDate,
          trialEndsAt: trialEndDate,
          hasUsedTrial: true
        }
      });

      // Create trial subscription
      const subscription = await prisma.subscription.create({
        data: {
          userId: user.id,
          planId: trialPlan.id,
          status: 'TRIAL',
          trialEndsAt: trialEndDate,
          currentPeriodStart: trialStartDate,
          currentPeriodEnd: trialEndDate
        },
        include: { plan: true }
      });

      return NextResponse.json({ 
        message: 'Trial started successfully',
        subscription,
        trialEndsAt: trialEndDate
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error managing subscription:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 