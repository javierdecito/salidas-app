/* Salidas a la naturaleza · Lago del Fuerte — prototipo sin conexión
   Datos: IndexedDB del teléfono. Exportación: ZIP clasificado (CSV + GeoJSON + fotos por carpeta). */
'use strict';
const APP_VERSION = '0.4.5';

// ---------- Contenido de la guía ----------
const FORMAS = [
  { id: 'arbol', nombre: 'Árbol', img: 'img/v_arbol.jpg', como: 'Un tronco leñoso único que se ramifica arriba; en general supera los 3–4 m.', donde: 'En estas laderas casi todos los árboles son plantados o exóticos (pinos, eucaliptos, acacias). El pastizal serrano natural casi no tiene árboles nativos.', pensar: 'Si un árbol no es de acá, ¿cómo llegó?' },
  { id: 'arbusto', nombre: 'Arbusto', img: 'img/v_arbusto.jpg', como: 'Varios tallos leñosos que salen desde la base; de 0,5 a 3 m.', donde: 'Quebradas, pie de los roquedales, laderas protegidas. En estas sierras hay arbustales nativos de chilca (Baccharis tandilensis), chilca uruguaya (Eupatorium buniifolium) y carquejilla (Baccharis articulata) (Frangi, 1975), y también arbustos invasores (retama, retamilla, zarzamora).', pensar: '¿Está solo o forma un matorral cerrado?' },
  { id: 'pasto', nombre: 'Pasto (gramínea)', img: 'img/v_pasto.jpg', como: 'Hojas largas y angostas con nervios paralelos; tallo con nudos; flores sin pétalos de color, en espigas.', donde: 'Domina el pastizal. Muchos pastos serranos crecen en matas, con suelo entre ellas.', pensar: '¿La mata protege el suelo? ¿Qué pasa entre mata y mata?' },
  { id: 'hierba', nombre: 'Hierba de hoja ancha', img: 'img/v_hierba.jpg', como: 'Planta sin madera, hojas más anchas con nervios en red; muchas con flores vistosas.', donde: 'Entre las matas del pastizal, bordes de senderos y claros. Suele ser el grupo con más especies.', pensar: '¿Cuántos colores de flores hay en un metro cuadrado?' },
  { id: 'cactus', nombre: 'Cactus', img: 'img/v_cactus.jpg', como: 'Tallo verde y carnoso con espinas (hojas transformadas), sin hojas comunes.', donde: 'Grietas y rellanos de roquedales soleados, con suelo muy delgado. En estas sierras se citan, entre otros, Wigginsia tephracantha y Notocactus submammulosus var. pampeanus (Frangi, 1975).', pensar: '¿Por qué crece sobre la roca y no en el pastizal?' },
  { id: 'roseta', nombre: 'Roseta', img: 'img/v_roseta.jpg', como: 'Hojas duras, a veces con espinas en el borde, en círculo a ras del suelo o de la roca.', donde: 'Afloramientos rocosos (bromelias) y lugares disturbados (cardos).', pensar: '¿Qué ventaja tiene juntar las hojas cerca del suelo?' },
  { id: 'helecho', nombre: 'Helecho', img: 'img/v_helecho.jpg', como: 'Hojas grandes y recortadas que nacen enrolladas (báculo); puntitos marrones debajo. Sin flores.', donde: 'Lugares sombríos y húmedos: grietas profundas, pie de rocas, laderas al sur. Uno típico de los roquedales de Tandil es el helecho serrucho de las sierras, Blechnum australe (Frangi, 1975).', pensar: 'Si hay helechos, ¿qué dice eso de la humedad?' },
  { id: 'musgo', nombre: 'Musgo', img: 'img/v_musgo.jpg', como: 'Alfombras blandas de pocos centímetros, tallitos con "hojitas" diminutas.', donde: 'Sobre rocas, troncos y suelo, sobre todo en sombra.', pensar: '¿De qué lado de la roca hay más musgo?' },
  { id: 'hepatica', nombre: 'Hepática', img: 'img/v_hepatica.jpg', como: 'Lámina verde chata y blanda, sin tallo ni hojas, que se ramifica en dos.', donde: 'Suelo húmedo y sombrío, barrancas, bordes del arroyo.', pensar: '¿Podría vivir al sol del roquedal?' },
  { id: 'liquen', nombre: 'Liquen', img: 'img/v_liquen.jpg', como: 'Costras o "barbas" naranjas, amarillas, gris verdosas o blancas sobre roca, corteza o suelo.', donde: 'Rocas expuestas, cortezas. No es una planta: es un hongo asociado con un alga o cianobacteria.', pensar: '¿Qué rocas están más cubiertas de líquenes?' },
];
const INVASORAS = [
  { id: 'retama', nombre: 'Retama (Spartium junceum)', img: 'img/i_retama.jpg', senas: 'Tallos verdes, redondos, como juncos, casi sin hojas; flores amarillas grandes y perfumadas.', expande: 'Vainas que se abren y lanzan las semillas.', cambia: 'Matorrales densos que desplazan al pastizal.' },
  { id: 'retamilla', nombre: 'Retamilla (Genista monspessulana)', img: 'img/i_retamilla.jpg', senas: 'Hojas de 3 folíolos chicos, tallos peludos, flores amarillas en grupos cortos, vainas peludas.', expande: 'Vainas que lanzan semillas; avanza con caminos, canteras y forestaciones.', cambia: 'Matorrales densos en las laderas.' },
  { id: 'zarzamora', nombre: 'Zarzamora (Rubus spp.)', img: 'img/i_zarza.jpg', senas: 'Tallos arqueados con aguijones curvos; hojas de 3–5 folíolos; moras negras.', expande: 'Aves que comen las moras; la punta del tallo echa raíz.', cambia: 'Marañas impenetrables.' },
];
const CLAVE = [
  { q: '¿Es una costra, mancha o "barbas" pegadas a la roca o la corteza, sin hojas ni tallo?', si: ['liquen'] },
  { q: '¿Es una alfombrita verde y blanda de pocos centímetros?', si: ['musgo', 'hepatica'], nota: 'Con "hojitas" en un tallito → musgo. Lámina chata como cinta → hepática.' },
  { q: '¿Tiene hojas grandes y recortadas que nacen enrolladas, con puntitos marrones debajo?', si: ['helecho'] },
  { q: '¿Es carnosa, verde, con espinas y sin hojas comunes?', si: ['cactus'] },
  { q: '¿Tiene hojas duras apretadas en roseta, a veces con espinas en el borde?', si: ['roseta'] },
  { q: '¿Tiene tallos de madera (duros, con corteza)?', si: ['arbol', 'arbusto'], nota: 'Un tronco que se ramifica arriba y supera 3–4 m → árbol. Varios tallos desde la base → arbusto.' },
  { q: '¿Hojas largas y finas con nervios paralelos y tallo con nudos?', si: ['pasto'], no: ['hierba'] },
];
const FISONOMIAS = ['Pastizal serrano', 'Arbustal', 'Roquedal', 'Bosque implantado o invasor', 'Matorral invasor', 'Césped / parque', 'Ribera / borde de arroyo'];
const COBERTURA = ['+', '1', '2', '3', '4', '5'];
const COB_PCT = { '+': 'menos del 1 %', '1': '1 a 10 %', '2': '10 a 25 %', '3': '25 a 50 %', '4': '50 a 75 %', '5': '75 a 100 %' };
const REC_LADERA = 'Ladera del Puñón (recorrido de la salida)';
const REC_ALT = 'Recorrido 1 · Fundidor → cruz del cerro (alternativo)';
const MATERIAS = ['Fundamentos de Biología', 'Marcos Naturales', 'Equipo mixto'];
const PARADAS = [
  { id: 'P0', nombre: 'Puñón Mapuche', min: 15, ev: 'Evidencia 1 · La primera impresión', todos: 'Seguridad: las seis reglas y las fotos de las yararás (pestaña Guía → Seguridad). Comentario del paisaje exprés mirando la ladera: una observación de relieve, una de vegetación y una de elementos humanos, cada una con su deducción. Foto panorámica.', bio: '¿Cuántas fisonomías ves? ¿Dónde están las manchas de árboles?', mn: '¿Lo que ves coincide con lo que dedujeron en la charla previa con la imagen satelital?' },
  { id: 'P1', nombre: 'Arroyo y franja arbolada', min: 20, ev: 'Evidencia 2 · El agua', todos: 'Solo en el sector que indique el docente; el arroyo se cruza por el paso indicado. Versión corta (10 min) si el tiempo apremia.', bio: 'Red de patada en un rápido: registrá cada grupo de macroinvertebrados. Árboles de la ribera: foto de una hoja y del tronco.', mn: 'Cabecera de cuenca: ¿qué le pasaría al lago si la ladera pierde su cobertura vegetal? Anotá la idea.' },
  { id: 'P2', nombre: 'Bosquete y arbustal del borde norte', min: 30, ev: 'Evidencia 3 · ¿Los árboles se escapan?', todos: 'Juntos (5 min): ¿qué árboles son? ¿Plantados en hileras o escapados? Después, en paralelo (20 min), solo en las franjas que revisó el docente. Al final, 5 min para contarse los resultados.', bio: 'Transecto de renovales de 25 m desde el borde del bosquete o de un matorral de retama, retamilla o zarzamora (el gráfico se dibuja solo).', mn: 'Cuadrante de 1 × 1 m en el arbustal (lectura de mancha) y registro de presiones con foto y GPS.' },
  { id: 'P3', nombre: 'Roquedal y senderos', min: 25, ev: 'Evidencia 4 · La roca y las huellas del uso', todos: 'Al pasar, el árbol aislado: ¿misma especie que el bosquete? ¿tiene renovales? En el roquedal no se trepa ni se meten las manos: ahí toman sol las yararás.', bio: 'Cacería de adaptaciones mirando desde el sendero: cactus, rosetas, helechos, musgos, líquenes. Cara al sol y cara a la sombra.', mn: 'Línea de senderos de 25 m: contá los que cruzan y medí ancho y profundidad. Señales de erosión y de quién los usa.' },
  { id: 'P4', nombre: 'Mirador del borde este', min: 20, ev: 'Evidencia 5 · El titular', todos: 'Comentario final del paisaje (10 min), mirando al lago y la ciudad. Después, el titular de cada equipo en un minuto: "La ladera ___ porque encontramos ___".', bio: 'Conteo de aves de 5 minutos mientras los demás hacen el comentario.', mn: '¿Qué altura marca el GPS? ¿Coincide con la cota de la zona protegida (200 o 220 m)? ¿A qué distancia están las casas?' },
];
const PELIGROSOS = [
  { img: 'img/s_yarara_grande.jpg', nombre: 'Yarará grande o víbora de la cruz', sci: 'Bothrops alternatus', txt: 'Puede pasar 1,5 m. Dibujos oscuros en forma de riñón bordeados de blanco; líneas blancas en forma de cruz en la cabeza. Es la serpiente más registrada alrededor de Tandil.', cr: 'RAP · iNaturalist · CC BY' },
  { img: 'img/s_yarara_pasto.jpg', nombre: 'Así se ve entre el pasto', sci: 'Bothrops alternatus', txt: 'Se camufla en el pastizal y la hojarasca: por eso se camina por el sendero, mirando dónde se pisa, y nunca se mete la mano en el pasto alto.', cr: 'Valentín Alfano · iNaturalist · CC BY' },
  { img: 'img/s_yarara_nata.jpg', nombre: 'Yarará ñata', sci: 'Bothrops ammodytoides', txt: 'Chica (en general menos de 70 cm), gris con manchas oscuras irregulares y la punta del hocico levantada. Vive en sierras y suelos pedregosos.', cr: 'Valentín Alfano · iNaturalist · CC BY' },
  { img: 'img/s_viuda_negra.jpg', nombre: 'Viuda negra', sci: 'Latrodectus mirabilis · foto tomada en Tandil', txt: 'Hembra negra brillante con manchas rojas; telas irregulares entre piedras y pastos, con capullos blancos. Su picadura es de importancia sanitaria.', cr: 'Lucas Rubio · iNaturalist · CC BY' },
];
const PARECIDOS = [
  { img: 'img/s_falsa_yarara.jpg', nombre: 'Falsa yarará', sci: 'Xenodon dorbignyi', txt: 'Hocico respingado y manchas que imitan a la yarará: se confunde fácil con la ñata.', cr: 'maurozunino · iNaturalist · CC BY' },
  { img: 'img/s_parejera.jpg', nombre: 'Culebra parejera', sci: 'Philodryas patagoniensis', txt: 'Larga, delgada y rápida, color oliva. Huye; si se la agarra, muerde.', cr: 'Valentín Alfano · iNaturalist · CC BY' },
  { img: 'img/s_panza_amarilla.jpg', nombre: 'Culebra de panza amarilla', sci: 'Erythrolamprus poecilogyrus', txt: 'Oscura con manchas amarillas; suele andar en lugares húmedos.', cr: 'Gonzalo Romero · iNaturalist · CC BY' },
  { img: 'img/s_falsa_coral.jpg', nombre: 'Falsa coral', sci: 'Oxyrhopus rhombifer', txt: 'Anillos negros, amarillos y rojos que no rodean todo el cuerpo.', cr: 'diego Hernan Perez · iNaturalist · CC BY' },
  { img: 'img/s_escorpion.jpg', nombre: 'Escorpión de piedra', sci: 'Bothriurus bonariensis', txt: 'Oscuro, pinzas cortas y gruesas. Su picadura duele; igual no se toca. El peligroso (Tityus) tiene pinzas largas y delgadas.', cr: 'Lauu · iNaturalist · CC BY' },
];
const RUMBOS = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
const PRESIONES = ['Casas o construcciones', 'Calles y caminos', 'Senderos y erosión', 'Árboles exóticos', 'Matorral invasor', 'Residuos', 'Quemas', 'Canteras', 'Ganado o caballos', 'Otra'];
const TRAMOS = ['0–5', '5–10', '10–15', '15–20', '20–25'];
const TIPOS_LIBRE = [
  { id: 'presion', nombre: 'Presión o impacto humano', sub: ['Casa o construcción', 'Alambrado o cerco', 'Sendero erosionado', 'Árboles plantados', 'Residuos', 'Quema', 'Corte o poda', 'Extracción de plantas o piedras', 'Ganado o caballos', 'Inscripciones o pintadas', 'Otra'] },
  { id: 'invasora', nombre: 'Planta invasora', sub: INVASORAS.map(i => i.nombre.split(' (')[0]).concat(['Otra / no sé']) },
  { id: 'forma_de_vida', nombre: 'Forma de vida', sub: FORMAS.map(f => f.nombre) },
  { id: 'indicio', nombre: 'Indicio de fauna', sub: ['Huella', 'Heces', 'Egagrópila', 'Pluma o pelo', 'Cueva o nido', 'Hormiguero', 'Rastro en planta', 'Tela de araña', 'Otro'] },
  { id: 'invertebrado', nombre: 'Invertebrado', sub: ['Insecto', 'Araña', 'Opilión', 'Escorpión (no tocar)', 'Ácaro o garrapata', 'Bicho bolita', 'Ciempiés', 'Milpiés', 'Lombriz', 'Caracol o babosa', 'Otro'] },
  { id: 'ave', nombre: 'Ave', sub: ['Vista', 'Oída', 'Vista y oída'] },
  { id: 'macroinvertebrado', nombre: 'Macroinvertebrado (arroyo)', sub: ['Efímeras', 'Plecópteros', 'Tricópteros', 'Libélulas (ninfas)', 'Larvas rojas', 'Sanguijuelas y lombrices', 'Caracoles', 'Anfípodos', 'Otro'] },
  { id: 'otro', nombre: 'Otro', sub: ['Paisaje', 'Disturbio humano', 'Suelo', 'Otro'] },
];

