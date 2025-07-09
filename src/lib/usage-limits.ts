import { prisma } from './prisma';

export interface UsageLimitResult {
  allowed: boolean;
  reason?: string;
  limit?: number;
  current?: number;
  requiresUpgrade?: boolean;
}

export interface UserLimits {
  maxHouses: number;
  maxRoomsPerHouse: number | null;
  maxItemsPerRoom: number | null;
}

/**
 * Get current user limits based on their subscription
 */
export async function getUserLimits(userEmail: string): Promise<UserLimits | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
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
      return null;
    }

    const activeSubscription = user.subscriptions[0];
    if (!activeSubscription?.plan) {
      // No active subscription - very restrictive limits
      return {
        maxHouses: 0,
        maxRoomsPerHouse: 0,
        maxItemsPerRoom: 0
      };
    }

    return {
      maxHouses: activeSubscription.plan.maxHouses,
      maxRoomsPerHouse: activeSubscription.plan.maxRoomsPerHouse,
      maxItemsPerRoom: activeSubscription.plan.maxItemsPerRoom
    };
  } catch (error) {
    console.error('Error getting user limits:', error);
    return null;
  }
}

/**
 * Check if user can add a house
 */
export async function checkHouseLimit(userEmail: string): Promise<UsageLimitResult> {
  try {
    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    });

    if (!user) {
      return { allowed: false, reason: 'User not found' };
    }

    const limits = await getUserLimits(userEmail);
    if (!limits) {
      return { allowed: false, reason: 'Unable to determine user limits' };
    }

    // Count current houses
    const currentHouseCount = await prisma.house.count({
      where: { userId: user.id }
    });

    const allowed = currentHouseCount < limits.maxHouses;

    return {
      allowed,
      reason: allowed ? undefined : `You've reached the maximum of ${limits.maxHouses} house(s) for your plan`,
      limit: limits.maxHouses,
      current: currentHouseCount,
      requiresUpgrade: !allowed
    };
  } catch (error) {
    console.error('Error checking house limit:', error);
    return { allowed: false, reason: 'Error checking limits' };
  }
}

/**
 * Check if user can add a room to a specific house
 */
export async function checkRoomLimit(userEmail: string, houseId: number): Promise<UsageLimitResult> {
  try {
    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    });

    if (!user) {
      return { allowed: false, reason: 'User not found' };
    }

    // Verify house ownership
    const house = await prisma.house.findFirst({
      where: { id: houseId, userId: user.id }
    });

    if (!house) {
      return { allowed: false, reason: 'House not found or access denied' };
    }

    const limits = await getUserLimits(userEmail);
    if (!limits) {
      return { allowed: false, reason: 'Unable to determine user limits' };
    }

    // If unlimited rooms per house
    if (limits.maxRoomsPerHouse === null) {
      return { allowed: true };
    }

    // Count current rooms in this house
    const currentRoomCount = await prisma.room.count({
      where: { houseId }
    });

    const allowed = currentRoomCount < limits.maxRoomsPerHouse;

    return {
      allowed,
      reason: allowed ? undefined : `You've reached the maximum of ${limits.maxRoomsPerHouse} room(s) per house for your plan`,
      limit: limits.maxRoomsPerHouse,
      current: currentRoomCount,
      requiresUpgrade: !allowed
    };
  } catch (error) {
    console.error('Error checking room limit:', error);
    return { allowed: false, reason: 'Error checking limits' };
  }
}

/**
 * Check if user can add an item to a specific room
 */
