/**
 * Google Indexing API — notify Google when job URLs are published or removed.
 * Graceful: no-op (and never throws) when GOOGLE_SERVICE_ACCOUNT_JSON is unset
 * or malformed. Quota is 200 URLs/day per project.
 */
import { google } from 'googleapis';

const RAW = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

export function isIndexingConfigured(): boolean {
  return !!RAW;
}

let jwt: InstanceType<typeof google.auth.JWT> | null = null;
function getAuth(): InstanceType<typeof google.auth.JWT> | null {
  if (!RAW) return null;
  if (jwt) return jwt;
  try {
    const cred = JSON.parse(RAW) as { client_email: string; private_key: string };
    jwt = new google.auth.JWT({ email: cred.client_email, key: cred.private_key, scopes: ['https://www.googleapis.com/auth/indexing'] });
    return jwt;
  } catch (err) {
    console.error('[indexing] bad GOOGLE_SERVICE_ACCOUNT_JSON:', err instanceof Error ? err.message : err);
    return null;
  }
}

/** Submit a single URL. type: URL_UPDATED (published) or URL_DELETED. Best-effort. */
export async function submitUrl(url: string, type: 'URL_UPDATED' | 'URL_DELETED' = 'URL_UPDATED'): Promise<boolean> {
  const auth = getAuth();
  if (!auth) return false;
  try {
    const indexing = google.indexing({ version: 'v3', auth });
    await indexing.urlNotifications.publish({ requestBody: { url, type } });
    console.log(`[indexing] ${type} ${url}`);
    return true;
  } catch (err) {
    console.error('[indexing] submit failed:', err instanceof Error ? err.message : err);
    return false;
  }
}
