import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  GitMerge,
  X,
  Search,
  CheckCircle2,
  User,
  AlertTriangle,
  ArrowLeft,
  Check,
  Loader2,
} from 'lucide-react';
import { Customer, Personnel, CustomerReport } from '../types';
import { toPersianDigits, formatPersianDate, matchesCustomerSearch, isPersonnelActive } from '../utils';
import { fetchCustomersPaginated, fetchCustomerById } from '../api';

interface MergeCustomersModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  reports: CustomerReport[];
  personnelList: Personnel[];
  initialSelectedCustomerIds?: string[];
  onMerge: (
    primaryCustomerId: string,
    mergedCustomerIds: string[],
    assignedMarketerId?: string,
    assignedMarketerName?: string,
    notes?: string
  ) => Promise<void>;
}

export const MergeCustomersModal: React.FC<MergeCustomersModalProps> = ({
  isOpen,
  onClose,
  customers,
  reports,
  personnelList,
  initialSelectedCustomerIds = [],
  onMerge,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedCustomerIds);
  const [primaryId, setPrimaryId] = useState<string>(initialSelectedCustomerIds[0] || '');
  const [selectedMarketerId, setSelectedMarketerId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [merging, setMerging] = useState<boolean>(false);
  const [step, setStep] = useState<'select' | 'confirm'>('select');
  const [actionError, setActionError] = useState<string | null>(null);

  // Full cache of known customers (from props, server search, and detail fetches)
  const [customerMap, setCustomerMap] = useState<Record<string, Customer>>({});
  const [serverResults, setServerResults] = useState<Customer[]>([]);
  const [serverTotal, setServerTotal] = useState<number>(0);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const fetchedDetailsRef = useRef<Set<string>>(new Set());

  // Seed customerMap whenever customers prop updates
  useEffect(() => {
    if (!customers || customers.length === 0) return;
    setCustomerMap((prev) => {
      const next = { ...prev };
      for (const c of customers) {
        if (!c?.id) continue;
        const existing = next[c.id];
        next[c.id] = existing
          ? {
              ...c,
              reports: existing.reports && existing.reports.length > 0 ? existing.reports : c.reports,
              contacts: existing.contacts && existing.contacts.length > 0 ? existing.contacts : c.contacts,
            }
          : c;
      }
      return next;
    });
  }, [customers]);

  // Reset modal state on open
  useEffect(() => {
    if (!isOpen) return;
    setStep('select');
    setSearchQuery('');
    setActionError(null);
    setSearchError(null);
    setNotes('');
    fetchedDetailsRef.current.clear();

    if (initialSelectedCustomerIds.length > 0) {
      setSelectedIds(initialSelectedCustomerIds);
      setPrimaryId(initialSelectedCustomerIds[0]);
      const primaryCust =
        customers.find((c) => c.id === initialSelectedCustomerIds[0]) ||
        customerMap[initialSelectedCustomerIds[0]];
      setSelectedMarketerId(primaryCust?.assigned_marketer_id || '');
    } else {
      setSelectedIds([]);
      setPrimaryId('');
      setSelectedMarketerId('');
    }
  }, [isOpen, initialSelectedCustomerIds]);

  // Fetch full details (reports + contacts) for any selected customer not yet loaded
  useEffect(() => {
    if (!isOpen || selectedIds.length === 0) return;
    let cancelled = false;

    const idsToFetch = selectedIds.filter((id) => !fetchedDetailsRef.current.has(id));
    if (idsToFetch.length === 0) return;

    idsToFetch.forEach((id) => fetchedDetailsRef.current.add(id));

    Promise.all(
      idsToFetch.map((id) =>
        fetchCustomerById(id).catch(() => null)
      )
    ).then((loaded) => {
      if (cancelled) return;
      const valid = loaded.filter((c): c is Customer => Boolean(c && c.id));
      if (valid.length === 0) return;
      setCustomerMap((prev) => {
        const next = { ...prev };
        for (const c of valid) {
          next[c.id] = c;
        }
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [isOpen, selectedIds]);

  // Live debounced server-side search across the entire customer database
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const trimmed = searchQuery.trim();

    setIsSearching(true);
    setSearchError(null);

    const timer = setTimeout(async () => {
      try {
        const res = await fetchCustomersPaginated({
          search: trimmed || undefined,
          page: 1,
          limit: 50,
        });
        if (cancelled) return;
        const rows = Array.isArray(res.data) ? res.data : [];
        setServerResults(rows);
        setServerTotal(res.filteredTotal ?? res.total ?? rows.length);

        if (rows.length > 0) {
          setCustomerMap((prev) => {
            const next = { ...prev };
            for (const c of rows) {
              if (!c?.id) continue;
              const existing = next[c.id];
              next[c.id] = existing
                ? {
                    ...c,
                    reports: existing.reports && existing.reports.length > 0 ? existing.reports : c.reports,
                    contacts: existing.contacts && existing.contacts.length > 0 ? existing.contacts : c.contacts,
                  }
                : c;
            }
            return next;
          });
        }
      } catch (err: any) {
        if (!cancelled) {
          setSearchError(err?.message || 'خطا در جستجوی مشتریان از سرور');
        }
      } finally {
        if (!cancelled) {
          setIsSearching(false);
        }
      }
    }, trimmed ? 250 : 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isOpen, searchQuery]);

  // Selected customer objects (resolved from full customerMap so server-searched records work)
  const selectedCustomers = useMemo(() => {
    return selectedIds
      .map((id) => customerMap[id] || customers.find((c) => c.id === id))
      .filter((c): c is Customer => Boolean(c));
  }, [selectedIds, customerMap, customers]);

  // Primary customer object
  const primaryCustomer = useMemo(() => {
    return selectedCustomers.find((c) => c.id === primaryId) || selectedCustomers[0];
  }, [selectedCustomers, primaryId]);

  // Ensure marketer defaults to primary customer's marketer
  useEffect(() => {
    if (primaryCustomer && !selectedMarketerId) {
      setSelectedMarketerId(primaryCustomer.assigned_marketer_id || '');
    }
  }, [primaryCustomer, selectedMarketerId]);

  // Combined displayed list: server results + instant local matches while typing
  const filteredCustomers = useMemo(() => {
    const trimmed = searchQuery.trim();
    const seen = new Set<string>();
    const combined: Customer[] = [];

    const addUnique = (list: Customer[]) => {
      for (const c of list) {
        if (c?.id && !seen.has(c.id)) {
          seen.add(c.id);
          combined.push(c);
        }
      }
    };

    if (!trimmed) {
      addUnique(serverResults);
      addUnique(customers);
      return combined.slice(0, 100);
    }

    // Server results match the query authoritatively
    addUnique(serverResults);

    // Also include local matches from already-loaded customers using Persian/phone-normalized matching
    const allKnown = Object.values(customerMap);
    const localMatches = allKnown.filter((c) => matchesCustomerSearch(c, trimmed));
    addUnique(localMatches);

    return combined;
  }, [serverResults, customers, customerMap, searchQuery]);

  const toggleSelectCustomer = (cust: Customer) => {
    setActionError(null);
    const id = cust.id;
    setCustomerMap((prev) => ({
      ...prev,
      [id]: prev[id] || cust,
    }));

    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((item) => item !== id);
        if (primaryId === id) {
          setPrimaryId(next[0] || '');
        }
        return next;
      } else {
        const next = [...prev, id];
        if (!primaryId) setPrimaryId(id);
        return next;
      }
    });
  };

  const getCustomerReports = (cust: Customer): CustomerReport[] => {
    const seen = new Set<string>();
    const list: CustomerReport[] = [];
    const addRep = (r: CustomerReport) => {
      if (!r) return;
      const key = String(r.id || `${r.customer_id}-${r.date_created}-${r.report_text?.slice(0, 20)}`);
      if (!seen.has(key)) {
        seen.add(key);
        list.push(r);
      }
    };
    if (Array.isArray(cust.reports)) {
      cust.reports.forEach(addRep);
    }
    reports
      .filter((r) => String(r.customer_id) === String(cust.id))
      .forEach(addRep);
    return list;
  };

  // Preview combined metrics
  const combinedStats = useMemo(() => {
    const allMobiles = new Set<string>();
    const allLandlines = new Set<string>();
    const allReports: { report: CustomerReport; customerName: string; marketerName: string }[] = [];

    selectedCustomers.forEach((cust) => {
      (cust.mobile_numbers || []).forEach((m) => m && allMobiles.add(m));
      (cust.manager_phones || []).forEach((m) => m && allMobiles.add(m));
      (cust.negotiator_phones || []).forEach((m) => m && allMobiles.add(m));
      if (cust.telegram_phone) allMobiles.add(cust.telegram_phone);
      (cust.landline_numbers || []).forEach((l) => l && allLandlines.add(l));
      (cust.contacts || []).forEach((ct) => {
        if (!ct?.value) return;
        if (ct.channel_type === 'landline') allLandlines.add(ct.value);
        else if (['mobile', 'whatsapp', 'telegram'].includes(ct.channel_type)) allMobiles.add(ct.value);
      });

      const custReports = getCustomerReports(cust);
      custReports.forEach((r) => {
        allReports.push({
          report: r,
          customerName: cust.company_name,
          marketerName: r.negotiator_name,
        });
      });
    });

    return {
      mobileCount: allMobiles.size,
      landlineCount: allLandlines.size,
      reportsCount: allReports.length,
      reportsList: allReports,
    };
  }, [selectedCustomers, reports]);

  const handleExecuteMerge = async () => {
    setActionError(null);
    if (selectedCustomers.length < 2) {
      setActionError('حداقل ۲ پرونده مشتری باید برای ادغام انتخاب شوند.');
      return;
    }
    if (!primaryCustomer) {
      setActionError('لطفاً پرونده مشتری اصلی (مقصد) را مشخص کنید.');
      return;
    }

    const mergedIds = selectedCustomers
      .map((c) => c.id)
      .filter((id) => id !== primaryCustomer.id);

    const chosenMarketer = personnelList.find((p) => p.id === selectedMarketerId);

    setMerging(true);
    try {
      await onMerge(
        primaryCustomer.id,
        mergedIds,
        chosenMarketer?.id,
        chosenMarketer?.name,
        notes
      );
      onClose();
    } catch (err: any) {
      setActionError('خطا در ادغام پرونده‌ها: ' + (err?.message || 'خطای نامشخص'));
    } finally {
      setMerging(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
      <div
        className="bg-white dark:bg-[#181818] border border-slate-200 dark:border-[#282828] w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden my-4 flex flex-col max-h-[90vh] text-slate-900 dark:text-white"
        dir="rtl"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-[#121212] border-b border-slate-200 dark:border-[#282828] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-[#1DB954]/15 text-emerald-700 dark:text-[#1DB954] flex items-center justify-center shrink-0">
              <GitMerge className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>ادغام پرونده‌های مشتریان تکراری</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-[#1DB954]/20 dark:text-[#1DB954] font-bold">
                  ویژه مدیر
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#A7A7A7] mt-0.5">
                تجمیع شماره‌ها، انتقال تاریخچه مذاکرات و تعیین بازاریاب نهایی پرونده
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {step === 'select' ? (
              <button
                type="button"
                disabled={selectedCustomers.length < 2 || !primaryCustomer}
                onClick={() => {
                  setActionError(null);
                  setStep('confirm');
                }}
                className="h-9 px-4 rounded-full bg-[#1DB954] hover:bg-[#1ED760] disabled:opacity-50 disabled:pointer-events-none text-black font-bold text-xs transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <span>مرحله بعد: پیش‌نمایش و تأیید</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                disabled={merging}
                onClick={handleExecuteMerge}
                className="h-9 px-4 rounded-full bg-[#1DB954] hover:bg-[#1ED760] text-black font-bold text-xs transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <GitMerge className="w-3.5 h-3.5 stroke-[3]" />
                <span>{merging ? 'در حال ادغام پرونده‌ها...' : 'تأیید و ادغام نهایی'}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 dark:bg-[#242424] dark:hover:bg-[#333] dark:text-[#A7A7A7] dark:hover:text-white transition-colors flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Inline Error Alert */}
        {actionError && (
          <div className="mx-4 sm:mx-6 mt-4 p-3 rounded-2xl bg-rose-50 dark:bg-[#E22134]/15 border border-rose-200 dark:border-[#E22134]/40 text-xs text-rose-700 dark:text-rose-300 font-semibold flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{actionError}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="p-1 rounded-full hover:bg-rose-200/50 dark:hover:bg-rose-900/40 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {step === 'select' ? (
          <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
            {/* Explanatory banner */}
            <div className="p-3 bg-emerald-50 dark:bg-[#1DB954]/10 border border-emerald-200 dark:border-[#1DB954]/20 rounded-2xl flex items-start gap-2.5 text-xs text-slate-700 dark:text-[#d0d0d0] leading-relaxed">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-[#1DB954] shrink-0 mt-0.5" />
              <span>
                مشتریانی که دارای شماره‌های مختلف بوده و توسط بازاریاب‌های جداگانه پیگیری شده‌اند را انتخاب کنید. با ادغام، تمام شماره‌ها و گزارش‌های هر دو بازاریاب در پرونده اصلی تجمیع شده و بازاریاب منتخب به کل سوابق دسترسی خواهد داشت.
              </span>
            </div>

            {/* Selected Customers list */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                <span>مشتریان انتخاب‌شده جهت ادغام ({toPersianDigits(selectedCustomers.length)} پرونده):</span>
                {selectedCustomers.length > 0 && (
                  <span className="text-[11px] text-slate-500 dark:text-[#A7A7A7]">
                    روی دایره کلیک کنید تا به عنوان پرونده اصلی تعیین شود
                  </span>
                )}
              </div>

              {selectedCustomers.length === 0 ? (
                <div className="p-6 text-center rounded-2xl bg-slate-50 dark:bg-[#121212] border border-dashed border-slate-300 dark:border-[#333] text-xs text-slate-500 dark:text-[#777]">
                  هنوز مشتری‌ای انتخاب نشده است. از لیست زیر حداقل ۲ مشتری را تیک بزنید.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {selectedCustomers.map((cust) => {
                    const isPrimary = primaryId === cust.id;
                    const custReportsCount = getCustomerReports(cust).length;

                    return (
                      <div
                        key={cust.id}
                        className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                          isPrimary
                            ? 'bg-emerald-50 dark:bg-[#1DB954]/10 border-emerald-500 dark:border-[#1DB954] shadow-md shadow-emerald-500/10'
                            : 'bg-slate-50 dark:bg-[#1e1e1e] border-slate-200 dark:border-[#333] hover:border-slate-300 dark:hover:border-[#444]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            type="button"
                            onClick={() => setPrimaryId(cust.id)}
                            className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                              isPrimary
                                ? 'bg-[#1DB954] border-[#1DB954] text-black'
                                : 'border-slate-400 dark:border-[#666] hover:border-slate-800 dark:hover:border-white'
                            }`}
                            title="انتخاب به عنوان پرونده اصلی"
                          >
                            {isPrimary && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </button>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                {cust.company_name}
                              </span>
                              {isPrimary && (
                                <span className="text-[10px] px-2 py-0.2 rounded-full bg-[#1DB954] text-black font-bold shrink-0">
                                  پرونده اصلی (مقصد)
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-[#A7A7A7] mt-0.5 flex items-center gap-3">
                              <span className="flex items-center gap-1 text-emerald-600 dark:text-[#1DB954]">
                                <User className="w-3 h-3" />
                                <span>{cust.assigned_marketer_name || 'بدون بازاریاب'}</span>
                              </span>
                              <span>· {toPersianDigits(custReportsCount)} گزارش</span>
                              {cust.city && <span>· {cust.city}</span>}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleSelectCustomer(cust)}
                          className="w-7 h-7 rounded-full bg-slate-200 hover:bg-red-100 hover:text-red-600 dark:bg-[#282828] dark:hover:bg-[#E22134]/20 dark:hover:text-[#E22134] text-slate-500 dark:text-[#888] flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                          title="حذف از لیست ادغام"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Search & Add more customers */}
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-[#282828]">
              <div className="flex items-center justify-between gap-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#B3B3B3]">
                  جستجو و انتخاب پرونده‌های مشتریان دیگر برای ادغام:
                </label>
                {searchQuery.trim() && !isSearching && (
                  <span className="text-[10px] text-slate-500 dark:text-[#888] font-mono">
                    {toPersianDigits(filteredCustomers.length)} نتیجه
                    {serverTotal > filteredCustomers.length
                      ? ` از ${toPersianDigits(serverTotal)}`
                      : ''}
                  </span>
                )}
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="جستجوی نام شرکت، نام مدیر، نام بازاریاب یا شماره تماس در کل سامانه..."
                  className="w-full h-10 bg-white dark:bg-[#121212] rounded-xl pl-9 pr-9 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#777] border border-slate-300 dark:border-[#2a2a2a] focus:outline-none focus:border-emerald-500 dark:focus:border-[#1DB954]"
                />
                {isSearching ? (
                  <Loader2 className="w-4 h-4 text-emerald-600 dark:text-[#1DB954] absolute right-3 top-1/2 -translate-y-1/2 animate-spin pointer-events-none" />
                ) : (
                  <Search className="w-4 h-4 text-slate-400 dark:text-[#777] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                )}
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#282828] cursor-pointer"
                    title="پاک کردن جستجو"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {searchError && (
                <div className="text-[11px] text-rose-600 dark:text-rose-400 px-1">
                  {searchError}
                </div>
              )}

              {/* Customer Selector Cards */}
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {filteredCustomers.length === 0 ? (
                  <div className="p-5 text-center rounded-xl bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-[#282828] text-xs text-slate-500 dark:text-[#888]">
                    {isSearching
                      ? 'در حال جستجو در کل پرونده‌های مشتریان...'
                      : 'مشتری‌ای با این مشخصات یافت نشد.'}
                  </div>
                ) : (
                  filteredCustomers.map((c) => {
                    const isChecked = selectedIds.includes(c.id);
                    const phone =
                      c.manager_phones?.[0] ||
                      c.mobile_numbers?.[0] ||
                      c.negotiator_phones?.[0] ||
                      c.landline_numbers?.[0] ||
                      c.contacts?.[0]?.value ||
                      '-';

                    return (
                      <div
                        key={c.id}
                        onClick={() => toggleSelectCustomer(c)}
                        className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 cursor-pointer select-none ${
                          isChecked
                            ? 'bg-emerald-50 dark:bg-[#1a2e1e] border-emerald-300 dark:border-[#1DB954]/50'
                            : 'bg-white dark:bg-[#181818] border-slate-200 dark:border-[#282828] hover:bg-slate-50 dark:hover:bg-[#202020]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="w-4 h-4 rounded accent-emerald-600 dark:accent-[#1DB954] cursor-pointer shrink-0"
                          />
                          <div className="min-w-0">
                            <span className="font-bold text-xs text-slate-900 dark:text-white truncate block">
                              {c.company_name}
                              {c.manager_name ? (
                                <span className="font-normal text-slate-500 dark:text-[#999]">
                                  {' '}
                                  ({c.manager_name})
                                </span>
                              ) : null}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-[#888]">
                              بازاریاب: {c.assigned_marketer_name || 'نامشخص'} ·{' '}
                              <span dir="ltr" className="font-mono">
                                {phone}
                              </span>
                            </span>
                          </div>
                        </div>

                        {c.city && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-[#242424] text-slate-600 dark:text-[#aaa] shrink-0 font-mono">
                            {c.city}
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Target Marketer Assignment */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-[#282828] space-y-3">
              <label className="block text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <User className="w-4 h-4 text-emerald-600 dark:text-[#1DB954]" />
                <span>تعیین بازاریاب مالک پرونده پس از ادغام:</span>
              </label>
              <select
                value={selectedMarketerId}
                onChange={(e) => setSelectedMarketerId(e.target.value)}
                className="w-full h-10 px-3 bg-white dark:bg-[#242424] rounded-xl text-xs text-slate-900 dark:text-white border border-slate-300 dark:border-[#383838] focus:outline-none focus:border-emerald-500 dark:focus:border-[#1DB954]"
              >
                {personnelList.filter((p) => isPersonnelActive(p)).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.role === 'admin' ? 'مدیر' : 'کارشناس بازاریابی'})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 dark:text-[#888]">
                بازاریاب انتخاب‌شده به عنوان مالک نهایی تعیین شده و تمام سوابق و شماره‌های هر دو پرونده برای وی در دسترس خواهد بود.
              </p>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#B3B3B3] mb-1">
                توضیحات و علت ادغام (اختیاری):
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="مثلاً: هر دو شماره متعلق به کارخانه سپهر بوده و ادغام شد..."
                className="w-full h-9 px-3 bg-white dark:bg-[#121212] rounded-xl text-xs text-slate-900 dark:text-white border border-slate-300 dark:border-[#282828] focus:outline-none focus:border-emerald-500 dark:focus:border-[#1DB954]"
              />
            </div>
          </div>
        ) : (
          /* Confirmation Step */
          <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-[#F59B23]/10 border border-amber-300 dark:border-[#F59B23]/30 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-[#F59B23] shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <h4 className="font-bold text-slate-900 dark:text-white">تأیید نهایی ادغام پرونده‌ها</h4>
                <p className="text-slate-700 dark:text-[#d0d0d0] leading-relaxed">
                  با تأیید ادغام، پرونده‌های فرعی حذف شده و اطلاعات به صورت یکپارچه در پرونده اصلی تجمیع می‌گردد.
                </p>
              </div>
            </div>

            {/* Summary preview */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-[#282828] space-y-3">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200 dark:border-[#222]">
                <span className="text-slate-500 dark:text-[#A7A7A7]">پرونده اصلی نهایی:</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">{primaryCustomer?.company_name}</span>
              </div>
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200 dark:border-[#222]">
                <span className="text-slate-500 dark:text-[#A7A7A7]">بازاریاب مسئول جدید:</span>
                <span className="font-bold text-emerald-600 dark:text-[#1DB954]">
                  {personnelList.find((p) => p.id === selectedMarketerId)?.name || primaryCustomer?.assigned_marketer_name}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200 dark:border-[#222]">
                <span className="text-slate-500 dark:text-[#A7A7A7]">تعداد کل شماره‌های تجمیع‌شده:</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">
                  {toPersianDigits(combinedStats.mobileCount)} همراه · {toPersianDigits(combinedStats.landlineCount)} ثابت
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-[#A7A7A7]">تعداد کل گزارش‌های منتقل‌شده:</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">
                  {toPersianDigits(combinedStats.reportsCount)} گزارش مذاکره
                </span>
              </div>
            </div>

            {/* Transferred reports list preview */}
            {combinedStats.reportsList.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white">پیش‌نمایش گزارش‌های منتقل‌شده:</span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {combinedStats.reportsList.map((item, idx) => (
                    <div
                      key={item.report.id || idx}
                      className="p-2.5 rounded-xl bg-white dark:bg-[#1c1c1c] border border-slate-200 dark:border-[#2c2c2c] text-xs flex items-center justify-between gap-2 shadow-sm"
                    >
                      <div className="min-w-0">
                        <span className="font-semibold text-slate-900 dark:text-white block truncate">
                          {(item.report.report_text || '').slice(0, 70)}
                          {(item.report.report_text || '').length > 70 ? '...' : ''}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-[#888]">
                          ثبت‌شده توسط: <strong className="text-emerald-600 dark:text-[#1DB954]">{item.marketerName}</strong> ({item.customerName})
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-[#777] font-mono shrink-0">
                        {formatPersianDate(item.report.date_created)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 dark:bg-[#121212] border-t border-slate-200 dark:border-[#282828] flex items-center justify-between gap-3">
          {step === 'select' ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="h-10 px-5 rounded-full border border-slate-300 hover:border-slate-400 dark:border-[#444] text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-[#A7A7A7] dark:hover:text-white transition-colors cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                disabled={selectedCustomers.length < 2 || !primaryCustomer}
                onClick={() => {
                  setActionError(null);
                  setStep('confirm');
                }}
                className="h-10 px-6 rounded-full bg-[#1DB954] hover:bg-[#1ED760] disabled:opacity-50 disabled:pointer-events-none text-black font-bold text-xs transition-all flex items-center gap-1.5 shadow-md shadow-[#1DB954]/20 cursor-pointer"
              >
                <span>مرحله بعد: پیش‌نمایش و تأیید</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setActionError(null);
                  setStep('select');
                }}
                className="h-10 px-5 rounded-full border border-slate-300 hover:border-slate-400 dark:border-[#444] text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-[#A7A7A7] dark:hover:text-white transition-colors cursor-pointer"
              >
                بازگشت به انتخاب
              </button>
              <button
                type="button"
                disabled={merging}
                onClick={handleExecuteMerge}
                className="h-10 px-7 rounded-full bg-[#1DB954] hover:bg-[#1ED760] text-black font-bold text-xs transition-all hover:scale-105 shadow-md shadow-[#1DB954]/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <GitMerge className="w-4 h-4 stroke-[3]" />
                <span>{merging ? 'در حال ادغام پرونده‌ها...' : 'تأیید و ادغام نهایی'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

