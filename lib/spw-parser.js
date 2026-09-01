import { cleanText, numberValue, formatDateValue, classifyItem } from './calculations.js';

function normalizeName(s) { return cleanText(s).toLowerCase().replace(/[^a-z0-9]+/g,' ' ).trim(); }
function parseStaff(value) {
  const s = cleanText(value);
  const m = s.match(/^(\d{5,})\s*\/\s*(.+)$/);
  if (!m) return null;
  return { id: m[1], name: m[2].trim() };
}
function isTotalLine(v) { return /^total\s+for\b/i.test(cleanText(v)); }

export function parseSPW(rows, targets) {
  const first = rows[0] || [];
  const blocks = [];
  for (let c=0; c<first.length; c+=4) {
    const head = cleanText(first[c]);
    const m = head.match(/^(M\d+)\s+(.+)/i);
    if (m) blocks.push({ start:c, code:m[1].toUpperCase(), headerName:m[2].trim() });
  }
  const targetMap = new Map(targets.map(t=>[t.code,t]));
  const transactions=[]; const warnings=[];

  for (const b of blocks) {
    const target=targetMap.get(b.code);
    const spvNorm=normalizeName(target?.spv || '');
    let currentDate=null, currentStaff=null;
    for (let i=1; i<rows.length; i++) {
      const r=rows[i] || [];
      const a=cleanText(r[b.start]), article=cleanText(r[b.start+1]), c=r[b.start+2];
      if (!a && !article) continue;
      const date=formatDateValue(r[b.start]);
      if (date) { currentDate=date; currentStaff=null; continue; }
      if (isTotalLine(a)) { currentStaff=null; continue; }
      const staff=parseStaff(a);
      if (staff && !article) {
        currentStaff = normalizeName(staff.name) === spvNorm ? null : staff;
        continue;
      }
      if (!currentStaff || !currentDate || !article) continue;
      const next=rows[i+1] || [];
      const total=numberValue(next[b.start]);
      const receipt=cleanText(next[b.start+1]);
      const unit=numberValue(next[b.start+2]);
      const nextLooksNumeric = total !== 0 || unit !== 0 || /^\d{6,}$/.test(receipt);
      if (!nextLooksNumeric) continue;
      const classification=classifyItem(a, article);
      const qty = unit > 0 && total >= 0 ? Math.max(0, Math.round((total / unit) * 100) / 100) : (total > 0 ? 1 : 0);
      transactions.push({
        storeCode:b.code, store:target?.store || b.headerName, date:currentDate,
        staffId:currentStaff.id, staff:currentStaff.name, description:a, article,
        amount:total, receipt, unitPrice:unit, qty, ...classification
      });
      i += 1;
    }
  }
  for (const t of targets) if (!blocks.some(b=>b.code===t.code)) warnings.push(`SPW ${t.code} tidak ditemukan.`);
  return { transactions, warnings, blocks };
}
