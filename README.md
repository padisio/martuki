# Martuki · edición web 0.18.0

[Jugar en el navegador](https://padisio.github.io/martuki/)

Juego completo con seis niveles, cinemáticas, epílogo, galería de personajes, música y diálogos coloreados según el personaje. Comparte los recursos de la APK 0.18.0.

- **F** o **⛶**: pantalla completa.
- **H** o **?**: controles.
- **WASD / flechas**: moverse; **J** golpe; **K** cuchillo; **L** disparo; **Espacio** esquiva; **U** especial; **B** invocar a Bofe.
- **P / Esc**: pausa; **M**: sonido.
- En móvil: orientación horizontal y controles táctiles.

La primera carga descarga las ilustraciones y puede tardar. La pantalla completa requiere pulsar un botón y depende del navegador.

## Código y recursos completos

El paquete íntegro se distribuye como **Martuki-Web-0.18.0.zip** en la [Release v0.18.0](https://github.com/padisio/martuki/releases/tag/v0.18.0). Contiene `dist/`, el código JavaScript, todos los recursos, instrucciones, servidor local y manifiesto SHA-256. Para jugar localmente: extraer, ejecutar `node server.mjs` y abrir `http://127.0.0.1:4173`.

SHA-256 del ZIP:

```text
ebd2eb9a96b720209965120c7d1fdaa1f53cc257a75a1bbcd712546333f8da9e
```

## Despliegue

El workflow descarga el paquete publicado desde la Release de este repositorio, verifica su SHA-256 y publica exclusivamente `dist/` en GitHub Pages. No necesita claves externas ni servidores adicionales. Se ejecuta al actualizar este workflow en `main` o manualmente desde Actions seleccionando `main`; Pages debe usar GitHub Actions como origen. Esto conserva la protección de Pages que solo permite desplegar desde la rama principal.

Para otra versión, adjuntar el nuevo paquete a su Release y actualizar en el workflow el nombre, la etiqueta y el SHA-256. El ZIP también contiene una configuración alternativa para publicar directamente `dist/` si se prefiere guardar todos los recursos en Git.

## Verificación previa

160 pruebas de lógica aprobadas. Prueba en Edge con escritorio y móvil emulado, rutas bajo `/martuki/`, pantalla completa, teclado, controles táctiles, diálogos y ausencia de errores de carga. Recursos comparados contra la APK: 731 archivos idénticos; únicamente se adaptó la entrada web y el control de fullscreen, con tres archivos web añadidos.
