let DATA=null;
const $=s=>document.querySelector(s);
const money=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n||0);
const num=n=>new Intl.NumberFormat('id-ID',{maximumFractionDigits:2}).format(n||0);
const pct=n=>`${num((n||0)*100)}%`;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
function option(value,label=value){return `<option value="${esc(value)}">${esc(label)}</option>`}
async function loadData(){
  $('#status').textContent='Memuat data terbaru…';
  const r=await fetch('/api/dashboard?t='+Date.now()); const j=await r.json();
  if(!j.ok) throw new Error(j.error||'Gagal memuat data'); DATA=j;
  $('#status').textContent=`${j.source.fileName} • ${j.source.modifiedTime?new Date(j.source.modifiedTime).toLocaleString('id-ID'):'sample lokal'} • refresh otomatis 60 detik`;
  initFilters(); renderAll(); renderWarnings();
}
function initFilters(){
 const stores=DATA.targets;
 const existing=$('#storeFilter').value;
 $('#storeFilter').innerHTML=option('','Semua Store')+stores.map(s=>option(s.code,`${s.code} — ${s.store}`)).join('');
 $('#stockStoreFilter').innerHTML=option('','Semua Store')+stores.map(s=>option(s.code,`${s.code} — ${s.store}`)).join('');
 if(stores.some(s=>s.code===existing)) $('#storeFilter').value=existing;
 updateDependentFilters(); updateStockLobs();
}
function selected(){return {store:$('#storeFilter').value,staff:$('#staffFilter').value,lob:$('#lobFilter').value,type:$('#typeFilter').value}}
function filteredTx(){const f=selected();return DATA.transactions.filter(x=>(!f.store||x.storeCode===f.store)&&(!f.staff||x.staffId===f.staff)&&(!f.lob||x.lob===f.lob)&&(!f.type||x.type===f.type))}
function updateDependentFilters(){
 const store=$('#storeFilter').value; const prevStaff=$('#staffFilter').value, prevLob=$('#lobFilter').value, prevType=$('#typeFilter').value;
 const base=DATA.transactions.filter(x=>!store||x.storeCode===store);
 const staff=[...new Map(base.map(x=>[x.staffId,x.staff])).entries()].sort((a,b)=>a[1].localeCompare(b[1]));
 $('#staffFilter').innerHTML=option('','Semua Staff')+staff.map(([id,name])=>option(id,name)).join(''); if(staff.some(x=>x[0]===prevStaff))$('#staffFilter').value=prevStaff;
 const lobs=[...new Set(base.map(x=>x.lob))].sort(); $('#lobFilter').innerHTML=option('','Semua LOB')+lobs.map(x=>option(x)).join(''); if(lobs.includes(prevLob))$('#lobFilter').value=prevLob;
 const staffSel=$('#staffFilter').value, lob=$('#lobFilter').value;
 const typeBase=base.filter(x=>(!staffSel||x.staffId===staffSel)&&(!lob||x.lob===lob)); const types=[...new Set(typeBase.map(x=>x.type))].sort();
 $('#typeFilter').innerHTML=option('','Semua Tipe')+types.map(x=>option(x)).join(''); if(types.includes(prevType))$('#typeFilter').value=prevType;
}
function agg(items){
 const sum=fn=>items.reduce((a,x)=>a+(fn(x)||0),0), receipts=new Set(items.map(x=>x.receipt).filter(Boolean)).size, tx=receipts||items.filter(x=>x.amount>0).length, units=sum(x=>x.qty);
 return {amount:sum(x=>x.amount),device:sum(x=>x.category==='Device'?x.amount:0),accy:sum(x=>x.category==='Accy'?x.amount:0),vas:sum(x=>x.category==='VAS'?x.amount:0),iphone:sum(x=>x.lob==='iPhone'?x.qty:0),ipad:sum(x=>x.lob==='iPad'?x.qty:0),watch:sum(x=>x.lob==='Apple Watch'?x.qty:0),mac:sum(x=>x.lob==='Mac'?x.qty:0),units,tx,upt:tx?units/tx:0,atv:tx?sum(x=>x.amount)/tx:0};
}
function renderKPIs(){const a=agg(filteredTx()); $('#kpis').innerHTML=[['Total Amount',money(a.amount)],['Device Amount',money(a.device)],['Accy',money(a.accy)],['VAS',money(a.vas)],['UPT / ATV',`${num(a.upt)} / ${money(a.atv)}`]].map(x=>`<div class="kpi"><small>${x[0]}</small><strong>${x[1]}</strong></div>`).join('')}
function renderStoreTable(){
 const rows=DATA.storeSummary; $('#storeTable').innerHTML=`<thead><tr><th>Kode</th><th>Store</th><th>Sales</th><th>Target</th><th>Achievement</th><th>Apple/Device</th><th>Target Apple</th><th>Ach.</th><th>Accy</th><th>Target Accy</th><th>Ach.</th><th>VAS</th><th>Target VAS</th><th>Ach.</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${x.code}</td><td>${esc(x.store)}</td><td>${money(x.amount)}</td><td>${money(x.target)}</td><td class="achievement">${pct(x.achievement)}</td><td>${money(x.deviceAmount)}</td><td>${money(x.targetApple)}</td><td>${pct(x.appleAchievement)}</td><td>${money(x.accyAmount)}</td><td>${money(x.targetAccy)}</td><td>${pct(x.accyAchievement)}</td><td>${money(x.vasAmount)}</td><td>${money(x.targetVAS)}</td><td>${pct(x.vasAchievement)}</td></tr>`).join('')}</tbody>`;
}
function renderStaffTable(){
 const items=filteredTx(); const keys=[...new Set(items.map(x=>`${x.storeCode}|${x.staffId}|${x.staff}`))];
 const rows=keys.map(k=>{const [storeCode,id,name]=k.split('|');return{storeCode,id,name,...agg(items.filter(x=>x.storeCode===storeCode&&x.staffId===id))}}).sort((a,b)=>b.amount-a.amount);
 $('#staffTable').innerHTML=`<thead><tr><th>Store</th><th>Staff</th><th>Amount</th><th>iPhone</th><th>iPad</th><th>Apple Watch</th><th>Mac</th><th>Device Amount</th><th>Accy</th><th>VAS</th><th>UPT</th><th>ATV</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${x.storeCode}</td><td>${esc(x.name)}</td><td>${money(x.amount)}</td><td>${num(x.iphone)}</td><td>${num(x.ipad)}</td><td>${num(x.watch)}</td><td>${num(x.mac)}</td><td>${money(x.device)}</td><td>${money(x.accy)}</td><td>${money(x.vas)}</td><td>${num(x.upt)}</td><td>${money(x.atv)}</td></tr>`).join('')}</tbody>`;
}
function renderDaily(){
 const items=filteredTx(), dates=[...new Set(items.map(x=>x.date))].sort(), staff=[...new Set(items.map(x=>`${x.storeCode}|${x.staffId}|${x.staff}`))];
 const metrics=[['Total Amount',a=>money(a.amount)],['Total iPhone',a=>num(a.iphone)],['Total iPad',a=>num(a.ipad)],['Total Apple Watch',a=>num(a.watch)],['Total Mac',a=>num(a.mac)],['Total Amount Device',a=>money(a.device)],['Total Amount Accy',a=>money(a.accy)],['Total Amount VAS',a=>money(a.vas)],['UPT',a=>num(a.upt)],['ATV',a=>money(a.atv)]];
 const head=`<thead><tr><th>Staff</th><th>Metric</th>${dates.map(d=>`<th>${d.slice(8,10)}/${d.slice(5,7)}</th>`).join('')}</tr></thead>`;
 let body=''; for(const k of staff){const [store,id,name]=k.split('|');const base=items.filter(x=>x.storeCode===store&&x.staffId===id); for(const [label,fmt] of metrics){body+=`<tr><td>${esc(name)} (${store})</td><td>${label}</td>${dates.map(d=>`<td>${fmt(agg(base.filter(x=>x.date===d)))}</td>`).join('')}</tr>`}}
 $('#dailyTable').innerHTML=head+`<tbody>${body}</tbody>`;
}
function renderDetails(){const rows=filteredTx().slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,1000);$('#detailTable').innerHTML=`<thead><tr><th>Tanggal</th><th>Store</th><th>Staff</th><th>LOB</th><th>Tipe</th><th>Artikel</th><th>Description</th><th>Qty</th><th>Amount</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${x.date}</td><td>${x.storeCode}</td><td>${esc(x.staff)}</td><td>${esc(x.lob)}</td><td>${esc(x.type)}</td><td>${esc(x.article)}</td><td>${esc(x.description)}</td><td>${num(x.qty)}</td><td>${money(x.amount)}</td></tr>`).join('')}</tbody>`}
function updateStockLobs(){const store=$('#stockStoreFilter').value,prev=$('#stockLobFilter').value,base=DATA.stocks.filter(x=>!store||x.storeCode===store),lobs=[...new Set(base.map(x=>x.lob))].sort();$('#stockLobFilter').innerHTML=option('','Semua LOB')+lobs.map(x=>option(x)).join('');if(lobs.includes(prev))$('#stockLobFilter').value=prev}
function renderStock(){const store=$('#stockStoreFilter').value,lob=$('#stockLobFilter').value,rows=DATA.stocks.filter(x=>(!store||x.storeCode===store)&&(!lob||x.lob===lob));$('#stockTable').innerHTML=`<thead><tr><th>Store</th><th>LOB</th><th>Artikel</th><th>Description</th><th>Qty</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${x.storeCode}</td><td>${esc(x.lob)}</td><td>${esc(x.article)}</td><td>${esc(x.description)}</td><td>${num(x.qty)}</td></tr>`).join('')}</tbody>`}
function renderWarnings(){const e=$('#warnings');if(DATA.warnings?.length){e.classList.remove('hidden');e.innerHTML='<strong>Data warning:</strong><br>'+DATA.warnings.map(esc).join('<br>')}else e.classList.add('hidden')}
function renderAll(){renderKPIs();renderStoreTable();renderStaffTable();renderDaily();renderDetails();renderStock()}
['storeFilter','staffFilter','lobFilter','typeFilter'].forEach(id=>document.addEventListener('change',e=>{if(e.target.id===id){if(['storeFilter','staffFilter','lobFilter'].includes(id))updateDependentFilters();renderAll()}}));
document.addEventListener('change',e=>{if(e.target.id==='stockStoreFilter'){updateStockLobs();renderStock()}if(e.target.id==='stockLobFilter')renderStock()});
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');const sales=b.dataset.tab==='sales';$('#salesTab').classList.toggle('hidden',!sales);$('#stockTab').classList.toggle('hidden',sales)});
$('#refreshBtn').onclick=()=>loadData().catch(showError); function showError(e){$('#status').textContent='Error: '+e.message;alert(e.message)}
loadData().catch(showError); setInterval(()=>loadData().catch(console.error),60000);
