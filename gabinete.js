/* Gabinete · integra las exportaciones de la app de campo, analiza y genera Excel y PowerPoint */
'use strict';
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const COL = { dark: '#1A4331', mid: '#2F9468', mint: '#56B58D', fill: '#D9F1DF', alert: '#B3413A', gold: '#C9A227', blue: '#4A90B8', brown: '#8C6A4A', grey: '#5B6B62' };
const PAL = [COL.mid, COL.gold, COL.blue, COL.alert, COL.brown, COL.dark, COL.mint, '#9B6FB0', '#E2B92B', '#7A8C3A'];
const TRAMOS = ['0_5', '5_10', '10_15', '15_20', '20_25'];
const TRAMO_LBL = ['0–5 m', '5–10 m', '10–15 m', '15–20 m', '20–25 m'];
const EPT = ['Efímeras', 'Plecópteros', 'Tricópteros'];
const ZONA = [[-37.35054840878951, -59.12645674976687], [-37.35147568257391, -59.12655270170696], [-37.35167376237693, -59.12602694748193], [-37.35146461355053, -59.12483381516792], [-37.35145454143915, -59.12390799879461], [-37.35100654444017, -59.12336440916344], [-37.35022180415834, -59.12385248874079], [-37.34983236181426, -59.12502966988024]];
const PARADAS = [['P0', 'Puñón Mapuche', -37.349528, -59.127389], ['P1', 'Arroyo', -37.349911, -59.126698], ['P2', 'Bosquete y arbustal', -37.35019, -59.125477], ['P3', 'Roquedal y senderos', -37.351371, -59.12368], ['P4', 'Mirador', -37.350608, -59.123566]];

// ---------- estado ----------
const TABLAS = { comentario: 'comentario_paisaje.csv', mancha: 'manchas_planilla_A.csv', transecto: 'transectos_planilla_B.csv', sendero: 'senderos_lineas.csv', cruce: 'senderos_cruces.csv', rapido: 'registros_rapidos.csv' };
let D = vacio();
function vacio() { return { comentario: [], mancha: [], transecto: [], sendero: [], cruce: [], rapido: [], fotos: [], equipos: new Set(), archivos: 0, ids: new Set() }; }
const charts = [];

