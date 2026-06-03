import { Readable } from 'stream';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export function uploadToCloudinary(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'qr-menu', resource_type: 'image' },
      (err, result) => (err ? reject(err) : resolve(result!.secure_url))
    );
    Readable.from(buffer).pipe(stream);
  });
}
