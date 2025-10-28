import Modal from './Modal';
import { exportCSV, importCSV } from '@/lib/csv';
import { saveAs } from 'file-saver';
import { db } from '@/lib/db';
import { useRef } from 'react';

export default function ImportExportSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);

  const onExport = async () => {
    const projects = await db.projects.toArray();
    const csv = exportCSV(projects);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, 'lucia-proyectos.csv');
  };

  const onImport = async (file: File) => {
    const text = await file.text();
    const parsed = importCSV(text);
    await db.transaction('rw', db.projects, async () => {
      for (const p of parsed) await db.projects.put(p);
    });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose}>
      <div className="space-y-4">
        <div className="text-lg font-semibold">Importar / Exportar</div>

        <div className="section-card p-3 space-y-2">
          <button className="w-full py-2 rounded-lg border" onClick={onExport}>Exportar CSV</button>

          <button className="w-full py-2 rounded-lg border" onClick={() => fileRef.current?.click()}>
            Importar CSV
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onImport(f);
            }}
          />

          <div className="text-xs text-gray-500">Compatible con esquema #schema=1.</div>
        </div>

        <button className="w-full py-3 rounded-xl bg-black text-white" onClick={onClose}>Cerrar</button>
      </div>
    </Modal>
  );
}
