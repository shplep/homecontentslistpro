import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/items - Get all items for a specific room
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');
    const roomId = searchParams.get('roomId');
    
    if (!userEmail) {
      return NextResponse.json({ error: 'User email required' }, { status: 401 });
    }

    if (!roomId) {
      return NextResponse.json({ error: 'Room ID required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const roomIdInt = parseInt(roomId);
    
    if (isNaN(roomIdInt)) {
      return NextResponse.json({ error: 'Invalid room ID' }, { status: 400 });
    }

    // Verify the room belongs to the user
    const room = await prisma.room.findFirst({
      where: {
        id: roomIdInt,
        house: {
          userId: user.id
        }
      }
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found or access denied' }, { status: 404 });
    }

    const items = await prisma.item.findMany({
      where: { roomId: roomIdInt },
      include: {
        images: {
          select: {
            id: true,
            filename: true,
            path: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Format items for response
    const formattedItems = items.map((item: any) => ({
      id: item.id,
      roomId: item.roomId,
      name: item.name,
      serialNumber: item.serialNumber,
      brand: item.brand,
      model: item.model,
      price: item.price ? parseFloat(item.price.toString()) : null,
      quantity: item.quantity,
      purchaseDate: item.purchaseDate?.toISOString().split('T')[0] || null,
      status: item.status,
      condition: item.condition,
      notes: item.notes,
      isImported: item.isImported,
      createdAt: item.createdAt.toISOString(),
      images: item.images
    }));

    return NextResponse.json(formattedItems);
  } catch (error) {
    console.error('Error fetching items:', error);
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
  }
}

// POST /api/items - Create a new item
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
    const { 
      roomId, 
      name, 
      serialNumber, 
      brand, 
      model, 
      price, 
      quantity,
      purchaseDate,
      status, 
      condition, 
      notes 
    } = body;

    if (!roomId || !name) {
      return NextResponse.json({ error: 'Room ID and name are required' }, { status: 400 });
    }

    // Verify the room belongs to the user
    const room = await prisma.room.findFirst({
      where: {
        id: parseInt(roomId),
        house: {
          userId: user.id
        }
      }
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found or access denied' }, { status: 404 });
    }

    const item = await prisma.item.create({
      data: {
        roomId: parseInt(roomId),
        name,
        serialNumber: serialNumber || null,
        brand: brand || null,
        model: model || null,
        price: price ? Number(price) : null,
        quantity: quantity ? Number(quantity) : 1,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        status: status || null,
        condition: condition || null,
        notes: notes || null,
        isImported: false
      },
      include: {
        images: {
          select: {
            id: true,
            filename: true,
            path: true
          }
        }
      }
    });

    const formattedItem = {
      id: item.id,
      roomId: item.roomId,
      name: item.name,
      serialNumber: item.serialNumber,
      brand: item.brand,
      model: item.model,
      price: item.price ? parseFloat(item.price.toString()) : null,
      quantity: item.quantity,
      purchaseDate: item.purchaseDate?.toISOString().split('T')[0] || null,
      status: item.status,
      condition: item.condition,
      notes: item.notes,
      isImported: item.isImported,
      createdAt: item.createdAt.toISOString(),
      images: item.images
    };

    return NextResponse.json(formattedItem, { status: 201 });
  } catch (error) {
    console.error('Error creating item:', error);
    return NextResponse.json({ error: 'Failed to create item' }, { status: 500 });
  }
} 