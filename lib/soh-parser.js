import { cleanText, numberValue, classifyItem } from './calculations.js';

export function parseSOH(rows, targets) {
  const first=rows[0] || []; const blocks=[]; const stocks=[]; const warnings=[];
  for (let c=0; c<first.length; c+=10) {
    const h=cleanText(first[c]); const m=h.match(/^(M\d+)\s+(.+)/i);
    if (m) blocks.push({start:c,code:m[1].toUpperCase(),headerName:m[2].trim()});
  }
  const targetMap=new Map(targets.map(t=>[t.code,t]));
  for (const b of blocks) {
    const reportStore=cleanText(rows[1]?.[b.start+2]);
    const expected=targetMap.get(b.code)?.store || b.headerName;
    if (reportStore && !reportStore.toLowerCase().includes(b.headerName.replace(/^Digimap\s*/i,'').toLowerCase().split(' ')[0])) {
      warnings.push(`SOH ${b.code}: nama report \"${reportStore}\" berbeda dari header \"${b.headerName}\".`);
    }
    let count=0;
    for (let i=3;i<rows.length;i++) {
      const r=rows[i] || [];
      const brand=cleanText(r[b.start]);
      const division=cleanText(r[b.start+1]);
      const group=cleanText(r[b.start+2]);
      const type=cleanText(r[b.start+3]);
      const item=cleanText(r[b.start+4]);
      const barcode=cleanText(r[b.start+5]);
      const qty=numberValue(r[b.start+7]);
      if (!item && !barcode) continue;
      let article=item, description=item;
      const slash=item.indexOf(' / ');
      if (slash>0) { article=item.slice(0,slash).trim(); description=item.slice(slash+3).trim(); }
      const cls=classifyItem(description, article);
      stocks.push({ storeCode:b.code, store:expected, brand, division, group, stockType:type, article, description, barcode, qty, lob:cls.lob, category:cls.category });
      count++;
    }
    if (!count) warnings.push(`SOH ${b.code} tidak memiliki baris stock.`);
  }
  return { stocks, warnings, blocks };
}
