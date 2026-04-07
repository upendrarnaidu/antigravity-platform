import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#0a0a14] p-1 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm transition-colors">
      <button
        onClick={() => setTheme('light')}
        title="Light Mode"
        className={`p-1.5 rounded-lg transition-all ${
          theme === 'light'
            ? 'bg-white shadow-sm text-indigo-600 border border-slate-200'
            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 border border-transparent'
        }`}
      >
        <Sun size={15} strokeWidth={2.5} />
      </button>

      <button
        onClick={() => setTheme('system')}
        title="System Preference"
        className={`p-1.5 rounded-lg transition-all ${
          theme === 'system'
            ? 'bg-slate-200 dark:bg-white/10 shadow-sm text-indigo-600 dark:text-indigo-400 border border-slate-300 dark:border-white/10'
            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 border border-transparent'
        }`}
      >
        <Monitor size={15} strokeWidth={2.5} />
      </button>

      <button
        onClick={() => setTheme('dark')}
        title="Dark Mode"
        className={`p-1.5 rounded-lg transition-all ${
          theme === 'dark'
            ? 'bg-[#1e1b4b] shadow-sm text-indigo-400 border border-indigo-500/30'
            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 border border-transparent'
        }`}
      >
        <Moon size={15} strokeWidth={2.5} />
      </button>
    </div>
  );
}
