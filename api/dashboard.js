import fs from 'node:fs/promises';
import path from 'node:path';
import { parseWorkbook, buildSummary } from '../lib/parser.js';
import { getDriveFileMetadata, downloadDriveFile } from '../lib/google-drive.js';

let cache = { version: null, dataset: null, source: null };

async function getExcelSource() {
  const useLocal = process.env.USE_LOCAL_SAMPLE === 'true' || !process.env.GOOGLE_DRIVE_FILE_ID;
  if (useLocal) {
    const filePath = path.join(process.cwd(), 'sample', 'sample-data.xlsx');
    const stat = await fs.stat(filePath);
    return {
      version: `local-${stat.mtimeMs}-${stat.size}`,
      source: { mode: 'sample', name: 'sample-data.xlsx', modifiedTime: stat.mtime.toISOString(), size: stat.size },
      load: () => fs.readFile(filePath)
    };
  }
  const fileId = process.env.GOOGLE_DRIVE_FILE_ID;
  const meta = await getDriveFileMetadata(fileId);
  return {
    version: `${meta.modifiedTime}-${meta.size || ''}`,
    source: { mode: 'google-drive', ...meta },
    load: () => downloadDriveFile(fileId)
  };
}

async function loadDataset() {
  const sourceInfo = await getExcelSource();
  if (cache.dataset && cache.version === sourceInfo.version) return cache;
  const buffer = await sourceInfo.load();
  const dataset = parseWorkbook(buffer);
  cache = { version: sourceInfo.version, dataset, source: sourceInfo.source };
  return cache;
}

function respond(res, status, payload) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.end(JSON.stringify(payload));
}

export default async function handler(req, res) {
  try {
    const { dataset, source, version } = await loadDataset();
    const view = String(req.query?.view || 'summary');
    if (view === 'summary') {
      return respond(res, 200, { ok: true, version, source, stores: buildSummary(dataset) });
    }
    const code = String(req.query?.store || '').toUpperCase();
    const store = dataset.stores.find(s => s.code === code);
    if (!store) return respond(res, 404, { ok:false, error:`Store ${code || '(kosong)'} tidak ditemukan.` });

    if (view === 'store') {
      return respond(res, 200, {
        ok: true, version, source,
        store: { code:store.code, name:store.name, spv:store.spv, target:store.target },
        transactions: store.transactions
      });
    }
    if (view === 'stock') {
      return respond(res, 200, {
        ok: true, version, source,
        store: { code:store.code, name:store.name, warning:store.stockWarning, reportedStore:store.stockReportedStore },
        stock: store.stock
      });
    }
    return respond(res, 400, { ok:false, error:'Parameter view tidak valid.' });
  } catch (error) {
    console.error(error);
    return respond(res, 500, { ok:false, error:error.message || 'Terjadi error pada server.' });
  }
}
