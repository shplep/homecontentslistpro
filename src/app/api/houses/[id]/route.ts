import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/houses/[id] - Get a specific house
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');
    
    if (!userEmail) {
      return NextResponse.json({ error: 'User email required' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const houseId = parseInt(params.id);
    
    if (isNaN(houseId)) {
      return NextResponse.json({ error: 'Invalid house ID' }, { status: 400 });
    }

    const house = await prisma.house.findFirst({
      where: { 
        id: houseId,
        userId: user.id 
      },
      include: {
        rooms: {
          include: {
            items: true
          }
        },
        insuranceInfo: true
      }
    });

    if (!house) {
      return NextResponse.json({ error: 'House not found' }, { status: 404 });
    }

    // Calculate statistics
    const houseWithStats = {
      ...house,
      stats: {
        roomCount: house.rooms.length,
        itemCount: house.rooms.reduce((total: number, room: any) => total + room.items.length, 0),
        totalValue: house.rooms.reduce((total: number, room: any) => 
          total + room.items.reduce((roomTotal: number, item: any) => 
            roomTotal + (item.price ? Number(item.price) : 0), 0
          ), 0
        )
      }
    };

    return NextResponse.json({ house: houseWithStats });
  } catch (error) {
    console.error('Error fetching house:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/houses/[id] - Update a specific house
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { userEmail, name, address1, address2, city, state, zipCode } = body;
    
    if (!userEmail) {
      return NextResponse.json({ error: 'User email required' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const houseId = parseInt(params.id);
    
    if (isNaN(houseId)) {
      return NextResponse.json({ error: 'Invalid house ID' }, { status: 400 });
    }

    // Validation
    if (!address1 || !city || !state || !zipCode) {
      return NextResponse.json({ 
        error: 'Address Line 1, City, State, and ZIP Code are required' 
      }, { status: 400 });
    }

    // Check if house exists and belongs to user
    const existingHouse = await prisma.house.findFirst({
      where: { 
        id: houseId,
        userId: user.id 
      }
    });

    if (!existingHouse) {
      return NextResponse.json({ error: 'House not found' }, { status: 404 });
    }

    const house = await prisma.house.update({
      where: { id: houseId },
      data: {
        name: name || null,
        address1,
        address2: address2 || null,
        city,
        state,
        zipCode
      },
      include: {
        rooms: true,
        insuranceInfo: true
      }
    });

    return NextResponse.json({ house });
  } catch (error) {
    console.error('Error updating house:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/houses/[id] - Delete a specific house
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');
    
    if (!userEmail) {
      return NextResponse.json({ error: 'User email required' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const houseId = parseInt(params.id);
    
    if (isNaN(houseId)) {
      return NextResponse.json({ error: 'Invalid house ID' }, { status: 400 });
    }

    // Check if house exists and belongs to user
    const existingHouse = await prisma.house.findFirst({
      where: { 
        id: houseId,
        userId: user.id 
      },
      include: {
        rooms: {
          include: {
            items: true
          }
        }
      }
    });

    if (!existingHouse) {
      return NextResponse.json({ error: 'House not found' }, { status: 404 });
    }

    // Check if house has items
    const hasItems = existingHouse.rooms.some((room: any) => room.items.length > 0);
    
    if (hasItems) {
      return NextResponse.json({ 
        error: 'Cannot delete house with items. Please delete all items first.' 
      }, { status: 400 });
    }

    // Delete the house (this will cascade delete rooms due to the schema)
    await prisma.house.delete({
      where: { id: houseId }
    });

    return NextResponse.json({ message: 'House deleted successfully' });
  } catch (error) {
    console.error('Error deleting house:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 