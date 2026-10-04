import React, { useState } from 'react';
import {
  Building2,
  Plus,
  Check,
  Edit2,
  Trash2,
  Phone,
  MapPin,
  ShieldCheck,
  Layers,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Users,
  Briefcase,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { Tenant, Customer, Personnel } from '../types';
import { createTenant, updateTenant, deleteTenant } from '../api';

interface TenantsManagementViewProps {
  tenants: Tenant[];
  activeTenantId: string;
  onSelectTenant: (tenantId: string) => void;
  onRefreshTenants: () => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  isAdmin: boolean;
  customers?: Customer[];
  personnelList?: Personnel[];
  initialCreateOpen?: boolean;
}

export const TenantsManagementView: React.FC<TenantsManagementViewProps> = ({
  tenants,
  activeTenantId,
  onSelectTenant,
  onRefreshTenants,
  showToast,
  isAdmin,
  customers = [],
  personnelList = [],
  initialCreateOpen = false,
}) => {
  const [isAdding, setIsAdding] = useState(initialCreateOpen);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    phone: '',
    address: '',
    status: 'active' as 'active' | 'inactive',
  });

  const handleOpenAdd = () => {
    setEditingTenant(null);
    setFormData({
      name: '',
      slug: '',
      phone: '',
      address: '',
      status: 'active',
    });
    setIsAdding(true);
  };

  const handleOpenEdit = (t: Tenant) => {
    setEditingTenant(t);
    setFormData({
      name: t.name,
      slug: t.slug || '',
      phone: t.phone || '',
      address: t.address || '',
      status: t.status || 'active',
    });
    setIsAdding(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('نام سازمان الزامی است.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingTenant) {
        await updateTenant(editingTenant.id, formData);
        showToast('اطلاعات سازمان با موفقیت به‌روزرسانی شد.', 'success');
      } else {
        const newSlug =
          formData.slug.trim() ||
          formData.name
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '-');
        await createTenant({
          ...formData,
          slug: newSlug,
        });
        showToast('سازمان / شعبه جدید با موفقیت ایجاد شد.', 'success');
      }
      setIsAdding(false);
      setEditingTenant(null);
      await onRefreshTenants();
    } catch (err: any) {
      showToast(err.message || 'خطا در ذخیره سازمان', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (t: Tenant) => {
    if (t.id === 'default' || t.id === '1') {
      showToast('سازمان مرکزی و پیش‌فرض سامانه قابل حذف نیست.', 'error');
      return;
    }
    if (!window.confirm(`آیا از حذف سازمان «${t.name}» اطمینان دارید؟ تمامی ارجاعات ممکن است تحت تاثیر قرار گیرند.`)) {
      return;
    }

    try {
      await deleteTenant(t.id);
      showToast('سازمان با موفقیت حذف شد.', 'success');
      if (activeTenantId === t.id) {
        onSelectTenant('default');
      }
      await onRefreshTenants();
    } catch (err: any) {
      showToast(err.message || 'خطا در حذف سازمان', 'error');
    }
  };

  const activeTenant = tenants.find((t) => String(t.id) === String(activeTenantId));
  const activeTenantName =
    activeTenantId === 'all'
      ? 'همه سازمان‌ها (تجمیعی)'
      : activeTenant?.name || 'سازمان مرکزی آلفادسک';

  return (
    <div className="space-y-6">
      {/* Top Banner & Overview */}
      <div className="bg-gradient-to-r from-[#181818] via-[#1c1c1c] to-[#141414] border border-[#282828] rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-[#1DB954]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#1DB954]/15 border border-[#1DB954]/30 flex items-center justify-center text-[#1DB954] flex-shrink-0 shadow-lg shadow-[#1DB954]/10">
              <Building2 className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-white">
                  مدیریت سازمان‌ها، شرکت‌ها و شعب
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-[#1DB954]/15 text-[#1DB954] text-[11px] font-mono border border-[#1DB954]/30">
                  Multi-Tenancy
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#A7A7A7] mt-0.5">
                جداسازی و ایزولاسیون کامل پرونده‌های مشتریان، مذاکرات، لیدها و پرسنل برای هر شرکت یا سازمان
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isAdmin && (
              <button
                type="button"
                onClick={handleOpenAdd}
                className="px-4 py-2.5 rounded-xl bg-[#1DB954] hover:bg-[#1ED760] text-black font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-[#1DB954]/20 transition-all cursor-pointer hover:scale-[1.02]"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>ساخت سازمان جدید</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onSelectTenant('all')}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer border ${
                activeTenantId === 'all'
                  ? 'bg-[#1DB954]/20 text-[#1DB954] border-[#1DB954]/40 shadow-sm'
                  : 'bg-[#222222] hover:bg-[#2a2a2a] text-[#B3B3B3] hover:text-white border-[#333333]'
              }`}
            >
              <Layers className="w-4 h-4 text-[#1DB954]" />
              <span>دید کلان (همه سازمان‌ها)</span>
              {activeTenantId === 'all' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-5 border-t border-[#252525]">
          <div className="bg-[#121212]/70 border border-[#242424] rounded-xl p-3.5">
            <div className="text-[11px] text-[#888] font-medium flex items-center gap-1.5 mb-1">
              <Building2 className="w-3.5 h-3.5 text-[#1DB954]" />
              <span>تعداد کل سازمان‌ها</span>
            </div>
            <div className="text-xl font-black text-white font-mono">
              {tenants.length} <span className="text-xs font-normal text-[#888]">شرکت</span>
            </div>
          </div>

          <div className="bg-[#121212]/70 border border-[#242424] rounded-xl p-3.5">
            <div className="text-[11px] text-[#888] font-medium flex items-center gap-1.5 mb-1">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>سازمان فعال فعلی</span>
            </div>
            <div className="text-xs sm:text-sm font-bold text-[#1DB954] truncate">
              {activeTenantName}
            </div>
          </div>

          <div className="bg-[#121212]/70 border border-[#242424] rounded-xl p-3.5">
            <div className="text-[11px] text-[#888] font-medium flex items-center gap-1.5 mb-1">
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span>مشتریان در سامانه</span>
            </div>
            <div className="text-xl font-black text-white font-mono">
              {customers.length} <span className="text-xs font-normal text-[#888]">پرونده</span>
            </div>
          </div>

          <div className="bg-[#121212]/70 border border-[#242424] rounded-xl p-3.5">
            <div className="text-[11px] text-[#888] font-medium flex items-center gap-1.5 mb-1">
              <Briefcase className="w-3.5 h-3.5 text-amber-400" />
              <span>پرسنل ثبت‌شده</span>
            </div>
            <div className="text-xl font-black text-white font-mono">
              {personnelList.length} <span className="text-xs font-normal text-[#888]">نفر</span>
            </div>
          </div>
        </div>
      </div>

      {/* Add / Edit Form Modal or Card */}
      {isAdding && (
        <div className="bg-[#161616] border-2 border-[#1DB954]/40 rounded-2xl p-5 sm:p-6 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-[#252525] pb-4 mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#1DB954]/15 flex items-center justify-center text-[#1DB954]">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-white">
                {editingTenant ? 'ویرایش مشخصات سازمان' : 'ساخت و تعریف سازمان جدید'}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setEditingTenant(null);
              }}
              className="text-xs text-[#888] hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#222] hover:bg-[#282828] transition-colors"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>بستن فرم</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                  نام سازمان / شرکت / شعبه <span className="text-[#E22134]">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="مثلاً: هلدینگ بازرگانی کیان یا شعبه اصفهان"
                  required
                  className="w-full h-11 px-3.5 bg-[#1f1f1f] rounded-xl text-xs text-white border border-[#333] focus:border-[#1DB954] focus:ring-1 focus:ring-[#1DB954] focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5 flex items-center justify-between">
                  <span>شناسه یا کد لاتین یکتا (Slug)</span>
                  <span className="text-[10px] text-[#777]">اختیاری</span>
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="kian-holding"
                  className="w-full h-11 px-3.5 bg-[#1f1f1f] rounded-xl text-xs text-white border border-[#333] focus:border-[#1DB954] focus:outline-none font-mono transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                  شماره تماس دفتر یا سازمان
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="021-xxxxxxxx"
                  className="w-full h-11 px-3.5 bg-[#1f1f1f] rounded-xl text-xs text-white border border-[#333] focus:border-[#1DB954] focus:outline-none font-mono transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                  وضعیت فعالیت سازمان
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as 'active' | 'inactive',
                    })
                  }
                  className="w-full h-11 px-3.5 bg-[#1f1f1f] rounded-xl text-xs text-white border border-[#333] focus:border-[#1DB954] focus:outline-none cursor-pointer"
                >
                  <option value="active">فعال (Active)</option>
                  <option value="inactive">تعلیق / غیرفعال (Inactive)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                  نشانی و آدرس دفتر مرکزی شعبه
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="تهران، خیابان ولیعصر..."
                  className="w-full h-11 px-3.5 bg-[#1f1f1f] rounded-xl text-xs text-white border border-[#333] focus:border-[#1DB954] focus:outline-none transition-all"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#252525]">
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setEditingTenant(null);
                }}
                className="px-4 py-2.5 rounded-xl bg-[#222] hover:bg-[#282828] text-xs text-white transition-colors cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-[#1DB954] hover:bg-[#1ed760] text-black font-extrabold text-xs shadow-lg shadow-[#1DB954]/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'در حال ثبت...' : editingTenant ? 'ذخیره تغییرات' : 'ایجاد و ثبت سازمان'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Organizations Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#1DB954]" />
            <h3 className="text-sm font-bold text-white">
              لیست شرکت‌ها و شعب ثبت‌شده ({tenants.length} سازمان)
            </h3>
          </div>
          <span className="text-xs text-[#888]">
            برای سوییچ بین سازمان‌ها، روی دکمه «انتخاب سازمان» کلیک نمایید
          </span>
        </div>

        {tenants.length === 0 ? (
          <div className="bg-[#181818] border border-[#282828] rounded-2xl p-12 text-center space-y-3">
            <Building2 className="w-12 h-12 text-[#555] mx-auto" />
            <h4 className="text-sm font-bold text-white">هنوز سازمانی ثبت نشده است</h4>
            <p className="text-xs text-[#888]">
              با کلیک بر روی دکمه «ساخت سازمان جدید»، اولین شعبه یا شرکت خود را تعریف کنید.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tenants.map((t) => {
              const isSelected =
                activeTenantId === String(t.id) ||
                (activeTenantId === 'default' && (t.id === 'default' || t.id === '1'));
              const isDefaultOrg = t.id === 'default' || t.id === '1' || t.slug === 'alphadesk-hq';

              return (
                <div
                  key={t.id}
                  className={`p-5 rounded-2xl border transition-all relative flex flex-col justify-between gap-4 ${
                    isSelected
                      ? 'bg-gradient-to-br from-[#1a2e21] to-[#141414] border-[#1DB954] shadow-xl shadow-[#1DB954]/10 ring-1 ring-[#1DB954]'
                      : 'bg-[#181818] border-[#282828] hover:border-[#383838]'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md ${
                            isSelected
                              ? 'bg-[#1DB954] text-black font-black'
                              : 'bg-[#222222] text-[#888] border border-[#333]'
                          }`}
                        >
                          <Building2 className="w-5 h-5 stroke-[2.2]" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-extrabold text-white">{t.name}</h4>
                            {isDefaultOrg && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] font-semibold">
                                پیش‌فرض سامانه
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#888] font-mono mt-0.5">
                            کد شناسه: {t.slug || `org-${t.id}`}
                          </div>
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          t.status === 'active'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {t.status === 'active' ? 'فعال' : 'تعلیق'}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-[#A7A7A7] pt-2 border-t border-[#252525]">
                      {t.phone ? (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                          <span dir="ltr" className="font-mono text-[11px]">
                            {t.phone}
                          </span>
                        </div>
                      ) : null}

                      {t.address ? (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          <span className="line-clamp-1 text-[11px]">{t.address}</span>
                        </div>
                      ) : null}

                      {t.description ? (
                        <div className="text-[11px] text-[#777] line-clamp-1 italic">
                          {t.description}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-[#252525] mt-1">
                    <div className="flex items-center gap-2">
                      {isSelected ? (
                        <span className="px-3 py-1.5 rounded-xl bg-[#1DB954]/20 border border-[#1DB954]/40 text-[#1DB954] text-xs font-black flex items-center gap-1.5">
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>سازمان فعال فعلی</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectTenant(String(t.id));
                            showToast(`سازمان فعال به «${t.name}» تغییر یافت.`, 'success');
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-[#222222] hover:bg-[#2e2e2e] text-white hover:text-[#1DB954] text-xs font-bold flex items-center gap-1.5 transition-all border border-[#333333] cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5 text-[#1DB954]" />
                          <span>سوییچ به این سازمان</span>
                        </button>
                      )}
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(t)}
                          className="p-2 rounded-xl text-[#888] hover:text-white bg-[#202020] hover:bg-[#282828] border border-[#2e2e2e] transition-colors cursor-pointer"
                          title="ویرایش مشخصات"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {!isDefaultOrg && (
                          <button
                            type="button"
                            onClick={() => handleDelete(t)}
                            className="p-2 rounded-xl text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors cursor-pointer"
                            title="حذف سازمان"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Security & Multi-Tenancy Info Footer Card */}
      <div className="bg-[#141414] border border-[#242424] rounded-2xl p-4 flex items-center justify-between text-xs text-[#888]">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-[#1DB954] flex-shrink-0" />
          <span>
            امنیت پایگاه داده: تمامی درخواست‌ها با هدر استاندارد <code className="text-[#1DB954] font-mono">x-tenant-id</code> ایزوله شده و تداخل مالکیتی بین سازمان‌ها غیرممکن است.
          </span>
        </div>
      </div>
    </div>
  );
};
