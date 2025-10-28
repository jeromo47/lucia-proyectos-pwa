import { useNavigate } from 'react-router-dom';

export default function HeaderBar({ onMenu }: { onMenu?: () => void }) {
  const nav = useNavigate();

  return (
    <header className="relative flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white sticky top-0 z-10">
      {/* Zona izquierda vacía para equilibrar el centrado */}
      <div className="w-10" />

      {/* Logo centrado */}
      <button
        onClick={() => nav('/')}
        className="absolute left-1/2 -translate-x-1/2 select-none"
        aria-label="Inicio"
      >
        <img
          src="/icons/LogotipoHeader.png"
          alt="Lucía Proyectos"
          className="h-12 sm:h-14 object-contain"
          draggable={false}
        />
      </button>

      {/* Acciones derechas: Calendario y Menú ⋯ */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => nav('/calendar')}
          className="text-[20px] leading-none"
          aria-label="Calendario"
          title="Calendario"
        >
          📅
        </button>
        <button
          onClick={() => onMenu?.()}
          className="text-[20px] leading-none"
          aria-label="Más opciones"
          title="Más opciones"
        >
          ⋯
        </button>
      </div>
    </header>
  );
}
