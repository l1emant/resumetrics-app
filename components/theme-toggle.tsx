'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="w-8 h-8 rounded-lg bg-muted/40" />;
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className="relative w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-200 cursor-pointer"
    >
      <Sun
        className={`w-[15px] h-[15px] absolute transition-all duration-400 ${
          isDark
            ? 'opacity-0 rotate-90 scale-0'
            : 'opacity-100 rotate-0 scale-100 text-amber-500'
        }`}
        strokeWidth={2}
      />
      <Moon
        className={`w-[15px] h-[15px] absolute transition-all duration-400 ${
          isDark
            ? 'opacity-100 rotate-0 scale-100 text-indigo-300'
            : 'opacity-0 -rotate-90 scale-0'
        }`}
        strokeWidth={2}
      />
    </button>
  );
}
