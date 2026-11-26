import React, { useState } from 'react';
import { Download, Share, PlusSquare, X, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { canInstall, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;
  if (!canInstall && !isIOS) return null;

  const handleClick = async () => {
    if (canInstall) {
      await promptInstall();
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="flex items-center gap-1.5 h-8 sm:h-9 px-2.5 sm:px-3 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 dark:bg-[#1DB954]/15 dark:hover:bg-[#1DB954]/25 border border-emerald-500/35 dark:border-[#1DB954]/40 text-emerald-700 dark:text-[#1DB954] text-xs font-bold transition-all hover:scale-105 cursor-pointer flex-shrink-0"
        title="نصب اپلیکیشن آلفادسک روی دستگاه"
        aria-label="نصب اپلیکیشن"
      >
        <Download className="w-3.5 h-3.5 stroke-[2.5]" />
        <span className="hidden md:inline">نصب اپ</span>
      </button>

      {showIOSGuide && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowIOSGuide(false)}
        >
          <div
            className="w-full max-w-sm bg-white dark:bg-[#181818] border border-slate-200 dark:border-[#2e2e2e] rounded-2xl p-5 shadow-2xl space-y-4 text-right"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#282828] pb-3">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
                <Smartphone className="w-4 h-4 text-emerald-600 dark:text-[#1DB954]" />
                <span>نصب آلفادسک در آیفون / آیپد</span>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                aria-label="بستن راهنما"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-[#ccc] leading-relaxed">
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-[#262626]">
                <Share className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                <span>
                  ۱. در مرورگر <strong>Safari</strong>، روی دکمه اشتراک‌گذاری (<strong>Share</strong>) در نوار پایین صفحه بزنید.
                </span>
              </div>
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-[#262626]">
                <PlusSquare className="w-4 h-4 text-emerald-600 dark:text-[#1DB954] shrink-0 mt-0.5" />
                <span>
                  ۲. گزینه <strong>Add to Home Screen</strong> (افزودن به صفحه اصلی) را انتخاب کرده و روی <strong>Add</strong> بزنید.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2.5 rounded-xl bg-emerald-600 dark:bg-[#1DB954] text-white dark:text-black font-bold text-xs cursor-pointer"
            >
              متوجه شدم
            </button>
          </div>
        </div>
      )}
    </>
  );
};
