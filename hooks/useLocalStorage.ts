
import { useState, useEffect } from 'react';

function getStorageValue<T,>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') {
    return defaultValue;
  }
  const saved = localStorage.getItem(key);
  if (saved && saved !== 'undefined') {
    try {
      return JSON.parse(saved) as T;
    } catch (error) {
      console.error("Error parsing localStorage key", key, ":", saved, error);
      localStorage.removeItem(key); // Remove corrupted item
      return defaultValue;
    }
  }
  return defaultValue;
}

export function useLocalStorage<T,>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    return getStorageValue(key, defaultValue);
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }, [key, value]);

  return [value, setValue];
}
