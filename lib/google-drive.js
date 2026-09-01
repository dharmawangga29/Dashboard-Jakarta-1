import fs from 'node:fs/promises';
import path from 'node:path';
import { google } from 'googleapis';

function normalizePrivateKey(value = '') {
  return value.replace(/\\n/g, '\n');
}

export async function getExcelBuffer() {
  if (String(process.env.USE_LOCAL_SAMPLE).toLowerCase() === 'true') {
    const p = path.join(process.cwd(), 'sample', 'SPW-SOH-Jakarta-1-2.xlsx');
    return {
      buffer: await fs.readFile(p),
      source: 'local-sample',
      modifiedTime: null,
      fileName: path.basename(p)
    };
  }

  const fileId = process.env.GOOGLE_DRIVE_FILE_ID;
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = normalizePrivateKey(process.env.GOOGLE_PRIVATE_KEY);

  if (!fileId || !clientEmail || !privateKey) {
    throw new Error('Environment Google Drive belum lengkap. Isi GOOGLE_DRIVE_FILE_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, dan GOOGLE_PRIVATE_KEY.');
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/drive.readonly']
  });
  const drive = google.drive({ version: 'v3', auth });

  const [meta, file] = await Promise.all([
    drive.files.get({ fileId, fields: 'id,name,modifiedTime,mimeType,size' }),
    drive.files.get({ fileId, alt: 'media' }, { responseType: 'arraybuffer' })
  ]);

  return {
    buffer: Buffer.from(file.data),
    source: 'google-drive',
    modifiedTime: meta.data.modifiedTime || null,
    fileName: meta.data.name || 'Google Drive Excel'
  };
}
