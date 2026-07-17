'use client';
import { useState, useEffect, useCallback } from 'react';
import { getStore, setStore, NeuroPulseStore, DEFAULT_STORE, STORE_CHANGE_EVENT } from '../lib/storage';

export function useStorage(): [NeuroPulseStore, (updater: (prev: NeuroPulseStore) => NeuroPulseStore) => void, boolean] {
  // Always initialize with DEFAULT_STORE to match server render and avoid hydration mismatch
  const [store, setStoreState] = useState<NeuroPulseStore>(DEFAULT_STORE);
  const [mounted, setMounted] = useState(false);

  const update = useCallback((updater: (prev: NeuroPulseStore) => NeuroPulseStore) => {
    setStore(updater);
    setStoreState(getStore());
  }, []);

  useEffect(() => {
    setStoreState(getStore());
    setMounted(true);

    const handleChange = () => setStoreState(getStore());
    window.addEventListener(STORE_CHANGE_EVENT, handleChange);
    window.addEventListener('storage', handleChange);
    return () => {
      window.removeEventListener(STORE_CHANGE_EVENT, handleChange);
      window.removeEventListener('storage', handleChange);
    };
  }, []);

  return [store, update, mounted];
}
