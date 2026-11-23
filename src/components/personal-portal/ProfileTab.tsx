import React from 'react';
import { User, Upload, Camera, Lock } from 'lucide-react';
import { Personnel, AuthUser } from '../../types';
import { getAvatarUrl } from '../../utils';

export interface ProfileTabProps {
  isAdmin: boolean;
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
  isAdmin,
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
  const inputBaseClass = isAdmin
    ? 'w-full h-10 px-3 bg-slate-50 dark:bg-[#121212] rounded-xl text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-[#2c2c2c] focus:border-emerald-500 dark:focus:border-[#1DB954] focus:outline-none'
    : 'w-full h-10 px-3 bg-slate-100 dark:bg-[#1e1e1e] rounded-xl text-xs text-slate-500 dark:text-[#888] border border-slate-200 dark:border-[#2c2c2c] cursor-not-allowed';

  return (
    <div className="bg-white dark:bg-[#181818] border border-slate-200 dark:border-[#282828] rounded-2xl p-5 sm:p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-[#282828] pb-4">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-emerald-600 dark:text-[#1DB954]" />
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">اطلاعات هویتی و پرسنلی</h3>
            <p className="text-xs text-slate-500 dark:text-[#888]">
              {isAdmin
                ? 'مشخصات خود را تکمیل کنید تا در احکام و واریزی‌های مساعده استفاده شود.'
                : 'اطلاعات هویتی فقط قابل مشاهده است؛ شماره کارت بانکی و شماره شبا قابل ویرایش می‌باشند.'}
            </p>
          </div>
        </div>
        <button
          type="submit"
          form="profile-tab-form"
          disabled={isSavingProfile}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-[#1DB954] dark:hover:bg-[#1ed760] text-white dark:text-black font-bold text-xs shadow-sm transition-all disabled:opacity-50 cursor-pointer"
        >
          {isSavingProfile
            ? 'در حال ذخیره...'
            : isAdmin
            ? 'ذخیره مشخصات پروفایل'
            : 'ذخیره شماره کارت و شبا'}
        </button>
      </div>

      {!isAdmin && (
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs leading-relaxed">
          <Lock className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            تغییر اطلاعات هویتی (نام، نام کاربری، شماره تماس، کد ملی و تصویر پروفایل) صرفاً توسط مدیر سیستم امکان‌پذیر است. شما می‌توانید شماره کارت بانکی و شماره شبا را جهت واریزی‌ها ویرایش و ذخیره کنید.
          </span>
        </div>
      )}

      {/* Avatar File Upload */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-700 dark:text-[#B3B3B3] flex items-center justify-between">
          <span>تصویر پروفایل (آواتار پرسنلی):</span>
          {isAdmin && profileAvatar && (
            <button
              type="button"
              onClick={() => setProfileAvatar('')}
              className="text-[11px] text-rose-600 dark:text-rose-400 hover:underline"
            >
              حذف تصویر
            </button>
          )}
        </label>

        {isAdmin && (
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png, image/jpeg, image/webp, image/gif"
            onChange={handleAvatarFileChange}
            className="hidden"
          />
        )}

        <div
          onClick={() => {
            if (isAdmin) fileInputRef.current?.click();
          }}
          className={`p-4 sm:p-5 rounded-2xl border-2 border-dashed transition-all flex flex-col sm:flex-row items-center gap-4 ${
            isAdmin ? 'cursor-pointer group' : 'cursor-not-allowed opacity-85'
          } ${
            profileAvatar
              ? `bg-slate-50 dark:bg-[#121212] border-emerald-500/50 dark:border-[#1DB954]/50 ${isAdmin ? 'hover:border-emerald-500 dark:hover:border-[#1DB954]' : ''}`
              : `bg-slate-50 dark:bg-[#121212] border-slate-300 dark:border-[#333] ${isAdmin ? 'hover:border-emerald-500 dark:hover:border-[#1DB954] hover:bg-slate-100 dark:hover:bg-[#161616]' : ''}`
          }`}
        >
          {/* Avatar Preview */}
          <div className="relative flex-shrink-0">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-[#222] border-2 border-emerald-500 dark:border-[#1DB954] overflow-hidden flex items-center justify-center text-slate-900 dark:text-[#1DB954] font-black text-xl shadow-lg shadow-black/10 dark:shadow-black/40 relative">
              <span>{(profileName || currentPersonnel?.name || currentUser?.name || 'U').trim().charAt(0).toUpperCase()}</span>
              {getAvatarUrl(profileAvatar || currentPersonnel?.profile_image || currentPersonnel?.avatar || currentUser?.avatar, profileName) ? (
                <img
                  key={getAvatarUrl(profileAvatar || currentPersonnel?.profile_image || currentPersonnel?.avatar || currentUser?.avatar, profileName)}
                  src={getAvatarUrl(profileAvatar || currentPersonnel?.profile_image || currentPersonnel?.avatar || currentUser?.avatar, profileName)}
                  alt="avatar preview"
                  className="absolute inset-0 w-full h-full object-cover z-10 block"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : null}
            </div>
            {isUploadingAvatar && (
              <div className="absolute inset-0 bg-slate-900/70 dark:bg-black/70 rounded-2xl flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-emerald-500 dark:border-[#1DB954] border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Upload Action Description */}
          <div className="flex-1 text-center sm:text-right space-y-1">
            {isAdmin ? (
              <>
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <Upload className="w-4 h-4 text-emerald-600 dark:text-[#1DB954]" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-[#1DB954] transition-colors">
                    {profileAvatar ? 'کلیک کنید برای تغییر تصویر' : 'انتخاب یا بارگذاری تصویر جدید'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-[#777]">
                  فرمت‌های مجاز: JPG, PNG, WEBP (فشرده‌سازی خودکار هوشمند) • ذخیره مستقیم در پایگاه داده
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <Lock className="w-4 h-4 text-slate-400 dark:text-[#777]" />
                  <span className="text-xs font-bold text-slate-600 dark:text-[#999]">
                    تصویر پروفایل فقط توسط مدیر سیستم قابل تغییر است
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-[#777]">
                  این بخش برای حساب کاربری شما در حالت فقط خواندنی قرار دارد.
                </p>
              </>
            )}
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="px-3.5 py-1.5 rounded-xl bg-slate-200 dark:bg-[#222] group-hover:bg-emerald-600 dark:group-hover:bg-[#1DB954] text-slate-800 dark:text-white group-hover:text-white dark:group-hover:text-black font-bold text-xs border border-slate-300 dark:border-[#333] transition-all flex items-center gap-1.5 flex-shrink-0"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>انتخاب فایل</span>
            </button>
          )}
        </div>
      </div>

      <form id="profile-tab-form" onSubmit={handleSaveProfile} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-[#B3B3B3] mb-1.5">
              نام و نام خانوادگی
            </label>
            <input
              type="text"
              value={profileName}
              onChange={(e) => isAdmin && setProfileName(e.target.value)}
              disabled={!isAdmin}
              required
              className={inputBaseClass}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-[#B3B3B3] mb-1.5">
              نام کاربری ورود (شناسه یکتا)
            </label>
            <input
              type="text"
              dir="ltr"
              value={profileUsername}
              onChange={(e) => isAdmin && setProfileUsername(e.target.value)}
              disabled={!isAdmin}
              placeholder="مثال: sara_ahmadi"
              className={`${inputBaseClass} font-mono`}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-[#B3B3B3] mb-1.5">
              شماره موبایل
            </label>
            <input
              type="text"
              dir="ltr"
              value={profilePhone}
              onChange={(e) => isAdmin && setProfilePhone(e.target.value)}
              disabled={!isAdmin}
              placeholder="0912..."
              className={`${inputBaseClass} font-mono`}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-[#B3B3B3] mb-1.5">
              کد ملی
            </label>
            <input
              type="text"
              dir="ltr"
              value={profileNationalId}
              onChange={(e) => isAdmin && setProfileNationalId(e.target.value)}
              disabled={!isAdmin}
              placeholder="۰۰۱۲۳۴۵۶۷۸"
              className={`${inputBaseClass} font-mono`}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-[#B3B3B3] mb-1.5">
              ایمیل کاربری (غیرقابل ویرایش)
            </label>
            <input
              type="email"
              dir="ltr"
              disabled
              value={currentPersonnel?.email || currentUser?.email || ''}
              className="w-full h-10 px-3 bg-slate-100 dark:bg-[#1e1e1e] rounded-xl text-xs text-slate-400 dark:text-[#777] border border-slate-200 dark:border-[#2c2c2c] cursor-not-allowed font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-[#B3B3B3] mb-1.5">
              شماره کارت بانکی (جهت واریز مساعده و حقوق)
            </label>
            <input
              type="text"
              dir="ltr"
              value={profileBankCard}
              onChange={(e) => setProfileBankCard(e.target.value)}
              placeholder="6037-9975-..."
              className="w-full h-10 px-3 bg-slate-50 dark:bg-[#121212] rounded-xl text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-[#2c2c2c] focus:border-emerald-500 dark:focus:border-[#1DB954] focus:outline-none font-mono tracking-wider"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-[#B3B3B3] mb-1.5">
              شماره شبا (IBAN)
            </label>
            <input
              type="text"
              dir="ltr"
              value={profileIban}
              onChange={(e) => setProfileIban(e.target.value)}
              placeholder="IR12017..."
              className="w-full h-10 px-3 bg-slate-50 dark:bg-[#121212] rounded-xl text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-[#2c2c2c] focus:border-emerald-500 dark:focus:border-[#1DB954] focus:outline-none font-mono"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isSavingProfile}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-[#1DB954] dark:hover:bg-[#1ed760] text-white dark:text-black font-bold text-xs shadow-lg shadow-emerald-600/20 dark:shadow-[#1DB954]/25 transition-all disabled:opacity-50"
          >
            {isSavingProfile
              ? 'در حال ذخیره...'
              : isAdmin
              ? 'ذخیره مشخصات پروفایل'
              : 'ذخیره شماره کارت و شبا'}
          </button>
        </div>
      </form>
    </div>
  );
};

