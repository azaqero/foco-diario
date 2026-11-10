# Foco Diario

**Tu feed en calma, sin la dopamina del scroll.**

Foco Diario convierte tu feed de Facebook en una **edición finita de periódico**:
una sola portada al día, hecha para leer y terminar. Sin scroll infinito, sin
métricas de engagement, sin videos que te atrapan. Cuando llegas al final del
diario, llegaste al final del feed.

> Pensado para cerebros que se distraen fácil — incluidos los que conviven con
> TDAH — y para cualquiera que quiera recuperar el foco sin bloquear la red.

## El problema

Las redes están diseñadas para que no te vayas: scroll infinito, contadores que
suben, videos que arrancan solos. No es falta de voluntad; es el diseño.

## La solución

En vez de bloquear Facebook, Foco Diario lo **de-feedea**. Reemplaza el feed por
una portada:

- **Masthead + fecha**, como un diario de verdad.
- **Una nota principal, dos secundarias y breves.** Nada más.
- **Fin del diario.** Literal: hay un final.
- **Solo texto e imágenes de ilustración en blanco y negro.** Se eliminan
  reacciones, comentarios, contadores y toda la parafernalia de engagement.

El resultado: una lectura deliberada, una vez por día, y después tu atención de
vuelta donde tiene que estar.

## Qué incluye (Fase 1)

- **Una edición por día.** La primera carga arma la portada; las siguientes del
  mismo día aparecen **instantáneas**, sin volver a recorrer el feed.
- **Cache de 7 días** con fallback: si el feed no se puede leer, mostramos la
  última edición con un aviso. Nunca te devuelve al feed original.
- **"Reimprimir"** manual, una vez por día, para cuando necesitas forzar una
  actualización.
- **Lightbox de detalle** con el texto completo, autor y fecha.
- **Fail-closed:** si no hay nada que mostrar, hay un estado vacío explícito. La
  red nunca aparece por accidente.

## Privacidad

- **100% local.** Sin cuenta, sin telemetría, sin requests salientes.
- La edición se guarda en `storage.local` de tu navegador. Nada más.
- El motor está pensado para ser auditable: no hay código remoto.

## Instalación

### Chrome (MV3)

1. Descarga `foco-diario-<versión>-chrome.zip` desde **Releases**.
2. Descomprímelo en una carpeta.
3. Abre `chrome://extensions` y activa **Modo de desarrollador**.
4. **Cargar descomprimida** → elige la carpeta.
5. Abre o recarga `https://www.facebook.com/`.

### Firefox (MV3, temporal)

Firefox exige firmar la extensión para una instalación permanente; por ahora la
build de Firefox es para probar:

1. Descarga `foco-diario-<versión>-firefox.zip` desde **Releases** y descomprímelo.
2. Abre `about:debugging#/runtime/this-firefox`.
3. **Cargar complemento temporal** → elige el `manifest.json` de la carpeta.

Se descarga al cerrar Firefox. La publicación firmada en AMO es un paso posterior.

## Estado

Fase 1 completa y en pruebas. Alcance actual:

- **Facebook home** (`facebook.com`, `facebook.com/home.php`).
- Interfaz en **español e inglés**; limpieza de contenido optimizada para
  **posts en español** (los posts en inglés se renderizan, con menos limpieza).

Esto es una validación de producto. Si sirve, siguen las fases Pro: más redes,
temas, horarios y editor con IA (BYOK). El motor queda abierto; los módulos Pro
serán privados.

## Desarrollo

Requisitos: Node >= 26.

```bash
npm install
npm run dev       # Chrome con HMR del content script
npm test          # vitest + jsdom
npm run compile   # tsc --noEmit
npm run build     # build de producción (Chrome)
npm run zip       # paquete de Chrome
```

Build de Firefox:

```bash
npx wxt build -b firefox --mv3
npx wxt zip -b firefox --mv3
```

## Estructura

```
entrypoints/          # WXT: content, background, options
public/_locales/      # traducciones de UI (es default, en)
src/core/             # motor abierto: adapters, extracción, limpieza, cache, render
src/shared/           # config, copy, i18n, tipos, storage
tests/                # vitest + jsdom
docs/adr/             # Architecture Decision Records
docs/dev.md           # notas de implementación y reglas de contenido
```

`src/core/*` no importa WXT ni APIs de la extensión: es testeable en Node.

## Arquitectura

- **Adapter = datos**: selectores y tuning por red, nunca código de render.
- **Renderer propio**: no se restiliza el DOM de Facebook; se monta una portada.
- **Composición**: el content script es el composition root; el core no conoce WXT.
- **Fail-closed**: ante la duda, estado vacío, nunca el feed original.

Decisiones detalladas en [`docs/adr/`](docs/adr/README.md).

## Licencia

MIT — ver [LICENSE](LICENSE). Es el motor abierto; los futuros módulos Pro viven
fuera de este repositorio.

---

Hecho para leer menos y mejor.
