export default function Modal({ open, onClose, children }: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-[90%] max-h-[90vh] overflow-y-auto p-5 relative">
        <button
          className="absolute right-3 top-2 text-gray-400 hover:text-black text-lg"
          onClick={onClose}
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
}
