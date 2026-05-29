import { useState, useEffect } from 'react';

/**
 * Returns true when the primary pointing device is coarse (touch screen).
 * Uses window.matchMedia('(pointer: coarse)') so it works correctly for
 * tablets, phones, and hybrid devices regardless of screen width.
 *
 * Reactively updates when the user plugs in / unplugs a mouse (e.g. tablet + BT keyboard).
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined'
      ? window.matchMedia('(pointer: coarse)').matches
      : false
  );

  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return isMobile;
}
