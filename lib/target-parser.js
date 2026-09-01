import { cleanText, numberValue } from './calculations.js';

export function parseTargets(rows) {
  const headerIndex = rows.findIndex(r => r.some(v => cleanText(v).toLowerCase() === 'site'));
  if (headerIndex < 0) throw new Error('Header Target tidak ditemukan.');
  const header = rows[headerIndex].map(v => cleanText(v).toLowerCase());
  const col = (name) => header.indexOf(name.toLowerCase());
  const out = [];
  for (const r of rows.slice(headerIndex + 1)) {
    const code = cleanText(r[col('site')]);
    if (!/^M\d+/i.test(code)) continue;
    out.push({
      code: code.toUpperCase(), store: cleanText(r[col('store')]), concept: cleanText(r[col('concept')]),
      target: numberValue(r[col('target')]), targetApple: numberValue(r[col('target apple')]),
      targetAccy: numberValue(r[col('target accy')]), targetVAS: numberValue(r[col('target vas')]),
      spv: cleanText(r[col('spv')])
    });
  }
  return out;
}
