import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

let s3: S3Client | null = null;

function getClient(): S3Client {
  if (s3) return s3;
  const accountId = process.env.R2_ACCOUNT_ID;
  if (!accountId) throw new Error('R2_ACCOUNT_ID is not set.');
  s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
    },
  });
  return s3;
}

const BUCKET = process.env.R2_BUCKET ?? 'ddotsmediajobs';
const PUBLIC_URL = process.env.R2_PUBLIC_URL ?? '';

/** Presign a PUT URL for direct browser upload. Returns the upload URL + final public URL. */
export async function presignUpload(
  key: string,
  contentType: string,
): Promise<{ uploadUrl: string; publicUrl: string }> {
  const command = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType });
  const uploadUrl = await getSignedUrl(getClient(), command, { expiresIn: 600 });
  return { uploadUrl, publicUrl: `${PUBLIC_URL}/${key}` };
}