// ---------- Utilidades ----------
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const slug = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '').toLowerCase() || 'x';
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2600); }
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } },
};

// ---------- IndexedDB ----------
let dbp;
function db() {
  if (!dbp) dbp = new Promise((res, rej) => {
    const r = indexedDB.open('salidas_naturaleza', 1);
    r.onupgradeneeded = () => { const d = r.result; d.createObjectStore('registros', { keyPath: 'id' }); d.createObjectStore('fotos', { keyPath: 'id' }); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  return dbp;
}
async function tx(storeName, mode, fn) {
  const d = await db();
  return new Promise((res, rej) => { const t = d.transaction(storeName, mode); const s = t.objectStore(storeName); const out = fn(s); t.oncomplete = () => res(out && out.result !== undefined ? out.result : out); t.onerror = () => rej(t.error); });
}
const putReg = (r) => tx('registros', 'readwrite', s => s.put(r));
const putFoto = (f) => tx('fotos', 'readwrite', s => s.put(f));
const allRegs = () => tx('registros', 'readonly', s => s.getAll());
const getFoto = (id) => tx('fotos', 'readonly', s => s.get(id));
const delReg = (id) => tx('registros', 'readwrite', s => s.delete(id));
const delFoto = (id) => tx('fotos', 'readwrite', s => s.delete(id));
async function pedirPersistencia() { try { if (navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch { } }

// ---------- Sesión ----------
let sesion = store.get('sesion', { recorrido: '', grupo: '', parada: '', materia: '' });
const paradaInfo = () => sesion.recorrido === REC_LADERA ? PARADAS.find(p => p.id === sesion.parada) : null;
function sesionOK() { return sesion.recorrido && sesion.grupo && sesion.parada; }
function renderSessionBar() {
  $('#sessionBar').innerHTML = sesionOK()
    ? `${sesion.recorrido === REC_LADERA ? '<b>Ladera del Puñón</b>' : '<b>' + esc(sesion.recorrido) + '</b>'} · Grupo <b>${esc(sesion.grupo)}</b> · Parada <b>${esc(sesion.parada)}</b>${paradaInfo() ? ' · ' + esc(paradaInfo().nombre) : ''}`
    : 'Configurá el recorrido, el grupo y la parada en <b>Inicio</b>.';
}

// ---------- GPS ----------
function tomarGPS() {
  return new Promise((res) => {
    if (!navigator.geolocation) return res(null);
    navigator.geolocation.getCurrentPosition(
      p => res({ lat: +p.coords.latitude.toFixed(6), lon: +p.coords.longitude.toFixed(6), prec: Math.round(p.coords.accuracy) }),
      () => res(null), { enableHighAccuracy: true, timeout: 30000, maximumAge: 60000 });
  });
}

// ---------- Fotos ----------
async function comprimir(file, max = 1600, q = 0.78) {
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise(r => c.toBlob(b => r(b || file), 'image/jpeg', q));
  } catch { return file; }
}

// ---------- Vistas ----------
let tab = 'inicio';
function go(t) { tab = t; document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === t)); render(); window.scrollTo(0, 0); }
function render() { renderSessionBar(); ({ inicio: vInicio, guia: vGuia, relevar: vRelevar, datos: vDatos }[tab])(); }

function opcionesParada(rec) {
  return rec === REC_LADERA ? PARADAS.map(p => [p.id, p.id + ' · ' + p.nombre]) : [1, 2, 3, 4, 5, 6, 7].map(n => [String(n), String(n)]);
}
function misionHTML() {
  const p = paradaInfo(); if (!p) return '';
  const m = sesion.materia;
  const bio = `<div class="mis bio"><b>Biología · detectives</b><p>${esc(p.bio)}</p></div>`;
  const mn = `<div class="mis mn"><b>Marcos Naturales · equipo técnico</b><p>${esc(p.mn)}</p></div>`;
  return `<div class="card mision"><div class="step">${esc(p.id)} · ${esc(p.nombre)} · ${p.min} min</div><h2>${esc(p.ev)}</h2>
    <p>${esc(p.todos)}</p>${m === MATERIAS[0] ? bio : m === MATERIAS[1] ? mn : bio + mn}</div>`;
}
function vInicio() {
  const rec = sesion.recorrido || REC_LADERA;
  $('#view').innerHTML = `
  ${misionHTML()}
  <div class="card">
    <h2>Antes de empezar</h2>
    <label for="sRec">Recorrido</label>
    <select id="sRec"><option>${REC_LADERA}</option><option>${REC_ALT}</option></select>
    <label for="sMat">Materia</label>
    <select id="sMat"><option value="">Elegí…</option>${MATERIAS.map(m => `<option>${m}</option>`).join('')}</select>
    <label for="sGru">Nombre o número del equipo</label>
    <input id="sGru" type="text" placeholder="Ej.: 3 o Los Teros" value="${esc(sesion.grupo)}">
    <label for="sPar">Parada</label>
    <select id="sPar"></select>
    <button class="btn" id="sSave">Guardar</button>
  </div>
  <div class="card note"><h3>El caso de la ladera del Puñón</h3>
    <p>¿Qué le está pasando a esta ladera, por qué, y qué convendría hacer? En cada una de las cinco paradas tu equipo junta una evidencia. En el mirador (P4), cada equipo da su titular. La salida dura 2 h 15 min.</p></div>
  <div class="card alert"><h3>⚠ En esta ladera suelen aparecer yararás</h3>
    <p>Siempre por el sendero, en fila, mirando el piso. Las manos, nunca donde no se ven. Si ves una serpiente: <b>quieto, avisá y alejate despacio</b>. El celular se usa en las paradas, nunca caminando.</p>
    <button class="btn danger" id="goSeg">Ver fotos y qué hacer</button></div>
  <div class="card note"><h3>Funciona sin señal</h3>
    <p>Todo lo que cargás queda guardado en este teléfono. Al terminar la salida, en <b>Datos</b>, tocá <b>Exportar</b> y subí el ZIP a la Tarea del aula virtual. Llevá igual la planilla de papel como respaldo.</p>
    <p class="muted">Versión ${APP_VERSION}</p></div>`;
  $('#sRec').value = rec; $('#sMat').value = sesion.materia || '';
  const fillPar = () => { $('#sPar').innerHTML = '<option value="">Elegí…</option>' + opcionesParada($('#sRec').value).map(([v, t]) => `<option value="${v}">${esc(t)}</option>`).join(''); $('#sPar').value = sesion.parada || ''; };
  fillPar(); $('#sRec').onchange = fillPar;
  $('#goSeg').onclick = () => { guiaSub = 'seg'; go('guia'); };
  $('#sSave').onclick = () => {
    sesion = { recorrido: $('#sRec').value, materia: $('#sMat').value, grupo: $('#sGru').value.trim(), parada: $('#sPar').value };
    store.set('sesion', sesion); renderSessionBar();
    toast(sesionOK() ? 'Listo. ¡A relevar!' : 'Completá recorrido, equipo y parada');
    if (sesionOK()) vInicio();
  };
}

let guiaSub = 'menu', clavePaso = 0, fichaSel = null;
function vGuia() {
  const v = $('#view');
  if (guiaSub === 'menu') {
    v.innerHTML = `<h2>Guía de campo</h2>
      <button class="btn danger" id="gSeg">⚠ Seguridad: yararás y otros animales</button>
      <button class="btn" id="gClave">🔎 Clave: ¿qué forma de vida es?</button>
      <button class="btn secondary" id="gMet">🧭 Método: comentario del paisaje</button>
      <button class="btn secondary" id="gPE">🌲 ¿Plantados o escapados?</button>
      <h3>Formas de vida</h3><div class="grid">${FORMAS.map(f => `<div class="tile" data-f="${f.id}"><img src="${f.img}" alt="">${esc(f.nombre)}</div>`).join('')}</div>
      <h3>Plantas invasoras</h3><div class="grid">${INVASORAS.map(f => `<div class="tile" data-i="${f.id}"><img src="${f.img}" alt="">${esc(f.nombre.split(' (')[0])}</div>`).join('')}</div>`;
    $('#gClave').onclick = () => { guiaSub = 'clave'; clavePaso = 0; vGuia(); };
    $('#gSeg').onclick = () => { guiaSub = 'seg'; vGuia(); window.scrollTo(0, 0); };
    $('#gMet').onclick = () => { guiaSub = 'metodo'; vGuia(); window.scrollTo(0, 0); };
    $('#gPE').onclick = () => { guiaSub = 'pe'; vGuia(); window.scrollTo(0, 0); };
    v.querySelectorAll('[data-f]').forEach(t => t.onclick = () => { guiaSub = 'ficha'; fichaSel = FORMAS.find(f => f.id === t.dataset.f); vGuia(); window.scrollTo(0, 0); });
    v.querySelectorAll('[data-i]').forEach(t => t.onclick = () => { guiaSub = 'inv'; fichaSel = INVASORAS.find(f => f.id === t.dataset.i); vGuia(); window.scrollTo(0, 0); });
  } else if (guiaSub === 'seg') {
    const ficha = (f) => `<div class="sf"><img src="${f.img}" alt="${esc(f.nombre)}"><b>${esc(f.nombre)}</b><i>${esc(f.sci)}</i><p>${esc(f.txt)}</p><small>Foto: ${esc(f.cr)}</small></div>`;
    v.innerHTML = `<button class="back" id="bk">← Guía</button>
      <div class="card alert"><h2>Si aparece una serpiente</h2><ol><li><b>Quieto.</b> Avisá en voz firme, sin gritar: "¡serpiente!".</li><li>El grupo retrocede despacio por donde vino.</li><li>Nadie la toca, la levanta, la arrincona ni la mata, aunque parezca muerta.</li><li>Si es seguro, una foto desde lejos, con zoom.</li></ol></div>
      <div class="card alert"><h2>Si alguien es mordido</h2><p><b>Acostado y tranquilo</b>, sin caminar solo ni correr. Quitar anillos, pulseras y calzado ajustado. Avisar al docente: se llama a emergencias y se traslada siempre a un centro de salud (Hospital Santamarina).</p>
      <p><b>NO</b> torniquete · <b>NO</b> cortar · <b>NO</b> succionar · <b>NO</b> poner nada en la herida · <b>NO</b> bebidas alcohólicas.</p><p class="muted">Según la guía de envenenamientos ofídicos del Ministerio de Salud de la Nación (2014). Centro Nacional de Intoxicaciones: 0800-333-0160 (24 h).</p></div>
      <h3>Peligrosos</h3><div class="sgrid">${PELIGROSOS.map(ficha).join('')}</div>
      <div class="card alert"><b>Ante la duda, es una yarará.</b> Cabeza triangular, cuello marcado y un orificio entre el ojo y la nariz (foseta loreal) indican una víbora.</div>
      <h3>Se parecen, pero no son peligrosos (igual no se tocan)</h3><div class="sgrid">${PARECIDOS.map(ficha).join('')}</div>
      <h3>Dónde tener cuidado</h3><img class="mapa" src="img/s_mapa_riesgos.jpg" alt="Mapa de zonas de cuidado">
      <p class="muted">A: arroyo · B: pasto alto y arbustos (yarará) · C: roquedal (yarará al sol, escorpiones, arañas, caídas) · D: senderos hondos · E: acceso de vehículos. Imagen: Google Earth Pro © 2026 Airbus.</p>`;
    $('#bk').onclick = () => { guiaSub = 'menu'; vGuia(); };
  } else if (guiaSub === 'metodo') {
    v.innerHTML = `<button class="back" id="bk">← Guía</button><div class="card ficha"><h2>Comentario del paisaje</h2>
      <p>Tres momentos, siempre en este orden:</p>
      <h3>1 · Lo que se observa</h3><p>Describir <b>sin interpretar</b>, en tres bloques: el <b>relieve</b> (formas, pendiente, roca a la vista), la <b>vegetación y el agua</b> (fisonomías, manchas, formas de vida dominantes, arroyo) y los <b>elementos humanos</b> (casas, calles, alambrados, senderos, árboles plantados, residuos, quemas).</p>
      <h3>2 · Lo que se deduce</h3><p>Del relieve, los materiales y su historia; de la vegetación, el clima, el suelo y la humedad; de los elementos humanos, los usos y las presiones. <b>Anotá en qué observación se apoya cada deducción.</b></p>
      <h3>3 · Lo que se concluye</h3><p>¿Qué tipo de paisaje es? ¿Dónde estamos? ¿Qué le pasa?</p>
      <p class="muted">Ejemplo: "los arbustos forman una línea verde que baja por la ladera" es una observación; "por ahí corre agua, al menos parte del año" es una deducción.</p>
      <button class="btn" id="goCP">📝 Hacer un comentario del paisaje</button></div>`;
    $('#bk').onclick = () => { guiaSub = 'menu'; vGuia(); };
    $('#goCP').onclick = () => { relevarSub = 'comentario'; go('relevar'); };
  } else if (guiaSub === 'pe') {
    v.innerHTML = `<button class="back" id="bk">← Guía</button><div class="card ficha"><h2>¿Plantados o escapados?</h2>
      <h3>Plantación</h3><p>Árboles en hileras, a distancias iguales, todos del mismo tamaño (misma edad) y casi sin renovales alrededor.</p>
      <h3>Invasión</h3><p>Adultos en un foco y jóvenes que se alejan de él: muchos renovales cerca y menos lejos. A veces, <b>focos satélite</b>: árboles aislados lejos del frente.</p>
      <h3>Cómo se pone a prueba</h3><p>Transecto de 25 m desde el borde, en una faja de 2 m de ancho: se cuentan <b>plántulas</b> (menos de 30 cm) y <b>juveniles</b> (de 30 cm a 2 m) en cada tramo de 5 m. Si el número cae con la distancia, la mancha probablemente se está expandiendo.</p>
      <button class="btn" id="goTR">📝 Cargar un transecto</button></div>`;
    $('#bk').onclick = () => { guiaSub = 'menu'; vGuia(); };
    $('#goTR').onclick = () => { relevarSub = 'transecto'; go('relevar'); };
  } else if (guiaSub === 'clave') {
    const p = CLAVE[clavePaso];
    v.innerHTML = `<button class="back" id="bk">← Guía</button><div class="card">
      <div class="step">Pregunta ${clavePaso + 1} de ${CLAVE.length}</div><div class="q">${esc(p.q)}</div>
      <div class="row"><button class="btn" id="cSi">Sí</button><button class="btn secondary" id="cNo">No</button></div>
      ${clavePaso > 0 ? '<button class="back" id="cPrev">← Pregunta anterior</button>' : ''}</div><div id="cRes"></div>`;
    $('#bk').onclick = () => { guiaSub = 'menu'; vGuia(); };
    const mostrar = (ids, nota) => {
      $('#cRes').innerHTML = `<div class="answer"><b>Resultado:</b> ${ids.map(i => FORMAS.find(f => f.id === i).nombre).join(' o ')}${nota ? `<p>${esc(nota)}</p>` : ''}
        <div class="grid">${ids.map(i => { const f = FORMAS.find(x => x.id === i); return `<div class="tile" data-f="${f.id}"><img src="${f.img}" alt="">Ver ficha</div>`; }).join('')}</div>
        <button class="btn secondary" id="cAgain">Empezar de nuevo</button></div>`;
      $('#cAgain').onclick = () => { clavePaso = 0; vGuia(); };
      document.querySelectorAll('#cRes [data-f]').forEach(t => t.onclick = () => { guiaSub = 'ficha'; fichaSel = FORMAS.find(f => f.id === t.dataset.f); vGuia(); });
    };
    $('#cSi').onclick = () => mostrar(p.si, p.nota);
    $('#cNo').onclick = () => { if (p.no) mostrar(p.no); else { clavePaso++; vGuia(); } };
    if ($('#cPrev')) $('#cPrev').onclick = () => { clavePaso--; vGuia(); };
  } else if (guiaSub === 'ficha') {
    const f = fichaSel;
    v.innerHTML = `<button class="back" id="bk">← Guía</button><div class="card ficha"><h2>${esc(f.nombre)}</h2><img src="${f.img}" alt="${esc(f.nombre)}">
      <h3>Cómo la reconozco</h3><p>${esc(f.como)}</p><h3>Dónde buscarla</h3><p>${esc(f.donde)}</p><h3>Para pensar</h3><p>${esc(f.pensar)}</p>
      <button class="btn" id="fReg">📝 Registrar esta forma de vida</button></div>`;
    $('#bk').onclick = () => { guiaSub = 'menu'; vGuia(); };
    $('#fReg').onclick = () => { relevarSub = { tipo: 'forma_de_vida', sub: f.nombre }; go('relevar'); };
  } else if (guiaSub === 'inv') {
    const f = fichaSel;
    v.innerHTML = `<button class="back" id="bk">← Guía</button><div class="card ficha"><h2>${esc(f.nombre)}</h2><img src="${f.img}" alt="${esc(f.nombre)}">
      <h3>Señas</h3><p>${esc(f.senas)}</p><h3>Cómo se expande</h3><p>${esc(f.expande)}</p><h3>Qué cambia</h3><p>${esc(f.cambia)}</p>
      <button class="btn" id="fReg">📝 Registrar esta invasora</button></div>`;
    $('#bk').onclick = () => { guiaSub = 'menu'; vGuia(); };
    $('#fReg').onclick = () => { relevarSub = { tipo: 'invasora', sub: f.nombre.split(' (')[0] }; go('relevar'); };
  }
}

// ---------- Relevar ----------
let relevarSub = null; // null = menú; 'mancha'; {tipo, sub}
let borrador = null;   // { fotos: [{blob, url}], gps }
function nuevoBorrador() { borrador = { fotos: [], gps: null }; }

function bloqueFotosGPS() {
  return `<label>Fotos</label>
    <input id="fIn" type="file" accept="image/*" capture="environment" style="display:none">
    <button class="btn secondary" id="fBtn" type="button">📷 Sacar foto</button>
    <div class="thumbs" id="thumbs"></div>
    <label>Ubicación</label>
    <button class="btn secondary" id="gBtn" type="button">📍 Tomar GPS</button>
    <div class="gps" id="gTxt">Sin ubicación todavía (se intenta tomar sola al guardar).</div>`;
}
function wireFotosGPS() {
  $('#fBtn').onclick = () => $('#fIn').click();
  $('#fIn').onchange = async (e) => {
    const file = e.target.files && e.target.files[0]; if (!file) return;
    const blob = await comprimir(file); borrador.fotos.push({ blob, url: URL.createObjectURL(blob) });
    $('#thumbs').innerHTML = borrador.fotos.map(f => `<img src="${f.url}" alt="foto">`).join(''); e.target.value = '';
    toast('Foto agregada');
  };
  $('#gBtn').onclick = async () => {
    $('#gTxt').textContent = 'Buscando satélites… (puede tardar hasta 30 s)';
    borrador.gps = await tomarGPS(); pintarGPS();
  };
  pintarGPS();
}
function pintarGPS() {
  const g = borrador && borrador.gps, el = $('#gTxt'); if (!el) return;
  if (g) { el.textContent = `${g.lat}, ${g.lon} (± ${g.prec} m)`; el.className = 'gps ok'; }
}

function vRelevar() {
  const v = $('#view');
  if (!sesionOK()) { v.innerHTML = `<div class="card note"><p>Primero completá el recorrido, el grupo y la parada en <b>Inicio</b>.</p><button class="btn" id="toIni">Ir a Inicio</button></div>`; $('#toIni').onclick = () => go('inicio'); return; }
  if (!relevarSub) {
    v.innerHTML = `<h2>Relevar</h2>
      ${paradaInfo() ? `<div class="card mision small"><b>${esc(paradaInfo().id)} · ${esc(paradaInfo().ev)}</b></div>` : ''}
      <button class="btn" id="rC">🧭 Comentario del paisaje</button>
      <button class="btn" id="rM">🌿 Lectura de una mancha (planilla A)</button>
      <button class="btn" id="rT">🌲 Transecto de renovales (planilla B)</button>
      <button class="btn" id="rS">🥾 Senderos: línea de conteo</button>
      <h3>Registro rápido con foto</h3>
      ${TIPOS_LIBRE.map(t => `<button class="btn secondary" data-t="${t.id}">${esc(t.nombre)}</button>`).join('')}`;
    $('#rM').onclick = () => { relevarSub = 'mancha'; vRelevar(); };
    $('#rC').onclick = () => { relevarSub = 'comentario'; vRelevar(); };
    $('#rT').onclick = () => { relevarSub = 'transecto'; vRelevar(); };
    $('#rS').onclick = () => { relevarSub = 'sendero'; vRelevar(); };
    v.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { relevarSub = { tipo: b.dataset.t }; vRelevar(); });
    return;
  }
  nuevoBorrador();
  if (relevarSub === 'mancha') return vMancha();
  if (relevarSub === 'comentario') return vComentario();
  if (relevarSub === 'transecto') return vTransecto();
  if (relevarSub === 'sendero') return vSendero();
  return vLibre(relevarSub);
}

function chipsHTML(id, items, multi) { return `<div class="chips${multi ? ' multi' : ''}" id="${id}">${items.map(x => `<span class="chip" data-v="${esc(x)}">${esc(x)}</span>`).join('')}</div>`; }
function wireChips(id, multi) {
  const box = $('#' + id);
  box.querySelectorAll('.chip').forEach(c => c.onclick = () => {
    if (!multi) box.querySelectorAll('.chip').forEach(o => o !== c && o.classList.remove('on'));
    c.classList.toggle('on');
  });
}
const chipsVal = (id) => [...document.querySelectorAll('#' + id + ' .chip.on')].map(c => c.dataset.v);

function vMancha() {
  const v = $('#view');
  v.innerHTML = `<button class="back" id="bk">← Relevar</button><div class="card"><h2>Lectura de una mancha</h2>
    <label>¿Dónde está el cuadrante?</label>${chipsHTML('cUbi', ['En la mancha', 'Junto a un sendero'])}
    <label>Fisonomía</label>${chipsHTML('cFis', FISONOMIAS)}
    <label>Forma de vida dominante</label>${chipsHTML('cDom', FORMAS.map(f => f.nombre))}
    <label>Cobertura del dominante: ¿cuánto del suelo tapa, visto desde arriba?</label><div class="cov" id="cCov">${COBERTURA.map(x => `<span class="chip" data-v="${x}">${x}</span>`).join('')}</div>
    <p class="muted" id="covTxt">+ menos del 1 % · 1: 1 a 10 % · 2: 10 a 25 % · 3: 25 a 50 % · 4: 50 a 75 % · 5: 75 a 100 %</p>
    <label>Acompañantes presentes (tocá todas las que veas)</label>${chipsHTML('cAco', FORMAS.map(f => f.nombre), true)}
    <label>Debajo (% aproximado)</label>
    ${['Suelo con vegetación', 'Roca', 'Hojarasca', 'Suelo desnudo'].map((x, i) => `<div class="pct"><span>${x}</span><input type="number" inputmode="numeric" min="0" max="100" id="p${i}" placeholder="%"></div>`).join('')}
    <label>Orientación de la ladera</label>${chipsHTML('cOri', ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO', 'Plano'])}
    <label for="mObs">Observaciones (adaptaciones, disturbios, preguntas)</label><textarea id="mObs"></textarea>
    ${bloqueFotosGPS()}
    <button class="btn" id="mSave">💾 Guardar lectura</button></div>`;
  $('#bk').onclick = () => { relevarSub = null; vRelevar(); };
  wireChips('cUbi'); wireChips('cFis'); wireChips('cDom'); wireChips('cAco', true); wireChips('cOri');
  $('#cCov').querySelectorAll('.chip').forEach(c => c.onclick = () => { $('#cCov').querySelectorAll('.chip').forEach(o => o.classList.remove('on')); c.classList.add('on'); $('#covTxt').textContent = 'Clase ' + c.dataset.v + ': ' + COB_PCT[c.dataset.v] + ' del suelo tapado'; });
  wireFotosGPS();
  $('#mSave').onclick = async () => {
    const fis = chipsVal('cFis')[0];
    if (!fis) return toast('Elegí al menos la fisonomía');
    const datos = { ubicacion_cuadrante: chipsVal('cUbi')[0] || '', fisonomia: fis, dominante: chipsVal('cDom')[0] || '', cobertura: (chipsVal('cCov')[0] || ''), cobertura_pct: COB_PCT[chipsVal('cCov')[0]] || '', acompanantes: chipsVal('cAco').join('; '),
      pct_suelo_veg: $('#p0').value, pct_roca: $('#p1').value, pct_hojarasca: $('#p2').value, pct_suelo_desnudo: $('#p3').value,
      orientacion: chipsVal('cOri')[0] || '', observaciones: $('#mObs').value.trim() };
    await guardar('mancha', slug(fis), datos);
  };
}

function vComentario() {
  const v = $('#view');
  const bloque = (k, t, ayudaV, ayudaD) => `<h3>${t}</h3>
    <label for="v_${k}">Lo que veo</label><textarea id="v_${k}" placeholder="${esc(ayudaV)}"></textarea>
    <label for="d_${k}">Lo que deduzco y en qué me apoyo</label><textarea id="d_${k}" placeholder="${esc(ayudaD)}"></textarea>`;
  v.innerHTML = `<button class="back" id="bk">← Relevar</button><div class="card"><h2>Comentario del paisaje</h2>
    <p class="muted">Primero observar en silencio. Después deducir. Al final, concluir.</p>
    <label>¿Hacia dónde mirás?</label>${chipsHTML('cRum', RUMBOS)}
    ${bloque('rel', '1 · El relieve', 'Formas, pendientes, roca a la vista…', 'Materiales, origen, por qué hay suelo o no…')}
    ${bloque('veg', '2 · La vegetación y el agua', 'Fisonomías, manchas, formas de vida dominantes, arroyo…', 'Humedad, sol, suelo, clima…')}
    ${bloque('hum', '3 · Los elementos humanos', 'Casas, calles, alambrados, senderos, árboles plantados…', 'Usos del lugar, desde cuándo, qué cambio producen…')}
    <label>Presiones que se ven (tocá todas)</label>${chipsHTML('cPre', PRESIONES, true)}
    <h3>Lo que concluimos</h3>
    <label for="c_tipo">¿Qué tipo de paisaje es?</label><textarea id="c_tipo"></textarea>
    <label for="c_donde">¿Dónde estamos?</label><textarea id="c_donde"></textarea>
    <label for="c_pasa">¿Qué le pasa?</label><textarea id="c_pasa"></textarea>
    ${bloqueFotosGPS()}
    <button class="btn" id="cSave">💾 Guardar comentario</button></div>`;
  $('#bk').onclick = () => { relevarSub = null; vRelevar(); };
  wireChips('cRum'); wireChips('cPre', true); wireFotosGPS();
  $('#cSave').onclick = async () => {
    const val = (id) => $('#' + id).value.trim();
    if (!val('v_rel') && !val('v_veg') && !val('v_hum')) return toast('Escribí al menos una observación');
    const datos = { rumbo_vista: chipsVal('cRum')[0] || '', relieve_veo: val('v_rel'), relieve_deduzco: val('d_rel'), vegetacion_veo: val('v_veg'), vegetacion_deduzco: val('d_veg'),
      humanos_veo: val('v_hum'), humanos_deduzco: val('d_hum'), presiones: chipsVal('cPre').join('; '), concluye_tipo: val('c_tipo'), concluye_donde: val('c_donde'), concluye_que_le_pasa: val('c_pasa') };
    await guardar('comentario', 'paisaje', datos);
  };
}

function vTransecto() {
  const v = $('#view');
  v.innerHTML = `<button class="back" id="bk">← Relevar</button><div class="card"><h2>Transecto de renovales</h2>
    <p class="muted">Cinta de 25 m desde el borde hacia afuera. Faja de 2 m de ancho (1 m a cada lado). Plántula: menos de 30 cm. Juvenil: de 30 cm a 2 m.</p>
    <label>¿Qué planta leñosa?</label>${chipsHTML('tEsp', ['Retama', 'Retamilla', 'Zarzamora', 'Pino', 'Acacia', 'Eucalipto', 'Otro / no sé'])}
    <label>¿Desde dónde sale el transecto?</label>${chipsHTML('tOri', ['Borde de bosquete', 'Borde de matorral', 'Árbol o arbusto aislado', 'Otro'])}
    <label>Rumbo de la cinta</label>${chipsHTML('tRum', RUMBOS)}
    <label>Fisonomía hacia donde va la cinta</label>${chipsHTML('tFis', FISONOMIAS)}
    <label>Patrón de los adultos</label>${chipsHTML('tPat', ['En hileras, todos iguales', 'Desordenados, de distintos tamaños', 'Un solo árbol', 'No sé'])}
    <label for="tAdu">Adultos en el origen (número)</label><input id="tAdu" type="number" inputmode="numeric" min="0">
    <table class="tr"><thead><tr><th>Tramo (m)</th><th>Plántulas</th><th>Juveniles</th><th>Camino, roca o suelo removido</th></tr></thead><tbody>
    ${TRAMOS.map((t, i) => `<tr><td>${t}</td><td><input type="number" inputmode="numeric" min="0" id="tp${i}"></td><td><input type="number" inputmode="numeric" min="0" id="tj${i}"></td><td class="c"><input type="checkbox" id="td${i}"></td></tr>`).join('')}
    </tbody></table>
    <div id="tBars" class="bars"></div>
    <label for="tObs">Observaciones</label><textarea id="tObs" placeholder="Especie, señas para identificarla, dudas…"></textarea>
    ${bloqueFotosGPS()}
    <p class="muted">Tomá el GPS parado en el origen del transecto.</p>
    <button class="btn" id="tSave">💾 Guardar transecto</button></div>`;
  $('#bk').onclick = () => { relevarSub = null; vRelevar(); };
  ['tEsp', 'tOri', 'tRum', 'tFis', 'tPat'].forEach(id => wireChips(id)); wireFotosGPS();
  const num = (id) => { const x = parseInt($('#' + id).value, 10); return isNaN(x) ? 0 : x; };
  const bars = () => {
    const tot = TRAMOS.map((_, i) => num('tp' + i) + num('tj' + i)); const mx = Math.max(1, ...tot);
    $('#tBars').innerHTML = '<b>Renovales por tramo</b>' + TRAMOS.map((t, i) => `<div class="bar"><span>${t} m</span><i style="width:${Math.round(100 * tot[i] / mx)}%"></i><em>${tot[i]}</em></div>`).join('');
  };
  v.querySelectorAll('.tr input[type=number]').forEach(x => x.oninput = bars); bars();
  $('#tSave').onclick = async () => {
    const esp = chipsVal('tEsp')[0]; if (!esp) return toast('Elegí qué planta');
    const datos = { especie: esp, origen: chipsVal('tOri')[0] || '', rumbo: chipsVal('tRum')[0] || '', fisonomia_vecina: chipsVal('tFis')[0] || '', patron_adultos: chipsVal('tPat')[0] || '', adultos_origen: $('#tAdu').value };
    let tp = 0, tj = 0;
    TRAMOS.forEach((t, i) => { const k = t.replace('–', '_'); datos['plantulas_' + k] = num('tp' + i); datos['juveniles_' + k] = num('tj' + i); datos['disturbio_' + k] = $('#td' + i).checked ? 'sí' : 'no'; tp += num('tp' + i); tj += num('tj' + i); });
    datos.total_plantulas = tp; datos.total_juveniles = tj; datos.observaciones = $('#tObs').value.trim();
    await guardar('transecto', slug(esp), datos);
  };
}

function vSendero() {
  const v = $('#view');
  v.innerHTML = `<button class="back" id="bk">← Relevar</button><div class="card"><h2>Senderos: línea de conteo</h2>
    <p class="muted"><b>Para qué:</b> saber cuánto pasto y suelo pierde la ladera por el uso. <b>Cómo:</b> tendé la cinta de 25 m a lo ancho de la ladera, sin subir ni bajar, para que corte a los senderos. Por cada sendero que cruce, apoyá la caña de borde a borde y medí el ancho (de pasto a pasto) y la profundidad (en el centro, desde la caña). Después hacé otra línea en un lugar de control, casi sin uso.</p>
    <label>Sector</label>${chipsHTML('sSec', ['Con uso', 'Sin uso aparente (control)'])}
    <label for="sLar">Largo de la línea (m)</label><input id="sLar" type="number" inputmode="decimal" min="1" value="25">
    <label for="sPen">Pendiente (°), si la mediste</label><input id="sPen" type="number" inputmode="decimal" min="0" max="90">
    <label>Senderos que cruzan la línea</label><div id="sList"></div>
    <button class="btn secondary" id="sAdd" type="button">➕ Agregar sendero</button>
    <label>¿Quién los usa? (por huellas o por lo que se ve)</label>${chipsHTML('sUso', ['Caminantes', 'Bicicletas', 'Caballos', 'Motos', 'Ganado', 'No se sabe'], true)}
    <label for="sObs">Observaciones</label><textarea id="sObs" placeholder="Raíces expuestas, surcos de agua, piedras sueltas…"></textarea>
    ${bloqueFotosGPS()}
    <button class="btn" id="sSave2">💾 Guardar línea</button></div>`;
  $('#bk').onclick = () => { relevarSub = null; vRelevar(); };
  wireChips('sSec'); wireChips('sUso', true); wireFotosGPS();
  let n = 0;
  const add = () => { n++; const d = document.createElement('div'); d.className = 'srow'; d.innerHTML = `<b>${n}</b><input type="number" inputmode="numeric" min="0" placeholder="ancho cm" class="sa"><input type="number" inputmode="numeric" min="0" placeholder="prof. cm" class="sp"><label class="ck"><input type="checkbox" class="se"> erosión</label>`; $('#sList').appendChild(d); };
  $('#sAdd').onclick = add; add();
  $('#sSave2').onclick = async () => {
    const sec = chipsVal('sSec')[0]; if (!sec) return toast('Elegí el sector');
    const rows = [...document.querySelectorAll('#sList .srow')].map((r, i) => ({ n: i + 1, ancho_cm: r.querySelector('.sa').value, prof_cm: r.querySelector('.sp').value, erosion: r.querySelector('.se').checked ? 'sí' : 'no' })).filter(r => r.ancho_cm !== '' || r.prof_cm !== '');
    const nums = (k) => rows.map(r => parseFloat(r[k])).filter(x => !isNaN(x));
    const media = (a) => a.length ? +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) : '';
    const largo = parseFloat($('#sLar').value) || 25;
    const datos = { sector: sec, largo_linea_m: largo, pendiente_grados: $('#sPen').value, n_senderos: rows.length, senderos_cada_100m: +(rows.length * 100 / largo).toFixed(1),
      ancho_medio_cm: media(nums('ancho_cm')), profundidad_media_cm: media(nums('prof_cm')), profundidad_max_cm: nums('prof_cm').length ? Math.max(...nums('prof_cm')) : '',
      con_erosion: rows.filter(r => r.erosion === 'sí').length, cruces: rows.map(r => `${r.n}: ${r.ancho_cm || '?'} × ${r.prof_cm || '?'} cm${r.erosion === 'sí' ? ' (erosión)' : ''}`).join(' | '), _cruces: rows,
      uso: chipsVal('sUso').join('; '), observaciones: $('#sObs').value.trim() };
    await guardar('sendero', slug(sec), datos);
  };
}

