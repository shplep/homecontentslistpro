import { prisma } from './prisma';

// Subscription status types
export type SubscriptionInfo = {
  hasActiveSubscription: boolean;
  isOnTrial: boolean;
  trialExpired: boolean;
  currentPlan: any | null;
  subscription: any | null;
  requiresUpgrade: boolean;
  daysLeftInTrial: number | null;
};

// Usage limits type
export type UsageLimits = {
  maxHouses: number;
  maxRoomsPerHouse: number | null;
  maxItemsPerRoom: number | null;
};

// Usage statistics type
export type UsageStats = {
  houseCount: number;
  roomCounts: { [houseId: number]: number };
  itemCounts: { [roomId: number]: number };
};

/**
 * Get current subscription information for a user
 */
export async function getUserSubscriptionInfo(userId: number): Promise<SubscriptionInfo> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscriptions: {
          where: { status: { in: ['ACTIVE', 'TRIAL'] } },
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!user) {
      throw new Error('User not found');
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

    return {
      hasActiveSubscription,
      isOnTrial: !!isOnTrial,
      trialExpired: !!trialExpired,
      currentPlan: activeSubscription?.plan || null,
      subscription: activeSubscription || null,
      requiresUpgrade: user.requiresUpgrade,
      daysLeftInTrial
    };
  } catch (error) {
    console.error('Error getting user subscription info:', error);
    throw error;
  }
}

/**
 * Start trial for a new user
 */
export async function startTrialForUser(userId: number): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.hasUsedTrial) {
      throw new Error('User has already used their trial');
    }

    // Get the trial plan
    const trialPlan = await prisma.subscriptionPlan.findFirst({
      where: { name: 'trial', isActive: true }
    });

    if (!trialPlan) {
      throw new Error('Trial plan not found');
    }

    const trialStartDate = new Date();
    const trialEndDate = new Date(trialStartDate.getTime() + (10 * 24 * 60 * 60 * 1000)); // 10 days

    // Update user trial status
    await prisma.user.update({
      where: { id: userId },
      data: {
        trialStartedAt: trialStartDate,
        trialEndsAt: trialEndDate,
        hasUsedTrial: true
      }
    });

    // Create trial subscription
    await prisma.subscription.create({
      data: {
        userId,
        planId: trialPlan.id,
        status: 'TRIAL',
        trialEndsAt: trialEndDate,
        currentPeriodStart: trialStartDate,
        currentPeriodEnd: trialEndDate
      }
    });

    console.log(`Trial started for user ${userId}, expires: ${trialEndDate}`);
  } catch (error) {
    console.error('Error starting trial for user:', error);
    throw error;
  }
}

/**
 * Get usage limits for a user based on their current subscription
 */
export async function getUserUsageLimits(userId: number): Promise<UsageLimits> {
  try {
    const subscriptionInfo = await getUserSubscriptionInfo(userId);
    
    // If user has an active subscription or is on trial, use plan limits
    if (subscriptionInfo.currentPlan) {
      return {
        maxHouses: subscriptionInfo.currentPlan.maxHouses,
        maxRoomsPerHouse: subscriptionInfo.currentPlan.maxRoomsPerHouse,
        maxItemsPerRoom: subscriptionInfo.currentPlan.maxItemsPerRoom
      };
    }

    // Default limits for users without subscription (should not happen in practice)
    return {
      maxHouses: 0,
      maxRoomsPerHouse: 0,
      maxItemsPerRoom: 0
    };
  } catch (error) {
    console.error('Error getting user usage limits:', error);
    throw error;
  }
}

/**
 * Get current usage statistics for a user
 */
export async function getUserUsageStats(userId: number): Promise<UsageStats> {
  try {
    const houses = await prisma.house.findMany({
      where: { userId },
      include: {
        rooms: {
          include: {
            items: {
              select: { id: true }
            }
          }
        }
      }
    });

    const roomCounts: { [houseId: number]: number } = {};
    const itemCounts: { [roomId: number]: number } = {};

    houses.forEach(house => {
      roomCounts[house.id] = house.rooms.length;
      
      house.rooms.forEach(room => {
        itemCounts[room.id] = room.items.length;
      });
    });

    return {
      houseCount: houses.length,
      roomCounts,
      itemCounts
    };
  } catch (error) {
    console.error('Error getting user usage stats:', error);
    throw error;
  }
}

/**
 * Check if user can perform an action based on their limits
 */
export async function checkUsageLimit(
  userId: number, 
  action: 'house' | 'room' | 'item',
  houseId?: number,
  roomId?: number
): Promise<{ allowed: boolean; reason?: string; limit?: number; current?: number }> {
  try {
    const [limits, stats] = await Promise.all([
      getUserUsageLimits(userId),
      getUserUsageStats(userId)
    ]);

    switch (action) {
      case 'house':
        const canAddHouse = stats.houseCount < limits.maxHouses;
        return {
          allowed: canAddHouse,
          reason: canAddHouse ? undefined : `You've reached the maximum of ${limits.maxHouses} house(s) for your plan`,
          limit: limits.maxHouses,
          current: stats.houseCount
        };

      case 'room':
        if (!houseId) {
          throw new Error('House ID required for room limit check');
        }
        
        if (limits.maxRoomsPerHouse === null) {
          return { allowed: true };
        }

        const currentRoomCount = stats.roomCounts[houseId] || 0;
        const canAddRoom = currentRoomCount < limits.maxRoomsPerHouse;
        return {
          allowed: canAddRoom,
          reason: canAddRoom ? undefined : `You've reached the maximum of ${limits.maxRoomsPerHouse} room(s) per house for your plan`,
          limit: limits.maxRoomsPerHouse,
          current: currentRoomCount
        };

      case 'item':
        if (!roomId) {
          throw new Error('Room ID required for item limit check');
        }
        
        if (limits.maxItemsPerRoom === null) {
          return { allowed: true };
        }

        const currentItemCount = stats.itemCounts[roomId] || 0;
        const canAddItem = currentItemCount < limits.maxItemsPerRoom;
        return {
          allowed: canAddItem,
          reason: canAddItem ? undefined : `You've reached the maximum of ${limits.maxItemsPerRoom} item(s) per room for your plan`,
          limit: limits.maxItemsPerRoom,
          current: currentItemCount
        };

      default:
        throw new Error('Invalid action type');
    }
  } catch (error) {
    console.error('Error checking usage limit:', error);
    throw error;
  }
}

/**
 * Mark user as requiring upgrade (used when they exceed limits)
 */
export async function markUserRequiresUpgrade(userId: number, reason?: string): Promise<void> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { requiresUpgrade: true }
    });

    // Optionally create a notification
    if (reason) {
      await prisma.notification.create({
        data: {
          userId,
          message: `Upgrade required: ${reason}`,
          type: 'DASHBOARD'
        }
      });
    }

    console.log(`User ${userId} marked as requiring upgrade: ${reason || 'No reason provided'}`);
  } catch (error) {
    console.error('Error marking user as requiring upgrade:', error);
    throw error;
  }
} 