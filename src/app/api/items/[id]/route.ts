import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { join } from 'path';
import { deleteFile, generateFilePath, cleanupEmptyDirectories } from '@/lib/file-utils';

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
      brand, 
      model, 
      price, 
      quantity,
      purchaseDate,
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
        brand: brand || null,
        model: model || null,
        price: price ? Number(price) : null,
        quantity: quantity ? Number(quantity) : 1,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
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

    // Verify the item belongs to the user and get associated files
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
        images: true
      }
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found or access denied' }, { status: 404 });
    }

    // Delete associated files from filesystem
    const { fullPath } = generateFilePath(user.id, itemId, '');
    for (const image of item.images) {
      const filename = image.path.split('/').pop();
      if (filename) {
        const filePath = join(fullPath, filename);
        await deleteFile(filePath);
      }
    }

    // Delete from database (images will be deleted by cascade)
    await prisma.item.delete({
      where: { id: itemId }
    });

    // Clean up empty directories
    const userPath = join(process.cwd(), 'public', 'uploads', `user_${user.id}`);
    await cleanupEmptyDirectories(fullPath, userPath);

    return NextResponse.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error deleting item:', error);
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
  }
} 