function vLibre(sel) {
  const t = TIPOS_LIBRE.find(x => x.id === sel.tipo);
  const v = $('#view');
  v.innerHTML = `<button class="back" id="bk">← Relevar</button><div class="card"><h2>${esc(t.nombre)}</h2>
    <label>¿Qué es?</label>${chipsHTML('cSub', t.sub)}
    <label for="lCant">Cantidad (si corresponde)</label><input id="lCant" type="number" inputmode="numeric" min="0">
    <label>¿Dónde estaba?</label>${chipsHTML('cDonde', FISONOMIAS.concat(['Sobre roca', 'En el agua', 'Sendero']))}
    <label for="lObs">Descripción u observaciones</label><textarea id="lObs" placeholder="Qué ves, tamaño, comportamiento, dudas…"></textarea>
    ${bloqueFotosGPS()}
    <button class="btn" id="lSave">💾 Guardar registro</button></div>`;
  $('#bk').onclick = () => { relevarSub = null; vRelevar(); };
  wireChips('cSub'); wireChips('cDonde'); wireFotosGPS();
  if (sel.sub) { const c = [...document.querySelectorAll('#cSub .chip')].find(c => c.dataset.v === sel.sub); if (c) c.classList.add('on'); }
  $('#lSave').onclick = async () => {
    const sub = chipsVal('cSub')[0];
    if (!sub) return toast('Elegí qué es');
    const datos = { categoria: t.nombre, que_es: sub, cantidad: $('#lCant').value, donde: chipsVal('cDonde')[0] || '', observaciones: $('#lObs').value.trim() };
    await guardar(t.id, slug(sub), datos);
  };
}