export async function checkItemLimit(userEmail: string, roomId: number): Promise<UsageLimitResult> {
  try {
    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    });

    if (!user) {
      return { allowed: false, reason: 'User not found' };
    }

    // Verify room ownership through house
    const room = await prisma.room.findFirst({
      where: { 
        id: roomId,
        house: { userId: user.id }
      }
    });

    if (!room) {
      return { allowed: false, reason: 'Room not found or access denied' };
    }

    const limits = await getUserLimits(userEmail);
    if (!limits) {
      return { allowed: false, reason: 'Unable to determine user limits' };
    }

    // If unlimited items per room
    if (limits.maxItemsPerRoom === null) {
      return { allowed: true };
    }

    // Count current items in this room
    const currentItemCount = await prisma.item.count({
      where: { roomId }
    });

    const allowed = currentItemCount < limits.maxItemsPerRoom;

    return {
      allowed,
      reason: allowed ? undefined : `You've reached the maximum of ${limits.maxItemsPerRoom} item(s) per room for your plan`,
      limit: limits.maxItemsPerRoom,
      current: currentItemCount,
      requiresUpgrade: !allowed
    };
  } catch (error) {
    console.error('Error checking item limit:', error);
    return { allowed: false, reason: 'Error checking limits' };
  }
}

/**
 * Mark user as requiring upgrade and create notification
 */
export async function markUserRequiresUpgrade(userEmail: string, reason: string): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    });

    if (!user) {
      console.error('User not found for upgrade marking:', userEmail);
      return;
    }

    // Update user to require upgrade
    await prisma.user.update({
      where: { id: user.id },
      data: { requiresUpgrade: true }
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId: user.id,
        message: `Upgrade required: ${reason}`,
        type: 'DASHBOARD'
      }
    });

    console.log(`User ${userEmail} marked as requiring upgrade: ${reason}`);
  } catch (error) {
    console.error('Error marking user for upgrade:', error);
  }
}

/**
 * Check if user needs to start trial (for new registrations)
 */
export async function shouldStartTrial(userEmail: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      include: {
        subscriptions: true
      }
    });

    if (!user) {
      return false;
    }

    // Start trial if:
    // 1. User hasn't used trial yet
    // 2. User has no active subscriptions
    const hasActiveSubscription = user.subscriptions.some(
      sub => ['ACTIVE', 'TRIAL'].includes(sub.status)
    );

    return !user.hasUsedTrial && !hasActiveSubscription;
  } catch (error) {
    console.error('Error checking if should start trial:', error);
    return false;
  }
}

/**
 * Analyze existing user usage and mark for upgrade if needed
 */
export async function analyzeExistingUserUsage(userEmail: string): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      include: {
        houses: {
          include: {
            rooms: {
              include: {
                items: { select: { id: true } }
              }
            }
          }
        }
      }
    });

    if (!user) {
      return;
    }

    const limits = await getUserLimits(userEmail);
    if (!limits) {
      return;
    }

    let requiresUpgrade = false;
    const reasons: string[] = [];

    // Check house limit
    if (user.houses.length > limits.maxHouses) {
      requiresUpgrade = true;
      reasons.push(`You have ${user.houses.length} houses but your plan allows ${limits.maxHouses}`);
    }

    // Check room limits
    if (limits.maxRoomsPerHouse !== null) {
      for (const house of user.houses) {
        if (house.rooms.length > limits.maxRoomsPerHouse) {
          requiresUpgrade = true;
          reasons.push(`House "${house.name || 'Unnamed'}" has ${house.rooms.length} rooms but your plan allows ${limits.maxRoomsPerHouse} per house`);
        }
      }
    }

    // Check item limits
    if (limits.maxItemsPerRoom !== null) {
      for (const house of user.houses) {
        for (const room of house.rooms) {
          if (room.items.length > limits.maxItemsPerRoom) {
            requiresUpgrade = true;
            reasons.push(`Room "${room.name}" has ${room.items.length} items but your plan allows ${limits.maxItemsPerRoom} per room`);
          }
        }
      }
    }

    if (requiresUpgrade) {
      await markUserRequiresUpgrade(userEmail, reasons.join('; '));
    }
  } catch (error) {
    console.error('Error analyzing existing user usage:', error);
  }
} 