import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/rooms - Get all rooms for a specific house
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');
    const houseId = searchParams.get('houseId');
    
    if (!userEmail) {
      return NextResponse.json({ error: 'User email required' }, { status: 401 });
    }

    if (!houseId) {
      return NextResponse.json({ error: 'House ID required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const houseIdInt = parseInt(houseId);
    
    if (isNaN(houseIdInt)) {
      return NextResponse.json({ error: 'Invalid house ID' }, { status: 400 });
    }

    // Verify the house belongs to the user
    const house = await prisma.house.findFirst({
      where: {
        id: houseIdInt,
        userId: user.id
      }
    });

    if (!house) {
      return NextResponse.json({ error: 'House not found or access denied' }, { status: 404 });
    }

    const rooms = await prisma.room.findMany({
      where: { houseId: houseIdInt },
      include: {
        items: {
          select: {
            id: true,
            price: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Calculate stats for each room
    const roomsWithStats = rooms.map((room: any) => ({
      id: room.id,
      houseId: room.houseId,
      name: room.name,
      notes: room.notes,
      createdAt: room.createdAt.toISOString(),
      stats: {
        itemCount: room.items.length,
        totalValue: room.items.reduce((sum: number, item: any) => sum + (item.price ? Number(item.price) : 0), 0)
      }
    }));

    return NextResponse.json(roomsWithStats);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    return NextResponse.json({ error: 'Failed to fetch rooms' }, { status: 500 });
  }
}

// POST /api/rooms - Create a new room
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { houseId, name, notes } = body;

    if (!houseId || !name) {
      return NextResponse.json({ error: 'House ID and name are required' }, { status: 400 });
    }

    // Verify the house belongs to the user
    const house = await prisma.house.findFirst({
      where: {
        id: parseInt(houseId),
        userId: user.id
      }
    });

    if (!house) {
      return NextResponse.json({ error: 'House not found or access denied' }, { status: 404 });
    }

    const room = await prisma.room.create({
      data: {
        houseId: parseInt(houseId),
        name,
        notes: notes || null
      },
      include: {
        items: {
          select: {
            id: true,
            price: true
          }
        }
      }
    });

    const roomWithStats = {
      id: room.id,
      houseId: room.houseId,
      name: room.name,
      notes: room.notes,
      createdAt: room.createdAt.toISOString(),
      stats: {
        itemCount: room.items.length,
        totalValue: room.items.reduce((sum: number, item: any) => sum + (item.price ? Number(item.price) : 0), 0)
      }
    };

    return NextResponse.json(roomWithStats, { status: 201 });
  } catch (error) {
    console.error('Error creating room:', error);
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
  }
} 