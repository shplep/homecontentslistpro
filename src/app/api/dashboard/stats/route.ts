import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/dashboard/stats - Get dashboard statistics for the current user
export async function GET(request: NextRequest) {
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

    // Fetch all user's data with counts
    const houses = await prisma.house.findMany({
      where: { userId: user.id },
      include: {
        rooms: {
          include: {
            items: {
              select: {
                price: true
              }
            }
          }
        }
      }
    });

    // Calculate statistics
    const totalHouses = houses.length;
    const totalRooms = houses.reduce((sum, house) => sum + house.rooms.length, 0);
    const totalItems = houses.reduce((sum, house) => 
      sum + house.rooms.reduce((roomSum, room) => roomSum + room.items.length, 0), 0
    );
    const totalValue = houses.reduce((sum, house) => 
      sum + house.rooms.reduce((roomSum, room) => 
        roomSum + room.items.reduce((itemSum, item) => 
          itemSum + (item.price ? Number(item.price) : 0), 0
        ), 0
      ), 0
    );

    return NextResponse.json({
      totalHouses,
      totalRooms,
      totalItems,
      totalValue
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 