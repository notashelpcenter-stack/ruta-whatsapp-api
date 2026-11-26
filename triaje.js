// Triaje separado de app.js (25 nov 2026) para poder medirlo con pruebas/triaje.test.js sin navegador.
const norm=s=>(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
const words=s=>norm(s).replace(/[^a-z0-9]+/g,' ').trim();
// Una clave solo cuenta al inicio de una palabra: antes "app" coincidía dentro de "whatsapp" y mandaba casos de API al tema noapi.
// Las de 3 letras o menos (lc, pin, otp, bsp) deben ser palabra completa.
const hit=(t,k)=>t.includes(' '+k+(k.length<=3?' ':''));
function rank(msg){
  const t=' '+words(msg)+' ';
  const codes=(t.match(/\b\d{3,7}\b/g)||[]).filter(n=>CODES.some(x=>x[0]===n));
  const sc=C.map(c=>{
    if(c.x&&c.x.some(k=>hit(t,words(k))))return {c,s:0};
    const m=[...new Set(c.k.map(words))].filter(k=>k&&hit(t,k));
    // una frase vale por sus palabras; si "erro" y "error" coinciden juntas, cuenta solo la más larga
    const s=m.filter(k=>!m.some(o=>o!==k&&o.includes(k))).reduce((a,k)=>a+k.split(' ').length,0);
    return {c,s:s+(c.id==='errores'&&codes.length?3:0)};
  }).filter(x=>x.s>0).sort((a,b)=>b.s-a.s).slice(0,4);
  return {codes,sc};
}
