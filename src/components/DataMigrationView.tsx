import React, { useState, useEffect, useRef } from 'react';
import {
  Database,
  UploadCloud,
  FileSpreadsheet,
  Users,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  RefreshCw,
  Building2,
  Check,
  X,
  FileText,
  Phone,
  UserCheck,
  ChevronDown,
  Layers,
  HelpCircle,
  Play,
  Terminal,
  ShieldCheck,
  Server
} from 'lucide-react';
import { Tenant, Personnel } from '../types';
import { importLegacyMigrationData } from '../api';

interface DataMigrationViewProps {
  tenants: Tenant[];
  activeTenantId: string;
  currentPersonnel: Personnel | null;
  isAdmin: boolean;
  onRefreshData: () => Promise<void>;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

// نمونه داده‌های تست ارسالی توسط کاربر
const SAMPLE_ACCOUNT_RAW = `uid\tpass\tfname\tlname\tgender\tactive\tbirth\taddress\tincomingDate\tendJobDate\tcontractType\tprecentage\tplusPrecent\tcode\tshenasname\tcontacts\temail\tresume\tpic\tuserlevel\tacctype\tusername\tshift\tinsertDate
2000\t1235\tامیرعلی\tنیک آیین\tمرد\t1\t\t\t1396/12/09\t\t0\t0\t0\t\t\t09125665463,09111372125\t\t\t\t0\tParsDatam\tadmin\t0\t2018-10-31 15:32:19
2020\t13661102\tحمیدرضا\tصابر\tمرد\t1\t\t\t1396/12/09\t\t0\t0\t0\t\t\t09370777561\thamid.saber.workmail@gmail.com\t\t\t0\tVlifeGaller\t2020\t21\t2018-10-31 15:32:19
2095\tsomayeha\tسمیه\tعلایی\tزن\t1\t1362/02/07\tتهران، خیابان شریعتی ، خیابان معلم ، خیابان مرودشت، کوچه امیر ، کوچه حمزه، نبش اقاقیا، پلاک ۱۸ واحد ۱\t1405/01/23\tNULL\t2\t1\tNULL\t0074364820\t839\t09120745843\t\tNULL\tNULL\t1\tVlifeGaller\tsomayeha\t25\t2026-04-12 13:26:48`;

const SAMPLE_CONTACT_RAW = `CallID\tuid\tInsertRecDate\tmobiles\tphonelines\tinstaID\ttelegID\ttlgMobile\tsystem\temails\twebsite\tmarketingWebsite\tCompanyName\tmarketName\tjob\tprovince\tcity\tmanagerName\tmanagerPhone\tCustomerID\texpire\tlockOwner\tlockGlobal\ttempLock\tClosedContact\tReferrals\tReferralsFrom\tlastStat\tblackList\tncode\trefrence\tjobChange\tcreated\tupdated
17550927602084\t2095\t14040522\t09112424582, 09115014582\t\t\t\t\tVlifeGaller\t\t\t\tنماینده دستگاه کارتخوان\t\tفروشنده دستگاه کارتخوان و امثالهم\t25\t9\tخسروی\t\t1\t14060423\t0\t1\t0\t\t1\t2084\tنمیخواد\tno\t\t\t\t6/13/26\t6/13/26
17550940902084\t2095\t14040522\t09112840260\t\t\t\t\tVlifeGaller\t\t\t\tنماینده دستگاه کارت خوان\t\tفروشنده دستگاه کارتخوان و امثالهم\t25\t5\tاکبری\t09112840260\t2\t14060423\t0\t1\t0\t\t1\t2084\tنمیخواد\tno\t\t\t\t6/13/26\t6/13/26
17550946352084\t2095\t14040522\t09113119440\t\t\t\t\tVlifeGaller\t\t\t\tنمایندگی کارت خوان\t\tفروشنده دستگاه کارتخوان و امثالهم\t27\t2\tموسوی\t09113119440\t3\t14060423\t0\t1\t0\t\t1\t2084\tنمیخواد\tno\t\t\t\t6/13/26\t6/13/26`;

const SAMPLE_HISTORY_RAW = `ID\tCallID\treport\tdateTime\tnegotiator\tcallNum\tnextFollow\tstatus\trating\tuid\tcustomerID\tcustomer\tinsertDate\tupdateDate\tvarcharDate
1\t17550927602084\tصحبت انجام شد گفت توضیحات و قیمت ها در واتس اپ ارسال شد\t14040522-1816\tخسروی\t9112424582\t1404/05/25  13:45\tپیگیری قبل از انقضا\t15\t2084\t1\tNULL\t2025-08-13 17:16:00\t2025-08-13 17:16:00\tNULL
2\t17550940902084\tتماس برقرار شد گفت توضیحات و قیمت ارسال بشه\t14040522-1838\tاکبری\t9112840260\t1404/05/25  14:00\tپیگیری قبل از انقضا\t15\t2084\t2\tNULL\t2025-08-13 17:38:10\t2025-08-13 17:38:10\tNULL
3\t17550946352084\tبهشون توضیح داده شد ولی جواب دریافت نشد\t14040522-1847\tموسوی\t9113119440\t1404/05/25  14:17\tپاسخ نمیدهد\t1\t2084\t3\tNULL\t2025-08-13 17:47:15\t2025-08-13 17:47:15\tNULL`;

// تابع پیشرفته و هوشمند تجزیه متن ورودی (Multi-line Smart TSV/CSV Parser)
// این تابع شکستگی‌های خط (Enter/Newline) ناخواسته در داخل فیلدهای گزارش یا توضیحات را به درستی تشخیص داده و ادغام می‌کند
function parseRawInput(raw: string): any[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  // ۱. بررسی آرایه ساختاریافته جیسون
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      return JSON.parse(trimmed);
    } catch {}
  }

  // ۲. تشخیص جداکننده اصلی بر اساس خط اول
  const firstLineEnd = trimmed.indexOf('\n');
  const firstLine = firstLineEnd !== -1 ? trimmed.substring(0, firstLineEnd) : trimmed;
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const delimiter = tabCount >= commaCount ? '\t' : ',';

  // ۳. تجزیه‌گر مبتنی بر ماشین حالت (State Machine) با پشتیبانی از فیلدهای چندخطی داخل کوتیشن
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;
  const len = trimmed.length;

  for (let i = 0; i < len; i++) {
    const char = trimmed[i];
    const nextChar = i + 1 < len ? trimmed[i + 1] : '';

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++; // رد کردن گیومه فرار
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === delimiter && !insideQuotes) {
      currentRow.push(currentField);
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentField);
      currentField = '';
      if (currentRow.some(val => val.trim().length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some(val => val.trim().length > 0)) {
      rows.push(currentRow);
    }
  }

  if (rows.length < 2) return [];

  const headers = rows[0].map(h => h.trim().replace(/^["']|["']$/g, ''));
  const expectedCols = headers.length;

  // ۴. ادغام هوشمند ردیف‌های تکه‌تکه‌شده فاقد کوتیشن (Unquoted Multi-line Stitching)
  const unifiedRows: string[][] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (unifiedRows.length === 0) {
      unifiedRows.push(row);
      continue;
    }

    const prevRow = unifiedRows[unifiedRows.length - 1];

    if (prevRow.length < expectedCols) {
      // ردیف قبلی بر اثر اینتر نصفه رها شده است
      prevRow[prevRow.length - 1] = (prevRow[prevRow.length - 1] + '\n' + (row[0] || '')).trim();
      for (let c = 1; c < row.length; c++) {
        prevRow.push(row[c]);
      }
    } else {
      // ردیف قبلی کامل است. آیا ردیف فعلی شروع یک رکورد معتبر جدید است؟
      const firstVal = String(row[0] || '').trim();
      const looksLikeValidRecordStart = /^\d+$/.test(firstVal) || row.length === expectedCols;
      if (!looksLikeValidRecordStart && row.length < expectedCols) {
        const reportIdx = headers.findIndex(h => /report|text|address|notes|شرح/i.test(h));
        const targetIdx = reportIdx !== -1 && reportIdx < prevRow.length ? reportIdx : prevRow.length - 1;
        prevRow[targetIdx] = (prevRow[targetIdx] + '\n' + row.join('\t')).trim();
      } else {
        unifiedRows.push(row);
      }
    }
  }

  // ۵. نگاشت نهایی به اشیاء کلید-مقدار
  const results: any[] = [];
  for (const row of unifiedRows) {
    const rowObj: Record<string, any> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = row[idx] !== undefined ? row[idx].trim().replace(/^["']|["']$/g, '') : '';
    });
    results.push(rowObj);
  }
  return results;
}

export const DataMigrationView: React.FC<DataMigrationViewProps> = ({
  tenants,
  activeTenantId,
  isAdmin,
  onRefreshData,
  showToast,
}) => {
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedTenantId, setSelectedTenantId] = useState<string>(activeTenantId === 'all' ? 'default' : activeTenantId);

  // متون ورودی جداول
  const [accountText, setAccountText] = useState<string>('');
  const [contactText, setContactText] = useState<string>('');
  const [historyText, setHistoryText] = useState<string>('');

  // وضعیت پردازش و پیشرفت زنده
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [currentPhaseText, setCurrentPhaseText] = useState('');
  const [progressLogs, setProgressLogs] = useState<string[]>([]);
  const [importResult, setImportResult] = useState<any | null>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // حرکت خودکار لاگ به انتهای لیست
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [progressLogs]);

  // افزودن لاگ با برچسب زمان
  const addLog = (msg: string) => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    setProgressLogs(prev => [...prev, `[${timeStr}] ${msg}`]);
  };

  // بارگذاری داده‌های نمونه برای تست
  const handleLoadSampleData = () => {
    setAccountText(SAMPLE_ACCOUNT_RAW);
    setContactText(SAMPLE_CONTACT_RAW);
    setHistoryText(SAMPLE_HISTORY_RAW);
    showToast('داده‌های نمونه ارسالی با موفقیت در فرم‌ها بارگذاری شدند.', 'info');
  };

  // رکوردهای شناسایی‌شده
  const parsedAccounts = parseRawInput(accountText);
  const parsedContacts = parseRawInput(contactText);
  const parsedHistory = parseRawInput(historyText);

  // اجرای فرآیند درون‌ریزی
  const handleExecuteImport = async () => {
    if (parsedAccounts.length === 0 && parsedContacts.length === 0 && parsedHistory.length === 0) {
      showToast('لطفاً حداقل داده‌های یکی از جداول را وارد کنید.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      setProgressPercent(10);
      setProgressLogs([]);
      setCurrentPhaseText('در حال آماده‌سازی و اعتبارسنجی اولیه ساختار رکوردها...');
      addLog('آغاز عملیات انتقال هوشمند اطلاعات به پایگاه داده مرکزی دایرکتوس.');
      addLog(`تعداد کارشناسان: ${parsedAccounts.length} | مشتریان: ${parsedContacts.length} | گزارش‌ها: ${parsedHistory.length}`);

      // شبیه‌سازی مراحل با انیمیشن پیشرفت در زمان ارسال به سرور
      const timer1 = setTimeout(() => {
        setProgressPercent(30);
        setCurrentPhaseText('ثبت و تطبیق حساب‌های کاربری پرسنل در دایرکتوس...');
        addLog('بررسی شناسه کارشناسان و تخصیص سطوح دسترسی...');
      }, 400);

      const timer2 = setTimeout(() => {
        setProgressPercent(55);
        setCurrentPhaseText('درون‌ریزی دسته‌ای پرونده‌های مشتریان و شماره‌های تماس...');
        addLog('ارسال دسته‌های مشتریان به پایگاه داده و نرمال‌سازی شماره‌های تماس...');
      }, 900);

      const timer3 = setTimeout(() => {
        setProgressPercent(80);
        setCurrentPhaseText('درون‌ریزی کلیه گزارش‌های مذاکره و الحاق به پرونده هر مشتری...');
        addLog('ثبت تاریخچه کامل مذاکرات همراه با تاریخ دقیق و اتصال به مشتریان...');
      }, 1400);

      const res = await importLegacyMigrationData({
        tenant_id: selectedTenantId,
        personnelRows: parsedAccounts,
        customerRows: parsedContacts,
        reportRows: parsedHistory,
      });

      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);

      setProgressPercent(100);
      setCurrentPhaseText('عملیات با موفقیت پایان یافت.');
      addLog(`نتیجه قطعی: ${res.importedPersonnelCount} کارشناس، ${res.importedCustomersCount} پرونده مشتری، و ${res.importedReportsCount} گزارش مذاکره با تاریخ دقیق ثبت شدند.`);

      setImportResult(res);
      showToast(res.message, 'success');
      await onRefreshData();
      setActiveStep(4);
    } catch (err: any) {
      addLog(`بروز خطا در جریان ذخیره‌سازی: ${err.message || 'خطای ناشناخته'}`);
      showToast(err.message || 'خطا در درون‌ریزی داده‌ها', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentTenantObj = tenants.find(t => String(t.id) === String(selectedTenantId)) || tenants[0];

  return (
    <div className="space-y-6 pb-12">
      {/* سربرگ معرفی */}
      <div className="bg-[#181818] border border-[#282828] rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-[#1DB954]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2.5 text-[#1DB954] text-xs font-bold uppercase tracking-wider mb-1.5">
              <Database className="w-4 h-4" />
              <span>مرکز مهاجرت و انتقال داده‌های سازمانی</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white">
              انتقال هوشمند اطلاعات از سامانه قبلی
            </h1>
            <p className="text-xs sm:text-sm text-[#A7A7A7] mt-1 max-w-2xl leading-relaxed">
              درون‌ریزی تمیز و خودکار جداول کارشناسان، پرونده‌های مشتریان و آخرین گزارش مذاکرات با رعایت کامل روابط در پایگاه داده، نرمال‌سازی شماره‌ها و پیشگیری از رکوردهای تکراری.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleLoadSampleData}
              className="px-3.5 py-2 rounded-xl bg-[#252525] hover:bg-[#303030] border border-[#3e3e3e] text-xs font-bold text-[#CCC] hover:text-white flex items-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-[#1DB954]" />
              <span>بارگذاری داده‌های تستی</span>
            </button>
          </div>
        </div>

        {/* نشانگر مراحل */}
        <div className="mt-8 pt-6 border-t border-[#252525] grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { num: 1, title: 'کارشناسان و پرسنل', subtitle: 'جدول حساب‌های کاربری', count: parsedAccounts.length },
            { num: 2, title: 'پرونده‌های مشتریان', subtitle: 'جدول اطلاعات مشتریان', count: parsedContacts.length },
            { num: 3, title: 'آخرین گزارش مذاکرات', subtitle: 'جدول پیشینه و گزارش‌ها', count: parsedHistory.length },
            { num: 4, title: 'پیش‌نمایش و اعمال', subtitle: 'اتمام درون‌ریزی', count: null },
          ].map((s) => {
            const isCurrent = activeStep === s.num;
            const isCompleted = activeStep > s.num;
            return (
              <button
                key={s.num}
                onClick={() => setActiveStep(s.num as any)}
                className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-[#1DB954]/10 border-[#1DB954] text-white shadow-lg shadow-[#1DB954]/5'
                    : isCompleted
                    ? 'bg-[#202020] border-[#333] text-[#AAA]'
                    : 'bg-[#141414] border-[#222] text-[#666]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isCurrent ? 'bg-[#1DB954] text-black' : isCompleted ? 'bg-[#333] text-white' : 'bg-[#222] text-[#777]'
                  }`}>
                    {isCompleted ? <Check className="w-3 h-3" /> : s.num}
                  </span>
                  {s.count !== null && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-[#1DB954]">
                      {s.count} رکورد
                    </span>
                  )}
                </div>
                <div className="text-xs font-bold truncate">{s.title}</div>
                <div className="text-[10px] text-[#777] truncate">{s.subtitle}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* انتخاب سازمان مقصد */}
      <div className="bg-[#181818] border border-[#282828] rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">سازمان مقصد برای الحاق اطلاعات</div>
            <div className="text-[11px] text-[#888]">تمامی پرونده‌ها و کارمندان به این سازمان تخصیص خواهند یافت.</div>
          </div>
        </div>

        <div className="w-full sm:w-auto min-w-[240px]">
          <select
            value={selectedTenantId}
            onChange={(e) => setSelectedTenantId(e.target.value)}
            className="w-full bg-[#121212] border border-[#333] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#1DB954]"
          >
            {tenants.map(t => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* گام ۱: پرسنل */}
      {activeStep === 1 && (
        <div className="bg-[#181818] border border-[#282828] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-bold">
                ۱
              </div>
              <div>
                <h2 className="text-base font-bold text-white">ورود اطلاعات همکاران و بازاریاب‌ها</h2>
                <p className="text-xs text-[#888]">محتوای جدول را به صورت کپی پیست از اکسل، متن جدول یا جیسون در کادر زیر وارد کنید.</p>
              </div>
            </div>
            <div className="text-xs font-mono text-[#1DB954] bg-[#1DB954]/10 px-3 py-1 rounded-lg border border-[#1DB954]/20">
              تعداد شناسایی‌شده: {parsedAccounts.length}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-[#AAA]">متن یا خروجی جدول اطلاعات پرسنل:</label>
            <textarea
              rows={8}
              value={accountText}
              onChange={(e) => setAccountText(e.target.value)}
              placeholder="ستون‌های جدول: uid fname lname contacts userlevel username ..."
              className="w-full bg-[#121212] border border-[#2e2e2e] rounded-xl p-3 text-xs font-mono text-[#DDD] focus:outline-none focus:border-[#1DB954] resize-y leading-relaxed dir-ltr"
            />
          </div>

          {/* پیش‌نمایش پرسنل */}
          {parsedAccounts.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[#252525]">
              <div className="text-xs font-bold text-white mb-2">پیش‌نمایش رکوردهای پرسنل ({parsedAccounts.length} مورد):</div>
              <div className="overflow-x-auto rounded-xl border border-[#282828]">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#202020] text-[#888] font-semibold border-b border-[#282828]">
                    <tr>
                      <th className="p-2.5">کد کارشناس</th>
                      <th className="p-2.5">نام و نام خانوادگی</th>
                      <th className="p-2.5">نام کاربری</th>
                      <th className="p-2.5">شماره تماس</th>
                      <th className="p-2.5">سطح دسترسی</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222]">
                    {parsedAccounts.slice(0, 5).map((row, idx) => (
                      <tr key={idx} className="hover:bg-[#1c1c1c]">
                        <td className="p-2.5 font-mono text-[#1DB954]">{row.uid || row.id}</td>
                        <td className="p-2.5 font-bold text-white">{(row.fname + ' ' + (row.lname || '')).trim() || '-'}</td>
                        <td className="p-2.5 font-mono text-[#AAA]">{row.username || '-'}</td>
                        <td className="p-2.5 font-mono text-[#AAA]">{row.contacts || row.phone || '-'}</td>
                        <td className="p-2.5 text-[#AAA]">{row.userlevel === '0' ? 'مدیر ارشد' : 'کارشناس فروش'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <button
              onClick={() => setActiveStep(2)}
              className="px-5 py-2.5 rounded-xl bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold text-xs flex items-center gap-2 cursor-pointer transition-all shadow-md"
            >
              <span>مرحله بعد: ورود مشتریان</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* گام ۲: مشتریان */}
      {activeStep === 2 && (
        <div className="bg-[#181818] border border-[#282828] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
                ۲
              </div>
              <div>
                <h2 className="text-base font-bold text-white">ورود اطلاعات مشتریان و پرونده‌ها</h2>
                <p className="text-xs text-[#888]">شامل نام شرکت، صنف، موبایل‌ها، وضعیت و اتصال به بازاریاب مسئول.</p>
              </div>
            </div>
            <div className="text-xs font-mono text-[#1DB954] bg-[#1DB954]/10 px-3 py-1 rounded-lg border border-[#1DB954]/20">
              تعداد شناسایی‌شده: {parsedContacts.length}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-[#AAA]">متن یا خروجی جدول مشتریان:</label>
            <textarea
              rows={8}
              value={contactText}
              onChange={(e) => setContactText(e.target.value)}
              placeholder="ستون‌های جدول: CallID uid mobiles CompanyName job managerName lastStat ..."
              className="w-full bg-[#121212] border border-[#2e2e2e] rounded-xl p-3 text-xs font-mono text-[#DDD] focus:outline-none focus:border-[#1DB954] resize-y leading-relaxed dir-ltr"
            />
          </div>

          {/* پیش‌نمایش مشتریان */}
          {parsedContacts.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[#252525]">
              <div className="text-xs font-bold text-white mb-2">پیش‌نمایش رکوردهای مشتریان ({parsedContacts.length} مورد):</div>
              <div className="overflow-x-auto rounded-xl border border-[#282828]">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#202020] text-[#888] font-semibold border-b border-[#282828]">
                    <tr>
                      <th className="p-2.5">شناسه تماس</th>
                      <th className="p-2.5">نام شرکت یا برند</th>
                      <th className="p-2.5">صنف و حوزه</th>
                      <th className="p-2.5">شماره موبایل‌ها</th>
                      <th className="p-2.5">مدیر</th>
                      <th className="p-2.5">وضعیت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222]">
                    {parsedContacts.slice(0, 5).map((row, idx) => (
                      <tr key={idx} className="hover:bg-[#1c1c1c]">
                        <td className="p-2.5 font-mono text-[#1DB954]">{row.CallID || row.callid}</td>
                        <td className="p-2.5 font-bold text-white">{row.CompanyName || row.marketName || '-'}</td>
                        <td className="p-2.5 text-[#AAA]">{row.job || '-'}</td>
                        <td className="p-2.5 font-mono text-[#AAA]">{row.mobiles || '-'}</td>
                        <td className="p-2.5 text-[#CCC]">{row.managerName || '-'}</td>
                        <td className="p-2.5 text-[#F59B23]">{row.lastStat || 'تماس برقرار نشده'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4">
            <button
              onClick={() => setActiveStep(1)}
              className="px-4 py-2.5 rounded-xl bg-[#252525] hover:bg-[#303030] text-[#CCC] font-bold text-xs flex items-center gap-2 cursor-pointer transition-all"
            >
              <ArrowRight className="w-4 h-4" />
              <span>مرحله قبل</span>
            </button>
            <button
              onClick={() => setActiveStep(3)}
              className="px-5 py-2.5 rounded-xl bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold text-xs flex items-center gap-2 cursor-pointer transition-all shadow-md"
            >
              <span>مرحله بعد: ورود آخرین گزارش‌ها</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* گام ۳: گزارش‌ها */}
      {activeStep === 3 && (
        <div className="bg-[#181818] border border-[#282828] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
                ۳
              </div>
              <div>
                <h2 className="text-base font-bold text-white">ورود آخرین گزارش مذاکرات</h2>
                <p className="text-xs text-[#888]">سیستم به صورت خودکار تنها آخرین مذاکره ثبت‌شده هر مشتری را فیلتر کرده و ضمیمه پرونده می‌کند.</p>
              </div>
            </div>
            <div className="text-xs font-mono text-[#1DB954] bg-[#1DB954]/10 px-3 py-1 rounded-lg border border-[#1DB954]/20">
              تعداد شناسایی‌شده: {parsedHistory.length}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-[#AAA]">متن یا خروجی جدول گزارش‌ها:</label>
            <textarea
              rows={8}
              value={historyText}
              onChange={(e) => setHistoryText(e.target.value)}
              placeholder="ستون‌های جدول: ID CallID report dateTime negotiator callNum nextFollow status rating ..."
              className="w-full bg-[#121212] border border-[#2e2e2e] rounded-xl p-3 text-xs font-mono text-[#DDD] focus:outline-none focus:border-[#1DB954] resize-y leading-relaxed dir-ltr"
            />
          </div>

          {/* پیش‌نمایش گزارش‌ها */}
          {parsedHistory.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[#252525]">
              <div className="text-xs font-bold text-white mb-2">پیش‌نمایش گزارش‌ها ({parsedHistory.length} مورد):</div>
              <div className="overflow-x-auto rounded-xl border border-[#282828]">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#202020] text-[#888] font-semibold border-b border-[#282828]">
                    <tr>
                      <th className="p-2.5">شناسه تماس</th>
                      <th className="p-2.5">مذاکره‌کننده</th>
                      <th className="p-2.5">شرح مذاکره</th>
                      <th className="p-2.5">امتیاز</th>
                      <th className="p-2.5">موعد پیگیری</th>
                      <th className="p-2.5">وضعیت حاصله</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222]">
                    {parsedHistory.slice(0, 5).map((row, idx) => (
                      <tr key={idx} className="hover:bg-[#1c1c1c]">
                        <td className="p-2.5 font-mono text-[#1DB954]">{row.CallID}</td>
                        <td className="p-2.5 font-bold text-white">{row.negotiator || '-'}</td>
                        <td className="p-2.5 text-[#AAA] max-w-[200px] truncate">{row.report || '-'}</td>
                        <td className="p-2.5 font-mono text-amber-400">{row.rating || '-'}</td>
                        <td className="p-2.5 font-mono text-[#888]">{row.nextFollow || '-'}</td>
                        <td className="p-2.5 text-[#1ED760]">{row.status || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4">
            <button
              onClick={() => setActiveStep(2)}
              className="px-4 py-2.5 rounded-xl bg-[#252525] hover:bg-[#303030] text-[#CCC] font-bold text-xs flex items-center gap-2 cursor-pointer transition-all"
            >
              <ArrowRight className="w-4 h-4" />
              <span>مرحله قبل</span>
            </button>
            <button
              onClick={() => setActiveStep(4)}
              className="px-5 py-2.5 rounded-xl bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold text-xs flex items-center gap-2 cursor-pointer transition-all shadow-md"
            >
              <span>مرحله بعد: بررسی نهایی و شروع درون‌ریزی</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* گام ۴: پیش‌نمایش، پیشرفت زنده و اجرا */}
      {activeStep === 4 && (
        <div className="bg-[#181818] border border-[#282828] rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1DB954]/10 border border-[#1DB954]/20 flex items-center justify-center text-[#1DB954] font-bold">
              ۴
            </div>
            <div>
              <h2 className="text-base font-bold text-white">بررسی خلاصه و اجرای عملیات درون‌ریزی</h2>
              <p className="text-xs text-[#888]">آمار کل داده‌های آماده پردازش را بررسی کرده و عملیات انتقال به پایگاه داده دایرکتوس را آغاز نمایید.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#121212] border border-[#282828] rounded-xl p-4 text-center">
              <div className="text-2xl font-black font-mono text-[#1DB954] mb-1">
                {parsedAccounts.length}
              </div>
              <div className="text-xs font-bold text-white">کارشناس و همکار</div>
              <div className="text-[10px] text-[#777] mt-0.5">آماده ثبت در جدول کارشناسان</div>
            </div>

            <div className="bg-[#121212] border border-[#282828] rounded-xl p-4 text-center">
              <div className="text-2xl font-black font-mono text-blue-400 mb-1">
                {parsedContacts.length}
              </div>
              <div className="text-xs font-bold text-white">پرونده مشتری</div>
              <div className="text-[10px] text-[#777] mt-0.5">آماده ثبت در جدول مشتریان</div>
            </div>

            <div className="bg-[#121212] border border-[#282828] rounded-xl p-4 text-center">
              <div className="text-2xl font-black font-mono text-amber-400 mb-1">
                {parsedHistory.length}
              </div>
              <div className="text-xs font-bold text-white">گزارش مذاکره</div>
              <div className="text-[10px] text-[#777] mt-0.5">درون‌ریزی کامل با تاریخ واقعی ثبت</div>
            </div>
          </div>

          {/* کادر پیشرفت زنده هنگام اجرا */}
          {isSubmitting && (
            <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-white">
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 text-[#1DB954] animate-spin" />
                  <span>{currentPhaseText}</span>
                </span>
                <span className="font-mono text-[#1DB954]">{progressPercent}٪</span>
              </div>

              {/* نوار پیشرفت گرافیکی */}
              <div className="w-full bg-[#202020] rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[#1DB954] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* کنسول لاگ زنده مراحل */}
              <div
                ref={logContainerRef}
                className="bg-black/60 rounded-lg p-2.5 font-mono text-[11px] text-[#888] max-h-32 overflow-y-auto space-y-1 dir-ltr text-left border border-white/5"
              >
                {progressLogs.map((log, idx) => (
                  <div key={idx} className="text-[#A7A7A7]">{log}</div>
                ))}
              </div>
            </div>
          )}

          {/* نتیجه موفقیت یا خطا */}
          {importResult && !isSubmitting && (
            <div className={`p-4 rounded-xl border ${
              importResult.success ? 'bg-[#1DB954]/10 border-[#1DB954]/30 text-white' : 'bg-red-950/20 border-red-500/30 text-white'
            }`}>
              <div className="flex items-center gap-2 font-bold text-sm mb-1">
                {importResult.success ? <CheckCircle2 className="w-5 h-5 text-[#1DB954]" /> : <AlertTriangle className="w-5 h-5 text-red-400" />}
                <span>{importResult.message}</span>
              </div>
              <div className="text-xs text-[#AAA] mt-2 flex flex-wrap gap-4">
                <span>کارشناسان ثبت‌شده: <b className="text-white font-mono">{importResult.importedPersonnelCount}</b></span>
                <span>پرونده‌های مشتریان: <b className="text-white font-mono">{importResult.importedCustomersCount}</b></span>
                <span>گزارش‌های ثبت‌شده: <b className="text-white font-mono">{importResult.importedReportsCount}</b></span>
                <span className="text-[#1DB954] flex items-center gap-1 font-bold">
                  <Server className="w-3.5 h-3.5" />
                  ذخیره‌سازی مستقیم در پایگاه داده مرکزی دایرکتوس
                </span>
              </div>
              {importResult.errors && importResult.errors.length > 0 && (
                <div className="mt-3 pt-3 border-t border-red-500/20 text-xs text-red-300 space-y-1">
                  <div className="font-bold">جزئیات پیام‌های سرور:</div>
                  {importResult.errors.map((e: string, idx: number) => (
                    <div key={idx}>• {e}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#252525]">
            <button
              onClick={() => setActiveStep(3)}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#252525] hover:bg-[#303030] text-[#CCC] font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              <ArrowRight className="w-4 h-4" />
              <span>بازگشت به مراحل قبل</span>
            </button>

            <button
              onClick={handleExecuteImport}
              disabled={isSubmitting || (parsedAccounts.length === 0 && parsedContacts.length === 0)}
              className="w-full sm:w-auto px-8 py-3 rounded-xl bg-[#1DB954] hover:bg-[#1ed760] disabled:opacity-50 text-black font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg shadow-[#1DB954]/20"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>در حال انتقال داده‌ها... ({progressPercent}٪)</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>شروع عملیات درون‌ریزی در سازمان «{currentTenantObj?.name}»</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
