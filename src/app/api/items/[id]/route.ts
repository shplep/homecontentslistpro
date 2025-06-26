import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/items/[id] - Get a specific item
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

    const itemId = parseInt(params.id);
    
    if (isNaN(itemId)) {
      return NextResponse.json({ error: 'Invalid item ID' }, { status: 400 });
    }

    const item = await prisma.item.findFirst({
      where: {
        id: itemId,
        room: {
          house: {
            userId: user.id
          }
        }
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

    if (!item) {
      return NextResponse.json({ error: 'Item not found or access denied' }, { status: 404 });
    }

    const formattedItem = {
      id: item.id,
      roomId: item.roomId,
      name: item.name,
      serialNumber: item.serialNumber,
      category: item.category,
      brand: item.brand,
      model: item.model,
      price: item.price ? Number(item.price) : null,
      dateAcquired: item.dateAcquired?.toISOString().split('T')[0] || null,
      status: item.status,
      condition: item.condition,
      notes: item.notes,
      isImported: item.isImported,
      createdAt: item.createdAt.toISOString(),
      images: item.images
    };

    return NextResponse.json(formattedItem);
  } catch (error) {
    console.error('Error fetching item:', error);
    return NextResponse.json({ error: 'Failed to fetch item' }, { status: 500 });
  }
}

// PUT /api/items/[id] - Update a specific item
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

    const itemId = parseInt(params.id);
    
    if (isNaN(itemId)) {
      return NextResponse.json({ error: 'Invalid item ID' }, { status: 400 });
    }

    const body = await request.json();
    const { 
      name, 
      serialNumber, 
      category, 
      brand, 
      model, 
      price, 
      dateAcquired, 
      status, 
      condition, 
      notes 
    } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Verify the item belongs to the user
    const existingItem = await prisma.item.findFirst({
      where: {
        id: itemId,
        room: {
          house: {
            userId: user.id
          }
        }
      }
    });

    if (!existingItem) {
      return NextResponse.json({ error: 'Item not found or access denied' }, { status: 404 });
    }

    const item = await prisma.item.update({
      where: { id: itemId },
      data: {
        name,
        serialNumber: serialNumber || null,
        category: category || null,
        brand: brand || null,
        model: model || null,
        price: price ? Number(price) : null,
        dateAcquired: dateAcquired ? new Date(dateAcquired) : null,
        status: status || null,
        condition: condition || null,
        notes: notes || null
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
      category: item.category,
      brand: item.brand,
      model: item.model,
      price: item.price ? Number(item.price) : null,
      dateAcquired: item.dateAcquired?.toISOString().split('T')[0] || null,
      status: item.status,
      condition: item.condition,
      notes: item.notes,
      isImported: item.isImported,
      createdAt: item.createdAt.toISOString(),
      images: item.images
    };

    return NextResponse.json(formattedItem);
  } catch (error) {
    console.error('Error updating item:', error);
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
  }
}

// DELETE /api/items/[id] - Delete a specific item
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

    const itemId = parseInt(params.id);
    
    if (isNaN(itemId)) {
      return NextResponse.json({ error: 'Invalid item ID' }, { status: 400 });
    }

    // Verify the item belongs to the user
    const item = await prisma.item.findFirst({
      where: {
        id: itemId,
        room: {
          house: {
            userId: user.id
          }
        }
      },
      include: {
        images: {
          select: { id: true }
        }
      }
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found or access denied' }, { status: 404 });
    }

    // Delete the item (this will cascade delete images due to the schema)
    await prisma.item.delete({
      where: { id: itemId }
    });

    return NextResponse.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error deleting item:', error);
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
  }
} 