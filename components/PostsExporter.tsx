import React, { useMemo, useState } from 'react';

function toCSV(items: any[]): string {
  const rows: string[] = [];
  const headers = [
    'product_id',
    'product_name',
    'product_url',
    'title_suggestion',
    'instagram_caption',
    'facebook_post',
    'tiktok_script',
    'linkedin_post',
    'suggested_hashtags',
    'short_copy',
  ];
  rows.push(headers.join(','));

  for (const it of items) {
    const hashtags = Array.isArray(it.suggested_hashtags)
      ? it.suggested_hashtags.join(' ')
      : (it.suggested_hashtags || '');
    const vals = [
      it.product_id || '',
      it.product_name || '',
      it.product_url || '',
      it.title_suggestion || '',
      it.instagram_caption || '',
      it.facebook_post || '',
      it.tiktok_script || '',
      it.linkedin_post || '',
      hashtags,
      it.short_copy || '',
    ].map((v) => {
      const s = String(v).replace(/\r?\n/g, ' ').replace(/"/g, '""');
      return '"' + s + '"';
    });
    rows.push(vals.join(','));
  }
  return rows.join('\n');
}

export const PostsExporter: React.FC<{ data: any } > = ({ data }) => {
  const [format, setFormat] = useState<'json' | 'csv'>('json');
  const [filename, setFilename] = useState<string>(() => `hispania_posts_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}`);

  const items: any[] = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data.items)) return data.items;
    if (Array.isArray(data)) return data;
    if (typeof data === 'object' && data !== null) return [data];
    try {
      const parsed = JSON.parse(String(data));
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [];
    }
  }, [data]);

  const handleDownload = () => {
    let blob: Blob;
    let name = filename || 'hispania_posts';
    if (format === 'json') {
      blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json;charset=utf-8' });
      name += '.json';
    } else {
      const csv = toCSV(items);
      blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      name += '.csv';
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-2 text-gray-200">
      <div className="text-sm">Items preparados: <span className="font-semibold">{items.length}</span></div>
      <div className="flex items-center gap-2">
        <select value={format} onChange={e => setFormat(e.target.value as any)} className="bg-gray-800 border border-gray-600 rounded px-2 py-1">
          <option value="json">JSON</option>
          <option value="csv">CSV</option>
        </select>
        <input value={filename} onChange={e => setFilename(e.target.value)} className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1" placeholder="Nombre de archivo" />
        <button onClick={handleDownload} disabled={!items.length} className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 rounded disabled:bg-gray-600">Descargar</button>
      </div>
      <div className="text-xs text-gray-400">Nota: Asegúrate de conectar el Exporter a la salida del Social Post Generator. El generador ahora incluye product_id, product_name y product_url.</div>
    </div>
  );
};

