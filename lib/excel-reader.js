import XLSX from 'xlsx';

export function readWorkbook(buffer) {
  return XLSX.read(buffer, { type: 'buffer', cellDates: true, raw: false });
}

export function sheetToRows(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error(`Sheet \"${sheetName}\" tidak ditemukan.`);
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
}

export function requiredSheets(workbook, names = ['SPW', 'Target', 'SOH']) {
  const missing = names.filter((name) => !workbook.SheetNames.includes(name));
  if (missing.length) throw new Error(`Sheet wajib tidak ditemukan: ${missing.join(', ')}`);
}
