import * as XLSX from 'xlsx';

const STORE_HEADER_RE = /^(M\d{3})\s+(.+)$/i;
const STAFF_RE = /^(\d{5,})\s*\/\s*(.+)$/;
const TOTAL_RE = /^TOTAL\s+FOR\s+/i;

const money = (v) => {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const s = String(v).trim().replace(/\s/g, '');
  if (!s) return 0;
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) return Number(s.replace(/\./g, '').replace(',', '.')) || 0;
  return Number(s.replace(/,/g, '')) || 0;
};

function normalizeName(v) {
  return String(v || '').trim().replace(/\s+/g, ' ').toUpperCase();
}

function excelSerialToISO(serial) {
  const n = Number(serial);
  if (!Number.isFinite(n)) return null;
  const utc = Math.round((n - 25569) * 86400 * 1000);
  const d = new Date(utc);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function parseDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === 'number' && value > 30000 && value < 80000) return excelSerialToISO(value);
  const s = String(value || '').trim();
  let m = s.match(/^(\d{1,2})[-\/]([01]?\d)[-\/](20\d{2})$/);
  if (m) return `${m[3]}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
  m = s.match(/^(20\d{2})[-\/]([01]?\d)[-\/](\d{1,2})$/);
  if (m) return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
  return null;
}

function parseStoreHeader(value) {
  const m = String(value || '').trim().match(STORE_HEADER_RE);
  return m ? { code: m[1].toUpperCase(), name: m[2].trim() } : null;
}

function classify(description, article, category = '', subcategory = '') {
  const desc = normalizeName(description);
  const art = normalizeName(article);
  const cat = normalizeName(category);
  const sub = normalizeName(subcategory);
  const hay = `${desc} ${art} ${cat} ${sub}`;

  const qoala = (art.startsWith('KLA') || /\bKLA[A-Z0-9]/.test(hay) || hay.includes('QOALA')) && !hay.includes('MUKLAY');
  if (art.startsWith('TSL') || /\bTELKOMSEL\b/.test(hay)) return { group: 'VAS', lob: 'Telkomsel' };
  if (art.startsWith('XXL') || /\bXL\b/.test(hay)) return { group: 'VAS', lob: 'XL' };
  if (art.startsWith('IDT') || /\bINDOSAT\b/.test(hay)) return { group: 'VAS', lob: 'Indosat' };
  if (qoala) return { group: 'VAS', lob: 'Qoala' };

  if (/\bIPHONE\b/.test(desc)) return { group: 'DEVICE', lob: 'iPhone' };
  if (/\bIPAD\b/.test(desc)) return { group: 'DEVICE', lob: 'iPad' };
  if (/APPLE\s*WATCH|\bWATCH\s+(SE|ULTRA|SERIES|10|11|9|8|7|6|5|4|3)\b/.test(desc)) return { group: 'DEVICE', lob: 'Apple Watch' };
  if (/\bMACBOOK\b|\bIMAC\b|\bMAC\s+MINI\b|\bMAC\s+STUDIO\b|\bMAC\s+PRO\b|\bMBA\b|\bMBP\b/.test(desc)) return { group: 'DEVICE', lob: 'Mac' };

  return { group: 'ACCY', lob: 'Accy' };
}

function parseTargets(rows) {
  const headerIndex = rows.findIndex(r => String(r?.[0] || '').trim().toLowerCase() === 'site');
  if (headerIndex < 0) throw new Error('Header Sheet Target tidak ditemukan.');
  const headers = rows[headerIndex].map(v => normalizeName(v));
  const col = (name) => headers.indexOf(normalizeName(name));
  const result = {};
  for (let i = headerIndex + 1; i < rows.length; i++) {
    const r = rows[i] || [];
    const code = String(r[col('Site')] || '').trim().toUpperCase();
    if (!/^M\d{3}$/.test(code)) continue;
    result[code] = {
      code,
      store: String(r[col('Store')] || '').trim(),
      concept: String(r[col('Concept')] || '').trim(),
      target: money(r[col('Target')]),
      targetApple: money(r[col('Target Apple')]),
      targetAccy: money(r[col('Target Accy')]),
      targetVAS: money(r[col('Target VAS')]),
      spv: String(r[col('SPV')] || '').trim()
    };
  }
  return result;
}

function parseSPW(rows, targets) {
  const stores = [];
  for (let start = 0; start < (rows[0]?.length || 0); start += 4) {
    const store = parseStoreHeader(rows[0]?.[start]);
    if (!store) continue;
    let currentDate = null;
    let currentStaff = null;
    const transactions = [];
    const spvNorm = normalizeName(targets[store.code]?.spv);

    for (let i = 1; i < rows.length; i++) {
      const r = rows[i] || [];
      const v0 = r[start];
      const v1 = r[start + 1];
      const v2 = r[start + 2];
      const date = parseDate(v0);
      if (date && (v1 === null || v1 === undefined || v1 === '')) {
        currentDate = date;
        currentStaff = null;
        continue;
      }
      const text0 = String(v0 || '').trim();
      const staff = text0.match(STAFF_RE);
      if (staff && (v1 === null || v1 === undefined || v1 === '')) {
        const staffName = staff[2].trim();
        currentStaff = normalizeName(staffName) === spvNorm ? null : { id: staff[1], name: staffName };
        continue;
      }
      if (!currentStaff || !currentDate || !text0 || TOTAL_RE.test(text0)) continue;
      if (v1 === null || v1 === undefined || String(v1).trim() === '') continue;

      const nr = rows[i + 1] || [];
      const gross = money(nr[start]);
      const txnIdRaw = nr[start + 1];
      const net = money(nr[start + 2]);
      const nextLooksNumeric = [nr[start], nr[start + 1], nr[start + 2]].some(x => typeof x === 'number' || /^-?[\d,.Ee+]+$/.test(String(x || '').trim()));
      if (!nextLooksNumeric) continue;

      const description = text0;
      const article = String(v1 || '').trim();
      const classification = classify(description, article);
      transactions.push({
        date: currentDate,
        staffId: currentStaff.id,
        staffName: currentStaff.name,
        description,
        article,
        transactionId: String(txnIdRaw ?? '').trim(),
        grossAmount: gross,
        amount: Number.isFinite(net) ? net : gross,
        group: classification.group,
        lob: classification.lob
      });
      i += 1;
    }
    stores.push({ ...store, transactions });
  }
  return stores;
}

function parseSOH(rows) {
  const stores = [];
  for (let start = 0; start < (rows[0]?.length || 0); start += 10) {
    const store = parseStoreHeader(rows[0]?.[start]);
    if (!store) continue;
    const reportedStore = String(rows[1]?.[start + 2] || '').trim();
    const stock = [];
    for (let i = 2; i < rows.length; i++) {
      const r = rows[i] || [];
      const brand = String(r[start] || '').trim();
      const category = String(r[start + 2] || '').trim();
      const subcategory = String(r[start + 3] || '').trim();
      const description = String(r[start + 4] || '').trim();
      const article = String(r[start + 5] || '').trim();
      const qty = money(r[start + 7]);
      if (!description || !article || !Number.isFinite(qty)) continue;
      const classification = classify(description, article, category, subcategory);
      stock.push({ brand, category, subcategory, article, description, qty, group: classification.group, lob: classification.lob });
    }
    const warning = !stock.length ? `SOH ${store.code} kosong pada file sumber.` : (reportedStore && normalizeName(reportedStore) !== normalizeName(store.name) ? `Header SOH ${store.code} tertulis \"${store.name}\", tetapi report di dalam blok tertulis \"${reportedStore}\".` : null);
    stores.push({ ...store, reportedStore, warning, stock });
  }
  return stores;
}

