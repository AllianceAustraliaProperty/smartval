/**
 * S3 Direct Upload Service
 * Handles direct uploads to S3 using presigned URLs
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export interface PresignedUrlResponse {
  presignedUrl: string;
  fileKey: string;
  s3Url: string;
  bucket: string;
  region: string;
}

export interface UploadResult {
  success: boolean;
  s3Url?: string;
  error?: string;
}

/**
 * Get presigned URL for S3 upload
 */
export async function getPresignedUrl(
  reportId: string,
  fileExtension: string,
  contentType?: string,
  endpointBase: string = '/api/photos'
): Promise<PresignedUrlResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpointBase}/presigned-url/${reportId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileExtension,
        contentType,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get presigned URL');
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting presigned URL:', error);
    throw error;
  }
}

/**
 * Batch presigned URLs
 */
export async function getPresignedUrlsBatch(
  reportId: string,
  files: { fileExtension: string; contentType?: string }[],
  endpointBase: string = '/api/photos'
): Promise<PresignedUrlResponse[]> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpointBase}/presigned-batch/${reportId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ files }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to get presigned URLs');
    }
    const data = await response.json();
    return (data.items || []) as PresignedUrlResponse[];
  } catch (error) {
    console.error('Error getting batch presigned URLs:', error);
    throw error;
  }
}

/**
 * Upload file directly to S3 using presigned URL
 */
export async function uploadToS3(
  file: File,
  presignedUrl: string
): Promise<boolean> {
  try {
    const response = await fetch(presignedUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });

    if (!response.ok) {
      throw new Error(`S3 upload failed: ${response.status} ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error('Error uploading to S3:', error);
    throw error;
  }
}

/**
 * Confirm upload to backend and update database
 */
export async function confirmUpload(
  reportId: string,
  s3Url: string,
  fileKey: string,
  endpointBase: string = '/api/photos'
): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpointBase}/confirm-upload/${reportId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        s3Url,
        fileKey,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to confirm upload');
    }

    return await response.json();
  } catch (error) {
    console.error('Error confirming upload:', error);
    throw error;
  }
}

/**
 * Complete S3 upload process: get presigned URL, upload to S3, confirm with backend
 */
export async function uploadFileToS3(
  reportId: string,
  file: File,
  endpointBase: string = '/api/photos'
): Promise<UploadResult> {
  try {
    // Get file extension
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!fileExtension) {
      throw new Error('Invalid file: no extension found');
    }

    // Get presigned URL
    const presignedData = await getPresignedUrl(reportId, fileExtension, file.type, endpointBase);

    // Upload to S3
    await uploadToS3(file, presignedData.presignedUrl);

    // Confirm upload with backend
    const confirmResult = await confirmUpload(reportId, presignedData.s3Url, presignedData.fileKey, endpointBase);

    return {
      success: true,
      s3Url: presignedData.s3Url,
    };
  } catch (error) {
    console.error('S3 upload failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/** Upload using already-prepared presigned data */
export async function uploadWithPresigned(
  reportId: string,
  file: File,
  presigned: PresignedUrlResponse,
  endpointBase: string = '/api/photos'
): Promise<UploadResult> {
  try {
    await uploadToS3(file, presigned.presignedUrl);
    await confirmUpload(reportId, presigned.s3Url, presigned.fileKey, endpointBase);
    return { success: true, s3Url: presigned.s3Url };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Upload failed' };
  }
}

/**
 * Upload multiple files to S3
 */
export async function uploadMultipleFilesToS3(
  reportId: string,
  files: FileList,
  options: { maxConcurrent?: number; maxFiles?: number } = {},
  endpointBase: string = '/api/photos'
): Promise<{ successful: UploadResult[]; failed: UploadResult[] }> {
  const maxConcurrent = Math.max(1, options.maxConcurrent ?? 1);
  const maxFiles = options.maxFiles ?? undefined;

  const fileArray = Array.from(files);
  const queue = typeof maxFiles === 'number' ? fileArray.slice(0, maxFiles) : fileArray;

  const successful: UploadResult[] = [];
  const failed: UploadResult[] = [];

  // Try batch presigned URLs to avoid backend concurrency limits
  let presignedList: PresignedUrlResponse[] | null = null;
  try {
    const meta = queue.map(f => ({ fileExtension: (f.name.split('.').pop() || '').toLowerCase(), contentType: f.type }));
    presignedList = await getPresignedUrlsBatch(reportId, meta, endpointBase);
    if (!Array.isArray(presignedList) || presignedList.length !== queue.length) {
      presignedList = null; // fallback to per-file
    }
  } catch {
    presignedList = null;
  }

  let index = 0;

  async function worker() {
    while (index < queue.length) {
      const currentIndex = index++;
      const file = queue[currentIndex];
      try {
        let result: UploadResult;
        if (presignedList) {
          result = await uploadWithPresigned(reportId, file, presignedList[currentIndex], endpointBase);
        } else {
          result = await uploadFileToS3(reportId, file, endpointBase);
        }
        if (result.success) {
          successful.push(result);
        } else {
          failed.push(result);
        }
      } catch (err: any) {
        failed.push({ success: false, error: err?.message || 'Upload failed' });
      }
    }
  }

  const workers = Array.from({ length: Math.min(maxConcurrent, queue.length) }, () => worker());
  await Promise.all(workers);

  return { successful, failed };
}
