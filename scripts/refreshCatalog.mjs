/*
  Script: scripts/refreshCatalog.mjs
  Descripción:
  - Recorre categorías de Hispania Colors, pagina los listados de productos y extrae datos de cada ficha.
  - Genera/actualiza public/data/hispania/catalog.json con la información estructurada.
  - Respeta un pequeño delay entre requests para ser amable.

  Uso:
  - npm run refresh:catalog
*/

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { load as loadHTML } from 'cheerio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE = 'https://hispaniacolors.es';
const ROOT = `${BASE}/es_es`;

// Categorías principales (puedes añadir más si lo deseas)
const CATEGORY_URLS = [
  `${ROOT}/product-category/pulseras`,
  `${ROOT}/product-category/llaveros`,
  `${ROOT}/product-category/complementos`,
];

const OUTPUT_DIR = path.resolve(__dirname, '..', 'public', 'data', 'hispania');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'catalog.json');

// Delay simple entre requests
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'HispaniaColorsCatalogBot/1.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} al solicitar ${url}`);
  return await res.text();
}

function absoluteUrl(u) {
  if (!u) return u;
  if (u.startsWith('http')) return u;
  if (u.startsWith('//')) return `https:${u}`;
  if (u.startsWith('/')) return `${BASE}${u}`;
  return u;
}

function extractText($el) {
  return $el.text().trim().replace(/\s+\n/g, '\n').replace(/\s{2,}/g, ' ');
}

function pickMaterialsAndColors(text) {
  const t = (text || '').toLowerCase();
  const materials = [];
  const colors = [];

  // Materiales comunes del sitio
  const MATERIAL_KEYWORDS = ['acero', 'acero inoxidable', 'latón', 'rodio', 'zamak', 'piel', 'cordón náutico', 'algodón', 'lona'];
  for (const m of MATERIAL_KEYWORDS) {
    if (t.includes(m)) materials.push(m);
  }

  // Colores básicos (puedes ampliar la lista si es necesario)
  const COLOR_KEYWORDS = ['azul marino','azul','azulón','verde','rojo','amarillo','negro','marrón','beige','burdeos','gris','blanco','plateado','dorado'];
  for (const c of COLOR_KEYWORDS) {
    if (t.includes(c)) colors.push(c);
  }

  return {
    materials: Array.from(new Set(materials)),
    colors: Array.from(new Set(colors)),
  };
}

async function parseProduct(url) {
  try {
    const html = await fetchText(url);
    const $ = loadHTML(html);

    const name = $('h1.product_title, h1.entry-title').first().text().trim();

    const shortDesc = extractText($('.woocommerce-product-details__short-description').first());
    const longDesc = extractText($('#tab-description, .woocommerce-Tabs-panel--description').first());

    let price = $('.summary .price').first().text().trim();
    if (price) {
      price = price.replace(/\s+/g, ' ');
    } else {
      price = null;
    }

    const sku = $('span.sku').first().text().trim() || null;

    const categories = $('span.posted_in a')
      .map((_, a) => $(a).text().trim())
      .get();

    const tags = $('span.tagged_as a')
      .map((_, a) => $(a).text().trim())
      .get();

    // Galería de imágenes
    const images = [];
    $('.woocommerce-product-gallery__wrapper a').each((_, a) => {
      const href = $(a).attr('href');
      if (href) images.push(absoluteUrl(href));
    });
    if (images.length === 0) {
      const altImg = $('img.wp-post-image').attr('src');
      if (altImg) images.push(absoluteUrl(altImg));
    }

    const stock = $('.summary p.stock').first().text().trim() || null;

    const { materials, colors } = pickMaterialsAndColors(`${name}\n${shortDesc}\n${longDesc}`);

    const id = url.split('/').filter(Boolean).pop();

    return {
      id,
      name,
      url,
      categories,
      tags,
      materials,
      colors,
      images,
      short_description: shortDesc || null,
      long_description: longDesc || null,
      price,
      sku,
      availability: stock,
    };
  } catch (err) {
    console.error('Error parseando producto', url, err.message);
    return null;
  }
}