async function guardar(tipo, subSlug, datos) {
  document.querySelectorAll('#view .btn').forEach(b => { if (/Guardar/.test(b.textContent)) b.disabled = true; });
  if (!borrador.gps) { toast('Tomando ubicación…'); borrador.gps = await tomarGPS(); }
  const id = 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const fecha = new Date();
  const regs = await allRegs();
  const n0 = regs.filter(r => r.tipo === tipo).length;
  const fotosIds = [];
  for (let i = 0; i < borrador.fotos.length; i++) {
    const fid = id + '_f' + (i + 1);
    const nombre = `${/^P\d/.test(sesion.parada) ? sesion.parada : 'P' + slug(sesion.parada)}_G${slug(sesion.grupo)}_${tipo}_${subSlug}_${String(n0 + 1).padStart(3, '0')}_${i + 1}.jpg`;
    await putFoto({ id: fid, regId: id, blob: borrador.fotos[i].blob, nombre });
    fotosIds.push(fid);
  }
  const g = borrador.gps || {};
  await putReg({ id, tipo, recorrido: sesion.recorrido, materia: sesion.materia || '', grupo: sesion.grupo, parada: sesion.parada, fecha_hora: fecha.toISOString(), fecha_local: fecha.toLocaleString('es-AR', { hour12: false }),
    lat: g.lat ?? '', lon: g.lon ?? '', precision_m: g.prec ?? '', ...datos, fotos: fotosIds, app_version: APP_VERSION });
  await pedirPersistencia();
  toast(borrador.gps ? 'Guardado ✓' : 'Guardado ✓ (sin GPS)');
  relevarSub = null; vRelevar();
}

