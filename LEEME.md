# Salidas a la naturaleza · App de campo y gabinete (versión 0.4.5)

Sitio web estático para publicar en GitHub Pages (ver la Guía de implementación, sección 6).

- `index.html` → la **aplicación de campo** para los estudiantes. Funciona sin conexión después de la primera carga: guía con fotos de seguridad, planillas con foto y GPS, exportación en ZIP clasificado.
- `gabinete.html` → la **página de gabinete** para el docente. Integra los ZIP de todos los equipos (o el ZIP de "Descargar todas las entregas" del aula virtual), muestra tablas, gráficos, mapa y fotos, y descarga el Excel integrado, el GeoJSON y una presentación de resultados en PowerPoint. Todo se procesa en el navegador: los datos no salen de la computadora.
- `demo/entregas_ejemplo.zip` → datos **inventados** de cuatro equipos para practicar con el gabinete.
- `lib/` → bibliotecas incluidas para no depender de servicios externos: Chart.js 4.4.1 (MIT), Leaflet 1.9.4 (BSD-2), SheetJS 0.18.5 (Apache-2.0), PptxGenJS 3.12.0 (MIT). JSZip (MIT/GPL) en la raíz.
- Fotos de fauna en `img/s_*.jpg`: iNaturalist, licencia CC BY; créditos en la propia aplicación.

Novedades 0.4.5: el botón de borrado aclara que solo borra los datos de la aplicación, no el resto del celular. Novedades 0.4.4: botón para borrar todos los datos de prueba; el ZIP trae los puntos en KML para Google Earth; el gabinete exporta el mapa en KML. Novedades 0.4.3: dos exportaciones, completa (datos + fotos) y solo datos (liviana), con el peso estimado del ZIP. Novedades 0.4.2: instrucciones de senderos más claras (para qué y cómo).
Novedades 0.4.1: invasoras del sector (retama, retamilla, zarzamora); transecto también desde matorrales.
Novedades 0.4.0: salida de 2 h 15 min con cinco paradas (P0–P4); sección de seguridad con fotos; página de gabinete.
Novedades 0.3.0: misión por parada y materia; comentario del paisaje en tres bloques; transecto de renovales con gráfico; línea de senderos; presiones; exportación en tablas separadas.
