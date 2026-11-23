import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Users,
  Briefcase,
  PackagePlus,
} from 'lucide-react';
import { Tenant, Customer, Personnel } from '../types';
import {
  createTenant,
  updateTenant,
  deleteTenant,
  fetchTenantSettings,
  updateTenantSettings,
  fetchTenantsStats,
  TenantsStatsResponse,
} from '../api';
import { toPersianDigits } from '../utils';

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
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const formSectionRef = useRef<HTMLDivElement | null>(null);

  // Real system-wide & per-tenant statistics
  const [stats, setStats] = useState<TenantsStatsResponse | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Per-tenant unit sales commission setting map
  const [unitSalesEnabledMap, setUnitSalesEnabledMap] = useState<Record<string, boolean>>({});
  const [togglingTenantId, setTogglingTenantId] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const data = await fetchTenantsStats();
      setStats(data);
    } catch {
      // keep previous stats if transient error
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats, tenants.length, activeTenantId]);

  useEffect(() => {
    let mounted = true;
    fetchTenantSettings('all')
      .then((res) => {
        if (!mounted) return;
        const map: Record<string, boolean> = {};
        if (Array.isArray(res.items)) {
          for (const item of res.items) {
            const tKey = String(item.tenant_id || 'default');
            map[tKey] = Boolean(item.enable_unit_sales_commission);
            if (tKey === '1') map['default'] = Boolean(item.enable_unit_sales_commission);
            if (tKey === 'default') map['1'] = Boolean(item.enable_unit_sales_commission);
          }
        }
        setUnitSalesEnabledMap(map);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [tenants.length]);

  const handleToggleUnitSales = async (t: Tenant) => {
    if (!isAdmin) return;
    const tId = String(t.id);
    const currentVal = Boolean(unitSalesEnabledMap[tId]);
    const nextVal = !currentVal;
    setTogglingTenantId(tId);
    try {
      await updateTenantSettings(tId, { enable_unit_sales_commission: nextVal });
      setUnitSalesEnabledMap((prev) => {
        const next = { ...prev, [tId]: nextVal };
        if (tId === '1' || tId === 'default') {
          next['1'] = nextVal;
          next['default'] = nextVal;
        }
        return next;
      });
      window.dispatchEvent(new CustomEvent('crm_tenant_settings_updated'));
      showToast(
        nextVal
          ? `فروش تعدادی / چندآیتمی برای «${t.name}» فعال شد.`
          : `فروش تعدادی / چندآیتمی برای «${t.name}» غیرفعال شد.`,
        'success'
      );
    } catch (err: any) {
      showToast(err.message || 'خطا در تغییر تنظیم فروش تعدادی', 'error');
    } finally {
      setTogglingTenantId(null);
    }
  };

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    phone: '',
    address: '',
    status: 'active' as 'active' | 'inactive',
  });

  const scrollFormIntoView = () => {
    setTimeout(() => {
      formSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const handleOpenAdd = () => {
    setEditingTenant(null);
    setConfirmDeleteId(null);
    setFormData({
      name: '',
      slug: '',
      phone: '',
      address: '',
      status: 'active',
    });
    setIsAdding(true);
    scrollFormIntoView();
  };

  const handleOpenEdit = (t: Tenant) => {
    setEditingTenant(t);
    setConfirmDeleteId(null);
    setFormData({
      name: t.name,
      slug: t.slug || '',
      phone: t.phone || '',
      address: t.address || '',
      status: t.status || 'active',
    });
    setIsAdding(true);
    scrollFormIntoView();
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
        await updateTenant(editingTenant.id, {
          name: formData.name.trim(),
          slug: formData.slug.trim(),
          phone: formData.phone.trim(),
          address: formData.address.trim(),
          status: formData.status,
        });
        showToast('اطلاعات سازمان با موفقیت به‌روزرسانی شد.', 'success');
      } else {
        const newSlug =
          formData.slug.trim() ||
          formData.name
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '-');
        await createTenant({
          name: formData.name.trim(),
          slug: newSlug,
          phone: formData.phone.trim(),
          address: formData.address.trim(),
          status: formData.status,
        });
        showToast('سازمان / شعبه جدید با موفقیت ایجاد شد.', 'success');
      }
      setIsAdding(false);
      setEditingTenant(null);
      await onRefreshTenants();
      await loadStats();
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

    try {
      await deleteTenant(t.id);
      setConfirmDeleteId(null);
      showToast('سازمان با موفقیت حذف شد.', 'success');
      if (activeTenantId === t.id) {
        onSelectTenant('default');
      }
      await onRefreshTenants();
      await loadStats();
    } catch (err: any) {
      showToast(err.message || 'خطا در حذف سازمان', 'error');
    }
  };

  const activeTenant = tenants.find((t) => String(t.id) === String(activeTenantId));
  const activeTenantName =
    activeTenantId === 'all'
      ? 'همه سازمان‌ها (تجمیعی)'
      : activeTenant?.name || 'سازمان مرکزی آلفادسک';

  const totalTenantsCount = stats?.total_tenants ?? tenants.length;
  const totalCustomersCount = stats ? stats.total_customers : null;
  const totalPersonnelCount = stats ? stats.total_personnel : null;

  return (
    <div className="space-y-6">
      {/* Top Banner & Overview */}
      <div className="bg-gradient-to-r from-white via-slate-50 to-emerald-50/40 dark:from-[#181818] dark:via-[#1c1c1c] dark:to-[#141414] border border-slate-200 dark:border-[#282828] rounded-2xl p-5 sm:p-6 shadow-sm dark:shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-500/10 dark:bg-[#1DB954]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 dark:bg-[#1DB954]/15 border border-emerald-500/30 dark:border-[#1DB954]/30 flex items-center justify-center text-emerald-600 dark:text-[#1DB954] flex-shrink-0 shadow-lg shadow-emerald-500/10 dark:shadow-[#1DB954]/10">
              <Building2 className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  مدیریت سازمان‌ها، شرکت‌ها و شعب
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 dark:bg-[#1DB954]/15 text-emerald-700 dark:text-[#1DB954] text-[11px] font-mono border border-emerald-500/30 dark:border-[#1DB954]/30">
                  Multi-Tenancy
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-[#A7A7A7] mt-0.5">
                جداسازی و ایزولاسیون کامل پرونده‌های مشتریان، مذاکرات و پرسنل برای هر شرکت یا سازمان
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isAdmin && (
              <button
                type="button"
                onClick={handleOpenAdd}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-[#1DB954] dark:hover:bg-[#1ED760] text-white dark:text-black font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-600/20 dark:shadow-[#1DB954]/20 transition-all cursor-pointer hover:scale-[1.02]"
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
                  ? 'bg-emerald-500/15 dark:bg-[#1DB954]/20 text-emerald-700 dark:text-[#1DB954] border-emerald-500/40 dark:border-[#1DB954]/40 shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-[#222222] dark:hover:bg-[#2a2a2a] text-slate-700 hover:text-slate-900 dark:text-[#B3B3B3] dark:hover:text-white border-slate-200 dark:border-[#333333]'
              }`}
            >
              <Layers className="w-4 h-4 text-emerald-600 dark:text-[#1DB954]" />
              <span>دید کلان (همه سازمان‌ها)</span>
              {activeTenantId === 'all' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-5 border-t border-slate-200 dark:border-[#252525]">
          <div className="bg-white/90 dark:bg-[#121212]/70 border border-slate-200 dark:border-[#242424] rounded-xl p-3.5 shadow-xs dark:shadow-none">
            <div className="text-[11px] text-slate-500 dark:text-[#888] font-medium flex items-center gap-1.5 mb-1">
              <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-[#1DB954]" />
              <span>تعداد کل سازمان‌ها</span>
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
              {toPersianDigits(totalTenantsCount)}{' '}
              <span className="text-xs font-normal text-slate-500 dark:text-[#888]">شرکت</span>
            </div>
          </div>

          <div className="bg-white/90 dark:bg-[#121212]/70 border border-slate-200 dark:border-[#242424] rounded-xl p-3.5 shadow-xs dark:shadow-none">
            <div className="text-[11px] text-slate-500 dark:text-[#888] font-medium flex items-center gap-1.5 mb-1">
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>سازمان فعال فعلی</span>
            </div>
            <div className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-[#1DB954] truncate">
              {activeTenantName}
            </div>
          </div>

          <div className="bg-white/90 dark:bg-[#121212]/70 border border-slate-200 dark:border-[#242424] rounded-xl p-3.5 shadow-xs dark:shadow-none">
            <div className="text-[11px] text-slate-500 dark:text-[#888] font-medium flex items-center gap-1.5 mb-1">
              <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>کل مشتریان سامانه</span>
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
              {loadingStats && totalCustomersCount === null ? (
                <span className="text-sm text-slate-400 dark:text-[#666]">...</span>
              ) : (
                toPersianDigits((totalCustomersCount ?? customers.length).toLocaleString('en-US'))
              )}{' '}
              <span className="text-xs font-normal text-slate-500 dark:text-[#888]">پرونده</span>
            </div>
          </div>

          <div className="bg-white/90 dark:bg-[#121212]/70 border border-slate-200 dark:border-[#242424] rounded-xl p-3.5 shadow-xs dark:shadow-none">
            <div className="text-[11px] text-slate-500 dark:text-[#888] font-medium flex items-center gap-1.5 mb-1">
              <Briefcase className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>کل پرسنل ثبت‌شده</span>
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
              {loadingStats && totalPersonnelCount === null ? (
                <span className="text-sm text-slate-400 dark:text-[#666]">...</span>
              ) : (
                toPersianDigits((totalPersonnelCount ?? personnelList.length).toLocaleString('en-US'))
              )}{' '}
              <span className="text-xs font-normal text-slate-500 dark:text-[#888]">نفر</span>
            </div>
          </div>
        </div>
      </div>

      {/* Add / Edit Form Modal or Card */}
      {isAdding && (
        <div
          ref={formSectionRef}
          className="bg-white dark:bg-[#161616] border-2 border-emerald-500/40 dark:border-[#1DB954]/40 rounded-2xl p-5 sm:p-6 shadow-xl dark:shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-[#252525] pb-4 mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 dark:bg-[#1DB954]/15 flex items-center justify-center text-emerald-600 dark:text-[#1DB954]">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingTenant ? 'ویرایش مشخصات سازمان' : 'ساخت و تعریف سازمان جدید'}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                form="tenant-view-form"
                disabled={isSubmitting}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-[#1DB954] dark:hover:bg-[#1ed760] text-white dark:text-black font-extrabold text-xs shadow-md shadow-emerald-600/20 dark:shadow-[#1DB954]/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'در حال ثبت...' : editingTenant ? 'ذخیره تغییرات' : 'ایجاد و ثبت سازمان'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setEditingTenant(null);
                }}
                className="text-xs text-slate-600 hover:text-slate-900 dark:text-[#888] dark:hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#222] dark:hover:bg-[#282828] border border-slate-200 dark:border-transparent transition-colors"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>بستن فرم</span>
              </button>
            </div>
          </div>

          <form id="tenant-view-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#B3B3B3] mb-1.5">
                  نام سازمان / شرکت / شعبه <span className="text-[#E22134]">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="مثلاً: هلدینگ بازرگانی کیان یا شعبه اصفهان"
                  required
                  className="w-full h-11 px-3.5 bg-slate-50 dark:bg-[#1f1f1f] rounded-xl text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-[#333] focus:border-emerald-500 dark:focus:border-[#1DB954] focus:ring-1 focus:ring-emerald-500 dark:focus:ring-[#1DB954] focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#B3B3B3] mb-1.5 flex items-center justify-between">
                  <span>شناسه یا کد لاتین یکتا (Slug)</span>
                  <span className="text-[10px] text-slate-400 dark:text-[#777]">اختیاری</span>
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="kian-holding"
                  className="w-full h-11 px-3.5 bg-slate-50 dark:bg-[#1f1f1f] rounded-xl text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-[#333] focus:border-emerald-500 dark:focus:border-[#1DB954] focus:outline-none font-mono transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#B3B3B3] mb-1.5">
                  شماره تماس دفتر یا سازمان
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="021-xxxxxxxx"
                  className="w-full h-11 px-3.5 bg-slate-50 dark:bg-[#1f1f1f] rounded-xl text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-[#333] focus:border-emerald-500 dark:focus:border-[#1DB954] focus:outline-none font-mono transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#B3B3B3] mb-1.5">
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
                  className="w-full h-11 px-3.5 bg-slate-50 dark:bg-[#1f1f1f] rounded-xl text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-[#333] focus:border-emerald-500 dark:focus:border-[#1DB954] focus:outline-none cursor-pointer"
                >
                  <option value="active">فعال (Active)</option>
                  <option value="inactive">تعلیق / غیرفعال (Inactive)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#B3B3B3] mb-1.5">
                  نشانی و آدرس دفتر مرکزی شعبه
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="تهران، خیابان ولیعصر..."
                  className="w-full h-11 px-3.5 bg-slate-50 dark:bg-[#1f1f1f] rounded-xl text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-[#333] focus:border-emerald-500 dark:focus:border-[#1DB954] focus:outline-none transition-all"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-[#252525]">
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setEditingTenant(null);
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#222] dark:hover:bg-[#282828] text-xs text-slate-700 dark:text-white font-semibold transition-colors cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-[#1DB954] dark:hover:bg-[#1ed760] text-white dark:text-black font-extrabold text-xs shadow-lg shadow-emerald-600/20 dark:shadow-[#1DB954]/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'در حال ثبت...' : editingTenant ? 'ذخیره تغییرات' : 'ایجاد و ثبت سازمان'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Organizations Grid */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-600 dark:text-[#1DB954]" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              لیست شرکت‌ها و شعب ثبت‌شده ({toPersianDigits(tenants.length)} سازمان)
            </h3>
          </div>
          <span className="text-xs text-slate-500 dark:text-[#888]">
            برای سوییچ بین سازمان‌ها، روی دکمه «سوییچ به این سازمان» کلیک نمایید
          </span>
        </div>

        {tenants.length === 0 ? (
          <div className="bg-white dark:bg-[#181818] border border-slate-200 dark:border-[#282828] rounded-2xl p-12 text-center space-y-3 shadow-sm dark:shadow-none">
            <Building2 className="w-12 h-12 text-slate-300 dark:text-[#555] mx-auto" />
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">هنوز سازمانی ثبت نشده است</h4>
            <p className="text-xs text-slate-500 dark:text-[#888]">
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
              const tenantMetrics =
                stats?.per_tenant?.[String(t.id)] ||
                (isDefaultOrg ? stats?.per_tenant?.['default'] || stats?.per_tenant?.['1'] : undefined);

              return (
                <div
                  key={t.id}
                  className={`p-5 rounded-2xl border transition-all relative flex flex-col justify-between gap-4 ${
                    isSelected
                      ? 'bg-gradient-to-br from-emerald-50 to-white dark:from-[#1a2e21] dark:to-[#141414] border-emerald-500 dark:border-[#1DB954] shadow-lg shadow-emerald-500/10 dark:shadow-[#1DB954]/10 ring-1 ring-emerald-500 dark:ring-[#1DB954]'
                      : 'bg-white dark:bg-[#181818] border-slate-200 dark:border-[#282828] hover:border-slate-300 dark:hover:border-[#383838] shadow-xs dark:shadow-none'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                            isSelected
                              ? 'bg-emerald-600 dark:bg-[#1DB954] text-white dark:text-black font-black'
                              : 'bg-slate-100 dark:bg-[#222222] text-slate-500 dark:text-[#888] border border-slate-200 dark:border-[#333]'
                          }`}
                        >
                          <Building2 className="w-5 h-5 stroke-[2.2]" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">{t.name}</h4>
                            {isDefaultOrg && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-[10px] font-semibold">
                                پیش‌فرض سامانه
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-[#888] font-mono mt-0.5">
                            کد شناسه: {t.slug || `org-${t.id}`}
                          </div>
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          t.status === 'active'
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {t.status === 'active' ? 'فعال' : 'تعلیق'}
                      </span>
                    </div>

                    {/* Per-organization accurate counts */}
                    {tenantMetrics && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/40 text-[11px] font-semibold text-blue-700 dark:text-blue-300">
                          <Users className="w-3 h-3" />
                          <span>{toPersianDigits(tenantMetrics.customers_count.toLocaleString('en-US'))} مشتری</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                          <Briefcase className="w-3 h-3" />
                          <span>{toPersianDigits(tenantMetrics.personnel_count.toLocaleString('en-US'))} پرسنل</span>
                        </span>
                      </div>
                    )}

                    <div className="space-y-1.5 text-xs text-slate-600 dark:text-[#A7A7A7] pt-2 border-t border-slate-200 dark:border-[#252525]">
                      {t.phone ? (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                          <span dir="ltr" className="font-mono text-[11px]">
                            {t.phone}
                          </span>
                        </div>
                      ) : null}

                      {t.address ? (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                          <span className="line-clamp-2 text-[11px]">{t.address}</span>
                        </div>
                      ) : null}

                      {t.description ? (
                        <div className="text-[11px] text-slate-500 dark:text-[#777] line-clamp-1 italic">
                          {t.description}
                        </div>
                      ) : null}
                    </div>

                    {/* Per-Tenant Feature Toggle: Unit / Itemized Sales Commission */}
                    {isAdmin && (
                      <div className="pt-2.5 border-t border-slate-200 dark:border-[#252525] flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                            <PackagePlus className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[11px] font-bold text-slate-800 dark:text-white truncate">
                              فروش تعدادی / چندآیتمی
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-[#888] truncate">
                              امکان ثبت پورسانت تعدادی جدا از فروش درصدی
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={Boolean(unitSalesEnabledMap[String(t.id)])}
                          disabled={togglingTenantId === String(t.id)}
                          onClick={() => handleToggleUnitSales(t)}
                          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer disabled:opacity-50 ${
                            unitSalesEnabledMap[String(t.id)]
                              ? 'bg-emerald-600 dark:bg-[#1DB954]'
                              : 'bg-slate-300 dark:bg-[#333333]'
                          }`}
                          title="فعال یا غیرفعال کردن فروش تعدادی برای این سازمان"
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                              unitSalesEnabledMap[String(t.id)]
                                ? '-translate-x-6'
                                : '-translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-[#252525] mt-1 gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      {isSelected ? (
                        <span className="px-3 py-1.5 rounded-xl bg-emerald-500/15 dark:bg-[#1DB954]/20 border border-emerald-500/40 dark:border-[#1DB954]/40 text-emerald-700 dark:text-[#1DB954] text-xs font-black flex items-center gap-1.5">
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
                          className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#222222] dark:hover:bg-[#2e2e2e] text-slate-800 hover:text-emerald-700 dark:text-white dark:hover:text-[#1DB954] text-xs font-bold flex items-center gap-1.5 transition-all border border-slate-200 dark:border-[#333333] cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-[#1DB954]" />
                          <span>سوییچ به این سازمان</span>
                        </button>
                      )}
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-1.5">
                        {confirmDeleteId === String(t.id) ? (
                          <div className="flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800/60 px-2 py-1 rounded-xl">
                            <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300">
                              حذف شود؟
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDelete(t)}
                              className="px-2 py-0.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold cursor-pointer"
                            >
                              بله
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-0.5 rounded-lg bg-slate-200 dark:bg-[#2a2a2a] text-slate-700 dark:text-white text-[10px] font-semibold cursor-pointer"
                            >
                              خیر
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(t)}
                              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-[#888] dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-[#202020] dark:hover:bg-[#282828] border border-slate-200 dark:border-[#2e2e2e] transition-colors cursor-pointer"
                              title="ویرایش مشخصات"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {!isDefaultOrg && (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(String(t.id))}
                                className="p-2 rounded-xl text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors cursor-pointer"
                                title="حذف سازمان"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
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
      <div className="bg-slate-50 dark:bg-[#141414] border border-slate-200 dark:border-[#242424] rounded-2xl p-4 flex items-center justify-between text-xs text-slate-600 dark:text-[#888]">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-[#1DB954] flex-shrink-0" />
          <span>
            امنیت پایگاه داده: تمامی درخواست‌ها با هدر استاندارد <code className="text-emerald-700 dark:text-[#1DB954] font-mono">x-tenant-id</code> ایزوله شده و تداخل مالکیتی بین سازمان‌ها غیرممکن است.
          </span>
        </div>
      </div>
    </div>
  );
};