// ---------- Datos y exportación ----------
function etiqueta(r) {
  if (r.tipo === 'mancha') return 'Mancha: ' + r.fisonomia;
  if (r.tipo === 'comentario') return 'Comentario del paisaje' + (r.rumbo_vista ? ' (mirando al ' + r.rumbo_vista + ')' : '');
  if (r.tipo === 'transecto') return `Transecto: ${r.especie} · ${r.total_plantulas} plántulas, ${r.total_juveniles} juveniles`;
  if (r.tipo === 'sendero') return `Senderos: ${r.n_senderos} en ${r.largo_linea_m} m (${r.sector})`;
  return r.categoria + ': ' + r.que_es;
}
async function vDatos() {
  const regs = (await allRegs()).sort((a, b) => a.fecha_hora < b.fecha_hora ? 1 : -1);
  const nFotos = regs.reduce((a, r) => a + (r.fotos ? r.fotos.length : 0), 0);
  let mbFotos = 0; for (const r of regs) for (const fid of (r.fotos || [])) { const f = await getFoto(fid); if (f && f.blob) mbFotos += f.blob.size / 1048576; }
  let est = '';
  try { if (navigator.storage && navigator.storage.estimate) { const e = await navigator.storage.estimate(); est = ` · ${(e.usage / 1048576).toFixed(1)} MB usados`; } } catch { }
  $('#view').innerHTML = `<h2>Datos guardados</h2>
    <div class="card"><b>${regs.length}</b> registros · <b>${nFotos}</b> fotos${est}
      <p>El ZIP completo pesará unos <b>${(mbFotos + 0.1).toFixed(1)} MB</b>.</p>
      <button class="btn" id="dExp" ${regs.length ? '' : 'disabled'}>📦 Exportar completo (datos + fotos)</button>
      <button class="btn" id="dExpL" ${regs.length ? '' : 'disabled'}>📄 Exportar solo datos (liviano, sin fotos)</button>
      <p class="muted">El ZIP completo trae las tablas para Excel, los puntos para Google Earth y las fotos ordenadas por parada y tipo. ${mbFotos > 40 ? '<b>Pesa más de 40 MB: subí al aula virtual el ZIP de solo datos y el completo a la carpeta de respaldo que indique la cátedra.</b>' : 'Si el aula virtual no acepta el completo por tamaño, subí el de solo datos y el completo a la carpeta de respaldo.'}</p></div>
    ${regs.length ? `<div class="card"><b>¿Eran datos de prueba?</b><p class="muted">Antes de la salida, borrá lo que cargaste para practicar, así no se mezcla con los datos del campo. Exportá primero si querés guardar algo.</p><p><b>Solo borra lo cargado en esta aplicación</b> (sus registros y las fotos guardadas en ella). No toca la galería, tus fotos, tus archivos ni nada más del celular.</p><button class="btn danger" id="dBorrarTodo">🗑 Borrar los datos de esta aplicación</button></div>` : ''}
    ${regs.map(r => `<div class="rec"><b>${esc(etiqueta(r))}</b><br>
      <small>Parada ${esc(r.parada)} · ${new Date(r.fecha_hora).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} · ${r.fotos.length} foto(s) · ${r.lat ? 'GPS ✓' : 'sin GPS'}</small>
      <br><button class="btn small danger" data-del="${r.id}">Borrar</button></div>`).join('')}`;
  if (regs.length) $('#dBorrarTodo').onclick = async () => { const b = $('#dBorrarTodo');
    if (b.dataset.arm !== '1') { b.dataset.arm = '1'; b.textContent = `Se borrarán ${regs.length} registros y ${nFotos} fotos de la aplicación (el resto del celular no se toca). Tocá de nuevo para confirmar`; return; }
    for (const r of regs) { for (const f of (r.fotos || [])) await delFoto(f); await delReg(r.id); } toast('Datos de la aplicación borrados'); vDatos(); };
  if (regs.length) { $('#dExp').onclick = () => exportar(true); $('#dExpL').onclick = () => exportar(false); }
  document.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
    if (b.dataset.arm !== '1') { b.dataset.arm = '1'; b.textContent = 'Tocá de nuevo para confirmar'; return; }
    const r = regs.find(x => x.id === b.dataset.del); for (const f of r.fotos) await delFoto(f); await delReg(r.id); toast('Registro borrado'); vDatos();
  });
}

