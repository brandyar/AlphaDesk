import React from 'react';
import {
  MessageSquareText,
  Send,
  Save,
  RefreshCw,
  Building2,
  AlertCircle,
  KeyRound,
  Eye,
  EyeOff,
  Sparkles,
  UserCheck,
  CalendarDays,
  DollarSign,
  Check,
  X,
  AlertTriangle,
} from 'lucide-react';
import { ProjectSettings, Tenant } from '../../types';

export interface SmsSettingsTabProps {
  projectSettings: ProjectSettings;
  setProjectSettings: React.Dispatch<React.SetStateAction<ProjectSettings>>;
  tenantSmsPhones: string;
  setTenantSmsPhones: (val: string) => void;
  isSavingProjectSettings: boolean;
  isSavingTenantSettings: boolean;
  handleSaveProjectSettings: () => Promise<void>;
  handleSaveTenantSettings: () => Promise<void>;
  isCentralOrgAdmin: boolean;
  tenants: Tenant[];
  activeTenantId: string | null;
  showApiKey: boolean;
  setShowApiKey: (val: boolean) => void;
  testSmsModalOpen: boolean;
  setTestSmsModalOpen: (val: boolean) => void;
  testSmsPhone: string;
  setTestSmsPhone: (val: string) => void;
  testSmsPattern: string;
  setTestSmsPattern: (val: string) => void;
  testSmsVarKey: string;
  setTestSmsVarKey: (val: string) => void;
  testSmsVarVal: string;
  setTestSmsVarVal: (val: string) => void;
  testSmsVarKey2: string;
  setTestSmsVarKey2: (val: string) => void;
  testSmsVarVal2: string;
  setTestSmsVarVal2: (val: string) => void;
  testSmsError: string | null;
  isSendingTestSms: boolean;
  handleSendTestSms: () => Promise<void>;
}

