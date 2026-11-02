# Martuki · edición web 0.20.0

[Jugar](https://padisio.github.io/martuki/) · [Escuchar los cuatro cambios](https://padisio.github.io/martuki/escuchar-musica.html)

Banda sonora JRPG nueva, conservando la portada aprobada. Revisión 7: combates de jefe y jefe final rehechos, tensión en las transformaciones de Marixás, oso Martín, Mayrena y Rosi/David, y catástrofe durante la Menina gigante y el clímax de Josep. Tras la transformación, los diálogos no hacen volver a la comedia. La música de cada nivel continúa entre oleadas.

El paquete base de recursos sigue fijado a la Release 0.18.0 y su SHA-256. El código y los audios activos nuevos se aplican desde `web/`; la versión ensamblada es 0.20.0. `web/music-release.json` identifica los 17 cues y las huellas de los nuevos audios. La escucha a igual volumen permite comparar el arreglo del jefe final sin ventaja de nivel. Las pruebas de música del workflow comprueban los recursos, la portada, la continuidad y todas las páginas posteriores a las mutaciones.

# Martuki · edición web 0.18.0

[Jugar en el navegador](https://padisio.github.io/martuki/)

Juego completo con seis niveles, cinemáticas, epílogo, galería de personajes, música y diálogos coloreados según el personaje. Comparte los recursos de la APK 0.18.0.

- **F** o **⛶**: pantalla completa.
- **H** o **?**: controles.
- **WASD / flechas**: moverse; **J** golpe; **K** cutter; **L** disparo; **Espacio** esquiva; **U** especial; **B** invocar a Bofe.
- **P / Esc**: pausa; **M**: sonido.
- En móvil: orientación horizontal y controles táctiles.

La primera carga descarga las ilustraciones y puede tardar. La pantalla de inicio muestra progreso real, archivos preparados, datos recibidos, velocidad media de descarga y recursos recuperados de caché. Si la conexión se detiene, avisa y permite reintentar. La pantalla completa requiere pulsar un botón y depende del navegador.

La portada oculta los niveles bajo **Elegir capítulo**. En las cinemáticas, pulsa la mitad derecha para avanzar y la izquierda para retroceder; también funcionan las flechas del teclado. Los diálogos conservan sus colores por personaje. Las presentaciones muestran los nombres sin etiquetas adicionales y el juego solo anuncia avances y recogidas importantes.

La partida se guarda automáticamente, incluida la página de la cinemática. Al recargar se recupera; el combate vuelve en pausa. Desde la portada también se puede recuperar la última partida. Las imágenes y la música se conservan en la caché del navegador para reutilizarlas al volver. Si se borran los datos del sitio o el navegador elimina su almacenamiento, será necesario descargar los recursos otra vez. No hay sincronización entre dispositivos.

## Código y recursos completos

El paquete íntegro se distribuye como **Martuki-Web-0.18.0.zip** en la [Release v0.18.0](https://github.com/padisio/martuki/releases/tag/v0.18.0). Contiene `dist/`, el código JavaScript, todos los recursos, instrucciones, servidor local y manifiesto SHA-256. Para jugar localmente: extraer, ejecutar `node server.mjs` y abrir `http://127.0.0.1:4173`.

SHA-256 del ZIP:

```text
ebd2eb9a96b720209965120c7d1fdaa1f53cc257a75a1bbcd712546333f8da9e
```

## Despliegue

El workflow comprueba el cargador, descarga el paquete publicado desde la Release de este repositorio, verifica su SHA-256 y aplica los archivos de `web/` sobre `dist/` antes de publicar en GitHub Pages. `web/` contiene las mejoras posteriores al ZIP original; para ejecutarlas localmente, copiar su contenido sobre el `dist/` extraído. No necesita claves externas ni servidores adicionales. Se ejecuta al actualizar el workflow, `web/`, `tests/` o `package.json` en `main`, o manualmente desde Actions seleccionando `main`; Pages debe usar GitHub Actions como origen. Esto conserva la protección de Pages que solo permite desplegar desde la rama principal.

Para otra versión, adjuntar el nuevo paquete a su Release y actualizar en el workflow el nombre, la etiqueta y el SHA-256. El ZIP también contiene una configuración alternativa para publicar directamente `dist/` si se prefiere guardar todos los recursos en Git.

## Verificación previa

160 pruebas de lógica aprobadas. Prueba en Edge con escritorio y móvil emulado, rutas bajo `/martuki/`, pantalla completa, teclado, controles táctiles, diálogos y ausencia de errores de carga. Recursos comparados contra la APK: 731 archivos idénticos; únicamente se adaptó la entrada web y el control de fullscreen, con tres archivos web añadidos.

La mejora de carga añade 11 pruebas (`npm test`) para progreso, concurrencia, caché, velocidad, errores y bloqueos. Verificada en Brave con descarga ralentizada hasta completar los 486 recursos, y con un error HTTP forzado y reintento. Se cargan hasta seis imágenes en paralelo; el porcentaje llega al 100 % cuando el juego está preparado.

La actualización de interfaz y continuidad añade otras 11 pruebas sobre ausencia de spoilers, diálogos, recogidas, escala de la zombi rubia, restauración de partida y caché persistente. El workflow las ejecuta sobre el juego montado en `site/dist/`. En el proyecto principal pasan 182 pruebas. En Brave se ha comprobado la navegación izquierda/derecha, la recuperación de la misma página tras recargar, la recuperación del combate en pausa y una segunda carga con 486 recursos desde caché y 0 KB descargados. Estas comprobaciones de recarga reproducen la pérdida de memoria de la página; no equivalen a una prueba en un teléfono físico.
