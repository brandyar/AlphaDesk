import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-3 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-4 py-2 rounded-full bg-amber-600 dark:bg-amber-500 text-white dark:text-black text-xs font-bold shadow-xl border border-amber-400/50 animate-in fade-in"
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>اتصال اینترنت قطع است — در حال نمایش نسخه آفلاین</span>
    </div>
  );
};