async function collectProductLinksFromCategory(categoryUrl) {
  const links = new Set();
  let page = 1;

  while (true) {
    const url = page === 1 ? categoryUrl : `${categoryUrl}/page/${page}`;
    try {
      const html = await fetchText(url);
      const $ = loadHTML(html);

      // Productos en el listado
      $('li.product a.woocommerce-LoopProduct-link, .products .product a.woocommerce-LoopProduct-link').each((_, a) => {
        const href = $(a).attr('href');
        if (href && href.includes('/product/')) links.add(absoluteUrl(href));
      });

      // ¿Existe un enlace a la siguiente página?
      const hasNext = $('a.page-numbers.next, nav.woocommerce-pagination a.next').length > 0;
      if (!hasNext) break;
      page += 1;
      await sleep(500);
    } catch (e) {
      // Si falla una página, paramos la paginación para esa categoría
      break;
    }
  }

  return Array.from(links);
}

async function collectProductLinksFromSitemap() {
  const candidates = [
    `${BASE}/sitemap_index.xml`,
    `${BASE}/sitemap.xml`,
    `${ROOT}/sitemap_index.xml`,
    `${ROOT}/sitemap.xml`,
  ];
  const links = new Set();
  for (const sm of candidates) {
    try {
      const xml = await fetchText(sm);
      // Extrae URLs con regex simple (suficiente aquí)
      const urlMatches = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g)).map(m => m[1]);
      const productSitemaps = urlMatches.filter(u => /product|productos|product-sitemap/i.test(u));
      const sitemapUrls = productSitemaps.length ? productSitemaps : urlMatches;

      for (const su of sitemapUrls) {
        try {
          const xml2 = await fetchText(su);
          const inner = Array.from(xml2.matchAll(/<loc>([^<]+)<\/loc>/g)).map(m => m[1]);
          inner.filter(u => u.includes('/product/')).forEach(u => links.add(u));
        } catch {}
      }
      if (links.size > 0) break;
    } catch {}
  }
  return Array.from(links);
}

async function main() {
  console.log('→ Iniciando refresco de catálogo de Hispania Colors...');

  // Preparar directorio de salida
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  // Descubrir enlaces de productos desde categorías
  const allLinks = new Set();
  for (const cat of CATEGORY_URLS) {
    console.log(`  • Recorriendo categoría: ${cat}`);
    const links = await collectProductLinksFromCategory(cat);
    links.forEach((l) => allLinks.add(l));
    await sleep(500);
  }

  // Fallback: sitemap si no encontramos nada por categorías
  if (allLinks.size === 0) {
    console.warn('No se encontraron productos en categorías. Probando sitemap...');
    const smLinks = await collectProductLinksFromSitemap();
    smLinks.forEach(l => allLinks.add(l));
  }

  if (allLinks.size === 0) {
    console.warn('No se encontraron productos. Verifica la conectividad o la estructura del sitio.');
  } else {
    console.log(`  • Productos encontrados: ${allLinks.size}`);
  }

  // Parsear productos (limitamos concurrente simple)
  const urlsAll = Array.from(allLinks);
  const MAX_PRODUCTS = Number(process.env.MAX_PRODUCTS || 150);
  const urls = urlsAll.slice(0, Math.max(1, MAX_PRODUCTS));
  const results = [];
  const CONCURRENCY = 4;
  let idx = 0;

  async function worker() {
    while (idx < urls.length) {
      const i = idx++;
      const u = urls[i];
      const prod = await parseProduct(u);
      if (prod) results.push(prod);
      await sleep(350);
    }
  }

  const workers = Array.from({ length: Math.min(CONCURRENCY, urls.length || 1) }, () => worker());
  await Promise.all(workers);

  // Ordenar por nombre para estabilidad
  results.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  const catalog = {
    updatedAt: new Date().toISOString(),
    brand: { name: 'Hispania Colors', site: `${ROOT}/` },
    products: results,
  };

  await fs.writeFile(OUTPUT_FILE, JSON.stringify(catalog, null, 2), 'utf8');
  console.log(`✓ Catálogo actualizado: ${path.relative(process.cwd(), OUTPUT_FILE)} (productos: ${results.length})`);
}

main().catch((e) => {
  console.error('Error general del refresco:', e);
  process.exit(1);
});

