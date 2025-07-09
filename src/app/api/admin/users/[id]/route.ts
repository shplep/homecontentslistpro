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

// GET /api/admin/users/[id] - Get user details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { isAdmin, error } = await checkAdminAccess(request);
    
    if (!isAdmin) {
      return NextResponse.json({ error: error || 'Admin access required' }, { status: 403 });
    }

    const userId = parseInt(params.id);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const includeSubscriptions = searchParams.get('includeSubscriptions') === 'true';
    const includeHouses = searchParams.get('includeHouses') === 'true';

    // Build include object based on query parameters
    const include: any = {
      _count: {
        select: {
          houses: true,
          subscriptions: true
        }
      }
    };

    if (includeSubscriptions) {
      include.subscriptions = {
        include: {
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
      };
    }

    if (includeHouses) {
      include.houses = {
        include: {
          _count: {
            select: {
              rooms: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/admin/users/[id] - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { isAdmin, error } = await checkAdminAccess(request);
    
    if (!isAdmin) {
      return NextResponse.json({ error: error || 'Admin access required' }, { status: 403 });
    }

    const userId = parseInt(params.id);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const body = await request.json();
    const { role, name, phone, address } = body;

    const updateData: any = {};
    
    if (role !== undefined) {
      if (!['USER', 'ADMIN'].includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }
      updateData.role = role;
    }

    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        address: true,
        updatedAt: true
      }
    });

    return NextResponse.json({ 
      message: 'User updated successfully',
      user: updatedUser 
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 