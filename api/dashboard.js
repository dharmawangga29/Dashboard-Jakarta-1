import { getExcelBuffer } from '../lib/google-drive.js';
import { readWorkbook } from '../lib/excel-reader.js';
import { parseDashboard } from '../lib/parser.js';

export default async function handler(req,res) {
  try {
    res.setHeader('Cache-Control','s-maxage=30, stale-while-revalidate=60');
    const source=await getExcelBuffer();
    const workbook=readWorkbook(source.buffer);
    const data=parseDashboard(workbook);
    res.status(200).json({ ok:true, source:{type:source.source,fileName:source.fileName,modifiedTime:source.modifiedTime}, ...data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok:false, error:error?.message || 'Unknown error' });
  }
}
