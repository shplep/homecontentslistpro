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

// GET /api/admin/subscription-plans/[id] - Get a specific subscription plan
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { isAdmin, error } = await checkAdminAccess(request);
    
    if (!isAdmin) {
      return NextResponse.json({ error: error || 'Admin access required' }, { status: 403 });
    }

    const planId = parseInt(params.id);
    
    if (isNaN(planId)) {
      return NextResponse.json({ error: 'Invalid plan ID' }, { status: 400 });
    }

    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
      include: {
        subscriptions: {
          select: { id: true, status: true, user: { select: { email: true, name: true } } }
        }
      }
    });

    if (!plan) {
      return NextResponse.json({ error: 'Subscription plan not found' }, { status: 404 });
    }

    const planWithStats = {
      ...plan,
      subscriberCount: plan.subscriptions.length,
      activeSubscriberCount: plan.subscriptions.filter((sub: any) => sub.status === 'ACTIVE').length
    };

    return NextResponse.json({ plan: planWithStats });
  } catch (error) {
    console.error('Error fetching subscription plan:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/admin/subscription-plans/[id] - Update a subscription plan
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { isAdmin, error } = await checkAdminAccess(request);
    
    if (!isAdmin) {
      return NextResponse.json({ error: error || 'Admin access required' }, { status: 403 });
    }

    const planId = parseInt(params.id);
    
    if (isNaN(planId)) {
      return NextResponse.json({ error: 'Invalid plan ID' }, { status: 400 });
    }

    const body = await request.json();
    const {
      name,
      displayName,
      description,
      price,
      stripeProductId,
      stripePriceId,
      maxHouses,
      maxRoomsPerHouse,
      maxItemsPerRoom,
      isActive,
      allowTrial,
      sortOrder
    } = body;

    // Check if plan exists
    const existingPlan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId }
    });

    if (!existingPlan) {
      return NextResponse.json({ error: 'Subscription plan not found' }, { status: 404 });
    }

    // Check if name is taken by another plan
    if (name && name !== existingPlan.name) {
      const nameConflict = await prisma.subscriptionPlan.findUnique({
        where: { name }
      });

      if (nameConflict) {
        return NextResponse.json({ 
          error: 'A plan with this name already exists' 
        }, { status: 409 });
      }
    }

    const updatedPlan = await prisma.subscriptionPlan.update({
      where: { id: planId },
      data: {
        ...(name && { name }),
        ...(displayName && { displayName }),
        ...(description !== undefined && { description: description || null }),
        ...(price !== undefined && { price: parseInt(price) }),
        ...(stripeProductId !== undefined && { stripeProductId: stripeProductId || null }),
        ...(stripePriceId !== undefined && { stripePriceId: stripePriceId || null }),
        ...(maxHouses !== undefined && { maxHouses: parseInt(maxHouses) }),
        ...(maxRoomsPerHouse !== undefined && { 
          maxRoomsPerHouse: maxRoomsPerHouse ? parseInt(maxRoomsPerHouse) : null 
        }),
        ...(maxItemsPerRoom !== undefined && { 
          maxItemsPerRoom: maxItemsPerRoom ? parseInt(maxItemsPerRoom) : null 
        }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
        ...(allowTrial !== undefined && { allowTrial: Boolean(allowTrial) }),
        ...(sortOrder !== undefined && { sortOrder: parseInt(sortOrder) })
      }
    });

    return NextResponse.json({ plan: updatedPlan });
  } catch (error) {
    console.error('Error updating subscription plan:', error);
    return NextResponse.json({ error: 'Failed to update subscription plan' }, { status: 500 });
  }
}

// DELETE /api/admin/subscription-plans/[id] - Delete a subscription plan
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { isAdmin, error } = await checkAdminAccess(request);
    
    if (!isAdmin) {
      return NextResponse.json({ error: error || 'Admin access required' }, { status: 403 });
    }

    const planId = parseInt(params.id);
    
    if (isNaN(planId)) {
      return NextResponse.json({ error: 'Invalid plan ID' }, { status: 400 });
    }

    // Check if plan exists and has active subscriptions
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
      include: {
        subscriptions: {
          where: { status: { in: ['ACTIVE', 'TRIAL'] } }
        }
      }
    });

    if (!plan) {
      return NextResponse.json({ error: 'Subscription plan not found' }, { status: 404 });
    }

    if (plan.subscriptions.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete plan with active subscriptions. Please cancel all subscriptions first.' 
      }, { status: 400 });
    }

    await prisma.subscriptionPlan.delete({
      where: { id: planId }
    });

    return NextResponse.json({ message: 'Subscription plan deleted successfully' });
  } catch (error) {
    console.error('Error deleting subscription plan:', error);
    return NextResponse.json({ error: 'Failed to delete subscription plan' }, { status: 500 });
  }
} 