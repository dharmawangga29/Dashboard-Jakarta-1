export const DEVICE_LOBS = ['iPhone', 'iPad', 'Apple Watch', 'Mac'];

export function cleanText(v) { return String(v ?? '').trim(); }
export function numberValue(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const s = cleanText(v).replace(/\s/g, '').replace(/,/g, '');
  if (!s) return 0;
  // Indonesian target strings use dot thousands separators.
  if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) return Number(s.replace(/\./g, '')) || 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}
export function formatDateValue(v) {
  if (v instanceof Date && !Number.isNaN(v.valueOf())) return v.toISOString().slice(0,10);
  const s = cleanText(v);
  let m = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  if (/^\d{5}(?:\.0)?$/.test(s)) {
    const n = Number(s);
    const d = new Date(Date.UTC(1899, 11, 30) + n * 86400000);
    return d.toISOString().slice(0,10);
  }
  return null;
}
export function classifyItem(description, article = '') {
  const d = cleanText(description).toUpperCase();
  const a = cleanText(article).toUpperCase();
  const both = `${d} ${a}`;
  if (a.startsWith('TSL') || both.includes('TELKOMSEL')) return { category: 'VAS', lob: 'Telkomsel', type: 'Telkomsel' };
  if (a.startsWith('XXL') || /\bXL\b/.test(both)) return { category: 'VAS', lob: 'XL', type: 'XL' };
  if (a.startsWith('IDT') || both.includes('INDOSAT')) return { category: 'VAS', lob: 'Indosat', type: 'Indosat' };
  if ((a.startsWith('KLA') || both.includes('QOALA') || both.includes('PROTEKSI')) && !both.includes('MUKLAY')) return { category: 'VAS', lob: 'Qoala', type: 'Qoala' };

  if (d.includes('IPHONE')) return { category: 'Device', lob: 'iPhone', type: inferType(d, 'IPHONE') };
  if (d.includes('IPAD')) return { category: 'Device', lob: 'iPad', type: inferType(d, 'IPAD') };
  if (d.includes('APPLE WATCH') || /^AW\b/.test(d)) return { category: 'Device', lob: 'Apple Watch', type: inferType(d, 'APPLE WATCH') };
  if (/\bMACBOOK\b|\bMBP\b|\bMBA\b|\bIMAC\b|\bMAC MINI\b|\bMAC STUDIO\b/.test(d)) return { category: 'Device', lob: 'Mac', type: inferType(d, 'MAC') };

  if (/MUKLAY|SHOPPING BAG|WARRANTY CARD/.test(both)) return { category: 'Other', lob: 'Other', type: 'Other' };
  return { category: 'Accy', lob: 'Accy', type: inferAccessoryType(d) };
}
function inferType(desc, family) {
  let s = desc.replace(/\s+/g, ' ').trim();
  const stop = [' 128GB',' 256GB',' 512GB',' 1TB',' 2TB',' WI-FI',' WIFI',' CELLULAR',' CASE',' TEMPERED',' CLEAR',' SILICONE'];
  let end = s.length;
  for (const token of stop) { const i = s.indexOf(token); if (i > 0) end = Math.min(end, i); }
  s = s.slice(0, end).trim();
  if (family === 'IPHONE') return s.match(/IPHONE\s+(?:\d+[A-Z]?|AIR|SE)(?:\s+(?:PRO MAX|PRO|PLUS|E))?/i)?.[0] || s.slice(0,40);
  if (family === 'IPAD') return s.match(/IPAD\s+(?:PRO|AIR|MINI|\d+TH|\d+(?:ST|ND|RD|TH)?)(?:\s+\d{1,2}(?:-INCH)?)?/i)?.[0] || s.slice(0,40);
  if (family === 'APPLE WATCH') return s.match(/APPLE WATCH\s+(?:ULTRA\s*\d*|SE\s*\d*|\d+)/i)?.[0] || 'Apple Watch';
  if (family === 'MAC') return s.match(/(?:MACBOOK\s+(?:AIR|PRO)|MBP|MBA|IMAC|MAC MINI|MAC STUDIO)[^,]*/i)?.[0]?.slice(0,45) || 'Mac';
  return s.slice(0,40);
}
function inferAccessoryType(d) {
  if (/AIRPODS|EARPHONE|EARPHONES/.test(d)) return 'Audio';
  if (/CHARGER|POWER ADAPTER/.test(d)) return 'Charger';
  if (/CABLE|CONNECTOR/.test(d)) return 'Cable';
  if (/CASE|MAGCASE|SHELL/.test(d)) return 'Case';
  if (/PENCIL|STYLUS/.test(d)) return 'Stylus';
  if (/POWER BANK|PB /.test(d)) return 'Power Bank';
  return 'Accessories';
}
export function aggregateTransactions(items) {
  const sum = (fn) => items.reduce((a,x) => a + (fn(x) || 0), 0);
  const amount = sum(x=>x.amount);
  const deviceAmount = sum(x=>x.category === 'Device' ? x.amount : 0);
  const accyAmount = sum(x=>x.category === 'Accy' ? x.amount : 0);
  const vasAmount = sum(x=>x.category === 'VAS' ? x.amount : 0);
  const units = sum(x=>x.qty);
  const receipts = new Set(items.map(x=>x.receipt).filter(Boolean)).size;
  const tx = receipts || items.filter(x=>x.amount>0).length;
  return {
    amount, deviceAmount, accyAmount, vasAmount, units, transactions: tx,
    iPhone: sum(x=>x.lob === 'iPhone' ? x.qty : 0),
    iPad: sum(x=>x.lob === 'iPad' ? x.qty : 0),
    appleWatch: sum(x=>x.lob === 'Apple Watch' ? x.qty : 0),
    mac: sum(x=>x.lob === 'Mac' ? x.qty : 0),
    upt: tx ? units / tx : 0,
    atv: tx ? amount / tx : 0
  };
}
