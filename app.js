const norm=s=>(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=id=>document.getElementById(id);
let cur=null,ui='es',lang='es';
try{ui=localStorage.getItem('waRuta.ui')||'es';lang=localStorage.getItem('waRuta.lang')||ui}catch(e){}
const tr=k=>T[ui][k];
const F=(c,f)=>ui==='pt'&&CPT[c.id]?CPT[c.id][f]:c[f];
const lab=k=>ui==='pt'&&LPT[k]?LPT[k]:L[k][0];
const CR=r=>ui==='pt'&&CODESPT[r[0]]?[r[0],GPT[r[1]]||r[1]].concat(CODESPT[r[0]]):r.slice(0,5);
const LN={es:'Español',pt:'Português',en:'English'};
const ES={},ESP={};
document.querySelectorAll('[data-i]').forEach(el=>ES[el.dataset.i]=el.innerHTML);
document.querySelectorAll('[data-p]').forEach(el=>ESP[el.dataset.p]=el.placeholder);
function fill(txt){return txt.replace(/\{(\w+)\}/g,(m,k)=>L[k]?L[k][1]:m)}
function copy(text,el,ok){
  const done=()=>{el.textContent=ok||tr('copied');setTimeout(()=>{el.textContent=''},1800)};
  try{navigator.clipboard.writeText(text).then(done,()=>{el.textContent=tr('nocopy')})}catch(e){el.textContent=tr('nocopy')}
}
function catBtn(c,score){return `<button type="button" data-c="${c.id}" aria-pressed="${cur===c.id}">${esc(F(c,'t'))}${score?`<span class="s">${score}</span>`:''}</button>`}
function renderAll(){$('all').innerHTML=C.map(c=>catBtn(c)).join('')}
function suggest(){
  const t=' '+norm($('msg').value)+' ';
  if(!t.trim()){$('sug').innerHTML=`<span class="hint">${tr('sugE')}</span>`;return}
  const codes=(t.match(/\b\d{3,7}\b/g)||[]).filter(n=>CODES.some(x=>x[0]===n));
  const sc=C.map(c=>({c,s:c.k.reduce((a,k)=>a+(t.includes(norm(k))?(k.length>6?2:1):0),0)+(c.id==='errores'&&codes.length?3:0)})).filter(x=>x.s>0).sort((a,b)=>b.s-a.s).slice(0,4);
  if(codes.length){$('code').value=codes[0];renderCodes()}
  $('sug').innerHTML=sc.length?sc.map(x=>catBtn(x.c,x.s>=4?'●●':'●')).join(''):`<span class="hint">${tr('sugN')}</span>`;
  if(sc.length&&!cur)show(sc[0].c.id);
}
function show(id){
  const c=C.find(x=>x.id===id);if(!c)return;cur=id;
  const reply=fill(c.r[lang]);
  $('route').innerHTML=`<div class="route-h"><h2>${esc(F(c,'t'))}</h2></div>
<p class="what"><b>${tr('what')}</b> ${esc(F(c,'what'))}</p>
<div class="ask"><b>${tr('ask')}</b> ${esc(F(c,'ask'))}</div>
<div class="tabs" role="tablist" aria-label="${tr('rl')}">${Object.keys(LN).map(l=>`<button type="button" role="tab" data-l="${l}" aria-selected="${l===lang}">${LN[l]}</button>`).join('')}</div>
<div class="reply" id="reply">${esc(reply)}</div>
<div class="row"><button type="button" class="main" id="cp">${tr('cp')}</button><button type="button" id="lg">${tr('lg')}</button><span class="toast" id="t1"></span></div>
<h3>${tr('links')}</h3>
<ul class="links">${c.links.map(k=>`<li><a href="${esc(L[k][1])}" target="_blank" rel="noopener">${esc(lab(k))}</a><button type="button" data-k="${k}" data-u="${esc(L[k][1])}">${tr('cl')}</button></li>`).join('')}</ul>
<div class="avoid"><b>${tr('avoid')}</b> ${esc(F(c,'avoid'))}</div>`;
  document.querySelectorAll('.cats button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.c===id));
  renderNote();
}
// Nota interna: los IDs son datos de cuenta del cliente, por eso viven solo en memoria y nunca en localStorage.
let usedL=new Set(),whyEd=false;
const NREQ=['nat','nai','nrol','nui','nwhy'];
function renderNote(){
  const c=C.find(x=>x.id===cur),keys=[...new Set([...usedL,...(c?c.links:[])])];
  $('nlinks').innerHTML=keys.length?keys.map(k=>`<label class="chk"><input type="checkbox" data-nk="${k}"${usedL.has(k)?' checked':''}> ${esc(lab(k))}</label>`).join(''):`<p class="hint">${tr('nnol')}</p>`;
  if(!whyEd)$('nwhy').value=c?tr('nwhyd').replace('{t}',F(c,'t')):'';
  $('nprev').textContent=noteText();
}
function noteText(){
  const c=C.find(x=>x.id===cur),v=id=>$(id).value.trim(),opt=id=>$(id).value?$(id).selectedOptions[0].text:'';
  return [tr('nh'),
    `${tr('nasset')}: ${[opt('nat'),v('nai')].filter(Boolean).join(': ')||'—'}`,
    `${tr('nrole')}: ${opt('nrol')||'—'}`,
    `${tr('nuid')}: ${v('nui')||'—'}`,
    `${tr('ntopic')}: ${c?F(c,'t'):'—'}`,
    `${tr('nlk')}:`+(usedL.size?'\n'+[...usedL].map(k=>`- ${lab(k)}: ${L[k][1]}`).join('\n'):' —'),
    `${tr('nwhy')}: ${v('nwhy')||'—'}`].join('\n');
}
function copyNote(){
  const miss=NREQ.filter(id=>!$(id).value.trim());
  NREQ.forEach(id=>$(id).setAttribute('aria-invalid',miss.includes(id)));
  const names=miss.map(id=>document.querySelector(`label[for=${id}]`).textContent);
  if(!usedL.size)names.push(tr('nlk'));
  if(names.length){$('nmsg').textContent=tr('nmiss')+' '+names.join(', ');if(miss.length)$(miss[0]).focus();return}
  copy(noteText(),$('nmsg'),tr('nok'));
}
function clearNote(){
  ['nat','nai','nrol','nui'].forEach(id=>{$(id).value='';$(id).removeAttribute('aria-invalid')});
  usedL.clear();whyEd=false;$('nmsg').textContent='';renderNote();
}
function noteInput(e){
  if(!e.target.closest('#notesec'))return;
  if(e.target.id==='nwhy')whyEd=true;
  const k=e.target.dataset.nk;if(k)e.target.checked?usedL.add(k):usedL.delete(k);
  e.target.removeAttribute('aria-invalid');$('nprev').textContent=noteText();
}
document.addEventListener('input',noteInput);
document.addEventListener('change',noteInput);
function applyUI(){
  document.documentElement.lang=ui==='pt'?'pt-BR':'es';
  document.title=ui==='pt'?'Rota WhatsApp API':'Ruta WhatsApp API';
  document.querySelectorAll('[data-i]').forEach(el=>{el.innerHTML=ui==='pt'?ST[el.dataset.i]:ES[el.dataset.i]});
  document.querySelectorAll('[data-p]').forEach(el=>{el.placeholder=ui==='pt'?SP[el.dataset.p]:ESP[el.dataset.p]});
  $('uilang').textContent=tr('btn');
  const cb=$('clr');delete cb.dataset.sure;cb.textContent=tr('clr');
  renderAll();suggest();renderLog();renderCodes();renderNote();
  if(cur)show(cur);else if(!$('route').querySelector('[data-i]'))$('route').innerHTML=`<div class="empty" data-i="empty1">${ui==='pt'?ST.empty1:ES.empty1}</div>`;
}
document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.id==='uilang'){ui=ui==='pt'?'es':'pt';lang=ui;try{localStorage.setItem('waRuta.ui',ui);localStorage.setItem('waRuta.lang',lang)}catch(x){}applyUI();return}
  if(b.dataset.c){show(b.dataset.c);if(innerWidth<860)$('route').scrollIntoView({behavior:'smooth',block:'start'});return}
  if(b.dataset.l){lang=b.dataset.l;try{localStorage.setItem('waRuta.lang',lang)}catch(x){}show(cur);return}
  if(b.dataset.u){copy(b.dataset.u,$('t1'),tr('lcopied'));usedL.add(b.dataset.k);renderNote();return}
  if(b.id==='cp'){copy($('reply').textContent,$('t1'),tr('rcopied'));for(const m of C.find(x=>x.id===cur).r[lang].matchAll(/\{(\w+)\}/g))if(L[m[1]])usedL.add(m[1]);renderNote();return}
  if(b.id==='ncp'){copyNote();return}
  if(b.id==='nclr'){clearNote();return}
  if(b.id==='lg'){addLog(cur);$('t1').textContent=tr('logged');setTimeout(()=>{$('t1').textContent=''},1800);return}
  if(b.id==='csv'){const rows=[tr('csvh')].concat(getLog().map(r=>{const d=new Date(r.t),c=C.find(x=>x.id===r.c);return[d.toLocaleDateString(tr('loc')),d.toLocaleTimeString(tr('loc'),{hour:'2-digit',minute:'2-digit'}),c?F(c,'t'):r.c]}));copy(rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n'),$('logmsg'),tr('csvok'));return}
  if(b.id==='clr'){if(b.dataset.sure){setLog([]);delete b.dataset.sure;b.textContent=tr('clr');renderLog()}else{b.dataset.sure='1';b.textContent=tr('sure');setTimeout(()=>{delete b.dataset.sure;b.textContent=tr('clr')},4000)}}
});
let memLog=[];
function getLog(){try{return JSON.parse(localStorage.getItem('waRuta.log')||'[]')}catch(e){return memLog}}
function setLog(a){memLog=a;try{localStorage.setItem('waRuta.log',JSON.stringify(a))}catch(e){}}
function addLog(id){const a=getLog();a.push({t:new Date().toISOString(),c:id});setLog(a);renderLog()}
function renderLog(){
  const a=getLog(),cnt={};a.forEach(r=>cnt[r.c]=(cnt[r.c]||0)+1);
  const max=Math.max(1,...Object.values(cnt));
  const rows=C.filter(c=>cnt[c.id]).sort((x,y)=>cnt[y.id]-cnt[x.id]);
  $('bars').innerHTML=rows.length?`<p class="hint">${a.length} ${tr('ncases')}</p>`+rows.map(c=>`<div class="bar"><span>${esc(F(c,'t'))}</span><span><i style="width:${cnt[c.id]/max*100}%"></i></span><span>${cnt[c.id]}</span></div>`).join(''):`<p class="empty">${tr('nolog')}</p>`;
}
function renderCodes(){
  const q=norm(($('code').value||'').trim());
  const list=CODES.map(r=>({r,d:CR(r)})).filter(x=>!q||x.r[0].includes(q)||norm(x.d.slice(1).join(' ')).includes(q));
  $('ccount').textContent=q?`${list.length} ${tr('of')} ${CODES.length} ${tr('codes')}`:`${CODES.length} ${tr('codes')}`;
  $('codes').querySelector('tbody').innerHTML=list.length?list.map(({r,d})=>`<tr><td>${esc(d[0])}<br><span class="hint" style="font-weight:400">${esc(d[1])}</span></td><td>${esc(d[2])}</td><td>${esc(d[3])}</td><td>${d[4]?esc(d[4]):''}</td><td><a href="${esc(L[r[5]][1])}" target="_blank" rel="noopener">${esc(lab(r[5]))}</a></td></tr>`).join(''):`<tr><td>${esc(q)}</td><td>${tr('notin')}</td><td><a href="${L.err[1]}" target="_blank" rel="noopener">${tr('search')}</a></td><td></td><td></td></tr>`;
}
let tm;$('msg').addEventListener('input',()=>{clearTimeout(tm);tm=setTimeout(suggest,200)});
$('code').addEventListener('input',renderCodes);
applyUI();
