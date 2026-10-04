import React, { useState } from 'react';
import {
  Building2,
  X,
  Plus,
  Check,
  Edit2,
  Trash2,
  Phone,
  MapPin,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { Tenant } from '../types';
import { createTenant, updateTenant, deleteTenant } from '../api';

interface TenantsManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenants: Tenant[];
  activeTenantId: string;
  onSelectTenant: (tenantId: string) => void;
  onRefreshTenants: () => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  isAdmin: boolean;
}

export const TenantsManagementModal: React.FC<TenantsManagementModalProps> = ({
  isOpen,
  onClose,
  tenants,
  activeTenantId,
  onSelectTenant,
  onRefreshTenants,
  showToast,
  isAdmin,
}) => {
  const [isAdding, setIsAdding] = useState(false);
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

  if (!isOpen) return null;

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
    if (t.id === 'default') {
      showToast('سازمان مرکزی و پیش‌فرض سیستم قابل حذف نیست.', 'error');
      return;
    }
    if (!window.confirm(`آیا از حذف سازمان «${t.name}» اطمینان دارید؟`)) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-[#181818] border border-[#282828] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-[#282828] flex items-center justify-between bg-[#141414]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1DB954]/15 border border-[#1DB954]/30 flex items-center justify-center text-[#1DB954]">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>مدیریت سازمان‌ها و شعب (سیستم چندسازمانی)</span>
                <span className="px-2 py-0.5 rounded-full bg-[#1DB954]/10 text-[#1DB954] text-[10px] border border-[#1DB954]/20 font-mono">
                  Multi-Tenant
                </span>
              </h3>
              <p className="text-xs text-[#888]">
                جداسازی کامل اطلاعات مشتریان، مذاکرات، لیدها و پرسنل برای هر شرکت یا سازمان
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isAdding && isAdmin && (
              <button
                type="button"
                onClick={handleOpenAdd}
                className="px-3.5 py-2 rounded-xl bg-[#1DB954] text-black font-bold text-xs flex items-center gap-1.5 shadow-md shadow-[#1DB954]/20 hover:bg-[#1ed760] transition-colors"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>سازمان جدید</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[#888] hover:text-white hover:bg-[#282828] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Add / Edit Form */}
          {isAdding ? (
            <div className="bg-[#141414] border border-[#2c2c2c] rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#242424] pb-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#1DB954]" />
                  <span>{editingTenant ? 'ویرایش مشخصات سازمان' : 'تعریف سازمان / شرکت جدید'}</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="text-xs text-[#888] hover:text-white flex items-center gap-1"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>بازگشت به لیست</span>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                      نام سازمان / شعبه <span className="text-[#E22134]">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="مثلاً: هلدینگ بازرگانی کیان یا شعبه اصفهان"
                      required
                      className="w-full h-10 px-3 bg-[#1e1e1e] rounded-xl text-xs text-white border border-[#333] focus:border-[#1DB954] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5 flex items-center justify-between">
                      <span>شناسه یا کد لاتین یکتا (Slug)</span>
                      <span className="text-[10px] text-[#777]">جهت تفکیک فنی</span>
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      placeholder="kian-holding"
                      className="w-full h-10 px-3 bg-[#1e1e1e] rounded-xl text-xs text-white border border-[#333] focus:border-[#1DB954] focus:outline-none font-mono"
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
                      className="w-full h-10 px-3 bg-[#1e1e1e] rounded-xl text-xs text-white border border-[#333] focus:border-[#1DB954] focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                      وضعیت سازمان
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          status: e.target.value as 'active' | 'inactive',
                        })
                      }
                      className="w-full h-10 px-3 bg-[#1e1e1e] rounded-xl text-xs text-white border border-[#333] focus:border-[#1DB954] focus:outline-none cursor-pointer"
                    >
                      <option value="active">فعال</option>
                      <option value="inactive">غیرفعال (تعلیق)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                      نشانی و آدرس دفتر سازمان
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="تهران، خیابان ولیعصر..."
                      className="w-full h-10 px-3 bg-[#1e1e1e] rounded-xl text-xs text-white border border-[#333] focus:border-[#1DB954] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#242424]">
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="px-4 py-2 rounded-xl bg-[#222] hover:bg-[#282828] text-xs text-white transition-colors"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold text-xs shadow-md transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? 'در حال ثبت...' : editingTenant ? 'ذخیره تغییرات' : 'ایجاد سازمان'}
                  </button>
                </div>
              </form>
            </div>
          ) : null}

          {/* Tenants List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-[#888] px-1">
              <span>لیست سازمان‌ها ({tenants.length} سازمان ثبت‌شده)</span>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => onSelectTenant('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    activeTenantId === 'all'
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                      : 'bg-[#222] hover:bg-[#282828] text-[#B3B3B3] hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 inline ml-1.5" />
                  دید کلان: تمام سازمان‌ها
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3">
              {tenants.map((t) => {
                const isActive = activeTenantId === t.id;
                return (
                  <div
                    key={t.id}
                    className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isActive
                        ? 'bg-[#1DB954]/5 border-[#1DB954] shadow-md shadow-[#1DB954]/10 ring-1 ring-[#1DB954]'
                        : 'bg-[#141414] border-[#282828] hover:border-[#383838]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          isActive
                            ? 'bg-[#1DB954] text-black font-bold'
                            : 'bg-[#222] text-[#888] border border-[#333]'
                        }`}
                      >
                        <Building2 className="w-5 h-5" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-white">{t.name}</h4>
                          {t.id === 'default' && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px]">
                              پیش‌فرض
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] ${
                              t.status === 'active'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {t.status === 'active' ? 'فعال' : 'غیرفعال'}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-[#888] flex-wrap">
                          {t.slug && (
                            <span className="font-mono text-[11px] text-[#A7A7A7]">
                              کد: {t.slug}
                            </span>
                          )}
                          {t.phone && (
                            <span className="flex items-center gap-1 font-mono text-[11px]">
                              <Phone className="w-3 h-3 text-blue-400" />
                              {t.phone}
                            </span>
                          )}
                          {t.address && (
                            <span className="flex items-center gap-1 line-clamp-1 text-[11px]">
                              <MapPin className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                              {t.address}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {isActive ? (
                        <span className="px-3 py-1.5 rounded-xl bg-[#1DB954]/15 border border-[#1DB954]/30 text-[#1DB954] text-xs font-bold flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>سازمان فعال فعلی</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectTenant(t.id);
                            showToast(`سازمان فعال به «${t.name}» تغییر یافت.`, 'success');
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-[#242424] hover:bg-[#303030] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors border border-[#3a3a3a]"
                        >
                          <Check className="w-3.5 h-3.5 text-[#1DB954]" />
                          <span>انتخاب این سازمان</span>
                        </button>
                      )}

                      {isAdmin && (
                        <div className="flex items-center gap-1 border-r border-[#2c2c2c] pr-2 mr-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(t)}
                            className="p-1.5 rounded-lg text-[#888] hover:text-white hover:bg-[#282828] transition-colors"
                            title="ویرایش مشخصات"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {t.id !== 'default' && (
                            <button
                              type="button"
                              onClick={() => handleDelete(t)}
                              className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
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
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#282828] bg-[#141414] flex items-center justify-between text-xs text-[#888]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#1DB954]" />
            <span>ایزولاسیون کامل رکوردها با هدر استاندارد x-tenant-id</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#242424] hover:bg-[#303030] text-white transition-colors"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};
