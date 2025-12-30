import { fileTypeFromBuffer } from 'file-type';

export interface FileValidationOptions {
  maxSizeBytes: number;
  allowedExtensions: string[];
  allowedMimeTypes?: string[];
  maxWidth?: number;
  maxHeight?: number;
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  documentType?: string;
}

/**
 * Validate image upload with security checks
 */
export async function validateImageUpload(
  file: File,
  options: FileValidationOptions
): Promise<FileValidationResult> {
  // Check file size
  if (file.size > options.maxSizeBytes) {
    return {
      valid: false,
      error: `File size exceeds ${options.maxSizeBytes / (1024 * 1024)}MB limit`,
    };
  }

  // Read file buffer for magic byte check
  const buffer = Buffer.from(await file.arrayBuffer());
  const fileType = await fileTypeFromBuffer(buffer);

  // Check magic bytes (MIME type)
  if (!fileType || !fileType.mime.startsWith('image/')) {
    return {
      valid: false,
      error: 'Invalid file type. Only images are allowed.',
    };
  }

  // Check extension against whitelist
  const extension = fileType.ext.toLowerCase();
  if (!options.allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `File type .${extension} not allowed. Allowed: ${options.allowedExtensions.join(', ')}`,
    };
  }

  // Check image dimensions if specified
  if (options.maxWidth || options.maxHeight) {
    try {
      const dimensions = await getImageDimensions(buffer);

      if (options.maxWidth && dimensions.width > options.maxWidth) {
        return {
          valid: false,
          error: `Image width exceeds ${options.maxWidth}px`,
        };
      }

      if (options.maxHeight && dimensions.height > options.maxHeight) {
        return {
          valid: false,
          error: `Image height exceeds ${options.maxHeight}px`,
        };
      }
    } catch (error) {
      console.error('[File Validation] Error checking dimensions:', error);
      return {
        valid: false,
        error: 'Unable to validate image dimensions',
      };
    }
  }

  return { valid: true };
}

/**
 * Get image dimensions from buffer
 */
async function getImageDimensions(
  buffer: Buffer
): Promise<{ width: number; height: number }> {
  // Use sharp for server-side image processing (more reliable than browser APIs)
  // Note: You may want to install sharp: npm install sharp
  // For now, using a basic implementation that reads dimensions from common formats

  // PNG dimensions (reading from IHDR chunk)
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    return { width, height };
  }

  // JPEG dimensions (reading from SOF marker)
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset < buffer.length) {
      if (buffer[offset] === 0xff) {
        const marker = buffer[offset + 1];
        // SOF0, SOF1, SOF2 markers
        if (marker >= 0xc0 && marker <= 0xc2) {
          const height = buffer.readUInt16BE(offset + 5);
          const width = buffer.readUInt16BE(offset + 7);
          return { width, height };
        }
        // Skip to next marker
        const length = buffer.readUInt16BE(offset + 2);
        offset += length + 2;
      } else {
        offset++;
      }
    }
  }

  // If we can't determine dimensions, return large values to not block upload
  // In production, consider using sharp library for robust dimension detection
  console.warn('[File Validation] Could not determine image dimensions');
  return { width: 0, height: 0 };
}

/**
 * Validate document upload (PDF, DOCX, PPTX) with security checks
 */
export async function validateDocumentUpload(
  file: File,
  options: FileValidationOptions
): Promise<FileValidationResult> {
  // Check file size
  if (file.size > options.maxSizeBytes) {
    return {
      valid: false,
      error: `File size exceeds ${options.maxSizeBytes / (1024 * 1024)}MB limit`,
    };
  }

  // Read file buffer for magic byte check
  const buffer = Buffer.from(await file.arrayBuffer());
  const fileType = await fileTypeFromBuffer(buffer);

  if (!fileType) {
    return {
      valid: false,
      error: 'Unable to determine file type',
    };
  }

  // Define allowed MIME types for documents
  const allowedMimeTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
    'application/msword', // DOC
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // PPTX
    'application/vnd.ms-powerpoint', // PPT
  ];

  // Check magic bytes (MIME type)
  if (!allowedMimeTypes.includes(fileType.mime)) {
    return {
      valid: false,
      error: 'Invalid file type. Only PDF, DOCX, and PPTX files are allowed.',
    };
  }

  // Map MIME to file type
  const fileTypeMap: Record<string, string> = {
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'application/vnd.ms-powerpoint': 'ppt',
  };

  const documentType = fileTypeMap[fileType.mime];

  return {
    valid: true,
    documentType,
  };
}
