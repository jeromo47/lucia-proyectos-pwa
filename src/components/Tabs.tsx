import type { TabKey } from '@/lib/types';

export default function Tabs({ value, onChange }: { value: TabKey; onChange: (v: TabKey)=>void; }) {
  const items: { key: TabKey; label: string }[] = [
    { key: 'current', label: 'Actuales' },
    { key: 'pending', label: 'Pendientes' },
    { key: 'past', label: 'Pasados' }
  ];
  return (
    <div className="flex gap-2 bg-gray-100 rounded-full p-1">
      {items.map(it => (
        <button
          key={it.key}
          onClick={()=>onChange(it.key)}
          className={`px-4 py-1 rounded-full text-sm ${
            value===it.key ? 'bg-white shadow font-semibold' : 'text-gray-600'
          }`}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}