function uniqueTransactions(txns) {
  return new Set(txns.map(t => `${t.date}|${t.staffId}|${t.transactionId || t.article}|${t.transactionId ? '' : t.description}`)).size;
}

export function aggregateTransactions(txns) {
  const totalAmount = txns.reduce((s,t) => s + t.amount, 0);
  const device = txns.filter(t => t.group === 'DEVICE');
  const accy = txns.filter(t => t.group === 'ACCY');
  const vas = txns.filter(t => t.group === 'VAS');
  const trxCount = uniqueTransactions(txns);
  const uptUnits = txns.filter(t => t.amount > 0 && t.group !== 'VAS').length;
  const lobAmount = {};
  const lobUnits = {};
  for (const lob of ['iPhone','iPad','Apple Watch','Mac']) {
    const list = device.filter(t => t.lob === lob);
    lobAmount[lob] = list.reduce((s,t) => s + t.amount, 0);
    lobUnits[lob] = list.filter(t => t.amount > 0).length;
  }
  return {
    amount: totalAmount,
    deviceAmount: device.reduce((s,t) => s + t.amount, 0),
    accyAmount: accy.reduce((s,t) => s + t.amount, 0),
    vasAmount: vas.reduce((s,t) => s + t.amount, 0),
    lobAmount,
    lobUnits,
    transactions: trxCount,
    units: uptUnits,
    upt: trxCount ? uptUnits / trxCount : 0,
    atv: trxCount ? totalAmount / trxCount : 0
  };
}

export function parseWorkbook(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer', raw: true, cellDates: false });
  for (const required of ['SPW','SOH','Target']) {
    if (!workbook.Sheets[required]) throw new Error(`Sheet ${required} tidak ditemukan.`);
  }
  const toRows = (name) => XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: null, raw: true });
  const targetRows = toRows('Target');
  const targets = parseTargets(targetRows);
  const salesStores = parseSPW(toRows('SPW'), targets);
  const stockStores = parseSOH(toRows('SOH'));
  const stockMap = Object.fromEntries(stockStores.map(s => [s.code, s]));

  const stores = salesStores.map(s => {
    const target = targets[s.code] || { code:s.code, store:s.name, target:0,targetApple:0,targetAccy:0,targetVAS:0,spv:'' };
    return {
      code: s.code,
      name: target.store || s.name,
      headerName: s.name,
      spv: target.spv,
      target,
      transactions: s.transactions,
      stock: stockMap[s.code]?.stock || [],
      stockWarning: stockMap[s.code]?.warning || null,
      stockReportedStore: stockMap[s.code]?.reportedStore || null
    };
  });
  return { stores, targets };
}

export function buildSummary(dataset) {
  return dataset.stores.map(s => {
    const a = aggregateTransactions(s.transactions);
    const t = s.target;
    const pct = (actual, target) => target ? actual / target : 0;
    return {
      code: s.code,
      name: s.name,
      spv: s.spv,
      sales: a,
      target: t,
      achievement: {
        total: pct(a.amount, t.target),
        apple: pct(a.deviceAmount, t.targetApple),
        accy: pct(a.accyAmount, t.targetAccy),
        vas: pct(a.vasAmount, t.targetVAS)
      },
      staffCount: new Set(s.transactions.map(x => x.staffId)).size,
      dateMin: s.transactions.map(x=>x.date).sort()[0] || null,
      dateMax: s.transactions.map(x=>x.date).sort().at(-1) || null,
      stockLines: s.stock.length,
      stockQty: s.stock.reduce((sum,x)=>sum+x.qty,0),
      stockWarning: s.stockWarning
    };
  });
}
