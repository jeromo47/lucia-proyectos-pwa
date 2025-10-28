export type SheetAction = {
  label: string;
  onClick: () => void;
  danger?: boolean;
};

export default function ActionSheet({
  open,
  onClose,
  actions = [],
  title = 'Opciones'
}: {
  open: boolean;
  onClose: () => void;
  actions: SheetAction[];
  title?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Sheet */}
      <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-xl p-4 pb-[max(16px,var(--safe-b))]">
        <div className="mx-auto h-1 w-10 rounded-full bg-gray-300 mb-3" />
        <div className="text-base font-semibold mb-2">{title}</div>

        <div className="flex flex-col gap-2">
          {actions.map((a, i) => (
            <button
              key={i}
              onClick={() => { a.onClick(); }}
              className={`w-full text-left px-4 py-3 rounded-xl border ${
                a.danger ? 'border-red-300 text-red-600' : 'border-gray-200'
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          className="mt-3 w-full px-4 py-3 rounded-xl bg-black text-white"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
