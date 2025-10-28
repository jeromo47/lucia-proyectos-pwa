import { Link, useLocation } from 'react-router-dom';

export default function HeaderBar() {
  const loc = useLocation();
  const path = loc.pathname;

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white sticky top-0 z-10">
      <Link to="/" className="font-semibold text-lg">Lucía</Link>
      <nav className="flex gap-3 text-sm">
        <Link to="/" className={path === '/' ? 'font-semibold' : ''}>Inicio</Link>
        <Link to="/calendar" className={path === '/calendar' ? 'font-semibold' : ''}>Calendario</Link>
        <Link to="/settings" className={path === '/settings' ? 'font-semibold' : ''}>Ajustes</Link>
      </nav>
    </header>
  );
}
