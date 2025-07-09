import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import path from 'path';
import fs from 'fs';

// GET /api/admin/backup/download - Download a specific backup file
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');
    const filename = searchParams.get('filename');
    
    if (!userEmail) {
      return NextResponse.json({ error: 'User email required' }, { status: 401 });
    }

    if (!filename) {
      return NextResponse.json({ error: 'Filename required' }, { status: 400 });
    }

    // Verify admin user
    const adminUser = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { id: true, role: true }
    });

    if (!adminUser || adminUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Security: Ensure filename doesn't contain path traversal characters
    const sanitizedFilename = path.basename(filename);
    if (sanitizedFilename !== filename) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }

    // Get backup directory and file path
    const backupDir = path.join(process.cwd(), 'backups');
    const filePath = path.join(backupDir, sanitizedFilename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Backup file not found' }, { status: 404 });
    }

    // Ensure file is within backup directory (additional security check)
    const resolvedFilePath = path.resolve(filePath);
    const resolvedBackupDir = path.resolve(backupDir);
    
    if (!resolvedFilePath.startsWith(resolvedBackupDir)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Read the file
    const fileBuffer = fs.readFileSync(filePath);
    const stats = fs.statSync(filePath);

    // Determine content type based on file extension
    const fileExtension = path.extname(sanitizedFilename).toLowerCase();
    let contentType = 'application/octet-stream';
    
    if (fileExtension === '.sql') {
      contentType = 'application/sql';
    } else if (fileExtension === '.json') {
      contentType = 'application/json';
    } else if (fileExtension === '.txt') {
      contentType = 'text/plain';
    }

    // Create response with file data
    const response = new NextResponse(fileBuffer);
    
    // Set headers for file download
    response.headers.set('Content-Type', contentType);
    response.headers.set('Content-Disposition', `attachment; filename="${sanitizedFilename}"`);
    response.headers.set('Content-Length', stats.size.toString());
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
    
  } catch (error) {
    console.error('Error downloading backup file:', error);
    return NextResponse.json({ 
      error: 'Failed to download backup file', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 