import { useEffect, useState } from 'react';

export default function Splash({ done }: { done: () => void }) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setShow(false);
      done();
    }, 1500); // 1.5s como en iOS
    return () => clearTimeout(t);
  }, [done]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center">
      <img
        src="/icons/LogotipoHeader.png"
        alt="Lucía Proyectos"
        className="h-14 opacity-0 animate-[fadein_0.8s_forwards]"
        draggable={false}
      />
      <style>{`@keyframes fadein { to { opacity: 1 } }`}</style>
    </div>
  );
}