// ---------- CSV ----------
function parseCSV(txt) {
  txt = txt.replace(/^﻿/, '');
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < txt.length; i++) {
    const c = txt[i];
    if (q) { if (c === '"') { if (txt[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ';') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && txt[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  const head = rows.shift() || [];
  return rows.filter(r => r.length > 1 || (r[0] || '').trim()).map(r => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}
const num = (v) => { const x = parseFloat(String(v ?? '').replace(',', '.')); return isNaN(x) ? null : x; };
const mean = (a) => { a = a.filter(x => x !== null && !isNaN(x)); return a.length ? a.reduce((s, x) => s + x, 0) / a.length : null; };
const sd = (a) => { a = a.filter(x => x !== null); if (a.length < 2) return null; const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); };
const r1 = (x) => x === null || x === undefined ? '—' : (Math.round(x * 10) / 10).toLocaleString('es-AR');
function contar(arr, key) { const m = {}; arr.forEach(r => String(r[key] || '').split(';').map(s => s.trim()).filter(Boolean).forEach(v => m[v] = (m[v] || 0) + 1)); return Object.entries(m).sort((a, b) => b[1] - a[1]); }

// ---------- carga ----------
function log(msg, cls = '') { const el = $('#log'); el.innerHTML = `<div class="${cls}">${esc(msg)}</div>` + el.innerHTML; }
async function cargarArchivos(files) {
  for (const f of files) {
    try { await abrirZip(await JSZip.loadAsync(f), f.name, 0); }
    catch (e) { log(`No se pudo leer ${f.name}: ${e.message}`, 'err'); }
  }
  refrescar();
}
async function abrirZip(zip, nombre, nivel) {
  const nombres = Object.keys(zip.files);
  const esExport = nombres.some(n => /(^|\/)datos\/[^/]+\.csv$/.test(n));
  if (esExport) {
    // puede haber más de una exportación dentro de carpetas: agrupar por prefijo de "datos/"
    const prefijos = [...new Set(nombres.map(n => { const m = n.match(/^(.*?)datos\/[^/]+\.csv$/); return m ? m[1] : null; }).filter(x => x !== null))];
    for (const pre of prefijos) await leerExport(zip, pre, nombre);
  }
  for (const n of nombres) {
    if (/\.zip$/i.test(n) && !zip.files[n].dir && nivel < 3) {
      try { await abrirZip(await JSZip.loadAsync(await zip.files[n].async('blob')), n.split('/').pop(), nivel + 1); }
      catch (e) { log(`No se pudo abrir ${n}: ${e.message}`, 'err'); }
    }
  }
  if (!esExport && nivel === 0 && !nombres.some(n => /\.zip$/i.test(n))) log(`${nombre}: no parece una exportación de la aplicación.`, 'err');
}
async function leerExport(zip, pre, nombre) {
  let nuevos = 0, rep = 0;
  for (const [k, fn] of Object.entries(TABLAS)) {
    let f = zip.file(pre + 'datos/' + fn);
    if (!f && k === 'mancha') f = zip.file(pre + 'datos/A_comentario_paisaje_y_manchas.csv'); // versiones 0.1–0.2
    if (!f) continue;
    const filas = parseCSV(await f.async('string'));
    for (const r of filas) {
      const clave = k + '|' + r.id + (k === 'cruce' ? '|' + r.sendero_n : '');
      if (D.ids.has(clave)) { rep++; continue; }
      D.ids.add(clave); D[k].push(r); nuevos++;
      if (r.grupo) D.equipos.add(r.grupo);
    }
  }
  const fotos = Object.keys(zip.files).filter(n => n.startsWith(pre + 'fotos/') && /\.jpe?g$/i.test(n));
  for (const n of fotos) {
    const rel = n.slice(pre.length);
    if (D.fotos.some(x => x.path === rel)) continue;
    const blob = await zip.files[n].async('blob');
    const partes = rel.split('/');
    D.fotos.push({ path: rel, parada: (partes[1] || '').replace('parada_', '').toUpperCase(), tipo: partes[2] || '', blob, url: URL.createObjectURL(blob) });
  }
  D.archivos++;
  log(`✓ ${nombre}: ${nuevos} filas nuevas${rep ? `, ${rep} repetidas ignoradas` : ''}, ${fotos.length} fotos.`, 'ok');
}

// ---------- vistas ----------
let vista = 'resumen';
function refrescar() {
  const hay = D.comentario.length + D.mancha.length + D.transecto.length + D.sendero.length + D.rapido.length > 0;
  $('#tabs').classList.toggle('hidden', !hay);
  ['#bXlsx', '#bPptx', '#bKml', '#bGeo'].forEach(b => $(b).disabled = !hay);
  if (hay) render(); else $('#vista').innerHTML = '';
}
function render() {
  charts.splice(0).forEach(c => c.destroy());
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.v === vista));
  ({ resumen: vResumen, mapa: vMapa, arboles: vArboles, manchas: vManchas, senderos: vSenderos, arroyo: vArroyo, fauna: vFauna, paisaje: vPaisaje, fotos: vFotos }[vista])();
}
function tabla(filas, cols, titulos) {
  if (!filas.length) return '<p class="leg">Sin datos.</p>';
  return `<div class="tw"><table class="t"><thead><tr>${(titulos || cols).map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${filas.map(r => `<tr>${cols.map(c => `<td>${esc(r[c])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function chart(id, cfg) { const c = new Chart(document.getElementById(id), cfg); charts.push(c); return c; }
const baseOpts = (titulo, extra = {}) => ({ responsive: true, maintainAspectRatio: false, plugins: { title: { display: !!titulo, text: titulo, color: COL.dark, font: { size: 15, weight: 'bold' } }, legend: { labels: { color: COL.dark } } }, ...extra });

// --- análisis reutilizables (pantalla y PowerPoint) ---
function A_resumen() {
  const porTipo = [['Comentarios del paisaje', D.comentario.length], ['Lecturas de mancha', D.mancha.length], ['Transectos', D.transecto.length], ['Líneas de senderos', D.sendero.length], ['Registros rápidos', D.rapido.length]];
  const eq = [...D.equipos].sort().map(g => {
    const de = (arr) => arr.filter(r => r.grupo === g).length;
    const mat = contar([...D.comentario, ...D.mancha, ...D.transecto, ...D.sendero, ...D.rapido].filter(r => r.grupo === g), 'materia').map(x => x[0]).join(', ');
    return { equipo: g, materia: mat, comentarios: de(D.comentario), manchas: de(D.mancha), transectos: de(D.transecto), senderos: de(D.sendero), rapidos: de(D.rapido), fotos: D.fotos.filter(f => f.path.includes('_G' + slug(g) + '_')).length };
  });
  return { porTipo, eq };
}
const slug = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '').toLowerCase() || 'x';
function A_transectos() {
  const T = D.transecto;
  const pl = TRAMOS.map(k => mean(T.map(r => num(r['plantulas_' + k]))));
  const ju = TRAMOS.map(k => mean(T.map(r => num(r['juveniles_' + k]))));
  const sdT = TRAMOS.map(k => sd(T.map(r => (num(r['plantulas_' + k]) || 0) + (num(r['juveniles_' + k]) || 0))));
  let decrece = 0, evaluables = 0;
  T.forEach(r => {
    const tot = TRAMOS.map(k => (num(r['plantulas_' + k]) || 0) + (num(r['juveniles_' + k]) || 0));
    if (tot.reduce((a, b) => a + b, 0) === 0) return;
    evaluables++;
    if (tot[0] + tot[1] > tot[3] + tot[4]) decrece++;
  });
  const porEsp = contar(T, 'especie');
  const filas = T.map(r => ({ equipo: r.grupo, especie: r.especie, origen: r.origen, patron: r.patron_adultos, ...Object.fromEntries(TRAMOS.map((k, i) => [TRAMO_LBL[i], (num(r['plantulas_' + k]) || 0) + (num(r['juveniles_' + k]) || 0)])), total: (num(r.total_plantulas) || 0) + (num(r.total_juveniles) || 0) }));
  const densidad = T.length ? mean(T.map(r => ((num(r.total_plantulas) || 0) + (num(r.total_juveniles) || 0)) / 50)) : null; // faja de 25 × 2 m = 50 m²
  return { n: T.length, pl, ju, sdT, decrece, evaluables, porEsp, filas, densidad };
}
function A_manchas() {
  const M = D.mancha;
  const dom = contar(M, 'dominante');
  const cob = ['+', '1', '2', '3', '4', '5'].map(c => M.filter(r => String(r.cobertura) === c).length);
  const sdM = mean(M.filter(r => r.ubicacion_cuadrante === 'En la mancha').map(r => num(r.pct_suelo_desnudo)));
  const sdS = mean(M.filter(r => r.ubicacion_cuadrante === 'Junto a un sendero').map(r => num(r.pct_suelo_desnudo)));
  const fis = contar(M, 'fisonomia');
  return { n: M.length, dom, cob, sdM, sdS, fis };
}
function A_senderos() {
  const S = D.sendero, C = D.cruce;
  const uso = S.filter(r => r.sector === 'Con uso'), ctl = S.filter(r => r.sector !== 'Con uso');
  const dens = (arr) => mean(arr.map(r => num(r.senderos_cada_100m)));
  const anchos = C.map(r => num(r.ancho_cm)).filter(x => x !== null), profs = C.map(r => num(r.profundidad_cm)).filter(x => x !== null);
  const bins = [[0, 2], [2, 5], [5, 10], [10, 20], [20, 1e9]], binL = ['0–2', '2–5', '5–10', '10–20', '20 o más'];
  const hist = bins.map(([a, b]) => profs.filter(x => x >= a && x < b).length);
  const eros = C.length ? C.filter(r => r.erosion === 'sí').length / C.length * 100 : null;
  return { n: S.length, nc: C.length, densUso: dens(uso), densCtl: dens(ctl), nUso: uso.length, nCtl: ctl.length, anchoM: mean(anchos), profM: mean(profs), profMax: profs.length ? Math.max(...profs) : null, hist, binL, eros, usuarios: contar(S, 'uso') };
}
function A_arroyo() {
  const M = D.rapido.filter(r => r.tipo === 'macroinvertebrado');
  const grupos = {}; M.forEach(r => { grupos[r.que_es] = (grupos[r.que_es] || 0) + (num(r.cantidad) || 1); });
  const g = Object.entries(grupos).sort((a, b) => b[1] - a[1]);
  const ept = EPT.filter(x => grupos[x]);
  return { n: M.length, g, ept, riqueza: g.length };
}
function A_fauna() {
  const R = D.rapido;
  const pres = contar(R.filter(r => r.tipo === 'presion'), 'que_es');
  const presCom = contar(D.comentario, 'presiones');
  const fauna = contar(R.filter(r => ['indicio', 'invertebrado', 'ave'].includes(r.tipo)), 'categoria');
  const inv = contar(R.filter(r => r.tipo === 'invasora'), 'que_es');
  return { pres, presCom, fauna, inv, filas: R.filter(r => r.tipo !== 'macroinvertebrado') };
}

function vResumen() {
  const a = A_resumen();
  $('#vista').innerHTML = `<h2>Resumen de lo cargado</h2>
  <div class="kpis"><div class="kpi"><b>${D.equipos.size}</b><span>equipos</span></div>${a.porTipo.map(([t, n]) => `<div class="kpi"><b>${n}</b><span>${t}</span></div>`).join('')}<div class="kpi"><b>${D.fotos.length}</b><span>fotos</span></div></div>
  <h3>Por equipo</h3>${tabla(a.eq, ['equipo', 'materia', 'comentarios', 'manchas', 'transectos', 'senderos', 'rapidos', 'fotos'], ['Equipo', 'Materia', 'Comentarios', 'Manchas', 'Transectos', 'Senderos', 'Registros rápidos', 'Fotos'])}
  <div class="lectura"><b>Antes de interpretar:</b> revisar que todos los equipos estén y que ninguno tenga planillas vacías. Si un equipo entregó dos veces, las filas repetidas se descartan solas.</div>`;
}
function vMapa() {
  $('#vista').innerHTML = `<h2>Mapa de los registros</h2><div id="map"></div><p class="leg" id="mleg"></p>
  <p class="leg">Fondo: OpenStreetMap o imagen satelital de Esri (requieren conexión). Contorno: zona de trabajo. Los puntos dependen de la precisión del GPS de cada teléfono (columna precision_m).</p>`;
  const map = L.map('map').setView([-37.3505, -59.1255], 17);
  const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' });
  const sat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, attribution: 'Imagen © Esri' }).addTo(map);
  L.control.layers({ 'Satélite': sat, 'Calles': osm }).addTo(map);
  L.polygon(ZONA, { color: '#ff3b30', weight: 3, fill: false }).addTo(map);
  PARADAS.forEach(([c, n, la, lo]) => L.marker([la, lo], { icon: L.divIcon({ className: '', html: `<div style="background:${COL.dark};color:#fff;border:2px solid #fff;border-radius:50%;width:26px;height:26px;line-height:22px;text-align:center;font-weight:700;font-size:12px">${c.slice(1)}</div>` }) }).bindPopup(`${c} · ${n}`).addTo(map));
  const tipos = { comentario: ['Comentario del paisaje', COL.gold], mancha: ['Mancha', COL.mid], transecto: ['Transecto', COL.dark], sendero: ['Senderos', COL.brown], rapido: ['Registro rápido', COL.blue] };
  const pts = [];
  for (const [k, [nom, col]] of Object.entries(tipos)) D[k].forEach(r => {
    const la = num(r.lat), lo = num(r.lon); if (la === null || lo === null) return;
    pts.push([la, lo]);
    L.circleMarker([la, lo], { radius: 7, color: '#fff', weight: 1.5, fillColor: col, fillOpacity: .9 }).bindPopup(`<b>${esc(nom)}</b><br>Equipo ${esc(r.grupo)} · ${esc(r.parada)}<br>${esc(r.que_es || r.fisonomia || r.especie || r.sector || '')}`).addTo(map);
  });
  if (pts.length) map.fitBounds(L.latLngBounds(pts.concat(ZONA)).pad(0.1));
  $('#mleg').innerHTML = Object.values(tipos).map(([n, c]) => `<span class="dot" style="background:${c}"></span>${n}`).join('');
}
function vArboles() {
  const a = A_transectos();
  $('#vista').innerHTML = `<h2>¿Los árboles se escapan? Transectos de renovales</h2>
  <div class="kpis"><div class="kpi"><b>${a.n}</b><span>transectos</span></div><div class="kpi"><b>${a.evaluables ? a.decrece + ' de ' + a.evaluables : '—'}</b><span>con menos renovales lejos del borde</span></div><div class="kpi"><b>${r1(a.densidad)}</b><span>renovales por m² (promedio en la faja de 50 m²)</span></div></div>
  <div class="grid2"><div class="chartbox"><canvas id="c1"></canvas></div><div class="chartbox"><canvas id="c2"></canvas></div></div>
  <div class="lectura"><b>Cómo leerlo:</b> si los renovales son muchos cerca del borde y disminuyen con la distancia, la mancha probablemente se está expandiendo (Guía, cap. 5; Cuaderno, figura 5). Si no hay renovales en ningún tramo, la población es estable o fue plantada. Es una foto de un día: para hablar de tendencia hacen falta repeticiones en años siguientes.</div>
  <h3>Cada transecto (plántulas + juveniles por tramo)</h3>${tabla(a.filas, ['equipo', 'especie', 'origen', 'patron', ...TRAMO_LBL, 'total'], ['Equipo', 'Especie', 'Origen', 'Patrón de los adultos', ...TRAMO_LBL, 'Total'])}`;
  chart('c1', { type: 'bar', data: { labels: TRAMO_LBL, datasets: [{ label: 'Plántulas (promedio)', data: a.pl, backgroundColor: COL.mint }, { label: 'Juveniles (promedio)', data: a.ju, backgroundColor: COL.dark }] }, options: baseOpts('Renovales por tramo desde el borde', { scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, title: { display: true, text: 'individuos por tramo (10 m²)' } } } }) });
  chart('c2', { type: 'doughnut', data: { labels: a.porEsp.map(x => x[0]), datasets: [{ data: a.porEsp.map(x => x[1]), backgroundColor: PAL }] }, options: baseOpts('Transectos por especie de árbol') });
}
function vManchas() {
  const a = A_manchas();
  $('#vista').innerHTML = `<h2>Lectura de manchas (planilla A)</h2>
  <div class="kpis"><div class="kpi"><b>${a.n}</b><span>cuadrantes</span></div><div class="kpi"><b>${r1(a.sdM)} %</b><span>suelo desnudo en la mancha</span></div><div class="kpi"><b>${r1(a.sdS)} %</b><span>suelo desnudo junto al sendero</span></div></div>
  <div class="grid2"><div class="chartbox"><canvas id="c1"></canvas></div><div class="chartbox"><canvas id="c2"></canvas></div></div>
  <div class="lectura"><b>Cómo leerlo:</b> la forma de vida que más veces domina da nombre a la fisonomía. Si junto a los senderos hay claramente más suelo desnudo que dentro de la mancha, es un indicio del efecto del pisoteo, que se discute junto con los datos de senderos.</div>
  ${tabla(D.mancha, ['grupo', 'parada', 'ubicacion_cuadrante', 'fisonomia', 'dominante', 'cobertura', 'acompanantes', 'pct_suelo_desnudo', 'observaciones'], ['Equipo', 'Parada', 'Cuadrante', 'Fisonomía', 'Dominante', 'Cobertura', 'Acompañantes', '% suelo desnudo', 'Observaciones'])}`;
  chart('c1', { type: 'bar', data: { labels: a.dom.map(x => x[0]), datasets: [{ label: 'cuadrantes', data: a.dom.map(x => x[1]), backgroundColor: COL.mid }] }, options: baseOpts('Forma de vida dominante', { indexAxis: 'y', plugins: { legend: { display: false }, title: { display: true, text: 'Forma de vida dominante', color: COL.dark, font: { size: 15, weight: 'bold' } } } }) });
  chart('c2', { type: 'bar', data: { labels: ['+', '1', '2', '3', '4', '5'], datasets: [{ label: 'cuadrantes', data: a.cob, backgroundColor: COL.gold }] }, options: baseOpts('Clases de cobertura del dominante', { plugins: { legend: { display: false }, title: { display: true, text: 'Clases de cobertura del dominante', color: COL.dark, font: { size: 15, weight: 'bold' } } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }) });
}
function vSenderos() {
  const a = A_senderos();
  $('#vista').innerHTML = `<h2>Senderos: líneas de conteo</h2>
  <div class="kpis"><div class="kpi"><b>${r1(a.densUso)}</b><span>senderos cada 100 m (sector con uso, ${a.nUso} líneas)</span></div><div class="kpi"><b>${r1(a.densCtl)}</b><span>senderos cada 100 m (control, ${a.nCtl} líneas)</span></div><div class="kpi"><b>${r1(a.anchoM)} cm</b><span>ancho medio</span></div><div class="kpi"><b>${r1(a.profM)} cm</b><span>profundidad media (máx. ${r1(a.profMax)})</span></div><div class="kpi"><b>${r1(a.eros)} %</b><span>senderos con señales de erosión</span></div></div>
  <div class="grid2"><div class="chartbox"><canvas id="c1"></canvas></div><div class="chartbox"><canvas id="c2"></canvas></div></div>
  <div class="lectura"><b>Cómo leerlo:</b> un sendero hundido varios centímetros indica pérdida de suelo. Comparar con el sector de control permite separar el efecto del uso del de la pendiente. Con pocas líneas, las diferencias pueden deberse al azar: decirlo en el informe.</div>
  <h3>Cada sendero medido</h3>${tabla(D.cruce, ['grupo', 'parada', 'sector', 'sendero_n', 'ancho_cm', 'profundidad_cm', 'erosion'], ['Equipo', 'Parada', 'Sector', 'N.º', 'Ancho (cm)', 'Profundidad (cm)', 'Erosión'])}`;
  chart('c1', { type: 'bar', data: { labels: a.binL, datasets: [{ label: 'senderos', data: a.hist, backgroundColor: COL.brown }] }, options: baseOpts('Profundidad de los senderos (cm)', { plugins: { legend: { display: false }, title: { display: true, text: 'Profundidad de los senderos (cm)', color: COL.dark, font: { size: 15, weight: 'bold' } } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }) });
  chart('c2', { type: 'bar', data: { labels: a.usuarios.map(x => x[0]), datasets: [{ label: 'líneas donde se registró', data: a.usuarios.map(x => x[1]), backgroundColor: COL.blue }] }, options: baseOpts('¿Quién usa los senderos? (huellas)', { plugins: { legend: { display: false }, title: { display: true, text: '¿Quién usa los senderos? (huellas)', color: COL.dark, font: { size: 15, weight: 'bold' } } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }) });
}
function vArroyo() {
  const a = A_arroyo();
  $('#vista').innerHTML = `<h2>Arroyo: macroinvertebrados</h2>
  <div class="kpis"><div class="kpi"><b>${a.riqueza}</b><span>grupos distintos</span></div><div class="kpi"><b>${a.ept.length} de 3</b><span>grupos sensibles (efímeras, plecópteros, tricópteros)</span></div></div>
  <div class="chartbox"><canvas id="c1"></canvas></div>
  <div class="lectura"><b>Cómo leerlo:</b> efímeras, plecópteros y tricópteros son sensibles a la contaminación; su presencia sugiere buena calidad del agua y su ausencia, posible deterioro (Guía, cap. 7, basado en Darrigran et al., 2007). Con un solo muestreo es una primera aproximación, no un diagnóstico.</div>
  ${a.ept.length ? `<p>Grupos sensibles encontrados: <b>${a.ept.join(', ')}</b>.</p>` : '<p class="aviso">No se registraron grupos sensibles. Antes de concluir, revisar si se muestreó el rápido y si se identificaron bien los grupos.</p>'}`;
  chart('c1', { type: 'bar', data: { labels: a.g.map(x => x[0]), datasets: [{ label: 'individuos', data: a.g.map(x => x[1]), backgroundColor: a.g.map(x => EPT.includes(x[0]) ? COL.mid : COL.grey) }] }, options: baseOpts('Individuos por grupo (verde: sensibles)', { plugins: { legend: { display: false }, title: { display: true, text: 'Individuos por grupo (verde: sensibles)', color: COL.dark, font: { size: 15, weight: 'bold' } } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }) });
}
function vFauna() {
  const a = A_fauna();
  $('#vista').innerHTML = `<h2>Fauna, invasoras y presiones</h2>
  <div class="grid2"><div class="chartbox"><canvas id="c1"></canvas></div><div class="chartbox"><canvas id="c2"></canvas></div></div>
  <h3>Todos los registros rápidos</h3>${tabla(a.filas, ['grupo', 'parada', 'categoria', 'que_es', 'cantidad', 'donde', 'observaciones'], ['Equipo', 'Parada', 'Categoría', 'Qué es', 'Cantidad', 'Dónde', 'Observaciones'])}`;
  const pres = a.pres.length ? a.pres : a.presCom;
  chart('c1', { type: 'bar', data: { labels: pres.map(x => x[0]), datasets: [{ label: 'registros', data: pres.map(x => x[1]), backgroundColor: COL.alert }] }, options: baseOpts(a.pres.length ? 'Presiones registradas con foto y GPS' : 'Presiones mencionadas en los comentarios', { indexAxis: 'y', plugins: { legend: { display: false }, title: { display: true, text: a.pres.length ? 'Presiones registradas con foto y GPS' : 'Presiones mencionadas en los comentarios', color: COL.dark, font: { size: 15, weight: 'bold' } } } }) });
  const mix = a.fauna.concat(a.inv.map(([k, v]) => ['Invasora: ' + k, v]));
  chart('c2', { type: 'bar', data: { labels: mix.map(x => x[0]), datasets: [{ label: 'registros', data: mix.map(x => x[1]), backgroundColor: COL.mid }] }, options: baseOpts('Fauna e invasoras registradas', { indexAxis: 'y', plugins: { legend: { display: false }, title: { display: true, text: 'Fauna e invasoras registradas', color: COL.dark, font: { size: 15, weight: 'bold' } } } }) });
}
function vPaisaje() {
  const C = D.comentario;
  $('#vista').innerHTML = `<h2>Comentarios del paisaje</h2>
  <p>Lo que concluyó cada equipo en cada parada. Comparar el comentario del Puñón (P0) con el del mirador (P4) muestra cómo cambió la lectura.</p>
  <div class="cards">${C.map(r => `<div class="card"><h4>Equipo ${esc(r.grupo)} · ${esc(r.parada)}${r.rumbo_vista ? ' · mirando al ' + esc(r.rumbo_vista) : ''}</h4>
  ${r.concluye_tipo ? `<p><b>Tipo de paisaje:</b> ${esc(r.concluye_tipo)}</p>` : ''}${r.concluye_donde ? `<p><b>Dónde estamos:</b> ${esc(r.concluye_donde)}</p>` : ''}${r.concluye_que_le_pasa ? `<p><b>Qué le pasa:</b> ${esc(r.concluye_que_le_pasa)}</p>` : ''}
  <details><summary>Observaciones y deducciones</summary>
  <p><b>Relieve:</b> ${esc(r.relieve_veo)} → <i>${esc(r.relieve_deduzco)}</i></p><p><b>Vegetación y agua:</b> ${esc(r.vegetacion_veo)} → <i>${esc(r.vegetacion_deduzco)}</i></p><p><b>Elementos humanos:</b> ${esc(r.humanos_veo)} → <i>${esc(r.humanos_deduzco)}</i></p></details>
  <div class="chips">${String(r.presiones || '').split(';').map(s => s.trim()).filter(Boolean).map(s => `<span>${esc(s)}</span>`).join('')}</div></div>`).join('') || '<p class="leg">Sin comentarios cargados.</p>'}</div>`;
}
function vFotos() {
  const F = [...D.fotos].sort((a, b) => a.path < b.path ? -1 : 1);
  $('#vista').innerHTML = `<h2>Fotos (${F.length})</h2><p class="leg">Ordenadas por parada y tipo. El nombre de cada foto indica parada, equipo, tipo, qué es y número. Tocá una foto para agrandarla.</p>
  <div class="gal">${F.map((f, i) => `<figure><img src="${f.url}" data-i="${i}" alt=""><figcaption>${esc(f.path.split('/').pop())}</figcaption></figure>`).join('')}</div><dialog id="dlg"><img id="dimg" alt=""></dialog>`;
  document.querySelectorAll('.gal img').forEach(im => im.onclick = () => { $('#dimg').src = im.src; $('#dlg').showModal(); });
  $('#dlg').onclick = () => $('#dlg').close();
}

// ---------- exportaciones ----------
function exportarXlsx() {
  const wb = XLSX.utils.book_new();
  const a = A_resumen();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(a.eq), 'Resumen por equipo');
  const hojas = [['comentario', 'Comentarios'], ['mancha', 'Manchas (A)'], ['transecto', 'Transectos (B)'], ['sendero', 'Senderos (líneas)'], ['cruce', 'Senderos (cada uno)'], ['rapido', 'Registros rápidos']];
  hojas.forEach(([k, n]) => { if (D[k].length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(D[k]), n); });
  const t = A_transectos();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(TRAMO_LBL.map((l, i) => ({ tramo: l, plantulas_promedio: t.pl[i], juveniles_promedio: t.ju[i], desvio_total: t.sdT[i] }))), 'Análisis transectos');
  XLSX.writeFile(wb, `salida_ladera_punon_datos_integrados_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
function exportarGeo() {
  const feats = [];
  for (const k of ['comentario', 'mancha', 'transecto', 'sendero', 'rapido']) D[k].forEach(r => { const la = num(r.lat), lo = num(r.lon); if (la !== null && lo !== null) feats.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [lo, la] }, properties: { capa: k, ...r } }); });
  const blob = new Blob([JSON.stringify({ type: 'FeatureCollection', features: feats }, null, 1)], { type: 'application/geo+json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'salida_ladera_punon_puntos.geojson'; a.click();
}
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
function exportarKml() {
  const blob = new Blob([kmlDe(D, 'Salida ladera del Puñón · puntos de todos los equipos')], { type: 'application/vnd.google-earth.kml+xml' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'salida_ladera_punon_puntos_google_earth.kml'; a.click();
}
async function blobToDataURL(blob) { return new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); }); }
async function exportarPptx() {
  const btn = $('#bPptx'); btn.disabled = true; btn.textContent = 'Armando…';
  try {
    const p = new PptxGenJS(); p.layout = 'LAYOUT_WIDE'; p.title = 'Resultados · El caso de la ladera del Puñón';
    const F = 'Calibri', H = 'Georgia';
    const tit = (s, t, sub) => { s.background = { color: 'FFFFFF' }; s.addShape(p.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 0.9, fill: { color: '1A4331' } }); s.addText(t, { x: 0.5, y: 0.12, w: 12.3, h: 0.66, fontFace: H, fontSize: 26, bold: true, color: 'FFFFFF' }); if (sub) s.addText(sub, { x: 0.5, y: 0.95, w: 12.3, h: 0.4, fontFace: F, fontSize: 14, color: '5B6B62', italic: true }); };
    const lect = (s, txt, y = 6.35) => s.addText(txt, { x: 0.5, y, w: 12.3, h: 0.85, fontFace: F, fontSize: 13, color: '7A5E10', fill: { color: 'FFF9E0' }, margin: 8 });
    const kpi = (s, x, y, val, lab) => { s.addShape(p.ShapeType.roundRect, { x, y, w: 2.9, h: 1.25, fill: { color: 'F4F6F3' }, line: { color: 'CFE3D6' }, rectRadius: 0.1 }); s.addText(String(val), { x, y: y + 0.08, w: 2.9, h: 0.6, align: 'center', fontFace: H, fontSize: 28, bold: true, color: '1A4331' }); s.addText(lab, { x: x + 0.1, y: y + 0.68, w: 2.7, h: 0.5, align: 'center', fontFace: F, fontSize: 11, color: '5B6B62' }); };
    const chOpt = { showLegend: true, legendPos: 'b', legendFontSize: 11, catAxisLabelFontSize: 11, valAxisLabelFontSize: 10, dataLabelFontSize: 10 };
    // 1 portada
    let s = p.addSlide(); s.background = { color: 'F4F6F3' };
    s.addShape(p.ShapeType.rect, { x: 0, y: 0, w: 0.35, h: 7.5, fill: { color: '1A4331' } });
    s.addText('SALIDAS A LA NATURALEZA · RESULTADOS', { x: 0.9, y: 1.1, w: 11, h: 0.4, fontFace: F, fontSize: 14, bold: true, color: '2F9468', charSpacing: 3 });
    s.addText('El caso de la ladera del Puñón', { x: 0.9, y: 1.6, w: 11.5, h: 1, fontFace: H, fontSize: 40, bold: true, color: '1A4331' });
    s.addText('¿Qué le está pasando a esta ladera, por qué, y qué convendría hacer?', { x: 0.9, y: 2.65, w: 11.5, h: 0.6, fontFace: F, fontSize: 20, italic: true, color: '14261F' });
    s.addText(`Datos de ${D.equipos.size} equipos · ${D.fotos.length} fotos · procesado el ${new Date().toLocaleDateString('es-AR')}`, { x: 0.9, y: 3.4, w: 11.5, h: 0.4, fontFace: F, fontSize: 14, color: '5B6B62' });
    s.addText('Fundamentos de Biología · Marcos Naturales y Problemáticas Ambientales de la Argentina · LDGA · FCH · UNICEN', { x: 0.9, y: 6.5, w: 11.5, h: 0.4, fontFace: F, fontSize: 12, color: '5B6B62' });
    // 2 resumen
    const a = A_resumen(); s = p.addSlide(); tit(s, 'Lo que juntamos', 'Datos tomados por los equipos en la salida');
    kpi(s, 0.5, 1.5, D.equipos.size, 'equipos'); a.porTipo.slice(0, 3).forEach(([t, n], i) => kpi(s, 3.6 + i * 3.1, 1.5, n, t));
    a.porTipo.slice(3).forEach(([t, n], i) => kpi(s, 0.5 + i * 3.1, 3.0, n, t)); kpi(s, 6.7, 3.0, D.fotos.length, 'fotos');
    const rowsEq = [['Equipo', 'Materia', 'Coment.', 'Manchas', 'Transectos', 'Senderos', 'Rápidos'].map(t => ({ text: t, options: { bold: true, color: 'FFFFFF', fill: { color: '1A4331' } } }))].concat(a.eq.slice(0, 8).map(r => [r.equipo, r.materia, r.comentarios, r.manchas, r.transectos, r.senderos, r.rapidos].map(String)));
    s.addTable(rowsEq, { x: 0.5, y: 4.5, w: 12.3, fontFace: F, fontSize: 11, border: { type: 'solid', color: 'CFE3D6', pt: 0.5 } });
    // 3 transectos
    const t = A_transectos();
    if (t.n) {
      s = p.addSlide(); tit(s, '¿Los árboles se escapan?', `${t.n} transectos de renovales desde el borde de árboles adultos`);
      s.addChart(p.ChartType.bar, [{ name: 'Plántulas', labels: TRAMO_LBL, values: t.pl.map(x => +(x || 0).toFixed(1)) }, { name: 'Juveniles', labels: TRAMO_LBL, values: t.ju.map(x => +(x || 0).toFixed(1)) }], { x: 0.5, y: 1.4, w: 7.6, h: 4.8, barGrouping: 'stacked', chartColors: ['56B58D', '1A4331'], ...chOpt, showTitle: true, title: 'Promedio de renovales por tramo (10 m²)', titleFontSize: 14, valAxisMinVal: 0 });
      kpi(s, 8.6, 1.5, t.evaluables ? `${t.decrece}/${t.evaluables}` : '—', 'transectos con menos renovales lejos del borde');
      kpi(s, 8.6, 3.0, r1(t.densidad), 'renovales por m² (promedio)');
      if (t.porEsp.length) s.addChart(p.ChartType.doughnut, [{ name: 'Especie', labels: t.porEsp.map(x => x[0]), values: t.porEsp.map(x => x[1]) }], { x: 8.4, y: 4.3, w: 4.4, h: 2.0, chartColors: PAL.map(c => c.slice(1)), showLegend: true, legendPos: 'r', legendFontSize: 10, dataLabelFontSize: 9 });
      lect(s, 'Si los renovales son muchos cerca del borde y disminuyen con la distancia, la mancha probablemente se está expandiendo. Es una foto de un día: la tendencia se confirma repitiendo el muestreo en años siguientes.');
    }
    // 4 manchas
    const m = A_manchas();
    if (m.n) {
      s = p.addSlide(); tit(s, 'Las manchas de cerca', `${m.n} cuadrantes de 1 × 1 m`);
      if (m.dom.length) s.addChart(p.ChartType.bar, [{ name: 'Cuadrantes', labels: m.dom.map(x => x[0]), values: m.dom.map(x => x[1]) }], { x: 0.5, y: 1.4, w: 6.2, h: 4.8, barDir: 'bar', chartColors: ['2F9468'], ...chOpt, showLegend: false, showTitle: true, title: 'Forma de vida dominante', titleFontSize: 14 });
      kpi(s, 7.3, 1.6, `${r1(m.sdM)} %`, 'suelo desnudo dentro de la mancha'); kpi(s, 10.3, 1.6, `${r1(m.sdS)} %`, 'suelo desnudo junto al sendero');
      s.addChart(p.ChartType.bar, [{ name: 'Cuadrantes', labels: ['+', '1', '2', '3', '4', '5'], values: m.cob }], { x: 7.1, y: 3.1, w: 5.8, h: 3.1, chartColors: ['C9A227'], ...chOpt, showLegend: false, showTitle: true, title: 'Clases de cobertura del dominante', titleFontSize: 13 });
      lect(s, 'La forma de vida que más domina da nombre a la fisonomía. Más suelo desnudo junto a los senderos que dentro de la mancha es un indicio del efecto del pisoteo.');
    }
    // 5 senderos
    const sd2 = A_senderos();
    if (sd2.n) {
      s = p.addSlide(); tit(s, 'Las huellas del uso: senderos', `${sd2.n} líneas de conteo · ${sd2.nc} senderos medidos`);
      kpi(s, 0.5, 1.5, r1(sd2.densUso), 'senderos cada 100 m (con uso)'); kpi(s, 3.6, 1.5, r1(sd2.densCtl), 'senderos cada 100 m (control)'); kpi(s, 6.7, 1.5, `${r1(sd2.profM)} cm`, 'profundidad media'); kpi(s, 9.8, 1.5, `${r1(sd2.eros)} %`, 'con señales de erosión');
      s.addChart(p.ChartType.bar, [{ name: 'Senderos', labels: sd2.binL, values: sd2.hist }], { x: 0.5, y: 3.0, w: 6.2, h: 3.2, chartColors: ['8C6A4A'], ...chOpt, showLegend: false, showTitle: true, title: 'Profundidad de los senderos (cm)', titleFontSize: 13 });
      if (sd2.usuarios.length) s.addChart(p.ChartType.bar, [{ name: 'Líneas', labels: sd2.usuarios.map(x => x[0]), values: sd2.usuarios.map(x => x[1]) }], { x: 6.9, y: 3.0, w: 5.9, h: 3.2, chartColors: ['4A90B8'], ...chOpt, showLegend: false, showTitle: true, title: '¿Quién los usa? (huellas)', titleFontSize: 13 });
      lect(s, 'Un sendero hundido varios centímetros indica pérdida de suelo. Comparar con el sector de control ayuda a separar el efecto del uso del de la pendiente.');
    }
    // 6 arroyo
    const ar = A_arroyo();
    if (ar.n) {
      s = p.addSlide(); tit(s, '¿El agua está sana?', 'Macroinvertebrados del arroyo Del Fuerte');
      s.addChart(p.ChartType.bar, [{ name: 'Individuos', labels: ar.g.map(x => x[0]), values: ar.g.map(x => x[1]) }], { x: 0.5, y: 1.4, w: 8, h: 4.8, chartColors: ['2F9468'], ...chOpt, showLegend: false, showTitle: true, title: 'Individuos por grupo', titleFontSize: 14 });
      kpi(s, 9.2, 1.6, ar.riqueza, 'grupos distintos'); kpi(s, 9.2, 3.1, `${ar.ept.length} de 3`, 'grupos sensibles (efímeras, plecópteros, tricópteros)');
      lect(s, 'Efímeras, plecópteros y tricópteros son sensibles a la contaminación: su presencia sugiere buena calidad del agua. Con un solo muestreo es una primera aproximación.');
    }
    // 7 presiones y fauna
    const fa = A_fauna(); const pres = fa.pres.length ? fa.pres : fa.presCom;
    if (pres.length || fa.fauna.length) {
      s = p.addSlide(); tit(s, 'Presiones y fauna', 'Lo que registraron los equipos con foto y GPS');
      if (pres.length) s.addChart(p.ChartType.bar, [{ name: 'Registros', labels: pres.slice(0, 10).map(x => x[0]), values: pres.slice(0, 10).map(x => x[1]) }], { x: 0.5, y: 1.4, w: 6.2, h: 5.4, barDir: 'bar', chartColors: ['B3413A'], ...chOpt, showLegend: false, showTitle: true, title: 'Presiones', titleFontSize: 14 });
      const mix = fa.fauna.concat(fa.inv.map(([k, v]) => ['Invasora: ' + k, v]));
      if (mix.length) s.addChart(p.ChartType.bar, [{ name: 'Registros', labels: mix.slice(0, 10).map(x => x[0]), values: mix.slice(0, 10).map(x => x[1]) }], { x: 6.9, y: 1.4, w: 6, h: 5.4, barDir: 'bar', chartColors: ['2F9468'], ...chOpt, showLegend: false, showTitle: true, title: 'Fauna e invasoras', titleFontSize: 14 });
    }
    // 8 comentarios: conclusiones
    const conTxt = D.comentario.filter(r => r.concluye_que_le_pasa); const finales = conTxt.filter(r => r.parada === 'P4'); const concl = (finales.length ? finales : conTxt).slice(0, 8);
    if (concl.length) {
      s = p.addSlide(); tit(s, '¿Qué le pasa a la ladera? Lo que dijeron los equipos', 'Conclusiones de los comentarios del paisaje');
      s.addText(concl.map(r => ({ text: `Equipo ${r.grupo} (${r.parada}): ${r.concluye_que_le_pasa}`, options: { bullet: true, breakLine: true } })), { x: 0.6, y: 1.5, w: 12.1, h: 5.4, fontFace: F, fontSize: 16, color: '14261F', valign: 'top', paraSpaceAfter: 8 });
    }
    // 9 fotos
    const fotos = []; const vistos = new Set();
    for (const f of D.fotos) { if (vistos.has(f.tipo)) continue; vistos.add(f.tipo); fotos.push(f); if (fotos.length === 6) break; }
    if (fotos.length) {
      s = p.addSlide(); tit(s, 'La ladera en fotos', 'Una foto por tipo de registro');
      for (let i = 0; i < fotos.length; i++) { const x = 0.5 + (i % 3) * 4.15, y = 1.45 + Math.floor(i / 3) * 2.95; s.addImage({ data: await blobToDataURL(fotos[i].blob), x, y, w: 3.95, h: 2.5, sizing: { type: 'cover', w: 3.95, h: 2.5 } }); s.addText(`${fotos[i].parada} · ${fotos[i].tipo}`, { x, y: y + 2.5, w: 3.95, h: 0.32, fontFace: F, fontSize: 11, color: '5B6B62' }); }
    }
    // 10 para el ateneo
    s = p.addSlide(); tit(s, 'Para el ateneo', 'Del dato al diagnóstico');
    s.addText([
      { text: 'Diagnóstico: ¿qué le pasa a la ladera? ¿Qué datos lo sostienen?', options: { bullet: { code: '25CF' }, breakLine: true } },
      { text: 'Causas probables: ¿qué presiones explican lo que vimos?', options: { bullet: { code: '25CF' }, breakLine: true } },
      { text: 'Pronóstico: ¿qué pasaría en 20 años si nada cambia?', options: { bullet: { code: '25CF' }, breakLine: true } },
      { text: 'Estudios que faltan: ¿qué no podemos afirmar todavía?', options: { bullet: { code: '25CF' }, breakLine: true } },
      { text: 'Recomendación al municipio: ¿forestar y abrir un circuito de bici, o proteger el pastizal serrano? ¿Por qué?', options: { bullet: { code: '25CF' } } },
    ], { x: 0.8, y: 1.6, w: 11.8, h: 4.6, fontFace: F, fontSize: 20, color: '14261F', paraSpaceAfter: 14 });
    lect(s, 'Distinguir siempre lo seguro de lo probable. Un dato de un día no es una tendencia; varios equipos que coinciden dan más confianza que uno solo.');
    await p.writeFile({ fileName: `Resultados_ladera_del_Punon_${new Date().toISOString().slice(0, 10)}.pptx` });
  } catch (e) { alert('No se pudo armar la presentación: ' + e.message); console.error(e); }
  btn.disabled = false; btn.textContent = '⬇ Presentación de resultados';
}

// ---------- eventos ----------
const drop = $('#drop');
['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', e => cargarArchivos([...e.dataTransfer.files]));
$('#fin').onchange = (e) => { cargarArchivos([...e.target.files]); e.target.value = ''; };
$('#bDemo').onclick = async () => {
  try { const r = await fetch('demo/entregas_ejemplo.zip'); if (!r.ok) throw new Error('no se encontró el archivo de ejemplo'); await cargarArchivos([new File([await r.blob()], 'entregas_ejemplo.zip')]); }
  catch (e) { log('Ejemplo: ' + e.message + ' (si abriste la página como archivo local, usá el botón "elegilos" y buscá demo/entregas_ejemplo.zip)', 'err'); }
};
$('#bReset').onclick = () => { D.fotos.forEach(f => URL.revokeObjectURL(f.url)); D = vacio(); $('#log').innerHTML = ''; refrescar(); };
document.querySelectorAll('#tabs button').forEach(b => b.onclick = () => { vista = b.dataset.v; render(); });
$('#bXlsx').onclick = exportarXlsx; $('#bGeo').onclick = exportarGeo; $('#bKml').onclick = exportarKml; $('#bPptx').onclick = exportarPptx;
