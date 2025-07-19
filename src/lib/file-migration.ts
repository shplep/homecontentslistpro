import { prisma } from './prisma';
import { join } from 'path';
import { readdir, rename, mkdir } from 'fs/promises';
import { generateFilePath } from './file-utils';

interface MigrationResult {
  success: number;
  failed: number;
  errors: string[];
}

/**
 * Migrate existing files from flat structure to organized structure
 * This should be run once when implementing the new file organization
 */
export async function migrateExistingFiles(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: 0,
    failed: 0,
    errors: []
  };

  try {
    // Get all images from database
    const images = await prisma.image.findMany({
      include: {
        item: {
          include: {
            room: {
              include: {
                house: true
              }
            }
          }
        }
      }
    });

    const oldUploadsDir = join(process.cwd(), 'public', 'uploads');
    
    for (const image of images) {
      try {
        // Skip if already in organized structure
        if (image.path.includes('user_')) {
          continue;
        }

        const userId = image.item.room.house.userId;
        const itemId = image.item.id;
        
        // Extract filename from current path
        const filename = image.path.split('/').pop();
        if (!filename) {
          result.errors.push(`Invalid path for image ${image.id}: ${image.path}`);
          result.failed++;
          continue;
        }

        // Generate new organized path
        const { fullPath, webPath } = generateFilePath(userId, itemId, filename);
        
        // Create directory structure
        await mkdir(fullPath, { recursive: true });
        
        // Move file from old location to new location
        const oldFilePath = join(oldUploadsDir, filename);
        const newFilePath = join(fullPath, filename);
        
        await rename(oldFilePath, newFilePath);
        
        // Update database with new path
        await prisma.image.update({
          where: { id: image.id },
          data: { path: webPath }
        });

        result.success++;
        console.log(`Migrated: ${filename} -> ${webPath}`);
        
      } catch (error) {
        result.failed++;
        result.errors.push(`Failed to migrate image ${image.id}: ${error}`);
        console.error(`Migration error for image ${image.id}:`, error);
      }
    }

  } catch (error) {
    result.errors.push(`Fatal migration error: ${error}`);
    console.error('Fatal migration error:', error);
  }

  return result;
}

/**
 * Clean up old files that couldn't be migrated
 */
export async function cleanupOrphanedFiles(): Promise<string[]> {
  const orphanedFiles: string[] = [];
  
  try {
    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    const files = await readdir(uploadsDir);
    
    // Get all current file paths from database
    const images = await prisma.image.findMany({
      select: { path: true }
    });
    
    const dbPaths = new Set(images.map(img => img.path.split('/').pop()));
    
    for (const file of files) {
      // Skip directories and hidden files
      if (file.startsWith('.') || file.startsWith('user_')) {
        continue;
      }
      
      // Check if file exists in database
      if (!dbPaths.has(file)) {
        orphanedFiles.push(file);
      }
    }
    
  } catch (error) {
    console.error('Error during orphaned file cleanup:', error);
  }
  
  return orphanedFiles;
} 