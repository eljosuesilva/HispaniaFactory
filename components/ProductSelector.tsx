import React, { useEffect, useMemo, useState } from 'react';
import { getCatalog, type HispaniaProduct } from '@/services/catalogService.ts';

interface ProductSelectorProps {
  onSelect: (product: HispaniaProduct) => void;
}

export const ProductSelector: React.FC<ProductSelectorProps> = ({ onSelect }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<HispaniaProduct[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const catalog = await getCatalog();
        setProducts(catalog.products);
        setLoading(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.categories || []).some(c => c.toLowerCase().includes(q)) ||
      (p.tags || []).some(t => t.toLowerCase().includes(q))
    );
  }, [query, products]);

  if (loading) return <div className="text-sm text-gray-400">Cargando catálogo…</div>;
  if (error) return <div className="text-sm text-red-400">{error}</div>;
  if (!products.length) return <div className="text-sm text-gray-400">Catálogo vacío. Añade productos a /public/data/hispania/catalog.json</div>;

  return (
    <div className="space-y-2">
      <input
        className="w-full p-2 bg-gray-800 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
        placeholder="Buscar por nombre, categoría o tag…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="max-h-48 overflow-auto divide-y divide-gray-700 border border-gray-700 rounded-md">
        {filtered.slice(0, 50).map(p => (
          <button
            key={p.id}
            className="w-full text-left p-2 hover:bg-gray-700 text-gray-200"
            onClick={() => onSelect(p)}
            title={p.url}
          >
            <div className="font-semibold text-sm">{p.name}</div>
            <div className="text-xs text-gray-400">{(p.categories || []).join(' · ')}</div>
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="p-3 text-sm text-gray-400">Sin resultados.</div>
        )}
      </div>
    </div>
  );
};

