import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Test database connection
    const userCount = await prisma.user.count();
    
    // Get some sample user data (without passwords)
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
      take: 5,
    });

    return NextResponse.json({
      success: true,
      database_connected: true,
      total_users: userCount,
      sample_users: users,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Database debug error:', error);
    return NextResponse.json({
      success: false,
      database_connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
} 