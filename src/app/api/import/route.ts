import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { userEmail, preview, options } = await request.json();

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

    const created = {
      houses: 0,
      rooms: 0,
      items: 0
    };

    const updated = {
      items: 0
    };

    const skipped = {
      items: 0
    };

    // Create houses first
    const houseMap = new Map();
    
    if (options.createMissingHouses) {
      for (const houseData of preview.houses) {
        try {
          // Check if house already exists
          const existingHouse = await prisma.house.findFirst({
            where: {
              userId: user.id,
              address1: houseData.address1,
              city: houseData.city,
              state: houseData.state
            }
          });

          if (existingHouse) {
            const houseKey = `${houseData.name || ''}-${houseData.address1}`;
            houseMap.set(houseKey, existingHouse.id);
          } else {
            const newHouse = await prisma.house.create({
              data: {
                userId: user.id,
                name: houseData.name,
                address1: houseData.address1,
                city: houseData.city,
                state: houseData.state,
                zipCode: houseData.zipCode || null
              }
            });

            const houseKey = `${houseData.name || ''}-${houseData.address1}`;
            houseMap.set(houseKey, newHouse.id);
            created.houses++;
          }
        } catch (error) {
          console.error('Error creating house:', error);
        }
      }
    } else {
      // Map existing houses
      const existingHouses = await prisma.house.findMany({
        where: { userId: user.id }
      });

      for (const house of existingHouses) {
        const houseKey = `${house.name || ''}-${house.address1}`;
        houseMap.set(houseKey, house.id);
      }
    }

    // Create rooms
    const roomMap = new Map();
    
    if (options.createMissingRooms) {
      for (const roomData of preview.rooms) {
        try {
          const houseId = houseMap.get(roomData.houseKey);
          if (!houseId) continue;

          // Check if room already exists
          const existingRoom = await prisma.room.findFirst({
            where: {
              houseId: houseId,
              name: roomData.name
            }
          });

          if (existingRoom) {
            roomMap.set(roomData.roomKey || `${roomData.houseKey}-${roomData.name}`, existingRoom.id);
          } else {
            const newRoom = await prisma.room.create({
              data: {
                houseId: houseId,
                name: roomData.name,
                notes: roomData.notes
              }
            });

            roomMap.set(roomData.roomKey || `${roomData.houseKey}-${roomData.name}`, newRoom.id);
            created.rooms++;
          }
        } catch (error) {
          console.error('Error creating room:', error);
        }
      }
    } else {
      // Map existing rooms
      const houseIds = Array.from(houseMap.values());
      const existingRooms = await prisma.room.findMany({
        where: { houseId: { in: houseIds } },
        include: { house: true }
      });

      for (const room of existingRooms) {
        const houseKey = `${room.house.name || ''}-${room.house.address1}`;
        const roomKey = `${houseKey}-${room.name}`;
        roomMap.set(roomKey, room.id);
      }
    }

    // Create/update items
    for (const itemData of preview.items) {
      try {
        const roomId = roomMap.get(itemData.roomKey);
        if (!roomId) {
          skipped.items++;
          continue;
        }

        // Check for duplicates
        const existingItem = await prisma.item.findFirst({
          where: {
            roomId: roomId,
            name: itemData.name,
            brand: itemData.brand || null,
            model: itemData.model || null
          }
        });

        if (existingItem) {
          if (options.updateExisting) {
            await prisma.item.update({
              where: { id: existingItem.id },
              data: {
                category: itemData.category || null,
                brand: itemData.brand || null,
                model: itemData.model || null,
                serialNumber: itemData.serialNumber || null,
                price: itemData.price || null,
                status: itemData.status || 'ACTIVE',
                condition: itemData.condition || 'GOOD',
                notes: itemData.notes || null
              }
            });
            updated.items++;
          } else if (options.skipDuplicates) {
            skipped.items++;
          } else {
            // Create duplicate with modified name
            await prisma.item.create({
              data: {
                roomId: roomId,
                name: `${itemData.name} (Imported)`,
                category: itemData.category || null,
                brand: itemData.brand || null,
                model: itemData.model || null,
                serialNumber: itemData.serialNumber || null,
                price: itemData.price || null,
                status: itemData.status || 'ACTIVE',
                condition: itemData.condition || 'GOOD',
                notes: itemData.notes || null,
                isImported: true
              }
            });
            created.items++;
          }
        } else {
          await prisma.item.create({
            data: {
              roomId: roomId,
              name: itemData.name,
              category: itemData.category || null,
              brand: itemData.brand || null,
              model: itemData.model || null,
              serialNumber: itemData.serialNumber || null,
              price: itemData.price || null,
              status: itemData.status || 'ACTIVE',
              condition: itemData.condition || 'GOOD',
              notes: itemData.notes || null,
              isImported: true
            }
          });
          created.items++;
        }
      } catch (error) {
        console.error('Error processing item:', error);
        skipped.items++;
      }
    }

    return NextResponse.json({
      success: true,
      created,
      updated,
      skipped,
      summary: `Import completed: ${created.houses} houses, ${created.rooms} rooms, ${created.items} items created. ${updated.items} items updated, ${skipped.items} items skipped.`
    });

  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
} 