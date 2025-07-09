import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper function to check if user is admin
async function checkAdminAccess(request: NextRequest) {
  try {
    // For now, we'll use a simple approach - check via query param
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

// GET /api/admin/subscription-plans - Get all subscription plans
export async function GET(request: NextRequest) {
  try {
    const { isAdmin, error } = await checkAdminAccess(request);
    
    if (!isAdmin) {
      return NextResponse.json({ error: error || 'Admin access required' }, { status: 403 });
    }

    const plans = await prisma.subscriptionPlan.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        subscriptions: {
          select: { id: true, status: true }
        }
      }
    });

    // Add subscriber counts to each plan
    const plansWithStats = plans.map((plan: any) => ({
      ...plan,
      subscriberCount: plan.subscriptions.length,
      activeSubscriberCount: plan.subscriptions.filter((sub: any) => sub.status === 'ACTIVE').length
    }));

    return NextResponse.json({ plans: plansWithStats });
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/subscription-plans - Create a new subscription plan
export async function POST(request: NextRequest) {
  try {
    const { isAdmin, error } = await checkAdminAccess(request);
    
    if (!isAdmin) {
      return NextResponse.json({ error: error || 'Admin access required' }, { status: 403 });
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

    // Validate required fields
    if (!name || !displayName || price === undefined || maxHouses === undefined) {
      return NextResponse.json({ 
        error: 'Name, display name, price, and max houses are required' 
      }, { status: 400 });
    }

    // Check if plan name already exists
    const existingPlan = await prisma.subscriptionPlan.findUnique({
      where: { name }
    });

    if (existingPlan) {
      return NextResponse.json({ 
        error: 'A plan with this name already exists' 
      }, { status: 409 });
    }

    const plan = await prisma.subscriptionPlan.create({
      data: {
        name,
        displayName,
        description: description || null,
        price: parseInt(price),
        stripeProductId: stripeProductId || null,
        stripePriceId: stripePriceId || null,
        maxHouses: parseInt(maxHouses),
        maxRoomsPerHouse: maxRoomsPerHouse ? parseInt(maxRoomsPerHouse) : null,
        maxItemsPerRoom: maxItemsPerRoom ? parseInt(maxItemsPerRoom) : null,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        allowTrial: allowTrial !== undefined ? Boolean(allowTrial) : false,
        sortOrder: sortOrder !== undefined ? parseInt(sortOrder) : 0
      }
    });

    return NextResponse.json({ plan }, { status: 201 });
  } catch (error) {
    console.error('Error creating subscription plan:', error);
    return NextResponse.json({ error: 'Failed to create subscription plan' }, { status: 500 });
  }
} 