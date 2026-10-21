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
  Server,
  Download,
  AlertCircle
} from 'lucide-react';
import { Tenant, Personnel } from '../types';
import { importLegacyMigrationData, resetMigrationCache, autoAssignFreeCustomersWithReports } from '../api';
import { toPersianDigits, normalizeLegacyStatus } from '../utils';

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

  // ۳. تجزیه‌گر مبتنی بر ماشین حالت (State Machine)
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
        i++;
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

  // ۴. ادغام هوشمند ردیف‌های تکه‌تکه‌شده فاقد کوتیشن
  const unifiedRows: string[][] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (unifiedRows.length === 0) {
      unifiedRows.push(row);
      continue;
    }

    const prevRow = unifiedRows[unifiedRows.length - 1];

    if (prevRow.length < expectedCols) {
      prevRow[prevRow.length - 1] = (prevRow[prevRow.length - 1] + '\n' + (row[0] || '')).trim();
      for (let c = 1; c < row.length; c++) {
        prevRow.push(row[c]);
      }
    } else {
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

  // نام فایل‌های بارگذاری‌شده
  const [accountFileName, setAccountFileName] = useState<string>('');
  const [contactFileName, setContactFileName] = useState<string>('');
  const [historyFileName, setHistoryFileName] = useState<string>('');

  // وضعیت پردازش و پیشرفت زنده
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [currentPhaseText, setCurrentPhaseText] = useState('');
  const [progressLogs, setProgressLogs] = useState<string[]>([]);
  const [importResult, setImportResult] = useState<any | null>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const handleAutoAssignFreeCustomers = async () => {
    try {
      setIsAutoAssigning(true);
      showToast('در حال تحلیل و اتصال مشتریان آزاد به آخرین بازاریاب ثبت‌کننده گزارش...', 'info');
      const res = await autoAssignFreeCustomersWithReports(selectedTenantId);
      if (res.success) {
        showToast(res.message, 'success');
        await onRefreshData();
      } else {
        showToast(res.message || 'خطا در اتصال خودکار مشتریان', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'خطا در اجرای اتصال خودکار مشتریان آزاد', 'error');
    } finally {
      setIsAutoAssigning(false);
    }
  };

  // حرکت خودکار لاگ به انتهای لیست
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [progressLogs]);

  const addLog = (msg: string) => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    setProgressLogs(prev => [...prev, `[${timeStr}] ${msg}`]);
  };

  const handleLoadSampleData = () => {
    setAccountText(SAMPLE_ACCOUNT_RAW);
    setContactText(SAMPLE_CONTACT_RAW);
    setHistoryText(SAMPLE_HISTORY_RAW);
    setAccountFileName('sample_accounts.tsv');
    setContactFileName('sample_contacts.tsv');
    setHistoryFileName('sample_history.tsv');
    showToast('داده‌های نمونه ارسالی با موفقیت بارگذاری شدند.', 'info');
  };

  // رکوردهای شناسایی‌شده
  const parsedAccounts = parseRawInput(accountText);
  const parsedContacts = parseRawInput(contactText);
  const parsedHistory = parseRawInput(historyText);

  // خواندن فایل از سیستم کاربر
  const handleFileUpload = (file: File, target: 'account' | 'contact' | 'history') => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        if (target === 'account') {
          setAccountText(content);
          setAccountFileName(file.name);
        } else if (target === 'contact') {
          setContactText(content);
          setContactFileName(file.name);
        } else if (target === 'history') {
          setHistoryText(content);
          setHistoryFileName(file.name);
        }
        showToast(`فایل «${file.name}» با موفقیت خوانده شد.`, 'success');
      }
    };
    reader.onerror = () => {
      showToast('خطا در خواندن فایل انتخاب شده.', 'error');
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleResetCache = async () => {
    try {
      await resetMigrationCache();
      showToast('حافظه کش موقت درون‌ریزی با موفقیت پاکسازی شد.', 'success');
      addLog('پاکسازی حافظه کش موقت سرور انجام گردید.');
    } catch (err: any) {
      showToast(err.message || 'خطا در پاکسازی کش', 'error');
    }
  };

  // اجرای فرآیند درون‌ریزی با دسته‌بندی خودکار و پردازش تدریجی برای حجم‌های بالا (حتی ۳۵,۰۰۰+ رکورد)
  const handleExecuteImport = async () => {
    if (parsedAccounts.length === 0 && parsedContacts.length === 0 && parsedHistory.length === 0) {
      showToast('لطفاً حداقل داده‌های یکی از جداول را وارد کنید.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      setProgressPercent(0);
      setProgressLogs([]);
      setImportResult(null);

      // Reset any stale server-side memory cache before starting
      try {
        await resetMigrationCache();
      } catch (rErr) {
        console.warn('Could not reset migration cache:', rErr);
      }

      const totalAccounts = parsedAccounts.length;
      const totalContacts = parsedContacts.length;
      const totalHistory = parsedHistory.length;

      addLog(`آغاز درون‌ریزی هوشمند برای ${totalAccounts} کارشناس، ${totalContacts} مشتری و ${totalHistory} گزارش مذاکره.`);

      let sumPersonnel = 0;
      let sumCustomers = 0;
      let sumReports = 0;
      let sumSkipped = 0;
      const allErrors: string[] = [];
      const allSkippedDetails: Array<{ companyName: string; phone: string; reason: string }> = [];

      // ۱. اگر پرسنل وجود دارد ارسال می‌شوند
      if (totalAccounts > 0) {
        setCurrentPhaseText(`در حال درون‌ریزی ${totalAccounts} حساب کاربری پرسنل...`);
        addLog(`ارسال ${totalAccounts} رکورد پرسنل به پایگاه داده...`);
        const resP = await importLegacyMigrationData({
          tenant_id: selectedTenantId,
          personnelRows: parsedAccounts,
          customerRows: [],
          reportRows: [],
        });
        sumPersonnel += resP.importedPersonnelCount || 0;
        sumSkipped += resP.skippedCount || 0;
        if (resP.errors?.length) allErrors.push(...resP.errors);
        addLog(`ثبت پرسنل تکمیل شد: ${resP.importedPersonnelCount} کارشناس جدید ثبت گردید.`);
      }

      // ۲. درون‌ریزی مشتریان در دسته‌های ۲۵۰ تایی (پاسخ سریع و بدون تایم‌اوت مرورگر)
      const CUSTOMER_CHUNK_SIZE = 250;
      if (totalContacts > 0) {
        const totalCustChunks = Math.ceil(totalContacts / CUSTOMER_CHUNK_SIZE);
        for (let i = 0; i < totalCustChunks; i++) {
          const start = i * CUSTOMER_CHUNK_SIZE;
          const end = Math.min(start + CUSTOMER_CHUNK_SIZE, totalContacts);
          const rawChunk = parsedContacts.slice(start, end);
          const chunk = rawChunk.map((c) => ({
            ...c,
            lastStat: normalizeLegacyStatus(c.lastStat),
            status: normalizeLegacyStatus(c.status || c.lastStat),
          }));

          const pct = Math.round(10 + ((i + 1) / totalCustChunks) * 30);
          setProgressPercent(pct);
          setCurrentPhaseText(`درون‌ریزی پرونده مشتریان (دسته‌بندی ${i + 1} از ${totalCustChunks}: رکوردهای ${start + 1} تا ${end})...`);
          addLog(`ارسال دسته‌بندی ${i + 1} مشتریان (${chunk.length} پرونده)...`);

          const resC = await importLegacyMigrationData({
            tenant_id: selectedTenantId,
            personnelRows: [],
            customerRows: chunk,
            reportRows: [],
          });

          sumCustomers += resC.importedCustomersCount || 0;
          sumSkipped += resC.skippedCount || 0;
          if (resC.skippedDetails && Array.isArray(resC.skippedDetails)) {
            allSkippedDetails.push(...resC.skippedDetails);
          }
          if (resC.errors?.length) allErrors.push(...resC.errors);
          addLog(`دسته ${i + 1} مشتریان پردازش شد: ${resC.importedCustomersCount} پرونده جدید ثبت و ${resC.skippedCount || 0} پرونده موجود با بازاریاب و کارشناس مربوطه به روزرسانی گردید.`);
        }
      } else {
        setProgressPercent(40);
      }

      // ۳. درون‌ریزی گزارش‌های مذاکره در دسته‌های ۵۰۰ تایی (پشتیبانی تا ۳۵,۰۰۰+ رکورد بدون قطعی یا تایم‌اوت)
      const REPORT_CHUNK_SIZE = 500;
      if (totalHistory > 0) {
        const totalRepChunks = Math.ceil(totalHistory / REPORT_CHUNK_SIZE);
        for (let i = 0; i < totalRepChunks; i++) {
          const start = i * REPORT_CHUNK_SIZE;
          const end = Math.min(start + REPORT_CHUNK_SIZE, totalHistory);
          const rawChunk = parsedHistory.slice(start, end);
          const chunk = rawChunk.map((h) => ({
            ...h,
            status: normalizeLegacyStatus(h.status),
          }));

          const pct = Math.round(40 + ((i + 1) / totalRepChunks) * 58);
          setProgressPercent(pct);
          setCurrentPhaseText(`درون‌ریزی گزارش‌های مذاکره (دسته‌بندی ${i + 1} از ${totalRepChunks}: گزارش‌های ${start + 1} تا ${end} از کل ${totalHistory})...`);
          addLog(`ارسال دسته‌بندی ${i + 1} از ${totalRepChunks} گزارش‌ها (${chunk.length} رکورد)...`);

          const resR = await importLegacyMigrationData({
            tenant_id: selectedTenantId,
            personnelRows: [],
            customerRows: [],
            reportRows: chunk,
          });

          sumReports += resR.importedReportsCount || 0;
          sumSkipped += resR.skippedCount || 0;
          if (resR.errors?.length) allErrors.push(...resR.errors);
          addLog(`دسته ${i + 1} گزارش‌ها انجام شد: ${resR.importedReportsCount} گزارش ثبت و پیوند داده شد.`);
        }
      }

      setProgressPercent(100);
      setCurrentPhaseText('کلیه دسته‌بندی‌های درون‌ریزی با موفقیت به پایان رسیدند.');
      addLog(`پایان موفقیت‌آمیز: کل داده‌ها شامل ${sumPersonnel} کارشناس، ${sumCustomers} مشتری و ${sumReports} گزارش مذاکره پردازش و ثبت شدند. (${sumSkipped} رکورد تکراری نادیده گرفته شد)`);

      const finalResult = {
        success: allErrors.length === 0 || sumCustomers > 0 || sumReports > 0,
        importedPersonnelCount: sumPersonnel,
        importedCustomersCount: sumCustomers,
        importedReportsCount: sumReports,
        skippedCount: sumSkipped,
        skippedDetails: allSkippedDetails,
        errors: allErrors,
        message: `عملیات درون‌ریزی کامل داده‌ها با موفقیت به پایان رسید: ${sumPersonnel} کارشناس، ${sumCustomers} پرونده مشتری، و ${sumReports} گزارش مذاکره در پایگاه داده مرکزی ثبت گردیدند. (${sumSkipped} رکورد تکراری شناسایی و نادیده گرفته شد)`
      };

      setImportResult(finalResult);
      showToast(finalResult.message, 'success');
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
              پشتیبانی از درون‌ریزی انبوه (حتی بیش از ۳۵,۰۰۰ گزارش) با قابلیت آپلود فایل، دسته‌بندی خودکار، نرمال‌سازی شماره‌ها و پیشگیری هوشمند از رکوردهای تکراری.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleResetCache}
              className="px-3.5 py-2 rounded-xl bg-[#252525] hover:bg-[#303030] border border-[#3e3e3e] text-xs font-bold text-[#CCC] hover:text-white flex items-center gap-2 transition-all cursor-pointer shadow-sm"
              title="پاکسازی حافظه موقت سرور جهت شروع مجدد و درون‌ریزی تمیز"
            >
              <RefreshCw className="w-4 h-4 text-amber-400" />
              <span>پاکسازی حافظه موقت درون‌ریزی</span>
            </button>
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
            { num: 3, title: 'گزارش‌های مذاکره', subtitle: 'جدول پیشینه و گزارش‌ها', count: parsedHistory.length },
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

      {/* کارت ابزار هوشمند ساماندهی مشتریان آزاد گزارش‌دار */}
      <div className="bg-[#181818] border border-[#1DB954]/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl shadow-[#1DB954]/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1DB954]/15 border border-[#1DB954]/30 flex items-center justify-center text-[#1DB954] flex-shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
              <span>اتصال و ساماندهی خودکار مشتریان آزاد گزارش‌دار به آخرین بازاریاب</span>
              <span className="text-[10px] bg-[#1DB954]/20 text-[#1DB954] px-2 py-0.5 rounded-full font-bold">هوشمند</span>
            </div>
            <div className="text-[11px] text-[#A7A7A7] mt-0.5">
              شماره‌ها و پرونده‌هایی که آزاد ثبت شده‌اند اما دارای گزارش مذاکره هستند، به صورت خودکار به آخرین بازاریابی که برایشان گزارش نوشته وصل و فعال می‌گردند.
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAutoAssignFreeCustomers}
          disabled={isAutoAssigning || isSubmitting}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#1DB954] hover:bg-[#1ed760] disabled:opacity-50 text-black font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-[#1DB954]/20 cursor-pointer flex-shrink-0"
        >
          {isAutoAssigning ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>در حال اتصال هوشمند...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 stroke-[2.5]" />
              <span>اتصال آنی به آخرین بازاریاب</span>
            </>
          )}
        </button>
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
                <p className="text-xs text-[#888]">محتوای جدول را به صورت انتخاب فایل اکسل/CSV یا کپی پیست متن در کادر زیر وارد کنید.</p>
              </div>
            </div>
            <div className="text-xs font-mono text-[#1DB954] bg-[#1DB954]/10 px-3 py-1 rounded-lg border border-[#1DB954]/20">
              تعداد شناسایی‌شده: {parsedAccounts.length}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-[#AAA]">متن یا خروجی جدول اطلاعات پرسنل:</label>
              <label className="px-3 py-1.5 rounded-lg bg-[#222] hover:bg-[#2e2e2e] text-xs font-bold text-[#1DB954] cursor-pointer flex items-center gap-1.5 transition-all border border-[#333]">
                <UploadCloud className="w-3.5 h-3.5" />
                <span>{accountFileName ? `فایل: ${accountFileName}` : 'بارگذاری فایل (.csv / .tsv)'}</span>
                <input
                  type="file"
                  accept=".csv,.tsv,.txt,.json"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'account')}
                />
              </label>
            </div>
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

          {/* پیام راهنما برای اصلاح و بروزرسانی مالکیت پرونده‌ها */}
          <div className="bg-[#132035] border border-blue-500/30 rounded-xl p-3.5 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="text-xs text-[#E0E0E0] leading-relaxed">
              <span className="font-bold text-blue-400 block mb-0.5">اصلاح و به‌روزرسانی هوشمند مالکان پرونده‌ها:</span>
              با بارگذاری فایل پرونده‌ها و پرسنل، <strong className="text-white">هیچ مشتری تکراری ایجاد نخواهد شد.</strong> پایگاه داده پرونده‌های موجود را شناسایی کرده و بازاریاب مسئول هر پرونده را بر اساس فیلدهای مرجع (<span className="font-mono text-[#1DB954]">Referrals / lockOwner / uid</span>) به کارشناس مربوطه اصلاح و به روزرسانی خواهد کرد.
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-[#AAA]">متن یا خروجی جدول مشتریان:</label>
              <label className="px-3 py-1.5 rounded-lg bg-[#222] hover:bg-[#2e2e2e] text-xs font-bold text-[#1DB954] cursor-pointer flex items-center gap-1.5 transition-all border border-[#333]">
                <UploadCloud className="w-3.5 h-3.5" />
                <span>{contactFileName ? `فایل: ${contactFileName}` : 'بارگذاری فایل (.csv / .tsv)'}</span>
                <input
                  type="file"
                  accept=".csv,.tsv,.txt,.json"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'contact')}
                />
              </label>
            </div>
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
                        <td className="p-2.5 text-[#F59B23]">{normalizeLegacyStatus(row.lastStat || row.status)}</td>
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
                <h2 className="text-base font-bold text-white">ورود گزارش‌های مذاکره (حجم کامل / ۳۵,۰۰۰+ رکورد)</h2>
                <p className="text-xs text-[#888]">می‌توانید فایل کامل ۳۵,۰۰۰ گزارش را یکجا آپلود کنید. سیستم به صورت خودکار آن را دسته‌بندی و ارسال می‌کند.</p>
              </div>
            </div>
            <div className="text-xs font-mono text-[#1DB954] bg-[#1DB954]/10 px-3 py-1 rounded-lg border border-[#1DB954]/20">
              تعداد شناسایی‌شده: {parsedHistory.length}
            </div>
          </div>

          {/* پیام راهنما برای درون‌ریزی اختصاصی گزارش‌ها */}
          <div className="bg-[#132A1D] border border-[#1DB954]/30 rounded-xl p-3.5 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-[#1DB954] shrink-0 mt-0.5" />
            <div className="text-xs text-[#E0E0E0] leading-relaxed">
              <span className="font-bold text-[#1DB954] block mb-0.5">درون‌ریزی مستقیم/مجدد گزارش‌های مذاکره:</span>
              اگر مشتریان و پرسنل قبلاً در سامانه ثبت شده‌اند، <strong className="text-white">نیازی به انتخاب مجدد یا پر کردن گام‌های ۱ و ۲ نیست.</strong> می‌توانید فقط فایل گزارش‌ها را بارگذاری کرده و دکمه ادامه را بزنید. سیستم گزارش‌ها را به صورت هوشمند با کارشناسان و مشتریان موجود در دیتابیس تطبیق داده و پیوند می‌دهد.
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-[#AAA]">متن یا خروجی فایل گزارش‌ها:</label>
              <label className="px-3.5 py-2 rounded-xl bg-[#1DB954]/10 hover:bg-[#1DB954]/20 text-xs font-bold text-[#1DB954] cursor-pointer flex items-center gap-2 transition-all border border-[#1DB954]/30 shadow-sm">
                <UploadCloud className="w-4 h-4" />
                <span>{historyFileName ? `فایل انتخاب شده: ${historyFileName}` : 'بارگذاری فایل کامل ۳۵ هزار گزارش (.csv / .tsv)'}</span>
                <input
                  type="file"
                  accept=".csv,.tsv,.txt,.json"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'history')}
                />
              </label>
            </div>
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
              <div className="text-xs font-bold text-white mb-2">پیش‌نمایش گزارش‌ها (نمایش ۵ مورد از کل {parsedHistory.length} مورد):</div>
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
                        <td className="p-2.5 text-[#1ED760]">{normalizeLegacyStatus(row.status)}</td>
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
              <p className="text-xs text-[#888]">سیستم کل {parsedHistory.length} گزارش را به صورت دسته‌های خودکار ارسال می‌کند تا بدون تایم‌اوت ثبت گردند.</p>
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
              <div className="text-[10px] text-[#777] mt-0.5">درون‌ریزی کامل (ارسال دسته‌ای)</div>
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
                {importResult.skippedCount > 0 && (
                  <span className="text-amber-400">رکوردهای تکراری/غیرمجاز نادیده گرفته‌شده: <b className="font-mono">{importResult.skippedCount}</b></span>
                )}
                <span className="text-[#1DB954] flex items-center gap-1 font-bold">
                  <Server className="w-3.5 h-3.5" />
                  ذخیره‌سازی مستقیم در پایگاه داده مرکزی دایرکتوس
                </span>
              </div>
              {importResult.skippedDetails && importResult.skippedDetails.length > 0 && (
                <div className="mt-4 pt-3 border-t border-amber-500/20 text-xs text-amber-200 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-bold flex items-center gap-1.5 text-amber-400">
                      <AlertCircle className="w-4 h-4 text-amber-400" />
                      <span>دلایل و لیست رکوردهای نادیده گرفته‌شده ({toPersianDigits(importResult.skippedDetails.length)} مورد):</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const csvHeader = "نام کسب و کار\tشماره تماس\tدلیل ثبت نشدن\n";
                        const csvRows = importResult.skippedDetails.map((s: any) => `${s.companyName}\t${s.phone}\t${s.reason}`).join("\n");
                        const blob = new Blob(["\uFEFF" + csvHeader + csvRows], { type: 'text/tab-separated-values;charset=utf-8;' });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement("a");
                        link.setAttribute("href", url);
                        link.setAttribute("download", `skipped_customers_report_${Date.now()}.tsv`);
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-[11px] border border-amber-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>دانلود گزارش کامل ردیف‌های نادیده گرفته شده (TSV)</span>
                    </button>
                  </div>
                  <div className="max-h-48 overflow-y-auto bg-black/50 rounded-xl p-3 space-y-1.5 font-sans border border-amber-500/10 text-[11px]">
                    {importResult.skippedDetails.slice(0, 100).map((s: any, idx: number) => (
                      <div key={idx} className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/10 pb-1">
                        <span className="font-bold text-white">{toPersianDigits(idx + 1)}. {s.companyName} ({s.phone})</span>
                        <span className="text-amber-300/80 font-mono text-[10px]">{s.reason}</span>
                      </div>
                    ))}
                    {importResult.skippedDetails.length > 100 && (
                      <div className="text-center text-[#888] pt-1">و {toPersianDigits(importResult.skippedDetails.length - 100)} مورد دیگر (جهت مشاهده کامل روی دکمه دانلود فوق کلیک کنید)</div>
                    )}
                  </div>
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
              disabled={isSubmitting || (parsedAccounts.length === 0 && parsedContacts.length === 0 && parsedHistory.length === 0)}
              className="w-full sm:w-auto px-8 py-3 rounded-xl bg-[#1DB954] hover:bg-[#1ed760] disabled:opacity-50 text-black font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg shadow-[#1DB954]/20"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>در حال درون‌ریزی دسته‌ای... ({progressPercent}٪)</span>
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
