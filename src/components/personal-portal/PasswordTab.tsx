import React from 'react';
import { KeyRound, Eye, EyeOff } from 'lucide-react';

export interface PasswordTabProps {
  currentPassword: string;
  setCurrentPassword: (val: string) => void;
  newPassword: string;
  setNewPassword: (val: string) => void;
  confirmPassword: string;
  setConfirmPassword: (val: string) => void;
  showPassword: boolean;
  setShowPassword: (val: boolean) => void;
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
  showPassword,
  setShowPassword,
  isChangingPassword,
  handleChangePassword,
}) => {
  return (
    <div className="bg-[#181818] border border-[#282828] rounded-2xl p-5 sm:p-6 space-y-6">
      <div className="flex items-center gap-2 border-b border-[#282828] pb-4">
        <KeyRound className="w-5 h-5 text-[#1DB954]" />
        <div>
          <h3 className="text-base font-bold text-white">تغییر رمز عبور</h3>
          <p className="text-xs text-[#888]">رمز عبور ورود به سامانه را تغییر دهید.</p>
        </div>
      </div>

      <form onSubmit={handleChangePassword} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
            رمز عبور فعلی (اختیاری)
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              dir="ltr"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-10 px-3 bg-[#121212] rounded-xl text-xs text-white border border-[#2c2c2c] focus:border-[#1DB954] focus:outline-none font-mono"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#777] hover:text-white"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
            رمز عبور جدید (حداقل ۶ کاراکتر)
          </label>
          <input
            type={showPassword ? 'text' : 'password'}
            dir="ltr"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="w-full h-10 px-3 bg-[#121212] rounded-xl text-xs text-white border border-[#2c2c2c] focus:border-[#1DB954] focus:outline-none font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
            تکرار رمز عبور جدید
          </label>
          <input
            type={showPassword ? 'text' : 'password'}
            dir="ltr"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="w-full h-10 px-3 bg-[#121212] rounded-xl text-xs text-white border border-[#2c2c2c] focus:border-[#1DB954] focus:outline-none font-mono"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isChangingPassword}
            className="w-full py-2.5 rounded-xl bg-[#282828] hover:bg-[#333] text-white border border-[#3e3e3e] font-bold text-xs transition-all disabled:opacity-50"
          >
            {isChangingPassword ? 'در حال ثبت...' : 'بروزرسانی رمز عبور'}
          </button>
        </div>
      </form>
    </div>
  );
};
