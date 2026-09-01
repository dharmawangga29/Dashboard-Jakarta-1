import crypto from 'node:crypto';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.readonly';

let tokenCache = { token: null, expiresAt: 0 };

function base64url(value) {
  const input = typeof value === 'string' ? Buffer.from(value) : value;
  return input.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function getCredentials() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;
  if (!clientEmail || !rawKey) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY belum dikonfigurasi.');
  }
  return {
    clientEmail,
    privateKey: rawKey.replace(/\\n/g, '\n')
  };
}

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (tokenCache.token && tokenCache.expiresAt - now > 120) return tokenCache.token;

  const { clientEmail, privateKey } = getCredentials();
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({
    iss: clientEmail,
    scope: DRIVE_SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600
  }));
  const unsigned = `${header}.${payload}`;
  const signature = crypto.sign('RSA-SHA256', Buffer.from(unsigned), privateKey);
  const assertion = `${unsigned}.${base64url(signature)}`;

  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion
  });
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  if (!response.ok) {
    throw new Error(`Gagal mengambil Google access token (${response.status}): ${await response.text()}`);
  }
  const json = await response.json();
  tokenCache = { token: json.access_token, expiresAt: now + Number(json.expires_in || 3600) };
  return tokenCache.token;
}

export async function getDriveFileMetadata(fileId) {
  const token = await getAccessToken();
  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType,modifiedTime,size&supportsAllDrives=true`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`Gagal membaca metadata Google Drive (${response.status}): ${await response.text()}`);
  return response.json();
}

export async function downloadDriveFile(fileId) {
  const token = await getAccessToken();
  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`Gagal download Excel dari Google Drive (${response.status}): ${await response.text()}`);
  return Buffer.from(await response.arrayBuffer());
}
