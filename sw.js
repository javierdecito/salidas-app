// Service worker: guarda la app para usarla sin conexión
const CACHE='salidas-lago-v0.4.3';
const ASSETS=["./", "./index.html", "./style.css", "./app.js", "./jszip.min.js", "./manifest.webmanifest", "./img/i_ligustro.jpg", "./img/i_pino.jpg", "./img/i_retama.jpg", "./img/i_retamilla.jpg", "./img/i_rosa.jpg", "./img/i_zarza.jpg", "./img/icon-192.png", "./img/icon-512.png", "./img/s_escorpion.jpg", "./img/s_falsa_coral.jpg", "./img/s_falsa_yarara.jpg", "./img/s_mapa_riesgos.jpg", "./img/s_panza_amarilla.jpg", "./img/s_parejera.jpg", "./img/s_viuda_negra.jpg", "./img/s_yarara_grande.jpg", "./img/s_yarara_nata.jpg", "./img/s_yarara_pasto.jpg", "./img/v_arbol.jpg", "./img/v_arbusto.jpg", "./img/v_cactus.jpg", "./img/v_helecho.jpg", "./img/v_hepatica.jpg", "./img/v_hierba.jpg", "./img/v_liquen.jpg", "./img/v_musgo.jpg", "./img/v_pasto.jpg", "./img/v_roseta.jpg"];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(r=>r||fetch(e.request).then(resp=>{
    if(resp.ok&&new URL(e.request.url).origin===location.origin){const cp=resp.clone();caches.open(CACHE).then(c=>c.put(e.request,cp));}
    return resp;}).catch(()=>caches.match('./index.html'))));
});
