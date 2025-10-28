import { useEffect, useState } from 'react';
import HeaderBar from '@/components/HeaderBar';
import { db } from '@/lib/db';
import type { FieldDefinition } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

export default function CustomFields() {
  const [defs, setDefs] = useState<FieldDefinition[]>([]);
  const [name, setName] = useState('');

  const refresh = async () => setDefs(await db.fieldDefs.toArray());
  useEffect(() => { refresh(); }, []);

  const add = async () => {
    if (!name.trim()) return;
    if (defs.length >= 5) return alert('Máximo 5 campos personalizados.');
    await db.fieldDefs.add({ id: uuidv4(), name, createdAt: new Date().toISOString() });
    setName('');
    refresh();
  };

  const del = async (id: string) => {
    await db.fieldDefs.delete(id);
    refresh();
  };

  return (
    <div className="h-full flex flex-col">
      <HeaderBar />
      <div className="p-5 space-y-4">
        <div className="section-card p-4 space-y-3">
          <div className="text-lg font-semibold">Campos personalizados</div>

          <div className="flex gap-2">
            <input
              className="flex-1 border rounded-lg px-3 py-2"
              placeholder="Nombre del campo"
              value={name}
              onChange={e => setName(e.target.value)}
            />
            <button className="px-4 py-2 rounded-lg bg-black text-white" onClick={add}>Añadir</button>
          </div>

          <div className="space-y-2">
            {defs.map(d => (
              <div key={d.id} className="flex items-center justify-between border rounded-lg px-3 py-2">
                <span>{d.name}</span>
                <button className="text-red-600 text-sm" onClick={() => del(d.id)}>Eliminar</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
