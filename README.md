# HispaniaFactory – Generador automático de contenido para redes sociales (Hispania Colors)

Este proyecto genera contenido de altísima calidad para redes sociales a partir del catálogo de Hispania Colors. Incluye pipeline visual por nodos, exportación a JSON/CSV y manejo de imágenes locales normalizadas.

## Ejecución local

Requisitos: Node.js 18+

1. Instala dependencias:
   `npm install`
2. Configura tu API Key de Gemini en `.env.local`:
   `GEMINI_API_KEY=tu_api_key`
3. Arranca en desarrollo:
   `npm run dev`

---

## Adaptación Hispania Colors (Generación Automática de Contenido)

Este proyecto ha sido adaptado para generar contenido de altísima calidad para las redes sociales de Hispania Colors.

### Nodos nuevos
- "Hispania Product": permite seleccionar un producto desde el catálogo local (`/public/data/hispania/catalog.json`).
- "Social Post Generator": recibe el producto (y opcionalmente un texto de estilo) y genera un JSON con:
  - `title_suggestion`
  - `instagram_caption`
  - `facebook_post`
  - `tiktok_script`
  - `linkedin_post`
  - `suggested_hashtags`
  - `short_copy`

### Flujo sugerido
1. Añade un nodo "Hispania Product" y selecciona el producto.
2. (Opcional) Añade un "Text Input" con preferencias de estilo (tono, campaña, temporada).
3. Conecta ambos al "Social Post Generator".
4. Conecta la salida al nodo "Exporter" para descargar JSON/CSV de los posts.
5. (Opcional) Conecta el nodo "Product Image Loader" al "Image Editor" para editar imágenes locales normalizadas.
6. Conecta salidas al nodo "Output" para vista previa.

### Catálogo y voz de marca
- Catálogo de muestra: `public/data/hispania/catalog.json`.
- Guías de marca/voz: `public/data/hispania/brand.json`.

### Refrescar catálogo automáticamente (scraping)
- Requisitos: Node 18+ (con fetch nativo).
- Instalación de dependencias: `npm install`
- Ejecutar: `npm run refresh:catalog`
  - Recorre categorías principales del sitio y guarda el resultado en `public/data/hispania/catalog.json`.
  - Incluye nombre, descripciones, categorías, tags, materiales, colores (heurístico), imágenes, precio (si aparece), sku y disponibilidad (si aparece).

### Descarga/normalización de imágenes locales (para Image Editor)
- Dependencia: sharp (se instala con `npm install` ya incluida en package.json).
- Ejecutar: `npm run images:download`
  - Lee `catalog.json`, descarga 1 imagen por producto (configurable), genera `webp` optimizado y miniaturas.
  - Crea `public/data/hispania/images_manifest.json` con rutas estáticas.
- Uso en la app: coloca un nodo "Product Image Loader" y conéctalo a "Image Editor".

Puedes actualizar el catálogo manualmente editando el JSON, o ejecutar los scripts periódicamente (CRON/CI) para mantenerlo al día.

---

## Despliegue en Vercel
- Repo GitHub: crea un repositorio o usa el que generemos automáticamente.
- Vercel detecta Vite automáticamente. También añadimos `vercel.json` con:
  - buildCommand: `npm run build`
  - outputDirectory: `dist`
- Variables de entorno:
  - GEMINI_API_KEY (requerida para generación de texto/imagen/video)
- Pasos:
  1. Conecta tu GitHub a Vercel y selecciona este repo.
  2. Establece GEMINI_API_KEY en Project Settings → Environment Variables.
  3. Deploy.

Nota: el nodo Video Generator usa el modelo `veo-3`. Asegúrate de que tu cuenta tenga acceso.
