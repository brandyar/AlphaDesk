import React, { useState } from 'react';
import { KeyRound, Eye, EyeOff } from 'lucide-react';

export interface PasswordTabProps {
  currentPassword: string;
  setCurrentPassword: (val: string) => void;
  newPassword: string;
  setNewPassword: (val: string) => void;
  confirmPassword: string;
  setConfirmPassword: (val: string) => void;
  showPassword?: boolean;
  setShowPassword?: (val: boolean) => void;
  isChangingPassword: boolean;
  handleChangePassword: (e: React.FormEvent) => Promise<void>;
}

export const PasswordTab: React.FC<PasswordTabProps> = ({
  currentPassword,
  setCurrentPassword,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  isChangingPassword,
  handleChangePassword,
}) => {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div className="bg-white dark:bg-[#181818] border border-slate-200 dark:border-[#282828] rounded-2xl p-5 sm:p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-[#282828] pb-4">
        <div className="flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-emerald-600 dark:text-[#1DB954]" />
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">تغییر رمز عبور</h3>
            <p className="text-xs text-slate-500 dark:text-[#888]">رمز عبور ورود به سامانه را تغییر دهید.</p>
          </div>
        </div>
        <button
          type="submit"
          form="password-tab-form"
          disabled={isChangingPassword}
          className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#282828] hover:bg-slate-200 dark:hover:bg-[#333] text-slate-800 dark:text-white border border-slate-300 dark:border-[#3e3e3e] font-bold text-xs transition-all disabled:opacity-50 cursor-pointer"
        >
          {isChangingPassword ? 'در حال ثبت...' : 'بروزرسانی رمز عبور'}
        </button>
      </div>

      <form id="password-tab-form" onSubmit={handleChangePassword} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-[#B3B3B3] mb-1.5">
            رمز عبور فعلی (اختیاری)
          </label>
          <div
            dir="ltr"
            className="flex items-center h-10 bg-slate-50 dark:bg-[#121212] rounded-xl border border-slate-200 dark:border-[#2c2c2c] focus-within:border-emerald-500 dark:focus-within:border-[#1DB954] overflow-hidden"
          >
            <input
              type={showCurrent ? 'text' : 'password'}
              dir="ltr"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="flex-1 min-w-0 h-full px-3 bg-transparent text-xs text-slate-900 dark:text-white focus:outline-none font-mono"
            />
            <button
              type="button"
              onClick={() => setShowCurrent((prev) => !prev)}
              aria-label={showCurrent ? 'پنهان کردن رمز عبور فعلی' : 'نمایش رمز عبور فعلی'}
              title={showCurrent ? 'پنهان کردن رمز عبور' : 'نمایش رمز عبور'}
              className="h-full px-3 flex items-center justify-center text-slate-400 dark:text-[#777] hover:text-slate-700 dark:hover:text-white transition-colors shrink-0 cursor-pointer"
            >
              {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-[#B3B3B3] mb-1.5">
            رمز عبور جدید (حداقل ۶ کاراکتر)
          </label>
          <div
            dir="ltr"
            className="flex items-center h-10 bg-slate-50 dark:bg-[#121212] rounded-xl border border-slate-200 dark:border-[#2c2c2c] focus-within:border-emerald-500 dark:focus-within:border-[#1DB954] overflow-hidden"
          >
            <input
              type={showNew ? 'text' : 'password'}
              dir="ltr"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="flex-1 min-w-0 h-full px-3 bg-transparent text-xs text-slate-900 dark:text-white focus:outline-none font-mono"
            />
            <button
              type="button"
              onClick={() => setShowNew((prev) => !prev)}
              aria-label={showNew ? 'پنهان کردن رمز عبور جدید' : 'نمایش رمز عبور جدید'}
              title={showNew ? 'پنهان کردن رمز عبور' : 'نمایش رمز عبور'}
              className="h-full px-3 flex items-center justify-center text-slate-400 dark:text-[#777] hover:text-slate-700 dark:hover:text-white transition-colors shrink-0 cursor-pointer"
            >
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-[#B3B3B3] mb-1.5">
            تکرار رمز عبور جدید
          </label>
          <div
            dir="ltr"
            className="flex items-center h-10 bg-slate-50 dark:bg-[#121212] rounded-xl border border-slate-200 dark:border-[#2c2c2c] focus-within:border-emerald-500 dark:focus-within:border-[#1DB954] overflow-hidden"
          >
            <input
              type={showConfirm ? 'text' : 'password'}
              dir="ltr"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="flex-1 min-w-0 h-full px-3 bg-transparent text-xs text-slate-900 dark:text-white focus:outline-none font-mono"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((prev) => !prev)}
              aria-label={showConfirm ? 'پنهان کردن تکرار رمز عبور جدید' : 'نمایش تکرار رمز عبور جدید'}
              title={showConfirm ? 'پنهان کردن رمز عبور' : 'نمایش رمز عبور'}
              className="h-full px-3 flex items-center justify-center text-slate-400 dark:text-[#777] hover:text-slate-700 dark:hover:text-white transition-colors shrink-0 cursor-pointer"
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isChangingPassword}
            className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-[#282828] hover:bg-slate-200 dark:hover:bg-[#333] text-slate-800 dark:text-white border border-slate-300 dark:border-[#3e3e3e] font-bold text-xs transition-all disabled:opacity-50"
          >
            {isChangingPassword ? 'در حال ثبت...' : 'بروزرسانی رمز عبور'}
          </button>
        </div>
      </form>
    </div>
  );
};

