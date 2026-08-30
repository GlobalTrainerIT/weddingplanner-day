import { useState, useEffect } from 'react';

export function useDarkMode() {
  const [dark, setDark] = useState(() => localStorage.getItem('vow-theme') === 'dark');

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('vow-theme', dark ? 'dark' : 'light');
  }, [dark]);

  // Apply on mount from localStorage
  useEffect(() => {
    if (localStorage.getItem('vow-theme') === 'dark') {
      document.documentElement.classList.add('dark');
    }
  }, []);

  return [dark, setDark] as const;
}
