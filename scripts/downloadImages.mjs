/*
  Script: scripts/downloadImages.mjs
  Descarga y normaliza imágenes de productos listados en public/data/hispania/catalog.json.
  - Crea public/data/hispania/images/<product-id>/ con variantes w1200.webp y thumb.webp
  - Genera public/data/hispania/images_manifest.json con rutas estáticas relativas a /data/hispania/images/...

  Uso:
    npm run images:download

  Variables opcionales:
    MAX_PRODUCTS: número máximo de productos a procesar (por defecto 200)
    MAX_IMAGES_PER_PRODUCT: imágenes por producto (por defecto 1)
*/

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUBLIC_DIR = path.resolve(__dirname, '..', 'public');
const DATA_DIR = path.join(PUBLIC_DIR, 'data', 'hispania');
const CATALOG_FILE = path.join(DATA_DIR, 'catalog.json');
const OUT_IMAGES_DIR = path.join(DATA_DIR, 'images');
const OUT_MANIFEST = path.join(DATA_DIR, 'images_manifest.json');

const MAX_PRODUCTS = Number(process.env.MAX_PRODUCTS || 200);
const MAX_IMAGES_PER_PRODUCT = Number(process.env.MAX_IMAGES_PER_PRODUCT || 1);

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function fetchArrayBuffer(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'HispaniaColorsImagesBot/1.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} al descargar ${url}`);
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

async function processImage(buf, outBase) {
  const img = sharp(buf, { failOn: 'none' });
  // web size ~1200px
  const outWebp = await img.clone().resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  await fs.writeFile(`${outBase}-w1200.webp`, outWebp);
  // thumb ~600px
  const outThumb = await img.clone().resize({ width: 600, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
  await fs.writeFile(`${outBase}-thumb.webp`, outThumb);
}

async function main() {
  console.log('→ Descargando/normalizando imágenes…');
  await ensureDir(OUT_IMAGES_DIR);

  const raw = await fs.readFile(CATALOG_FILE, 'utf8');
  const catalog = JSON.parse(raw);
  const products = Array.isArray(catalog.products) ? catalog.products : [];

  let count = 0;
  const manifest = {};

  for (const product of products.slice(0, Math.max(1, MAX_PRODUCTS))) {
    const id = product.id || slugify(product.name) || slugify(product.url);
    const dir = path.join(OUT_IMAGES_DIR, id);
    await ensureDir(dir);
    const imgs = Array.isArray(product.images) ? product.images.slice(0, Math.max(1, MAX_IMAGES_PER_PRODUCT)) : [];

    const localPaths = [];
    for (let i = 0; i < imgs.length; i++) {
      const src = imgs[i];
      if (!src) continue;
      try {
        const buf = await fetchArrayBuffer(src);
        const base = path.join(dir, `img${i+1}`);
        await processImage(buf, base);
        // Guardamos rutas relativas públicas
        localPaths.push(`/data/hispania/images/${id}/img${i+1}-w1200.webp`);
        localPaths.push(`/data/hispania/images/${id}/img${i+1}-thumb.webp`);
      } catch (e) {
        console.warn('  ! Error con', src, e.message);
      }
    }
    if (localPaths.length) manifest[id] = localPaths;
    count += 1;
  }

  await fs.writeFile(OUT_MANIFEST, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`✓ Imágenes procesadas. Productos: ${count}. Manifest: ${path.relative(PUBLIC_DIR, OUT_MANIFEST)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });

