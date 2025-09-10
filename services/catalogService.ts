export interface HispaniaProduct {
  id: string;
  name: string;
  url: string;
  categories?: string[];
  tags?: string[];
  materials?: string[];
  colors?: string[];
  images?: string[];
  short_description?: string;
  long_description?: string;
  price?: number | string | null;
}

export interface HispaniaCatalog {
  updatedAt: string;
  brand: {
    name: string;
    site: string;
  };
  products: HispaniaProduct[];
}

export async function getCatalog(): Promise<HispaniaCatalog> {
  const res = await fetch('/data/hispania/catalog.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('No se pudo cargar el catálogo de Hispania Colors');
  return res.json();
}