export const SmsSettingsTab: React.FC<SmsSettingsTabProps> = ({
  projectSettings,
  setProjectSettings,
  tenantSmsPhones,
  setTenantSmsPhones,
  isSavingProjectSettings,
  isSavingTenantSettings,
  handleSaveProjectSettings,
  handleSaveTenantSettings,
  isCentralOrgAdmin,
  tenants,
  activeTenantId,
  showApiKey,
  setShowApiKey,
  testSmsModalOpen,
  setTestSmsModalOpen,
  testSmsPhone,
  setTestSmsPhone,
  testSmsPattern,
  setTestSmsPattern,
  testSmsVarKey,
  setTestSmsVarKey,
  testSmsVarVal,
  setTestSmsVarVal,
  testSmsVarKey2,
  setTestSmsVarKey2,
  testSmsVarVal2,
  setTestSmsVarVal2,
  testSmsError,
  isSendingTestSms,
  handleSendTestSms,
}) => {
  return (
    <>
      <div className="bg-[#181818] border border-[#282828] rounded-2xl p-5 sm:p-7 space-y-7 shadow-2xl animate-in fade-in">
        {/* Section Title & Quick Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#282828] pb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-950/20">
              <MessageSquareText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>تنظیمات درگاه پیامک IPPanel و پترن‌های نوتیفیکیشن</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-mono border border-emerald-500/30">
                  IPPanel v1 API
                </span>
              </h3>
              <p className="text-xs text-[#888] mt-0.5">
                پیکربندی کلید API، شماره خط فرستنده و کد پترن‌های پیامکی رویدادهای ورود، مرخصی و مساعده حقوق
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setTestSmsModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-[#222] hover:bg-[#2a2a2a] text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
            >
              <Send className="w-4 h-4" />
              <span>تست ارسال پیامک</span>
            </button>

            <button
              type="button"
              onClick={handleSaveProjectSettings}
              disabled={isSavingProjectSettings}
              className="px-6 py-2.5 rounded-xl bg-[#1DB954] hover:bg-[#1ed760] text-black text-xs font-extrabold shadow-lg shadow-[#1DB954]/25 transition-all flex items-center gap-2"
            >
              {isSavingProjectSettings ? (
                <RefreshCw className="w-4 h-4 animate-spin text-black" />
              ) : (
                <Save className="w-4 h-4 stroke-[2.5]" />
              )}
              <span>ذخیره کلیه تنظیمات</span>
            </button>
          </div>
        </div>

        {/* 0. Tenant Settings (sms_phones) Section */}
        <div className="space-y-3 bg-[#141414] p-4.5 rounded-2xl border border-cyan-500/25 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#222] pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-white">
                شماره‌های پیامک اطلاع‌رسانی مدیریت سازمان ({tenants.find((t) => String(t.id) === String(activeTenantId))?.name || 'سازمان انتخاب‌شده'})
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 font-mono border border-cyan-500/20">
                tenant_settings.sms_phones
              </span>
            </div>
            <button
              type="button"
              onClick={handleSaveTenantSettings}
              disabled={isSavingTenantSettings}
              className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold transition-all flex items-center gap-1.5 shadow-md"
            >
              {isSavingTenantSettings ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>ذخیره شماره‌های مدیریت</span>
            </button>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
              شماره‌های همراه مدیریت جهت دریافت پیامک‌های ثبت مرخصی و مساعده (با کاما جدا کنید)
            </label>
            <input
              type="text"
              dir="ltr"
              value={tenantSmsPhones}
              onChange={(e) => setTenantSmsPhones(e.target.value)}
              placeholder="09121234567, 09129876543"
              className="w-full h-10 px-3.5 bg-[#1e1e1e] rounded-xl text-xs text-white border border-[#333] focus:border-cyan-400 focus:outline-none font-mono"
            />
            <p className="text-[11px] text-[#888] mt-1.5">
              تنها این فیلد در تنظیمات هر سازمان (شعبه) قابل دیدن و ویرایش توسط مدیر همان شعبه است.
            </p>
          </div>
        </div>

        {!isCentralOrgAdmin && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>
              توجه: کلید API، شماره خط فرستنده و پترن‌های عمومی پیامک منحصراً توسط مدیر ارشد سازمان مرکزی قابل تغییر است.
            </span>
          </div>
        )}

        {/* 1. Gateway Credentials */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-white flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-[#1DB954]" />
            <span>۱. تنظیمات اتصال به وب‌سرویس IPPanel</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#141414] p-4.5 rounded-2xl border border-[#262626]">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5 flex items-center justify-between">
                <span>کلید API سامانه IPPanel (API Key)</span>
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1"
                >
                  {showApiKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showApiKey ? 'مخفی‌سازی' : 'نمایش کلید'}</span>
                </button>
              </label>
              <input
                type={showApiKey ? 'text' : 'password'}
                dir="ltr"
                disabled={!isCentralOrgAdmin}
                value={projectSettings.ippanel_api || ''}
                onChange={(e) => setProjectSettings({ ...projectSettings, ippanel_api: e.target.value })}
                placeholder="مثلاً: eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                className="w-full h-10 px-3.5 bg-[#1e1e1e] disabled:opacity-60 rounded-xl text-xs text-white border border-[#333] focus:border-[#1DB954] focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                شماره خط فرستنده (ippanel_sender)
              </label>
              <input
                type="text"
                dir="ltr"
                disabled={!isCentralOrgAdmin}
                value={projectSettings.ippanel_sender || projectSettings.ippanel_line_number || '+983000505'}
                onChange={(e) => setProjectSettings({ ...projectSettings, ippanel_sender: e.target.value, ippanel_line_number: e.target.value })}
                placeholder="+983000505"
                className="w-full h-10 px-3.5 bg-[#1e1e1e] disabled:opacity-60 rounded-xl text-xs text-white border border-[#333] focus:border-[#1DB954] focus:outline-none font-mono"
              />
            </div>
          </div>
        </div>

        {/* 2. Patterns Grid */}
        <div className="space-y-4">
          <div className="text-xs font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#1DB954]" />
            <span>۲. کدهای پترن نوتیفیکیشن‌های پیامکی (IPPanel Patterns)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category 1: Auth & Login */}
            <div className="bg-[#141414] p-4.5 rounded-2xl border border-[#262626] space-y-4 md:col-span-2">
              <div className="text-xs font-bold text-emerald-400 flex items-center gap-2 border-b border-[#222] pb-2.5">
                <UserCheck className="w-4 h-4" />
                <span>الف) احراز هویت و ورود به سیستم</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#B3B3B3] mb-1">
                    کد پترن ورود موفق به پنل کاربری (`login_pattern`)
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={projectSettings.login_pattern || ''}
                    onChange={(e) => setProjectSettings({ ...projectSettings, login_pattern: e.target.value })}
                    placeholder="کد پترن از ippanel (مثلاً: 12345)"
                    className="w-full h-9 px-3 bg-[#1e1e1e] rounded-xl text-xs text-white border border-[#333] focus:border-[#1DB954] focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#B3B3B3] mb-1">
                    متن توضیحی / راهنمای پترن ورود (`login_pattern_text`)
                  </label>
                  <input
                    type="text"
                    value={projectSettings.login_pattern_text || ''}
                    onChange={(e) => setProjectSettings({ ...projectSettings, login_pattern_text: e.target.value })}
                    placeholder="متغیرها: {name}، {date}، {time}، {username}"
                    className="w-full h-9 px-3 bg-[#1e1e1e] rounded-xl text-xs text-white border border-[#333] focus:border-[#1DB954] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Category 2: Leave Requests */}
            <div className="bg-[#141414] p-4.5 rounded-2xl border border-[#262626] space-y-4 md:col-span-2">
              <div className="text-xs font-bold text-amber-400 flex items-center gap-2 border-b border-[#222] pb-2.5">
                <CalendarDays className="w-4 h-4" />
                <span>ب) درخواست‌های مرخصی پرسنل</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Daily Leave Request */}
                <div className="p-3 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] space-y-2.5">
                  <span className="text-xs font-bold text-white block">۱. ثبت درخواست مرخصی روزانه</span>
                  <div className="space-y-2">
                    <input
                      type="text"
                      dir="ltr"
                      value={projectSettings.dayli_leave_request_pattern || ''}
                      onChange={(e) => setProjectSettings({ ...projectSettings, dayli_leave_request_pattern: e.target.value })}
                      placeholder="کد پترن ثبت مرخصی روزانه"
                      className="w-full h-8 px-2.5 bg-[#121212] rounded-lg text-xs text-white border border-[#333] focus:border-[#1DB954] focus:outline-none font-mono"
                    />
                    <input
                      type="text"
                      value={projectSettings.dayli_leave_request_text || ''}
                      onChange={(e) => setProjectSettings({ ...projectSettings, dayli_leave_request_text: e.target.value })}
                      placeholder="متن پیام (متغیرها: {name}, {days}, {start_date}, {reason})"
                      className="w-full h-8 px-2.5 bg-[#121212] rounded-lg text-xs text-[#BBB] border border-[#333] focus:border-[#1DB954] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Hourly Leave Request */}
                <div className="p-3 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] space-y-2.5">
                  <span className="text-xs font-bold text-white block">۲. ثبت درخواست مرخصی ساعتی</span>
                  <div className="space-y-2">
                    <input
                      type="text"
                      dir="ltr"
                      value={projectSettings.hourly_leave_request_pattern || ''}
                      onChange={(e) => setProjectSettings({ ...projectSettings, hourly_leave_request_pattern: e.target.value })}
                      placeholder="کد پترن ثبت مرخصی ساعتی"
                      className="w-full h-8 px-2.5 bg-[#121212] rounded-lg text-xs text-white border border-[#333] focus:border-[#1DB954] focus:outline-none font-mono"
                    />
                    <input
                      type="text"
                      value={projectSettings.hourly_leave_request_text || ''}
                      onChange={(e) => setProjectSettings({ ...projectSettings, hourly_leave_request_text: e.target.value })}
                      placeholder="متن پیام (متغیرها: {name}, {hours}, {start_time}, {end_time}, {date}, {reason})"
                      className="w-full h-8 px-2.5 bg-[#121212] rounded-lg text-xs text-[#BBB] border border-[#333] focus:border-[#1DB954] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Daily Leave Accept */}
                <div className="p-3 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] space-y-2.5">
                  <span className="text-xs font-bold text-emerald-400 block">۳. تایید مرخصی روزانه توسط مدیریت</span>
                  <div className="space-y-2">
                    <input
                      type="text"
                      dir="ltr"
                      value={projectSettings.dayli_leave_accept_pattern || ''}
                      onChange={(e) => setProjectSettings({ ...projectSettings, dayli_leave_accept_pattern: e.target.value })}
                      placeholder="کد پترن تایید مرخصی روزانه"
                      className="w-full h-8 px-2.5 bg-[#121212] rounded-lg text-xs text-white border border-[#333] focus:border-[#1DB954] focus:outline-none font-mono"
                    />
                    <input
                      type="text"
                      value={projectSettings.dayli_leave_accept_text || ''}
                      onChange={(e) => setProjectSettings({ ...projectSettings, dayli_leave_accept_text: e.target.value })}
                      placeholder="متن پیام (متغیرها: {name}, {manager_note}, {reviewed_by}, {start_date})"
                      className="w-full h-8 px-2.5 bg-[#121212] rounded-lg text-xs text-[#BBB] border border-[#333] focus:border-[#1DB954] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Daily Leave Reject */}
                <div className="p-3 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] space-y-2.5">
                  <span className="text-xs font-bold text-rose-400 block">۴. رد درخواست مرخصی روزانه</span>
                  <div className="space-y-2">
                    <input
                      type="text"
                      dir="ltr"
                      value={projectSettings.dayli_leave_reject_pattern || ''}
                      onChange={(e) => setProjectSettings({ ...projectSettings, dayli_leave_reject_pattern: e.target.value })}
                      placeholder="کد پترن رد مرخصی روزانه"
                      className="w-full h-8 px-2.5 bg-[#121212] rounded-lg text-xs text-white border border-[#333] focus:border-[#1DB954] focus:outline-none font-mono"
                    />
                    <input
                      type="text"
                      value={projectSettings.dayli_leave_reject_text || ''}
                      onChange={(e) => setProjectSettings({ ...projectSettings, dayli_leave_reject_text: e.target.value })}
                      placeholder="متن پیام (متغیرها: {name}, {manager_note}, {reviewed_by})"
                      className="w-full h-8 px-2.5 bg-[#121212] rounded-lg text-xs text-[#BBB] border border-[#333] focus:border-[#1DB954] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Hourly Leave Accept */}
                <div className="p-3 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] space-y-2.5">
                  <span className="text-xs font-bold text-emerald-400 block">۵. تایید مرخصی ساعتی</span>
                  <div className="space-y-2">
                    <input
                      type="text"
                      dir="ltr"
                      value={projectSettings.hourly_leave_accept_pattern || ''}
                      onChange={(e) => setProjectSettings({ ...projectSettings, hourly_leave_accept_pattern: e.target.value })}
                      placeholder="کد پترن تایید مرخصی ساعتی"
                      className="w-full h-8 px-2.5 bg-[#121212] rounded-lg text-xs text-white border border-[#333] focus:border-[#1DB954] focus:outline-none font-mono"
                    />
                    <input
                      type="text"
                      value={projectSettings.hourly_leave_accept_text || ''}
                      onChange={(e) => setProjectSettings({ ...projectSettings, hourly_leave_accept_text: e.target.value })}
                      placeholder="متن پیام (متغیرها: {name}, {manager_note}, {reviewed_by})"
                      className="w-full h-8 px-2.5 bg-[#121212] rounded-lg text-xs text-[#BBB] border border-[#333] focus:border-[#1DB954] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Hourly Leave Reject */}
                <div className="p-3 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] space-y-2.5">
                  <span className="text-xs font-bold text-rose-400 block">۶. رد درخواست مرخصی ساعتی</span>
                  <div className="space-y-2">
                    <input
                      type="text"
                      dir="ltr"
                      value={projectSettings.hourly_leave_reject_pattern || ''}
                      onChange={(e) => setProjectSettings({ ...projectSettings, hourly_leave_reject_pattern: e.target.value })}
                      placeholder="کد پترن رد مرخصی ساعتی"
                      className="w-full h-8 px-2.5 bg-[#121212] rounded-lg text-xs text-white border border-[#333] focus:border-[#1DB954] focus:outline-none font-mono"
                    />
                    <input
                      type="text"
                      value={projectSettings.hourly_leave_reject_text || ''}
                      onChange={(e) => setProjectSettings({ ...projectSettings, hourly_leave_reject_text: e.target.value })}
                      placeholder="متن پیام (متغیرها: {name}, {manager_note}, {reviewed_by})"
                      className="w-full h-8 px-2.5 bg-[#121212] rounded-lg text-xs text-[#BBB] border border-[#333] focus:border-[#1DB954] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Category 3: Advance Requests */}
            <div className="bg-[#141414] p-4.5 rounded-2xl border border-[#262626] space-y-4 md:col-span-2">
              <div className="text-xs font-bold text-blue-400 flex items-center gap-2 border-b border-[#222] pb-2.5">
                <DollarSign className="w-4 h-4" />
                <span>ج) درخواست‌های مساعده حقوق مالی</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Advance Request */}
                <div className="p-3 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] space-y-2.5">
                  <span className="text-xs font-bold text-white block">۱. ثبت درخواست مساعده حقوق</span>
                  <div className="space-y-2">
                    <input
                      type="text"
                      dir="ltr"
                      value={projectSettings.addvance_request_pattern || ''}
                      onChange={(e) => setProjectSettings({ ...projectSettings, addvance_request_pattern: e.target.value })}
                      placeholder="کد پترن ثبت درخواست مساعده"
                      className="w-full h-8 px-2.5 bg-[#121212] rounded-lg text-xs text-white border border-[#333] focus:border-[#1DB954] focus:outline-none font-mono"
                    />
                    <input
                      type="text"
                      value={projectSettings.addvance_request_text || ''}
                      onChange={(e) => setProjectSettings({ ...projectSettings, addvance_request_text: e.target.value })}
                      placeholder="متن پیام (متغیرها: {name}, {amount}, {month}, {reason})"
                      className="w-full h-8 px-2.5 bg-[#121212] rounded-lg text-xs text-[#BBB] border border-[#333] focus:border-[#1DB954] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Advance Accept */}
                <div className="p-3 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] space-y-2.5">
                  <span className="text-xs font-bold text-emerald-400 block">۲. تایید کامل درخواست مساعده</span>
                  <div className="space-y-2">
                    <input
                      type="text"
                      dir="ltr"
                      value={projectSettings.addvance_accept_pattern || ''}
                      onChange={(e) => setProjectSettings({ ...projectSettings, addvance_accept_pattern: e.target.value })}
                      placeholder="کد پترن تایید مساعده"
                      className="w-full h-8 px-2.5 bg-[#121212] rounded-lg text-xs text-white border border-[#333] focus:border-[#1DB954] focus:outline-none font-mono"
                    />
                    <input
                      type="text"
                      value={projectSettings.addvance_accept_text || ''}
                      onChange={(e) => setProjectSettings({ ...projectSettings, addvance_accept_text: e.target.value })}
                      placeholder="متن پیام (متغیرها: {name}, {amount}, {manager_note}, {reviewed_by})"
                      className="w-full h-8 px-2.5 bg-[#121212] rounded-lg text-xs text-[#BBB] border border-[#333] focus:border-[#1DB954] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Lower Advance Accept */}
                <div className="p-3 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] space-y-2.5">
                  <span className="text-xs font-bold text-amber-400 block">۳. تایید مساعده با مبلغ کمتر</span>
                  <div className="space-y-2">
                    <input
                      type="text"
                      dir="ltr"
                      value={projectSettings.lower_addvance_accept_pattern || ''}
                      onChange={(e) => setProjectSettings({ ...projectSettings, lower_addvance_accept_pattern: e.target.value })}
                      placeholder="کد پترن تایید مساعده با مبلغ کمتر"
                      className="w-full h-8 px-2.5 bg-[#121212] rounded-lg text-xs text-white border border-[#333] focus:border-[#1DB954] focus:outline-none font-mono"
                    />
                    <input
                      type="text"
                      value={projectSettings.lower_addvance_accept_text || ''}
                      onChange={(e) => setProjectSettings({ ...projectSettings, lower_addvance_accept_text: e.target.value })}
                      placeholder="متن پیام (متغیرها: {name}, {amount}, {manager_note}, {reviewed_by})"
                      className="w-full h-8 px-2.5 bg-[#121212] rounded-lg text-xs text-[#BBB] border border-[#333] focus:border-[#1DB954] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Advance Reject */}
                <div className="p-3 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] space-y-2.5">
                  <span className="text-xs font-bold text-rose-400 block">۴. رد درخواست مساعده</span>
                  <div className="space-y-2">
                    <input
                      type="text"
                      dir="ltr"
                      value={projectSettings.addvance_reject_pattern || ''}
                      onChange={(e) => setProjectSettings({ ...projectSettings, addvance_reject_pattern: e.target.value })}
                      placeholder="کد پترن رد درخواست مساعده"
                      className="w-full h-8 px-2.5 bg-[#121212] rounded-lg text-xs text-white border border-[#333] focus:border-[#1DB954] focus:outline-none font-mono"
                    />
                    <input
                      type="text"
                      value={projectSettings.addvance_reject_text || ''}
                      onChange={(e) => setProjectSettings({ ...projectSettings, addvance_reject_text: e.target.value })}
                      placeholder="متن پیام (متغیرها: {name}, {manager_note}, {reviewed_by})"
                      className="w-full h-8 px-2.5 bg-[#121212] rounded-lg text-xs text-[#BBB] border border-[#333] focus:border-[#1DB954] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Save Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-[#282828]">
          <span className="text-xs text-[#888]">
            کلیه تغییرات پترن‌ها بلافاصله پس از ذخیره، روی سیستم نوتیفیکیشن‌های پیامکی اعمال می‌شوند.
          </span>
          <button
            type="button"
            onClick={handleSaveProjectSettings}
            disabled={isSavingProjectSettings}
            className="px-6 py-2.5 rounded-xl bg-[#1DB954] hover:bg-[#1ed760] text-black text-xs font-extrabold shadow-lg shadow-[#1DB954]/25 transition-all flex items-center gap-2"
          >
            {isSavingProjectSettings ? (
              <RefreshCw className="w-4 h-4 animate-spin text-black" />
            ) : (
              <Check className="w-4 h-4 stroke-[3]" />
            )}
            <span>ذخیره کلیه تنظیمات پیامک</span>
          </button>
        </div>
      </div>

      {/* Modal: Test SMS Sending via IPPanel */}
      {testSmsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#181818] border border-[#282828] rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#282828] pb-3.5">
              <div className="flex items-center gap-2.5 text-emerald-400 font-bold text-sm">
                <Send className="w-5 h-5" />
                <span>تست ارسال آنلاین پیامک با درگاه IPPanel</span>
              </div>
              <button
                onClick={() => setTestSmsModalOpen(false)}
                className="text-[#888] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-[#B3B3B3] font-semibold mb-1.5">
                  شماره موبایل گیرنده تست <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={testSmsPhone}
                  onChange={(e) => setTestSmsPhone(e.target.value)}
                  placeholder="09121234567"
                  className="w-full h-10 px-3.5 bg-[#121212] rounded-xl text-white border border-[#333] focus:border-[#1DB954] focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[#B3B3B3] font-semibold mb-1.5">
                  کد پترن ثبت‌شده در IPPanel <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={testSmsPattern}
                  onChange={(e) => setTestSmsPattern(e.target.value)}
                  placeholder="کد پترن مثلاً: 12345"
                  className="w-full h-10 px-3.5 bg-[#121212] rounded-xl text-white border border-[#333] focus:border-[#1DB954] focus:outline-none font-mono"
                />
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-3 bg-[#121212] p-3 rounded-xl border border-[#222]">
                  <div>
                    <label className="block text-[11px] text-[#777] mb-1">نام کلید متغیر اول (اختیاری)</label>
                    <input
                      type="text"
                      dir="ltr"
                      value={testSmsVarKey}
                      onChange={(e) => setTestSmsVarKey(e.target.value)}
                      placeholder="code یا name"
                      className="w-full h-8 px-2 bg-[#181818] rounded-lg text-white border border-[#333] font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#777] mb-1">مقدار متغیر اول</label>
                    <input
                      type="text"
                      value={testSmsVarVal}
                      onChange={(e) => setTestSmsVarVal(e.target.value)}
                      placeholder="12345 یا سارا احمدی"
                      className="w-full h-8 px-2 bg-[#181818] rounded-lg text-white border border-[#333] text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 bg-[#121212] p-3 rounded-xl border border-[#222]">
                  <div>
                    <label className="block text-[11px] text-[#777] mb-1">نام کلید متغیر دوم (اختیاری)</label>
                    <input
                      type="text"
                      dir="ltr"
                      value={testSmsVarKey2}
                      onChange={(e) => setTestSmsVarKey2(e.target.value)}
                      placeholder="مثلاً: date یا username"
                      className="w-full h-8 px-2 bg-[#181818] rounded-lg text-white border border-[#333] font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#777] mb-1">مقدار متغیر دوم</label>
                    <input
                      type="text"
                      value={testSmsVarVal2}
                      onChange={(e) => setTestSmsVarVal2(e.target.value)}
                      placeholder="مقدار متغیر دوم"
                      className="w-full h-8 px-2 bg-[#181818] rounded-lg text-white border border-[#333] text-xs"
                    />
                  </div>
                </div>
              </div>

              {testSmsError && (
                <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl space-y-1.5 text-xs text-red-200">
                  <div className="font-bold flex items-center gap-1.5 text-red-400">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>خطا در ارسال پیامک:</span>
                  </div>
                  <div className="font-mono text-[11px] bg-black/40 p-2 rounded border border-red-500/20" dir="ltr">
                    {testSmsError}
                  </div>
                  <div className="text-[11px] text-[#AAA] leading-relaxed pt-1">
                    💡 <strong className="text-white">نکات راهنما برای رفع خطای ۴۰۰:</strong> اگر پترن شما در سامانه پیامک دارای متغیر است (مانند <code className="text-emerald-400 font-mono">%code%</code>)، نام کلید متغیر را دقیقاً همان کلمه (مثلاً <code className="text-emerald-400 font-mono">code</code>) بدون علامت % وارد نمایید.
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#282828]">
              <button
                type="button"
                onClick={() => setTestSmsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#AAA] hover:bg-[#252525] transition-colors"
                disabled={isSendingTestSms}
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleSendTestSms}
                disabled={isSendingTestSms}
                className="px-5 py-2.5 rounded-xl text-xs font-extrabold bg-[#1DB954] hover:bg-[#1ed760] text-black shadow-lg shadow-[#1DB954]/25 transition-all flex items-center gap-2"
              >
                {isSendingTestSms ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-black" />
                    <span>در حال ارسال پیامک...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>ارسال پیامک تست</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
