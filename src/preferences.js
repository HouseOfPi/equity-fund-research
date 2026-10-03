import { useState } from "react";
export function usePreference(key, fallback, allowed) {
  const [v, set] = useState(() => {
    try {
      const s = localStorage.getItem(key);
      return allowed.includes(s) ? s : fallback;
    } catch {
      return fallback;
    }
  });
  const change = (v) => {
    set(v);
    try {
      localStorage.setItem(key, v);
    } catch {}
  };
  return [v, change];
}
