import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { migrateExistingFiles, cleanupOrphanedFiles } from '@/lib/file-migration';

export async function POST(request: NextRequest) {
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
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    console.log('Starting file migration...');
    
    // Run the migration
    const migrationResult = await migrateExistingFiles();
    
    // Find orphaned files
    const orphanedFiles = await cleanupOrphanedFiles();

    const response = {
      success: true,
      migration: migrationResult,
      orphanedFiles: orphanedFiles,
      summary: {
        migratedFiles: migrationResult.success,
        failedMigrations: migrationResult.failed,
        orphanedFiles: orphanedFiles.length,
        totalProcessed: migrationResult.success + migrationResult.failed
      }
    };

    console.log('Migration completed:', response.summary);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error during file migration:', error);
    return NextResponse.json({ 
      error: 'Migration failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET endpoint to check migration status
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
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    // Check how many files are in old vs new structure
    const images = await prisma.image.findMany({
      select: { path: true }
    });

    const oldStructure = images.filter(img => !img.path.includes('user_')).length;
    const newStructure = images.filter(img => img.path.includes('user_')).length;

    return NextResponse.json({
      totalFiles: images.length,
      oldStructure,
      newStructure,
      migrationNeeded: oldStructure > 0,
      migrationComplete: oldStructure === 0
    });
  } catch (error) {
    console.error('Error checking migration status:', error);
    return NextResponse.json({ 
      error: 'Failed to check migration status' 
    }, { status: 500 });
  }
} 