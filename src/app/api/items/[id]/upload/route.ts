import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { 
  generateFilePath, 
  generateUniqueFilename, 
  validateFile, 
  ensureDirectoryExists 
} from '@/lib/file-utils';

export async function POST(
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
      }
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found or access denied' }, { status: 404 });
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const uploadedImages = [];

    for (const file of files) {
      // Validate file using utility function
      const validationError = validateFile(file);
      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 });
      }

      // Generate organized file structure
      const uniqueFilename = generateUniqueFilename(file.name);
      const { fullPath, webPath } = generateFilePath(user.id, itemId, uniqueFilename);

      // Ensure directory exists
      await ensureDirectoryExists(fullPath);

      // Save file
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const filepath = join(fullPath, uniqueFilename);
      await writeFile(filepath, buffer);

      // Save to database with organized path
      const image = await prisma.image.create({
        data: {
          itemId: itemId,
          filename: file.name,
          path: webPath,
          size: file.size,
          mimeType: file.type
        }
      });

      uploadedImages.push({
        id: image.id,
        filename: image.filename,
        path: image.path,
        size: image.size,
        mimeType: image.mimeType
      });
    }

    return NextResponse.json({ 
      message: 'Files uploaded successfully',
      images: uploadedImages 
    });

  } catch (error) {
    console.error('Error uploading files:', error);
    return NextResponse.json({ error: 'Failed to upload files' }, { status: 500 });
  }
} 