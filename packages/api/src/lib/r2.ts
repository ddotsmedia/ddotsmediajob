import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { TRPCError } from '@trpc/server';
import { isR2Configured } from './integrations';

export { isR2Configured };

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
  if (!isR2Configured()) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'File uploads are disabled — configure Cloudflare R2 in settings to enable uploads.',
    });
  }
  const command = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType });
  const uploadUrl = await getSignedUrl(getClient(), command, { expiresIn: 600 });
  return { uploadUrl, publicUrl: `${PUBLIC_URL}/${key}` };
}

/** Delete an R2 object given its stored public URL. No-op if the URL isn't ours. */
export async function deleteObjectByUrl(url: string): Promise<void> {
  if (!PUBLIC_URL || !url.startsWith(`${PUBLIC_URL}/`)) return;
  const key = url.slice(PUBLIC_URL.length + 1);
  if (!key) return;
  await getClient().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}
