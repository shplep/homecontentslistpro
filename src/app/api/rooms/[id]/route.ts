import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/rooms/[id] - Get a specific room
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

    const roomId = parseInt(params.id);
    
    if (isNaN(roomId)) {
      return NextResponse.json({ error: 'Invalid room ID' }, { status: 400 });
    }

    const room = await prisma.room.findFirst({
      where: {
        id: roomId,
        house: {
          userId: user.id
        }
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

    if (!room) {
      return NextResponse.json({ error: 'Room not found or access denied' }, { status: 404 });
    }

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

    return NextResponse.json(roomWithStats);
  } catch (error) {
    console.error('Error fetching room:', error);
    return NextResponse.json({ error: 'Failed to fetch room' }, { status: 500 });
  }
}

// PUT /api/rooms/[id] - Update a specific room
export async function PUT(
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

    const roomId = parseInt(params.id);
    
    if (isNaN(roomId)) {
      return NextResponse.json({ error: 'Invalid room ID' }, { status: 400 });
    }

    const body = await request.json();
    const { name, notes } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Verify the room belongs to the user's house
    const existingRoom = await prisma.room.findFirst({
      where: {
        id: roomId,
        house: {
          userId: user.id
        }
      }
    });

    if (!existingRoom) {
      return NextResponse.json({ error: 'Room not found or access denied' }, { status: 404 });
    }

    const room = await prisma.room.update({
      where: { id: roomId },
      data: {
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

    return NextResponse.json(roomWithStats);
  } catch (error) {
    console.error('Error updating room:', error);
    return NextResponse.json({ error: 'Failed to update room' }, { status: 500 });
  }
}

// DELETE /api/rooms/[id] - Delete a specific room
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

    const roomId = parseInt(params.id);
    
    if (isNaN(roomId)) {
      return NextResponse.json({ error: 'Invalid room ID' }, { status: 400 });
    }

    // Verify the room belongs to the user's house and check for items
    const room = await prisma.room.findFirst({
      where: {
        id: roomId,
        house: {
          userId: user.id
        }
      },
      include: {
        items: {
          select: { id: true }
        }
      }
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found or access denied' }, { status: 404 });
    }

    // Check if room has items
    if (room.items.length > 0) {
      return NextResponse.json({ 
        error: `Cannot delete room "${room.name}" because it contains ${room.items.length} item(s). Please remove all items first.` 
      }, { status: 400 });
    }

    await prisma.room.delete({
      where: { id: roomId }
    });

    return NextResponse.json({ message: 'Room deleted successfully' });
  } catch (error) {
    console.error('Error deleting room:', error);
    return NextResponse.json({ error: 'Failed to delete room' }, { status: 500 });
  }
} 