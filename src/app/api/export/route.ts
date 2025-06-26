import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');
    const format = searchParams.get('format') || 'csv';
    const scope = searchParams.get('scope') || 'all';
    const houseId = searchParams.get('houseId');
    const category = searchParams.get('category');
    const includeImages = searchParams.get('includeImages') === 'true';
    const includeStats = searchParams.get('includeStats') === 'true';

    if (!userEmail) {
      return NextResponse.json({ error: 'User email is required' }, { status: 400 });
    }

    // Get user ID
    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Build query based on scope
    let houses, rooms, items;

    if (scope === 'house' && houseId) {
      // Export specific house
      houses = await prisma.house.findMany({
        where: { 
          id: parseInt(houseId),
          userId: user.id 
        },
        include: {
          rooms: {
            include: {
              items: {
                include: includeImages ? { images: true } : undefined
              }
            }
          }
        }
      });
    } else if (scope === 'category' && category) {
      // Export by category
      houses = await prisma.house.findMany({
        where: { userId: user.id },
        include: {
          rooms: {
            include: {
              items: {
                where: { category },
                include: includeImages ? { images: true } : undefined
              }
            }
          }
        }
      });
    } else {
      // Export all data
      houses = await prisma.house.findMany({
        where: { userId: user.id },
        include: {
          rooms: {
            include: {
              items: {
                include: includeImages ? { images: true } : undefined
              }
            }
          }
        }
      });
    }

    // Calculate statistics if requested
    if (includeStats) {
      for (const house of houses) {
        let houseItemCount = 0;
        let houseTotalValue = 0;

        for (const room of house.rooms) {
          const roomItemCount = room.items.length;
                     const roomTotalValue = room.items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
          
          houseItemCount += roomItemCount;
          houseTotalValue += roomTotalValue;

          // Add room stats
          (room as any).stats = {
            itemCount: roomItemCount,
            totalValue: roomTotalValue
          };
        }

        // Add house stats
        (house as any).stats = {
          roomCount: house.rooms.length,
          itemCount: houseItemCount,
          totalValue: houseTotalValue
        };
      }
    }

    // Generate export based on format
    const timestamp = new Date().toISOString().split('T')[0];
    const scopeLabel = scope === 'house' ? 'house' : scope === 'category' ? category : 'all';
    
    if (format === 'json') {
      const exportData = {
        exportInfo: {
          generatedAt: new Date().toISOString(),
          scope,
          format,
          includeImages,
          includeStats,
          totalHouses: houses.length,
          totalRooms: houses.reduce((sum, h) => sum + h.rooms.length, 0),
          totalItems: houses.reduce((sum, h) => sum + h.rooms.reduce((roomSum, r) => roomSum + r.items.length, 0), 0)
        },
        houses
      };

      const filename = `inventory-${scopeLabel}-${timestamp}.json`;
      
      return new NextResponse(JSON.stringify(exportData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      });
    }

    if (format === 'csv') {
      // Create CSV data
      const csvData = [];
      
      // Header row
      const headers = [
        'House Name', 'House Address', 'House City', 'House State',
        'Room Name', 'Room Notes',
        'Item Name', 'Item Category', 'Item Brand', 'Item Model', 
        'Item Serial Number', 'Item Price', 'Item Date Acquired', 
        'Item Status', 'Item Condition', 'Item Notes'
      ];

      if (includeStats) {
        headers.push('House Room Count', 'House Item Count', 'House Total Value', 'Room Item Count', 'Room Total Value');
      }

      if (includeImages) {
        headers.push('Image Count', 'Image Paths');
      }

      csvData.push(headers.join(','));

      // Data rows
      for (const house of houses) {
        for (const room of house.rooms) {
          for (const item of room.items) {
            const row = [
              `"${house.name || ''}"`,
              `"${house.address1 || ''}"`,
              `"${house.city || ''}"`,
              `"${house.state || ''}"`,
              `"${room.name || ''}"`,
              `"${room.notes || ''}"`,
              `"${item.name || ''}"`,
              `"${item.category || ''}"`,
              `"${item.brand || ''}"`,
              `"${item.model || ''}"`,
              `"${item.serialNumber || ''}"`,
              `"${item.price || 0}"`,
              `"${item.dateAcquired ? new Date(item.dateAcquired).toISOString().split('T')[0] : ''}"`,
              `"${item.status || ''}"`,
              `"${item.condition || ''}"`,
              `"${item.notes || ''}"`
            ];

            if (includeStats) {
              const houseStats = (house as any).stats;
              const roomStats = (room as any).stats;
              row.push(
                `"${houseStats?.roomCount || 0}"`,
                `"${houseStats?.itemCount || 0}"`,
                `"${houseStats?.totalValue || 0}"`,
                `"${roomStats?.itemCount || 0}"`,
                `"${roomStats?.totalValue || 0}"`
              );
            }

            if (includeImages) {
              const imageCount = (item as any).images?.length || 0;
              const imagePaths = (item as any).images?.map((img: any) => img.path).join('; ') || '';
              row.push(`"${imageCount}"`, `"${imagePaths}"`);
            }

            csvData.push(row.join(','));
          }
        }
      }

      const csvContent = csvData.join('\n');
      const filename = `inventory-${scopeLabel}-${timestamp}.csv`;

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      });
    }

    if (format === 'excel') {
      // For Excel format, we'll return a simple CSV for now
      // In a real implementation, you'd use a library like 'exceljs'
      const csvData = [];
      
      const headers = [
        'House Name', 'House Address', 'Room Name', 'Item Name', 
        'Category', 'Brand', 'Model', 'Price', 'Condition', 'Status'
      ];
      csvData.push(headers.join(','));

      for (const house of houses) {
        for (const room of house.rooms) {
          for (const item of room.items) {
            const row = [
              `"${house.name || house.address1 || ''}"`,
              `"${house.address1}, ${house.city}, ${house.state}"`,
              `"${room.name || ''}"`,
              `"${item.name || ''}"`,
              `"${item.category || ''}"`,
              `"${item.brand || ''}"`,
              `"${item.model || ''}"`,
              `"${item.price || 0}"`,
              `"${item.condition || ''}"`,
              `"${item.status || ''}"`
            ];
            csvData.push(row.join(','));
          }
        }
      }

      const csvContent = csvData.join('\n');
      const filename = `inventory-${scopeLabel}-${timestamp}.xlsx`;

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      });
    }

    return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
} 