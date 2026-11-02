import React, { useState, useMemo } from 'react';
import {
  X,
  Sparkles,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Loader2,
  ShieldCheck,
  Search,
  ArrowRight,
  Database,
  FileCheck,
  Check,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { repairNegotiators } from '../api';
import { toPersianDigits, fixMojibake, formatDisplayDate } from '../utils';

interface RepairNegotiatorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const RepairNegotiatorsModal: React.FC<RepairNegotiatorsModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [pasteText, setPasteText] = useState<string>('');
  const [inputMode, setInputMode] = useState<'file' | 'paste'>('file');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [previewSearch, setPreviewSearch] = useState<string>('');

  // Analysis / Dry Run Result
  const [dryRunResult, setDryRunResult] = useState<{
    total_input_rows: number;
    matched_count: number;
    needs_update_count: number;
    already_matching_count: number;
    unmatched_count: number;
    preview_updates: Array<{
      id: string;
      phone: string;
      insertDate: string;
      current_negotiator: string;
      new_negotiator: string;
    }>;
    unmatched_samples: any[];
  } | null>(null);

  const [executeResult, setExecuteResult] = useState<{
    total_updated: number;
    message: string;
  } | null>(null);

  // Process File Upload with UTF-8 array buffer & plain text preservation
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);
    setDryRunResult(null);
    setExecuteResult(null);

    const fileName = selectedFile.name.toLowerCase();
    const isPlainText = fileName.endsWith('.csv') || fileName.endsWith('.tsv') || fileName.endsWith('.txt');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        let json: any[] = [];
        if (isPlainText) {
          const text = evt.target?.result as string;
          const workbook = XLSX.read(text, { type: 'string', codepage: 65001 });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        } else {
          const buffer = evt.target?.result as ArrayBuffer;
          const data = new Uint8Array(buffer);
          const workbook = XLSX.read(data, { type: 'array', codepage: 65001 });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        }

        if (!Array.isArray(json) || json.length === 0) {
          setError('فایل انتخابی فاقد ردیف‌های معتبر است یا خالی می‌باشد.');
          return;
        }

        // Clean keys, trim string values, and auto-repair any Mojibake
        const cleanedRows = (json as any[]).map((row) => {
          const clean: Record<string, any> = {};
          for (const [k, v] of Object.entries(row)) {
            const cleanKey = fixMojibake(k.trim());
            const cleanVal = typeof v === 'string' ? fixMojibake(v.trim()) : v;
            clean[cleanKey] = cleanVal;
          }
          return clean;
        });

        setParsedRows(cleanedRows);
      } catch (err: any) {
        setError(`خطا در خواندن فایل اکسل/CSV: ${err.message}`);
      }
    };

    if (isPlainText) {
      reader.readAsText(selectedFile, 'utf-8');
    } else {
      reader.readAsArrayBuffer(selectedFile);
    }
  };

  // Process Pasted Text (Smart TSV/CSV/JSON Parser with Mojibake repair)
  const handleParsePasteText = () => {
    if (!pasteText.trim()) {
      setError('لطفا ابتدا متن گزارش‌ها را در کادر وارد کنید.');
      return;
    }
    setError(null);
    setDryRunResult(null);
    setExecuteResult(null);

    try {
      const trimmed = pasteText.trim();
      // 1. JSON Array
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleaned = parsed.map((row: any) => {
            const clean: Record<string, any> = {};
            for (const [k, v] of Object.entries(row)) {
              clean[fixMojibake(k.trim())] = typeof v === 'string' ? fixMojibake(v.trim()) : v;
            }
            return clean;
          });
          setParsedRows(cleaned);
          return;
        }
      }

      // 2. Parse TSV or CSV
      const lines = trimmed.split(/\r?\n/).filter(l => l.trim().length > 0);
      if (lines.length < 2) {
        setError('فرمت متن نامعتبر است. حداقل ردیف عناوین و یک ردیف داده لازم است.');
        return;
      }

      const delimiter = lines[0].includes('\t') ? '\t' : ',';
      const headers = lines[0].split(delimiter).map((h) => fixMojibake(h.trim().replace(/^["']|["']$/g, '')));
      const rows: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const values = line.split(delimiter).map((v) => v.trim().replace(/^["']|["']$/g, ''));
        const obj: Record<string, any> = {};
        headers.forEach((h, idx) => {
          const rawVal = values[idx] !== undefined ? values[idx] : '';
          obj[h] = typeof rawVal === 'string' ? fixMojibake(rawVal) : rawVal;
        });
        rows.push(obj);
      }

      if (rows.length === 0) {
        setError('هیچ ردیف معتبری یافت نشد.');
        return;
      }

      setParsedRows(rows);
    } catch (err: any) {
      setError(`خطا در تجزیه متن: ${err.message}`);
    }
  };

  // Run Dry-Run Analysis
  const handleRunDryRun = async () => {
    if (parsedRows.length === 0) {
      setError('لطفا ابتدا فایل اکسل/CSV را بارگذاری کنید.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await repairNegotiators({
        dry_run: true,
        items: parsedRows,
      });

      setDryRunResult(res);
    } catch (err: any) {
      setError(err.message || 'خطا در ارزیابی فایل و تطبیق با پایگاه داده');
    } finally {
      setIsLoading(false);
    }
  };

  // Execute Actual Patching
  const handleExecutePatch = async () => {
    if (parsedRows.length === 0 || !dryRunResult) return;

    setIsExecuting(true);
    setError(null);

    try {
      const res = await repairNegotiators({
        dry_run: false,
        items: parsedRows,
      });

      setExecuteResult({
        total_updated: res.total_updated || dryRunResult.needs_update_count,
        message: res.message || 'نام مذاکره‌کنندگان با موفقیت در دیتابیس به روزرسانی شد.',
      });

      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'خطا در اعمال اصلاحات در دیتابیس');
    } finally {
      setIsExecuting(false);
    }
  };

  // Detect Column Names in First Row
  const detectedColumns = useMemo(() => {
    if (parsedRows.length === 0) return null;
    const first = parsedRows[0];
    const keys = Object.keys(first);

    const findKey = (aliases: string[]) =>
      keys.find((k) => aliases.some((a) => a.toLowerCase() === k.trim().toLowerCase())) || null;

    return {
      phone: findKey(['callNum', 'call_num', 'phone', 'mobile', 'negotiation_phone', 'شماره تماس', 'تلفن', 'موبایل']),
      negotiator: findKey(['negotiator', 'negotiator_name', 'user', 'مذاکره‌کننده', 'مذاکره کننده', 'کارشناس']),
      date: findKey(['insertDate', 'insert_date', 'date_created', 'dateTime', 'updateDate', 'تاریخ']),
      report: findKey(['report', 'report_text', 'گزارش', 'متن گزارش']),
    };
  }, [parsedRows]);

  // Filter Preview Updates by Search
  const filteredPreviewUpdates = useMemo(() => {
    if (!dryRunResult?.preview_updates) return [];
    if (!previewSearch.trim()) return dryRunResult.preview_updates;
    const q = previewSearch.toLowerCase().trim();
    return dryRunResult.preview_updates.filter(
      (item) =>
        item.phone.toLowerCase().includes(q) ||
        item.current_negotiator.toLowerCase().includes(q) ||
        item.new_negotiator.toLowerCase().includes(q) ||
        String(item.insertDate).toLowerCase().includes(q) ||
        formatDisplayDate(item.insertDate).toLowerCase().includes(q)
    );
  }, [dryRunResult, previewSearch]);


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-[#181818] rounded-3xl border border-slate-200 dark:border-[#282828] shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-slate-50 dark:bg-[#202020] border-b border-slate-200 dark:border-[#2c2c2c] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center flex-shrink-0 border border-amber-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>ابزار ترمیم و اصلاح نام مذاکره‌کنندگان (۲۵,۰۰۰ گزارش)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-[#1DB954]/15 dark:text-[#1DB954] font-mono font-bold border border-emerald-200 dark:border-transparent">
                  Patch Tool
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#A7A7A7] mt-0.5">
                اصلاح امن فیلد `negotiator_name` بر اساس فایل خروجی بدون دست‌کاری در گزارش‌ها و مشتریان جدید پروداکشن
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 dark:bg-[#2e2e2e] dark:hover:bg-[#3e3e3e] text-slate-600 dark:text-[#A7A7A7] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {executeResult ? (
            /* Success State */
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-[#1DB954] flex items-center justify-center mx-auto border border-[#1DB954]/30">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h4 className="text-xl font-black text-slate-900 dark:text-white">
                عملیات با موفقیت انجام شد!
              </h4>
              <p className="text-sm text-slate-600 dark:text-[#B3B3B3] max-w-md mx-auto">
                {executeResult.message}
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#282828] text-xs font-mono font-bold text-emerald-600 dark:text-[#1DB954]">
                <span>تعداد گزارشات اصلاح‌شده: {toPersianDigits(executeResult.total_updated)}</span>
              </div>
              <div className="pt-4">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-full bg-[#1DB954] hover:bg-[#1ED760] text-black font-bold text-xs cursor-pointer shadow-md"
                >
                  بستن و مشاهده تغییرات
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Step 1: Input selection */}
              {!dryRunResult && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-[#ccc]">
                      گام ۱: بارگذاری یا وارد کردن فایل خروجی ۲۵ هزار گزارش
                    </span>
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#222] p-1 rounded-xl border border-slate-200 dark:border-[#333]">
                      <button
                        type="button"
                        onClick={() => setInputMode('file')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          inputMode === 'file'
                            ? 'bg-emerald-500 dark:bg-[#1DB954] text-white dark:text-black shadow-xs'
                            : 'text-slate-500 dark:text-[#888]'
                        }`}
                      >
                        فایل اکسل / CSV
                      </button>
                      <button
                        type="button"
                        onClick={() => setInputMode('paste')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          inputMode === 'paste'
                            ? 'bg-emerald-500 dark:bg-[#1DB954] text-white dark:text-black shadow-xs'
                            : 'text-slate-500 dark:text-[#888]'
                        }`}
                      >
                        چسباندن متن (Paste)
                      </button>
                    </div>
                  </div>

                  {inputMode === 'file' ? (
                    <div className="border-2 border-dashed border-slate-200 dark:border-[#333] hover:border-emerald-500 dark:hover:border-[#1DB954] rounded-2xl p-6 text-center transition-all bg-slate-50/50 dark:bg-[#202020]/50">
                      <input
                        type="file"
                        accept=".xlsx, .xls, .csv, .tsv"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="excel-file-input"
                      />
                      <label
                        htmlFor="excel-file-input"
                        className="cursor-pointer flex flex-col items-center justify-center gap-3"
                      >
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-[#1DB954] flex items-center justify-center">
                          <FileSpreadsheet className="w-6 h-6" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-800 dark:text-white block">
                            {file ? file.name : 'انتخاب یا رها کردن فایل اکسل (xlsx, csv)'}
                          </span>
                          <span className="text-[11px] text-slate-400 dark:text-[#888] mt-1 block">
                            پشتیبانی کامل از فایل‌های ۲۵ هزار ردیفی (پردازش با سرعت بالا)
                          </span>
                        </div>
                      </label>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <textarea
                        value={pasteText}
                        onChange={(e) => setPasteText(e.target.value)}
                        placeholder="جدول داده‌ها یا JSON گزارشات را اینجا کپی و پیست کنید..."
                        rows={6}
                        className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-[#222] text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#666] border border-slate-200 dark:border-[#333] focus:outline-none focus:border-emerald-500 dark:focus:border-[#1DB954] font-mono"
                      />
                      <button
                        onClick={handleParsePasteText}
                        className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-[#2c2c2c] dark:hover:bg-[#3c3c3c] text-xs font-bold text-slate-800 dark:text-white cursor-pointer"
                      >
                        تجزیه متن وارد شده
                      </button>
                    </div>
                  )}

                  {/* Detected Columns & Ready to Analyze */}
                  {parsedRows.length > 0 && (
                    <div className="space-y-3">
                      {detectedColumns && (
                        <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-[#222] border border-slate-200 dark:border-[#333] text-xs">
                          <span className="font-bold text-slate-800 dark:text-white block mb-2">
                            ستون‌های شناسایی‌شده در فایل:
                          </span>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                            <div className="flex items-center gap-1.5 text-slate-600 dark:text-[#AAA]">
                              <span className="font-bold">شماره تماس:</span>
                              <span className="font-mono text-emerald-600 dark:text-[#1DB954] bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                {detectedColumns.phone || 'نامشخص'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-600 dark:text-[#AAA]">
                              <span className="font-bold">مذاکره‌کننده:</span>
                              <span className="font-mono text-emerald-600 dark:text-[#1DB954] bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                {detectedColumns.negotiator || 'نامشخص'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-600 dark:text-[#AAA]">
                              <span className="font-bold">تاریخ ثبت:</span>
                              <span className="font-mono text-emerald-600 dark:text-[#1DB954] bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                {detectedColumns.date || 'نامشخص'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-600 dark:text-[#AAA]">
                              <span className="font-bold">متن گزارش:</span>
                              <span className="font-mono text-emerald-600 dark:text-[#1DB954] bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                {detectedColumns.report || 'نامشخص'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-[#1DB954]/10 border border-emerald-200 dark:border-[#1DB954]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <FileCheck className="w-4 h-4 text-emerald-600 dark:text-[#1DB954]" />
                          <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                            تعداد ردیف‌های شناخته‌شده در فایل: {toPersianDigits(parsedRows.length)} ردیف
                          </span>
                        </div>

                        <button
                          onClick={handleRunDryRun}
                          disabled={isLoading}
                          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#1DB954] hover:bg-[#1ED760] text-black font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#1DB954]/20 disabled:opacity-50"
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>در حال تطبیق هوشمند با دیتابیس...</span>
                            </>
                          ) : (
                            <>
                              <Search className="w-4 h-4" />
                              <span>شروع بررسی و پیش‌نمایش تغییرات (Dry-Run)</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Dry Run Results & Preview Table */}
              {dryRunResult && (
                <div className="space-y-6">
                  {/* Stats Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-[#222] border border-slate-200 dark:border-[#333]">
                      <span className="text-[11px] text-slate-500 dark:text-[#888] block font-medium">
                        کل ردیف‌های فایل
                      </span>
                      <span className="text-lg font-black text-slate-900 dark:text-white font-mono mt-1 block">
                        {toPersianDigits(dryRunResult.total_input_rows)}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-[#1DB954]/10 border border-emerald-200 dark:border-[#1DB954]/30">
                      <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block font-medium">
                        منطبق با دیتابیس
                      </span>
                      <span className="text-lg font-black text-emerald-600 dark:text-[#1DB954] font-mono mt-1 block">
                        {toPersianDigits(dryRunResult.matched_count)}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50">
                      <span className="text-[11px] text-amber-700 dark:text-amber-400 block font-medium">
                        نیازمند اصلاح نام ✏️
                      </span>
                      <span className="text-lg font-black text-amber-600 dark:text-amber-400 font-mono mt-1 block">
                        {toPersianDigits(dryRunResult.needs_update_count)}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50">
                      <span className="text-[11px] text-rose-700 dark:text-rose-400 block font-medium">
                        بدون مطابقت
                      </span>
                      <span className="text-lg font-black text-rose-600 dark:text-rose-400 font-mono mt-1 block">
                        {toPersianDigits(dryRunResult.unmatched_count)}
                      </span>
                    </div>
                  </div>

                  {/* Safety Guarantee Notice */}
                  <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-[#202020] border border-slate-200 dark:border-[#2e2e2e] flex items-center gap-3 text-xs text-slate-700 dark:text-[#ccc]">
                    <ShieldCheck className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <span>
                      <strong>تضمین عدم آسیب به داده‌های جدید:</strong> اجرای این عملیات فقط و فقط فیلد نام مذاکره‌کننده (`negotiator_name`) را برای {toPersianDigits(dryRunResult.needs_update_count)} گزارش شناسا‌یی‌شده به‌روز می‌کند و تمام گزارش‌ها و مشتریان جدید ثبت‌شده در پروداکشن کاملا دست‌نخورده می‌مانند.
                    </span>
                  </div>

                  {/* Sample Preview Table with Search */}
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <h5 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <span>نمونه تغییرات پیشنهادی (نمایش ۱۰۰ مورد از اصلاحات):</span>
                        <span className="text-[11px] font-mono text-slate-400 dark:text-[#777]">
                          تغییر نام اشتباه ➔ نام واقعی
                        </span>
                      </h5>

                      <div className="relative w-full sm:w-64">
                        <Search className="w-3.5 h-3.5 text-slate-400 dark:text-[#777] absolute right-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={previewSearch}
                          onChange={(e) => setPreviewSearch(e.target.value)}
                          placeholder="جستجو در پیش‌نمایش (شماره، نام)..."
                          className="w-full pr-8 pl-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#222] text-xs text-slate-800 dark:text-white border border-slate-200 dark:border-[#333] focus:outline-none focus:border-emerald-500 dark:focus:border-[#1DB954]"
                        />
                      </div>
                    </div>

                    <div className="border border-slate-200 dark:border-[#2c2c2c] rounded-2xl overflow-hidden max-h-60 overflow-y-auto text-xs">
                      <table className="w-full text-right border-collapse">
                        <thead className="bg-slate-100 dark:bg-[#222] text-slate-600 dark:text-[#999] sticky top-0 font-bold">
                          <tr>
                            <th className="p-2.5">#</th>
                            <th className="p-2.5">شماره تماس</th>
                            <th className="p-2.5">تاریخ ثبت</th>
                            <th className="p-2.5 text-rose-600 dark:text-rose-400">نام فعلی در دیتابیس</th>
                            <th className="p-2.5 text-emerald-600 dark:text-[#1DB954]">نام واقعی (جدید)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-[#282828] text-slate-800 dark:text-[#ddd]">
                          {filteredPreviewUpdates.length > 0 ? (
                            filteredPreviewUpdates.map((item, idx) => (
                              <tr key={item.id || idx} className="hover:bg-slate-50 dark:hover:bg-[#202020]">
                                <td className="p-2.5 font-mono text-slate-400 dark:text-[#666]">{idx + 1}</td>
                                <td className="p-2.5 font-mono dir-ltr text-right">{item.phone}</td>
                                <td className="p-2.5 font-mono text-[11px] font-bold text-slate-700 dark:text-[#ccc]">
                                  {formatDisplayDate(item.insertDate)}
                                </td>
                                <td className="p-2.5 font-bold text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/20">
                                  {fixMojibake(item.current_negotiator)}
                                </td>
                                <td className="p-2.5 font-bold text-emerald-600 dark:text-[#1DB954] bg-emerald-50/50 dark:bg-[#1DB954]/10">
                                  {fixMojibake(item.new_negotiator)}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={5} className="p-4 text-center text-slate-400 dark:text-[#777]">
                                موردی یافت نشد.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-[#2c2c2c]">
                    <button
                      onClick={() => setDryRunResult(null)}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#282828] dark:hover:bg-[#333] text-xs font-bold text-slate-700 dark:text-[#ccc] cursor-pointer"
                    >
                      انتخاب فایل دیگر
                    </button>

                    <button
                      onClick={handleExecutePatch}
                      disabled={isExecuting || dryRunResult.needs_update_count === 0}
                      className="px-6 py-2.5 rounded-xl bg-[#1DB954] hover:bg-[#1ED760] text-black font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-[#1DB954]/20 disabled:opacity-50"
                    >
                      {isExecuting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>در حال اعمال اصلاحات در دیتابیس...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>
                            تایید و اعمال اصلاح نام {toPersianDigits(dryRunResult.needs_update_count)} گزارش
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
