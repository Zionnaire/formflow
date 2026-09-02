import { cloudinary } from '../config/cloudinary.js';
import { logger } from '../Middlewares/logger.js';

export interface UploadResult {
  url: string;
  publicId: string;
  format: string;
  bytes: number;
  width?: number;
  height?: number;
}

/** Profile photos and signatures — stored as authenticated (unlisted) image assets. */
export async function uploadImage(
  fileBuffer: Buffer,
  folder: string,
  options?: { maxWidth?: number; maxHeight?: number },
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `formflow/${folder}`,
        resource_type: 'image',
        type: 'authenticated',
        format: 'webp',
        transformation: [
          {
            width: options?.maxWidth ?? 1200,
            height: options?.maxHeight ?? 1200,
            crop: 'limit',
            quality: 'auto',
          },
        ],
      },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error('Upload failed'));
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          format: result.format,
          bytes: result.bytes,
          width: result.width,
          height: result.height,
        });
      },
    );
    uploadStream.end(fileBuffer);
  });
}

/** Source PDFs and generated, filled PDFs — stored as authenticated raw assets. */
export async function uploadDocument(fileBuffer: Buffer, folder: string, originalName: string): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `formflow/${folder}`,
        resource_type: 'raw',
        type: 'authenticated',
        public_id: originalName,
        use_filename: true,
        unique_filename: true,
      },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error('Upload failed'));
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          format: result.format,
          bytes: result.bytes,
        });
      },
    );
    uploadStream.end(fileBuffer);
  });
}

export async function deleteAsset(publicId: string, resourceType: 'image' | 'raw' = 'image'): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType, type: 'authenticated' });
    logger.info({ publicId }, 'Cloudinary asset deleted');
  } catch (err) {
    logger.error({ err, publicId }, 'Failed to delete Cloudinary asset');
  }
}
