import { useEffect, useState } from 'react';

export default function Splash({ done }: { done: ()=>void }) {
  const [show, setShow] = useState(true);
  useEffect(()=> {
    const t = setTimeout(()=>{ setShow(false); done(); }, 1500);
    return ()=>clearTimeout(t);
  }, [done]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center">
      <div className="opacity-0 animate-[fadein_0.8s_forwards] text-2xl font-semibold">
        Lucía Proyectos
      </div>
      <style>{`@keyframes fadein { to { opacity: 1 } }`}</style>
    </div>
  );
}
