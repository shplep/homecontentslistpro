import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/houses - Get all houses for the current user
export async function GET(request: NextRequest) {
  try {
    // Simple authentication using query parameter for now
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

    const houses = await prisma.house.findMany({
      where: { userId: user.id },
      include: {
        rooms: {
          include: {
            items: true
          }
        },
        insuranceInfo: true
      },
      orderBy: { createdAt: 'asc' }
    });

    // Calculate statistics for each house
    const housesWithStats = houses.map((house: any) => ({
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
    }));

    return NextResponse.json({ houses: housesWithStats });
  } catch (error) {
    console.error('Error fetching houses:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/houses - Create a new house
export async function POST(request: NextRequest) {
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

    // Validation
    if (!address1 || !city || !state || !zipCode) {
      return NextResponse.json({ 
        error: 'Address Line 1, City, State, and ZIP Code are required' 
      }, { status: 400 });
    }

    const house = await prisma.house.create({
      data: {
        userId: user.id,
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

    return NextResponse.json({ house }, { status: 201 });
  } catch (error) {
    console.error('Error creating house:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 