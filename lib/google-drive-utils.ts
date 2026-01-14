/**
 * Google Drive URL handling and metadata extraction utilities
 * Supports Google Drive sharing links without requiring OAuth/API setup
 */

export interface GoogleDriveMetadata {
  fileId: string;
  fileName: string | null;
  isAccessible: boolean;
  fileType: 'pdf' | 'docx' | 'pptx' | 'doc' | 'ppt' | 'link';
}

/**
 * Check if a URL is a valid Google Drive URL
 * Supports various Google Drive URL formats
 */
export function isGoogleDriveUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    // Check if it's a Google Drive or Google Docs domain
    if (
      !hostname.includes('drive.google.com') &&
      !hostname.includes('docs.google.com')
    ) {
      return false;
    }

    // Check for valid Google Drive URL patterns
    const pathname = urlObj.pathname;
    const searchParams = urlObj.searchParams;

    // Pattern 1: /file/d/{fileId}/
    if (pathname.includes('/file/d/')) return true;

    // Pattern 2: /open?id={fileId}
    if (pathname.includes('/open') && searchParams.has('id')) return true;

    // Pattern 3: /document/d/{fileId}/
    if (pathname.includes('/document/d/')) return true;

    // Pattern 4: /spreadsheets/d/{fileId}/
    if (pathname.includes('/spreadsheets/d/')) return true;

    // Pattern 5: /presentation/d/{fileId}/
    if (pathname.includes('/presentation/d/')) return true;

    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Extract Google Drive file ID from various URL formats
 * Returns null if file ID cannot be extracted
 */
export function extractGoogleDriveFileId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const searchParams = urlObj.searchParams;

    // Pattern 1: /file/d/{fileId}/view or /file/d/{fileId}
    const fileMatch = pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch) return fileMatch[1];

    // Pattern 2: /open?id={fileId}
    if (searchParams.has('id')) return searchParams.get('id');

    // Pattern 3: /document/d/{fileId}/
    const docMatch = pathname.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
    if (docMatch) return docMatch[1];

    // Pattern 4: /spreadsheets/d/{fileId}/
    const sheetsMatch = pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (sheetsMatch) return sheetsMatch[1];

    // Pattern 5: /presentation/d/{fileId}/
    const slidesMatch = pathname.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/);
    if (slidesMatch) return slidesMatch[1];

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Sanitize and clean up display filename
 * Removes Google-specific suffixes and trims whitespace
 */
export function sanitizeDisplayFilename(filename: string): string {
  return filename
    .replace(/ - Google Drive$/i, '')
    .replace(/ - Google Docs$/i, '')
    .replace(/ - Google Sheets$/i, '')
    .replace(/ - Google Slides$/i, '')
    .trim()
    .substring(0, 255); // Max 255 characters
}

/**
 * Detect file type from Google Drive URL and filename
 * Returns the file type based on URL pattern or filename extension
 */
export function detectGoogleDriveFileType(
  url: string,
  fileName: string | null
): 'pdf' | 'docx' | 'pptx' | 'doc' | 'ppt' | 'link' {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;

    // Check URL pattern first
    if (pathname.includes('/document/d/')) {
      return 'docx'; // Google Docs
    }
    if (pathname.includes('/presentation/d/')) {
      return 'pptx'; // Google Slides
    }

    // For generic drive.google.com URLs, try to extract from filename
    if (fileName) {
      const lowerFileName = fileName.toLowerCase();

      // Check for file extensions
      if (lowerFileName.endsWith('.pdf')) return 'pdf';
      if (lowerFileName.endsWith('.docx')) return 'docx';
      if (lowerFileName.endsWith('.doc')) return 'doc';
      if (lowerFileName.endsWith('.pptx')) return 'pptx';
      if (lowerFileName.endsWith('.ppt')) return 'ppt';
    }

    // Default fallback
    return 'link';
  } catch (error) {
    return 'link';
  }
}

/**
 * Fetch metadata from Google Drive without OAuth
 * Uses the public preview page to extract file name from HTML title
 */
export async function fetchGoogleDriveMetadata(
  url: string
): Promise<GoogleDriveMetadata> {
  const fileId = extractGoogleDriveFileId(url);

  if (!fileId) {
    throw new Error('Invalid Google Drive URL format');
  }

  try {
    // Build preview URL
    const previewUrl = `https://drive.google.com/file/d/${fileId}/view`;

    // Fetch with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(previewUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 403 || response.status === 404) {
        throw new Error('This file is not publicly accessible. Please check sharing settings.');
      }
      throw new Error(`Failed to fetch file metadata: ${response.status}`);
    }

    const html = await response.text();

    // Parse title from HTML
    // Google Drive format: "filename - Google Drive"
    // Google Docs format: "filename - Google Docs"
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    let fileName: string | null = null;

    if (titleMatch && titleMatch[1]) {
      fileName = sanitizeDisplayFilename(titleMatch[1]);
    }

    // Fallback: Try to extract from og:title meta tag
    if (!fileName) {
      const ogTitleMatch = html.match(/<meta property="og:title" content="([^"]+)"/i);
      if (ogTitleMatch && ogTitleMatch[1]) {
        fileName = sanitizeDisplayFilename(ogTitleMatch[1]);
      }
    }

    // Detect file type from URL and filename
    const fileType = detectGoogleDriveFileType(url, fileName);

    return {
      fileId,
      fileName,
      isAccessible: true,
      fileType,
    };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - file may be too large or inaccessible');
    }
    throw error;
  }
}
