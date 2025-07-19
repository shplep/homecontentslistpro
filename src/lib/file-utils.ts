import { join } from 'path';
import { mkdir, unlink, readdir } from 'fs/promises';

export interface FileUploadConfig {
  userId: number;
  itemId: number;
  maxFileSize?: number; // in bytes
  allowedTypes?: string[];
  allowedExtensions?: string[];
}

export const DEFAULT_MAX_FILE_SIZE = 6 * 1024 * 1024; // 6MB
export const DEFAULT_ALLOWED_TYPES = [
  'image/jpeg', 
  'image/jpg', 
  'image/png', 
  'application/pdf', 
  'application/msword', 
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];
export const DEFAULT_ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.pdf', '.doc', '.docx'];

/**
 * Generate organized file path structure
 */
export function generateFilePath(userId: number, itemId: number, filename: string): {
  userDir: string;
  itemDir: string;
  fullPath: string;
  webPath: string;
} {
  const userDir = `user_${userId}`;
  const itemDir = `item_${itemId}`;
  const fullPath = join(process.cwd(), 'public', 'uploads', userDir, itemDir);
  const webPath = `/uploads/${userDir}/${itemDir}/${filename}`;
  
  return { userDir, itemDir, fullPath, webPath };
}

/**
 * Generate unique filename with timestamp and random suffix
 */
export function generateUniqueFilename(originalFilename: string): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 15);
  const extension = originalFilename.split('.').pop();
  return `${timestamp}_${randomSuffix}.${extension}`;
}

/**
 * Validate file type and size
 */
export function validateFile(
  file: File, 
  config: Partial<FileUploadConfig> = {}
): string | null {
  const maxSize = config.maxFileSize || DEFAULT_MAX_FILE_SIZE;
  const allowedTypes = config.allowedTypes || DEFAULT_ALLOWED_TYPES;
  const allowedExtensions = config.allowedExtensions || DEFAULT_ALLOWED_EXTENSIONS;

  // Check file type
  const hasValidType = allowedTypes.includes(file.type);
  const hasValidExtension = allowedExtensions.some(ext => 
    file.name.toLowerCase().endsWith(ext)
  );
  
  if (!hasValidType && !hasValidExtension) {
    return `Invalid file type: ${file.name}. Only ${allowedExtensions.join(', ')} files are allowed.`;
  }
  
  // Check file size
  if (file.size > maxSize) {
    return `File too large: ${file.name}. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB.`;
  }
  
  return null;
}

/**
 * Create directory structure for user files
 */
export async function ensureDirectoryExists(fullPath: string): Promise<void> {
  await mkdir(fullPath, { recursive: true });
}

/**
 * Delete file from filesystem
 */
export async function deleteFile(filePath: string): Promise<boolean> {
  try {
    await unlink(filePath);
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
}

/**
 * Get all files in a directory (useful for cleanup)
 */
export async function listFiles(directoryPath: string): Promise<string[]> {
  try {
    return await readdir(directoryPath);
  } catch (error) {
    console.error('Error listing files:', error);
    return [];
  }
}

/**
 * Clean up empty directories after file deletion
 */
export async function cleanupEmptyDirectories(itemPath: string, userPath: string): Promise<void> {
  try {
    // Try to remove item directory if empty
    const itemFiles = await listFiles(itemPath);
    if (itemFiles.length === 0) {
      await unlink(itemPath);
      
      // Try to remove user directory if empty
      const userFiles = await listFiles(userPath);
      if (userFiles.length === 0) {
        await unlink(userPath);
      }
    }
  } catch (error) {
    // Ignore errors - directories might not be empty or might not exist
  }
} 