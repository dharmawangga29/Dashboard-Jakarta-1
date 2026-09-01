import { sheetToRows, requiredSheets } from './excel-reader.js';
import { parseTargets } from './target-parser.js';
import { parseSPW } from './spw-parser.js';
import { parseSOH } from './soh-parser.js';
import { aggregateTransactions } from './calculations.js';

export function parseDashboard(workbook) {
  requiredSheets(workbook);
  const targets=parseTargets(sheetToRows(workbook,'Target'));
  const spw=parseSPW(sheetToRows(workbook,'SPW'),targets);
  const soh=parseSOH(sheetToRows(workbook,'SOH'),targets);
  const storeSummary=targets.map(t=>{
    const items=spw.transactions.filter(x=>x.storeCode===t.code);
    const k=aggregateTransactions(items);
    return {...t,...k,
      achievement:t.target?k.amount/t.target:0,
      appleAchievement:t.targetApple?k.deviceAmount/t.targetApple:0,
      accyAchievement:t.targetAccy?k.accyAmount/t.targetAccy:0,
      vasAchievement:t.targetVAS?k.vasAmount/t.targetVAS:0
    };
  });
  const staff=[...new Set(spw.transactions.map(x=>`${x.storeCode}|${x.staffId}|${x.staff}`))].map(s=>{const [storeCode,staffId,name]=s.split('|');return{storeCode,staffId,name};});
  const dates=[...new Set(spw.transactions.map(x=>x.date))].sort();
  const lobs=[...new Set(spw.transactions.map(x=>x.lob))].sort();
  return {
    generatedAt:new Date().toISOString(), targets, storeSummary,
    transactions:spw.transactions, stocks:soh.stocks,
    filters:{staff,dates,lobs}, warnings:[...spw.warnings,...soh.warnings]
  };
}
