'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export function RouteTransitionIndicator() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(true);
    const t = setTimeout(() => setShow(false), 500);
    return () => clearTimeout(t);
  }, [pathname]);

  if (!show) return null;

  return (
    <div
      className="fixed left-0 top-0 z-[9999] h-0.5 w-full origin-left bg-primary-500"
      style={{ animation: 'route-progress 500ms ease-out forwards' }}
      aria-hidden
    />
  );
}