const csvCell = (v) => { const s = String(v ?? ''); return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
function toCSV(rows, cols) { return '﻿' + [cols.join(';')].concat(rows.map(r => cols.map(c => csvCell(c === 'fotos' ? (r._fotosNombres || []).join(' | ') : r[c])).join(';'))).join('\r\n'); }

// ---------- KML para Google Earth ----------
const KML_CAPAS = { comentario: ['Comentarios del paisaje', 'ff00c8ff'], mancha: ['Manchas (cuadrantes)', 'ff3c9c2f'], transecto: ['Transectos de renovales', 'ff1f5fb3'], sendero: ['Senderos', 'ff3a41b3'], rapido: ['Registros rápidos (fauna, presiones, otros)', 'ffb8904a'] };
const xesc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function kmlDe(filas, titulo) {
  const out = [`<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${xesc(titulo)}</name>`];
  for (const [k, [n, col]] of Object.entries(KML_CAPAS)) out.push(`<Style id="s_${k}"><IconStyle><color>${col}</color><scale>1.1</scale><Icon><href>http://maps.google.com/mapfiles/kml/paddle/wht-blank.png</href></Icon></IconStyle></Style>`);
  for (const [k, [n]] of Object.entries(KML_CAPAS)) {
    const fs = (filas[k] || []).filter(r => r.lat !== '' && r.lon !== '' && r.lat != null && r.lon != null && !isNaN(parseFloat(String(r.lat).replace(',', '.'))));
    if (!fs.length) continue;
    out.push(`<Folder><name>${xesc(n)} (${fs.length})</name>`);
    for (const r of fs) {
      const la = parseFloat(String(r.lat).replace(',', '.')), lo = parseFloat(String(r.lon).replace(',', '.'));
      const nom = [r.parada, r.grupo, r.fisonomia || r.especie || r.que_es || r.sector || r.concluye_tipo || ''].filter(Boolean).join(' · ');
      const filasT = Object.entries(r).filter(([c, v]) => v !== '' && v != null && typeof v !== 'object' && !['lat', 'lon', 'id', 'fecha_hora', '_fotosNombres'].includes(c)).map(([c, v]) => `<tr><td><b>${xesc(c.replace(/_/g, ' '))}</b></td><td>${xesc(v)}</td></tr>`).join('');
      out.push(`<Placemark><name>${xesc(nom)}</name><styleUrl>#s_${k}</styleUrl><description><![CDATA[<table>${filasT}</table>]]></description><Point><coordinates>${lo},${la},0</coordinates></Point></Placemark>`);
    }
    out.push('</Folder>');
  }
  out.push('</Document></kml>');
  return out.join('\n');
}
async function exportar(conFotos = true) {
  const btn = $(conFotos ? '#dExp' : '#dExpL'), txt0 = btn.textContent; btn.disabled = true; btn.textContent = 'Armando el ZIP…';
  try {
    const regs = await allRegs();
    const zip = new JSZip();
    for (const r of regs) {
      r._fotosNombres = [];
      for (const fid of r.fotos) {
        const f = await getFoto(fid); if (!f) continue;
        const carpeta = `fotos/parada_${slug(r.parada)}/${r.tipo}`;
        if (conFotos) zip.file(`${carpeta}/${f.nombre}`, f.blob); r._fotosNombres.push(`${carpeta}/${f.nombre}`);
      }
    }
    const base = ['id', 'recorrido', 'materia', 'grupo', 'parada', 'fecha_local', 'fecha_hora', 'lat', 'lon', 'precision_m'];
    const de = (t) => regs.filter(r => r.tipo === t);
    const libres = regs.filter(r => !['mancha', 'comentario', 'transecto', 'sendero'].includes(r.tipo));
    zip.file('datos/comentario_paisaje.csv', toCSV(de('comentario'), base.concat(['rumbo_vista', 'relieve_veo', 'relieve_deduzco', 'vegetacion_veo', 'vegetacion_deduzco', 'humanos_veo', 'humanos_deduzco', 'presiones', 'concluye_tipo', 'concluye_donde', 'concluye_que_le_pasa', 'fotos'])));
    zip.file('datos/manchas_planilla_A.csv', toCSV(de('mancha'), base.concat(['ubicacion_cuadrante', 'fisonomia', 'dominante', 'cobertura', 'cobertura_pct', 'acompanantes', 'pct_suelo_veg', 'pct_roca', 'pct_hojarasca', 'pct_suelo_desnudo', 'orientacion', 'observaciones', 'fotos'])));
    const trK = TRAMOS.flatMap(t => { const k = t.replace('–', '_'); return ['plantulas_' + k, 'juveniles_' + k, 'disturbio_' + k]; });
    zip.file('datos/transectos_planilla_B.csv', toCSV(de('transecto'), base.concat(['especie', 'origen', 'rumbo', 'fisonomia_vecina', 'patron_adultos', 'adultos_origen'], trK, ['total_plantulas', 'total_juveniles', 'observaciones', 'fotos'])));
    zip.file('datos/senderos_lineas.csv', toCSV(de('sendero'), base.concat(['sector', 'largo_linea_m', 'pendiente_grados', 'n_senderos', 'senderos_cada_100m', 'ancho_medio_cm', 'profundidad_media_cm', 'profundidad_max_cm', 'con_erosion', 'cruces', 'uso', 'observaciones', 'fotos'])));
    const cruces = de('sendero').flatMap(r => (r._cruces || []).map(c => ({ id: r.id, grupo: r.grupo, parada: r.parada, sector: r.sector, lat: r.lat, lon: r.lon, sendero_n: c.n, ancho_cm: c.ancho_cm, profundidad_cm: c.prof_cm, erosion: c.erosion })));
    zip.file('datos/senderos_cruces.csv', toCSV(cruces, ['id', 'grupo', 'parada', 'sector', 'lat', 'lon', 'sendero_n', 'ancho_cm', 'profundidad_cm', 'erosion']));
    zip.file('datos/registros_rapidos.csv', toCSV(libres, base.concat(['tipo', 'categoria', 'que_es', 'cantidad', 'donde', 'observaciones', 'fotos'])));
    const gj = { type: 'FeatureCollection', features: regs.filter(r => r.lat !== '' && r.lon !== '').map(r => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [r.lon, r.lat] },
      properties: Object.fromEntries(Object.entries(r).filter(([k]) => !['fotos', '_fotosNombres', '_cruces'].includes(k)).concat([['fotos', (r._fotosNombres || []).join(' | ')]])) })) };
    zip.file('datos/puntos.geojson', JSON.stringify(gj, null, 1));
    const porTipo = { comentario: de('comentario'), mancha: de('mancha'), transecto: de('transecto'), sendero: de('sendero'), rapido: libres };
    zip.file('datos/puntos_google_earth.kml', kmlDe(porTipo, 'Salida Lago del Fuerte · equipo ' + sesion.grupo));
    zip.file('LEEME.txt', `Salidas a la naturaleza · Lago del Fuerte\r\nGrupo: ${sesion.grupo}\r\nExportado: ${new Date().toLocaleString('es-AR')}\r\nApp versión ${APP_VERSION}\r\n\r\nTablas para Excel (separador ;):\r\ndatos/comentario_paisaje.csv    -> comentarios del paisaje (observo / deduzco / concluyo)\r\ndatos/manchas_planilla_A.csv    -> lectura de manchas con cuadrante\r\ndatos/transectos_planilla_B.csv -> transectos de renovales por tramo\r\ndatos/senderos_lineas.csv       -> líneas de conteo de senderos (resumen)\r\ndatos/senderos_cruces.csv       -> cada sendero medido (ancho y profundidad)\r\ndatos/registros_rapidos.csv     -> registros rápidos con foto\r\ndatos/puntos_google_earth.kml   -> todos los puntos con GPS para abrir en Google Earth (doble clic)\r\ndatos/puntos.geojson            -> los mismos puntos para QGIS u otro SIG\r\n${conFotos ? 'fotos/parada_N/tipo/            -> fotos clasificadas; el nombre indica parada, grupo, tipo, qué es y n.º' : 'ESTE ZIP ES SOLO DE DATOS: las fotos están en el ZIP completo (los nombres figuran en la columna fotos).'}\r\n`);
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    const nombre = `salida_lago_del_fuerte_G${slug(sesion.grupo)}_${new Date().toISOString().slice(0, 10)}${conFotos ? '' : '_solo_datos'}.zip`;
    const file = new File([blob], nombre, { type: 'application/zip' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: nombre }); toast('Listo para enviar'); }
      catch { descargar(blob, nombre); }
    } else descargar(blob, nombre);
  } catch (e) { toast('No se pudo exportar: ' + e.message); }
  btn.disabled = false; btn.textContent = txt0;
}
function descargar(blob, nombre) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nombre; document.body.appendChild(a); a.click(); a.remove(); toast('ZIP descargado'); }

// ---------- Arranque ----------
function netState() { const el = $('#netState'); const on = navigator.onLine; el.textContent = on ? 'En línea' : 'Sin conexión'; el.classList.toggle('off', !on); }
window.addEventListener('online', netState); window.addEventListener('offline', netState);
document.querySelectorAll('.tab').forEach(b => b.onclick = () => { if (b.dataset.tab === 'guia') guiaSub = 'menu'; if (b.dataset.tab === 'relevar') relevarSub = null; go(b.dataset.tab); });
$('#sunBtn').onclick = () => { document.body.classList.toggle('sun'); store.set('sol', document.body.classList.contains('sun')); };
if (store.get('sol', false)) document.body.classList.add('sun');
netState(); render();
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { }));
