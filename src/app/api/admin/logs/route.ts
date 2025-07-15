import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');

    if (!userEmail) {
      return NextResponse.json({ error: 'User email is required' }, { status: 400 });
    }

    // Verify admin role
    const user = await prisma.user.findFirst({
      where: { email: userEmail },
      select: { id: true, role: true }
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get query parameters for filtering
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const logType = searchParams.get('type') || 'all';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const skip = (page - 1) * limit;

    // Build where clause for filtering
    const whereClause: any = {};
    
    if (startDate) {
      whereClause.timestamp = {
        ...whereClause.timestamp,
        gte: new Date(startDate)
      };
    }
    
    if (endDate) {
      whereClause.timestamp = {
        ...whereClause.timestamp,
        lte: new Date(endDate)
      };
    }

    // Get admin logs
    const adminLogs = await prisma.adminLog.findMany({
      where: whereClause,
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      skip: skip,
      take: limit
    });

    // Get total count for pagination
    const totalCount = await prisma.adminLog.count({
      where: whereClause
    });

    // Format logs for frontend
    const formattedLogs = adminLogs.map(log => ({
      id: log.id,
      action: log.action,
      timestamp: log.timestamp,
      admin: {
        name: log.admin.name || 'Unknown Admin',
        email: log.admin.email
      },
      user: {
        name: log.user.name || 'Unknown User',
        email: log.user.email
      },
      type: 'admin_action'
    }));

    // Get recent system events (simulated from database activity)
    const recentUsers = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true
      }
    });

    const systemLogs = recentUsers.map(user => ({
      id: `user_${user.id}`,
      action: `User registered: ${user.name || user.email}`,
      timestamp: user.createdAt,
      admin: null,
      user: {
        name: user.name || 'Unknown User',
        email: user.email
      },
      type: 'system_event'
    }));

    // Combine and sort logs
    let allLogs = [...formattedLogs, ...systemLogs];
    
    // Filter by type if specified
    if (logType !== 'all') {
      allLogs = allLogs.filter(log => log.type === logType);
    }

    // Sort by timestamp
    allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply pagination to combined results
    const paginatedLogs = allLogs.slice(0, limit);

    return NextResponse.json({
      logs: paginatedLogs,
      pagination: {
        page,
        limit,
        total: Math.max(totalCount, allLogs.length),
        totalPages: Math.ceil(Math.max(totalCount, allLogs.length) / limit)
      },
      summary: {
        adminActions: formattedLogs.length,
        systemEvents: systemLogs.length,
        totalLogs: allLogs.length
      }
    });

  } catch (error) {
    console.error('Error fetching admin logs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/logs - Create a new admin log entry
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');

    if (!userEmail) {
      return NextResponse.json({ error: 'User email is required' }, { status: 400 });
    }

    // Verify admin role
    const admin = await prisma.user.findFirst({
      where: { email: userEmail },
      select: { id: true, role: true }
    });

    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { action, userId } = await request.json();

    if (!action || !userId) {
      return NextResponse.json({ error: 'Action and userId are required' }, { status: 400 });
    }

    // Create admin log entry
    const logEntry = await prisma.adminLog.create({
      data: {
        adminId: admin.id,
        userId: parseInt(userId),
        action: action,
        timestamp: new Date()
      },
      include: {
        admin: {
          select: {
            name: true,
            email: true
          }
        },
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Log entry created successfully',
      log: logEntry
    });

  } catch (error) {
    console.error('Error creating admin log:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 