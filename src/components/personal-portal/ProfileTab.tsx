import React from 'react';
import { User, Upload, Camera } from 'lucide-react';
import { Personnel, AuthUser } from '../../types';
import { getAvatarUrl } from '../../utils';

export interface ProfileTabProps {
  profileName: string;
  setProfileName: (val: string) => void;
  profileUsername: string;
  setProfileUsername: (val: string) => void;
  profilePhone: string;
  setProfilePhone: (val: string) => void;
  profileNationalId: string;
  setProfileNationalId: (val: string) => void;
  currentPersonnel: Personnel | null;
  currentUser: AuthUser | null;
  profileBankCard: string;
  setProfileBankCard: (val: string) => void;
  profileIban: string;
  setProfileIban: (val: string) => void;
  profileAvatar: string;
  setProfileAvatar: (val: string) => void;
  isSavingProfile: boolean;
  isUploadingAvatar: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleAvatarFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSaveProfile: (e: React.FormEvent) => Promise<void>;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  profileName,
  setProfileName,
  profileUsername,
  setProfileUsername,
  profilePhone,
  setProfilePhone,
  profileNationalId,
  setProfileNationalId,
  currentPersonnel,
  currentUser,
  profileBankCard,
  setProfileBankCard,
  profileIban,
  setProfileIban,
  profileAvatar,
  setProfileAvatar,
  isSavingProfile,
  isUploadingAvatar,
  fileInputRef,
  handleAvatarFileChange,
  handleSaveProfile,
}) => {
  return (
    <div className="bg-[#181818] border border-[#282828] rounded-2xl p-5 sm:p-6 space-y-6">
      <div className="flex items-center gap-2 border-b border-[#282828] pb-4">
        <User className="w-5 h-5 text-[#1DB954]" />
        <div>
          <h3 className="text-base font-bold text-white">اطلاعات هویتی و پرسنلی</h3>
          <p className="text-xs text-[#888]">
            مشخصات خود را تکمیل کنید تا در احکام و واریزی‌های مساعده استفاده شود.
          </p>
        </div>
      </div>

      {/* Avatar File Upload */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-[#B3B3B3] flex items-center justify-between">
          <span>تصویر پروفایل (آواتار پرسنلی):</span>
          {profileAvatar && (
            <button
              type="button"
              onClick={() => setProfileAvatar('')}
              className="text-[11px] text-rose-400 hover:underline"
            >
              حذف تصویر
            </button>
          )}
        </label>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png, image/jpeg, image/webp, image/gif"
          onChange={handleAvatarFileChange}
          className="hidden"
        />

        <div
          onClick={() => fileInputRef.current?.click()}
          className={`p-4 sm:p-5 rounded-2xl border-2 border-dashed transition-all flex flex-col sm:flex-row items-center gap-4 cursor-pointer group ${
            profileAvatar
              ? 'bg-[#121212] border-[#1DB954]/50 hover:border-[#1DB954]'
              : 'bg-[#121212] border-[#333] hover:border-[#1DB954] hover:bg-[#161616]'
          }`}
        >
          {/* Avatar Preview */}
          <div className="relative flex-shrink-0">
            <div className="w-16 h-16 rounded-2xl bg-[#222] border-2 border-[#1DB954] overflow-hidden flex items-center justify-center text-white font-black text-xl shadow-lg shadow-black/40">
              {profileAvatar ? (
                <img
                  src={getAvatarUrl(profileAvatar)}
                  alt="avatar preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                    const parent = (e.currentTarget as HTMLElement).parentElement;
                    if (parent && !parent.querySelector('.profile-tab-avatar-fallback')) {
                      const span = document.createElement('span');
                      span.className = 'profile-tab-avatar-fallback text-[#1DB954] text-lg font-bold';
                      span.textContent = profileName.charAt(0) || 'ک';
                      parent.appendChild(span);
                    }
                  }}
                />
              ) : (
                <span className="text-[#1DB954] text-lg font-bold">
                  {profileName.charAt(0) || 'ک'}
                </span>
              )}
            </div>
            {isUploadingAvatar && (
              <div className="absolute inset-0 bg-black/70 rounded-2xl flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-[#1DB954] border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Upload Action Description */}
          <div className="flex-1 text-center sm:text-right space-y-1">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <Upload className="w-4 h-4 text-[#1DB954]" />
              <span className="text-xs font-bold text-white group-hover:text-[#1DB954] transition-colors">
                {profileAvatar ? 'کلیک کنید برای تغییر تصویر' : 'انتخاب یا بارگذاری تصویر جدید'}
              </span>
            </div>
            <p className="text-[11px] text-[#777]">
              فرمت‌های مجاز: JPG, PNG, WEBP (فشرده‌سازی خودکار هوشمند) • ذخیره مستقیم در پایگاه داده
            </p>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="px-3.5 py-1.5 rounded-xl bg-[#222] group-hover:bg-[#1DB954] text-white group-hover:text-black font-bold text-xs border border-[#333] transition-all flex items-center gap-1.5 flex-shrink-0"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>انتخاب فایل</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSaveProfile} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
              نام و نام خانوادگی
            </label>
            <input
              type="text"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              required
              className="w-full h-10 px-3 bg-[#121212] rounded-xl text-xs text-white border border-[#2c2c2c] focus:border-[#1DB954] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
              نام کاربری ورود (شناسه یکتا)
            </label>
            <input
              type="text"
              dir="ltr"
              value={profileUsername}
              onChange={(e) => setProfileUsername(e.target.value)}
              placeholder="مثال: sara_ahmadi"
              className="w-full h-10 px-3 bg-[#121212] rounded-xl text-xs text-white border border-[#2c2c2c] focus:border-[#1DB954] focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
              شماره موبایل
            </label>
            <input
              type="text"
              dir="ltr"
              value={profilePhone}
              onChange={(e) => setProfilePhone(e.target.value)}
              placeholder="0912..."
              className="w-full h-10 px-3 bg-[#121212] rounded-xl text-xs text-white border border-[#2c2c2c] focus:border-[#1DB954] focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
              کد ملی
            </label>
            <input
              type="text"
              dir="ltr"
              value={profileNationalId}
              onChange={(e) => setProfileNationalId(e.target.value)}
              placeholder="۰۰۱۲۳۴۵۶۷۸"
              className="w-full h-10 px-3 bg-[#121212] rounded-xl text-xs text-white border border-[#2c2c2c] focus:border-[#1DB954] focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
              ایمیل کاربری (غیرقابل ویرایش)
            </label>
            <input
              type="email"
              dir="ltr"
              disabled
              value={currentPersonnel?.email || currentUser?.email || ''}
              className="w-full h-10 px-3 bg-[#1e1e1e] rounded-xl text-xs text-[#777] border border-[#2c2c2c] cursor-not-allowed font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
              شماره کارت بانکی (جهت واریز مساعده و حقوق)
            </label>
            <input
              type="text"
              dir="ltr"
              value={profileBankCard}
              onChange={(e) => setProfileBankCard(e.target.value)}
              placeholder="6037-9975-..."
              className="w-full h-10 px-3 bg-[#121212] rounded-xl text-xs text-white border border-[#2c2c2c] focus:border-[#1DB954] focus:outline-none font-mono tracking-wider"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
              شماره شبا (IBAN)
            </label>
            <input
              type="text"
              dir="ltr"
              value={profileIban}
              onChange={(e) => setProfileIban(e.target.value)}
              placeholder="IR12017..."
              className="w-full h-10 px-3 bg-[#121212] rounded-xl text-xs text-white border border-[#2c2c2c] focus:border-[#1DB954] focus:outline-none font-mono"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isSavingProfile}
            className="px-6 py-2.5 rounded-xl bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold text-xs shadow-lg shadow-[#1DB954]/25 transition-all disabled:opacity-50"
          >
            {isSavingProfile ? 'در حال ذخیره...' : 'ذخیره مشخصات پروفایل'}
          </button>
        </div>
      </form>
    </div>
  );
};
