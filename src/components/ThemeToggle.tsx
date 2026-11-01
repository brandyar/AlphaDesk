import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '' }) => {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative w-8 sm:w-9 h-8 sm:h-9 rounded-full flex items-center justify-center transition-all duration-200 border cursor-pointer ${
        isDark
          ? 'bg-[#282828] hover:bg-[#333333] text-amber-400 border-[#3e3e3e] hover:border-amber-400/40 shadow-sm'
          : 'bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border-slate-200 hover:border-slate-300 shadow-sm'
      } ${className}`}
      title={isDark ? 'تغییر به حالت روشن (روز)' : 'تغییر به حالت تیره (شب)'}
      aria-label={isDark ? 'تغییر به حالت روشن' : 'تغییر به حالت تیره'}
    >
      {isDark ? (
        <Sun className="w-4 h-4 transition-transform hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 transition-transform hover:-rotate-12" />
      )}
    </button>
  );
};
