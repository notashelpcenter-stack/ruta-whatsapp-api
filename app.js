const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=id=>document.getElementById(id);
let cur=null,autoCur=false,autoCode=false,ui='es';
try{ui=localStorage.getItem('waRuta.ui')||'es'}catch(e){}
// El idioma de respuesta ya no se guarda: se heredaba del cliente anterior (auditoría 25 nov 2026).
let lang=ui;
const tr=k=>T[ui][k];
const F=(c,f)=>ui==='pt'&&CPT[c.id]?CPT[c.id][f]:c[f];
const lab=k=>ui==='pt'&&LPT[k]?LPT[k]:L[k][0];
const CR=r=>ui==='pt'&&CODESPT[r[0]]?[r[0],GPT[r[1]]||r[1]].concat(CODESPT[r[0]]):r.slice(0,5);
const LN={es:'Español',pt:'Português',en:'English'};
const ES={},ESP={};
document.querySelectorAll('[data-i]').forEach(el=>ES[el.dataset.i]=el.innerHTML);
document.querySelectorAll('[data-p]').forEach(el=>ESP[el.dataset.p]=el.placeholder);
function fill(txt){return txt.replace(/\{(\w+)\}/g,(m,k)=>L[k]?L[k][1]:m)}
function copy(text,el,ok,then){
  const done=()=>{if(then)then();el.textContent=ok||tr('copied');setTimeout(()=>{el.textContent=''},1800)};
  try{navigator.clipboard.writeText(text).then(done,()=>{el.textContent=tr('nocopy')})}catch(e){el.textContent=tr('nocopy')}
}
function catBtn(c){return `<button type="button" data-c="${c.id}" aria-pressed="${cur===c.id}">${esc(F(c,'t'))}</button>`}
function renderAll(){$('all').innerHTML=C.map(c=>catBtn(c)).join('')}
// Alerta arriba con el significado del código: antes solo se filtraba la tabla, que queda fuera de la vista (pedido de TR, 25 nov 2026).
function renderAlert(codes){
  const u=[...new Set(codes)],a=$('calert');a.hidden=!u.length;
  a.innerHTML=u.map(n=>{const d=CR(CODES.find(x=>x[0]===n));
    return `<p><b>${tr('errc')} ${esc(n)}:</b> ${esc(d[2])}<br><b>${tr('sol')}</b> ${esc(d[3])} <a href="#codesec" data-code="${esc(n)}">${tr('seecode')}</a></p>`}).join('');
}
function suggest(){
  const m=$('msg').value.trim(),{codes,sc}=m?rank(m):{codes:[],sc:[]};
  renderAlert(codes);
  if(codes.length){$('code').value=codes[0];autoCode=true;renderCodes()}
  else if(autoCode){$('code').value='';autoCode=false;renderCodes()}
  $('sug').innerHTML=!m?`<span class="hint">${tr('sugE')}</span>`:sc.length?sc.map(x=>catBtn(x.c)).join(''):`<span class="hint">${tr('sugN')}</span>`;
  // Abre solo si hay un ganador claro: con empate abrir el primero mostraba una respuesta equivocada (25 nov 2026).
  const tie=sc[1]&&sc[1].s===sc[0].s;
  if(sc.length&&!tie&&(!cur||autoCur)){show(sc[0].c.id);autoCur=true}
  // Si la ruta la abrió el triaje y el mensaje nuevo no tiene ganador, se vacía: antes quedaba la del cliente anterior.
  else if(autoCur)emptyRoute(tie?tr('tie').replace('{a}',F(sc[0].c,'t')).replace('{b}',F(sc[1].c,'t')):'');
  // La lista completa se pliega con un ganador claro para que la nota quede junto a la ruta.
  if(m)$('allbox').open=!sc.length||!!tie;
}
function emptyRoute(msg){
  cur=null;
  $('route').innerHTML=msg?`<div class="empty">${esc(msg)}</div>`:`<div class="empty" data-i="empty1">${ui==='pt'?ST.empty1:ES.empty1}</div>`;
  document.querySelectorAll('.cats button').forEach(b=>b.setAttribute('aria-pressed',false));
  renderNote();
}
// Cierre del caso: un solo botón valida, copia, registra una vez y deja todo limpio (pedido de TR, 25 nov 2026).
function newCase(){
  $('msg').value='';clearNote();autoCur=false;lang=ui;emptyRoute('');
  $('code').value='';autoCode=false;renderCodes();suggest();$('allbox').open=true;$('msg').focus();
}
function show(id){
  const c=C.find(x=>x.id===id);if(!c)return;cur=id;
  const reply=fill(c.r[lang]);
  $('route').innerHTML=`<div class="route-h"><h2>${esc(F(c,'t'))}</h2></div>
<p class="what"><b>${tr('what')}</b> ${esc(F(c,'what'))}</p>
<div class="ask"><b>${tr('ask')}</b> ${esc(F(c,'ask'))}</div>
<div class="rbar"><div class="tabs" role="tablist" aria-label="${tr('rl')}">${Object.keys(LN).map(l=>`<button type="button" role="tab" data-l="${l}" aria-selected="${l===lang}">${LN[l]}</button>`).join('')}</div><span class="row" style="margin:0"><span class="toast" id="t1" role="status"></span><button type="button" class="main" id="cp">${tr('cp')}</button></span></div>
<div class="reply" id="reply">${esc(reply)}</div>
<h3>${tr('links')}</h3>
<ul class="links">${c.links.map(k=>`<li><a href="${esc(L[k][1])}" target="_blank" rel="noopener">${esc(lab(k))}</a><button type="button" data-k="${k}" data-u="${esc(L[k][1])}">${tr('cl')}</button></li>`).join('')}</ul>
<div class="avoid"><b>${tr('avoid')}</b> ${esc(F(c,'avoid'))}</div>`;
  // Se anuncia solo el título: con aria-live en todo el panel el lector leía la ruta entera en cada tecla.
  $('rstat').textContent=F(c,'t');
  document.querySelectorAll('.cats button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.c===id));
  renderNote();
}
// Nota interna: los IDs son datos de cuenta del cliente, por eso viven solo en memoria y nunca en localStorage.
// Varios activos por caso, rol a mano y enlaces manuales (pedido de TR, 25 nov 2026).
let usedL=new Set(),manL=new Map(),whyEd=false;
const NREQ=['nrol','nui','nwhy'];
const arows=()=>[...document.querySelectorAll('#nassets .arow')];
const aval=r=>[r.querySelector('select').value,r.querySelector('input').value];
function assetRow([t,v]=['','']){
  return `<div class="arow"><select aria-label="${tr('at')}"><option value="">${tr('pick')}</option>${tr('ats').map((o,i)=>`<option value="${i}"${String(i)===t?' selected':''}>${esc(o)}</option>`).join('')}</select><input type="text" aria-label="${tr('ai')}" placeholder="${tr('ai')}" autocomplete="off" value="${esc(v)}"><button type="button" data-rm>${tr('rm')}</button></div>`;
}
function renderAssets(list){list=list||arows().map(aval);$('nassets').innerHTML=(list.length?list:[['','']]).map(assetRow).join('')}
function renderNote(){
  const c=C.find(x=>x.id===cur),keys=[...new Set([...usedL,...(c?c.links:[])])];
  $('nlinks').innerHTML=keys.length||manL.size?keys.map(k=>`<label class="chk"><input type="checkbox" data-nk="${k}"${usedL.has(k)?' checked':''}> ${esc(lab(k))}</label>`).join('')+[...manL].map(([u,t])=>`<label class="chk"><input type="checkbox" data-nm="${esc(u)}" checked> ${esc(t||u)}</label>`).join(''):`<p class="hint">${tr('nnol')}</p>`;
  if(!whyEd)$('nwhy').value=c?tr('nwhyd').replace('{t}',F(c,'t')):'';
  $('nprev').textContent=noteText();
}
function noteText(){
  const c=C.find(x=>x.id===cur),v=id=>$(id).value.trim();
  const as=arows().map(r=>{const s=r.querySelector('select'),i=r.querySelector('input').value.trim();return s.value&&i?`- ${s.selectedOptions[0].text}: ${i}`:''}).filter(Boolean);
  const lk=[...[...usedL].map(k=>`- ${lab(k)}: ${L[k][1]}`),...[...manL].map(([u,t])=>`- ${t?t+': ':''}${u}`)];
  return [tr('nh'),
    `${tr('nasset')}:`+(as.length?'\n'+as.join('\n'):' —'),
    `${tr('nrole')}: ${v('nrol')||'—'}`,
    `${tr('nuid')}: ${v('nui')||'—'}`,
    `${tr('ntopic')}: ${c?F(c,'t'):'—'}`,
    `${tr('nlk')}:`+(lk.length?'\n'+lk.join('\n'):' —'),
    `${tr('nwhy')}: ${v('nwhy')||'—'}`].join('\n');
}
function copyNote(){
  const miss=NREQ.filter(id=>!$(id).value.trim());
  NREQ.forEach(id=>$(id).setAttribute('aria-invalid',miss.includes(id)));
  // Activos: una fila a medias es un error; si no hay ninguna completa, se marca la primera.
  const rs=arows(),full=rs.some(r=>aval(r).every(x=>x.trim()));let badA=!full;
  rs.forEach((r,n)=>{const [t,v]=aval(r).map(x=>x.trim()),half=!!t!==!!v,need=half||(!full&&n===0);
    if(half)badA=true;r.querySelector('select').setAttribute('aria-invalid',need&&!t);r.querySelector('input').setAttribute('aria-invalid',need&&!v)});
  const names=miss.map(id=>document.querySelector(`label[for=${id}]`).textContent);
  if(badA)names.unshift(tr('nasset'));
  if(!usedL.size&&!manL.size)names.push(tr('nlk'));
  if(!cur)names.unshift(tr('ntopic'));
  const m=$('nmsg');
  if(names.length){m.dataset.err='';m.textContent=tr('nmiss')+' '+names.join(', ');const f=document.querySelector('#notesec [aria-invalid=true]');if(f)f.focus();return}
  delete m.dataset.err;
  const b=$('ncp');if(b.disabled)return;
  b.disabled=true;setTimeout(()=>{b.disabled=false},800); // evita registrar dos veces con doble clic
  // registrar y limpiar solo si la copia funcionó: si falla, la nota sigue en pantalla
  copy(noteText(),m,tr('nok'),()=>{addLog(cur);newCase()});
}
function addLink(){
  const u=$('nlu').value.trim();let ok=false;
  try{ok=/^https?:$/.test(new URL(u).protocol)}catch(e){}
  const m=$('nmsg');
  if(!ok){$('nlu').setAttribute('aria-invalid',true);m.dataset.err='';m.textContent=tr('badurl');$('nlu').focus();return}
  manL.set(u,$('nll').value.trim());$('nlu').value='';$('nll').value='';$('nlu').removeAttribute('aria-invalid');m.textContent='';renderNote();
}
function clearNote(){
  renderAssets([['','']]);
  ['nrol','nui','nlu','nll'].forEach(id=>{$(id).value='';$(id).removeAttribute('aria-invalid')});
  $('nwhy').removeAttribute('aria-invalid');
  usedL.clear();manL.clear();whyEd=false;$('nmsg').textContent='';renderNote();
}
function noteInput(e){
  if(!e.target.closest('#notesec'))return;
  if(e.target.id==='nwhy')whyEd=true;
  const k=e.target.dataset.nk;if(k)e.target.checked?usedL.add(k):usedL.delete(k);
  if(e.target.dataset.nm!==undefined&&!e.target.checked){manL.delete(e.target.dataset.nm);renderNote();return}
  e.target.removeAttribute('aria-invalid');$('nprev').textContent=noteText();
}
document.addEventListener('input',noteInput);
document.addEventListener('change',noteInput);
$('nlu').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addLink()}});
$('nll').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addLink()}});
// Botón de tema: el CSS ya soportaba data-theme pero no había forma de cambiarlo (pedido de TR, 25 nov 2026).
const isDark=()=>(document.documentElement.dataset.theme||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'))==='dark';
const themeLabel=()=>{$('theme').textContent=tr(isDark()?'tlight':'tdark')};
function applyUI(){
  document.documentElement.lang=ui==='pt'?'pt-BR':'es';
  document.title=ui==='pt'?'Rota WhatsApp API':'Ruta WhatsApp API';
  document.querySelectorAll('[data-i]').forEach(el=>{el.innerHTML=ui==='pt'?ST[el.dataset.i]:ES[el.dataset.i]});
  document.querySelectorAll('[data-p]').forEach(el=>{el.placeholder=ui==='pt'?SP[el.dataset.p]:ESP[el.dataset.p]});
  $('uilang').textContent=tr('btn');$('nav').setAttribute('aria-label',tr('nav'));themeLabel();
  $('roles').innerHTML=tr('roles').map(r=>`<option value="${esc(r)}">`).join('');
  const cb=$('clr');delete cb.dataset.sure;cb.textContent=tr('clr');
  renderAssets();renderAll();suggest();renderLog();renderCodes();renderNote();
  if(cur)show(cur);else if(!$('route').querySelector('.empty'))$('route').innerHTML=`<div class="empty" data-i="empty1">${ui==='pt'?ST.empty1:ES.empty1}</div>`;
}
document.addEventListener('click',e=>{
  const a=e.target.closest('a[data-code]');if(a){$('code').value=a.dataset.code;autoCode=true;renderCodes();return}
  const b=e.target.closest('button');if(!b)return;
  if(b.id==='uilang'){ui=ui==='pt'?'es':'pt';lang=ui;try{localStorage.setItem('waRuta.ui',ui)}catch(x){}applyUI();return}
  if(b.id==='theme'){const t=isDark()?'light':'dark';document.documentElement.dataset.theme=t;try{localStorage.setItem('waRuta.theme',t)}catch(x){}themeLabel();return}
  if(b.dataset.c){show(b.dataset.c);autoCur=false;if(innerWidth<860)$('route').scrollIntoView({behavior:'smooth',block:'start'});return}
  if(b.dataset.l){lang=b.dataset.l;show(cur);return}
  if(b.dataset.u){copy(b.dataset.u,$('t1'),tr('lcopied'));usedL.add(b.dataset.k);renderNote();return}
  if(b.id==='cp'){copy($('reply').textContent,$('t1'),tr('rcopied'));for(const m of C.find(x=>x.id===cur).r[lang].matchAll(/\{(\w+)\}/g))if(L[m[1]])usedL.add(m[1]);renderNote();return}
  if(b.id==='nadd'){$('nassets').insertAdjacentHTML('beforeend',assetRow());arows().pop().querySelector('select').focus();return}
  if(b.dataset.rm!==undefined){const r=b.closest('.arow');if(arows().length>1){r.remove();$('nadd').focus()}else renderAssets([['','']]);$('nprev').textContent=noteText();return}
  if(b.id==='nla'){addLink();return}
  if(b.id==='ncp'){copyNote();return}
  if(b.id==='nclr'){clearNote();return}
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
  // Sin resultados se muestra el texto buscado como búsqueda, no en la columna de código (auditoría 25 nov 2026).
  $('codes').querySelector('tbody').innerHTML=list.length?list.map(({r,d})=>`<tr><td>${esc(d[0])}<br><span class="hint" style="font-weight:400">${esc(d[1])}</span></td><td>${esc(d[2])}</td><td>${esc(d[3])}</td><td>${d[4]?esc(d[4]):''}</td><td><a href="${esc(L[r[5]][1])}" target="_blank" rel="noopener">${esc(lab(r[5]))}</a></td></tr>`).join(''):`<tr><td colspan="5" style="white-space:normal;font-weight:400;color:var(--ink)">«${esc(q)}»: ${tr('notin')} <a href="${L.err[1]}" target="_blank" rel="noopener">${tr('search')}</a></td></tr>`;
}
let tm;$('msg').addEventListener('input',()=>{clearTimeout(tm);tm=setTimeout(suggest,200)});
$('code').addEventListener('input',()=>{autoCode=false;renderCodes()});
applyUI();
