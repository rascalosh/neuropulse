'use client';
import { useEffect, useRef, useState } from 'react';
import { setStore } from '../lib/storage';

export function useContextSwitch() {
  const [switchCount, setSwitchCount] = useState(0);
  const [totalLostSeconds, setTotalLostSeconds] = useState(0);
  const hiddenAt = useRef<number | null>(null);

  useEffect(() => {
    const handle = () => {
      if (document.hidden) {
        hiddenAt.current = Date.now();
      } else if (hiddenAt.current !== null) {
        const duration = Math.round((Date.now() - hiddenAt.current) / 1000);
        hiddenAt.current = null;

        // Only count if away for more than 5 seconds (avoid accidental quick tab switch)
        if (duration > 5) {
          setSwitchCount((c) => c + 1);
          setTotalLostSeconds((s) => s + duration);

          setStore((prev) => ({
            ...prev,
            contextSwitches: [
              ...prev.contextSwitches,
              { timestamp: new Date().toISOString(), durationSeconds: duration },
            ],
          }));
        }
      }
    };

    document.addEventListener('visibilitychange', handle);
    return () => document.removeEventListener('visibilitychange', handle);
  }, []);

  return { switchCount, totalLostSeconds };
}
