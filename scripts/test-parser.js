import fs from 'node:fs';
import { parseWorkbook, buildSummary } from '../lib/parser.js';
const buffer = fs.readFileSync(new URL('../sample/sample-data.xlsx', import.meta.url));
const dataset = parseWorkbook(buffer);
const summary = buildSummary(dataset);
console.log(JSON.stringify({
  stores: summary.map(s => ({code:s.code,name:s.name,staff:s.staffCount,transactions:s.sales.transactions,amount:s.sales.amount,stockLines:s.stockLines,stockQty:s.stockQty,dateMin:s.dateMin,dateMax:s.dateMax})),
  spvStillPresent: dataset.stores.flatMap(s => s.transactions.filter(t => t.staffName.toUpperCase() === s.spv.toUpperCase()).slice(0,1).map(t=>({store:s.code,spv:t.staffName}))),
  sampleVAS: dataset.stores.flatMap(s => s.transactions.filter(t=>t.group==='VAS').slice(0,3).map(t=>({store:s.code,article:t.article,desc:t.description,lob:t.lob,amount:t.amount}))).slice(0,20)
}, null, 2));
