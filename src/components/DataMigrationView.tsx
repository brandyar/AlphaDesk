import React, { useState } from 'react';
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
  Play
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

// Sample initial data provided by the user for instant testing
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

// Helper parser for TSV or CSV or JSON text
function parseRawInput(raw: string): any[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  // Check if valid JSON array
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      return JSON.parse(trimmed);
    } catch {}
  }

  // Parse TSV or CSV
  const lines = trimmed.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  const delimiter = lines[0].includes('\t') ? '\t' : ',';
  const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ''));

  const results: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const currentLine = lines[i];
    const values = currentLine.split(delimiter).map(v => v.trim().replace(/^["']|["']$/g, ''));
    const rowObj: Record<string, any> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = values[idx] !== undefined ? values[idx] : '';
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

  // Raw input texts
  const [accountText, setAccountText] = useState<string>('');
  const [contactText, setContactText] = useState<string>('');
  const [historyText, setHistoryText] = useState<string>('');

  // Processing state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importResult, setImportResult] = useState<any | null>(null);

  // Load sample data button
  const handleLoadSampleData = () => {
    setAccountText(SAMPLE_ACCOUNT_RAW);
    setContactText(SAMPLE_CONTACT_RAW);
    setHistoryText(SAMPLE_HISTORY_RAW);
    showToast('داده‌های نمونه ارسالی با موفقیت در فرم‌ها بارگذاری شدند.', 'info');
  };

  // Parsed records summary
  const parsedAccounts = parseRawInput(accountText);
  const parsedContacts = parseRawInput(contactText);
  const parsedHistory = parseRawInput(historyText);

  // Execute migration
  const handleExecuteImport = async () => {
    if (parsedAccounts.length === 0 && parsedContacts.length === 0 && parsedHistory.length === 0) {
      showToast('لطفاً حداقل داده‌های یکی از جداول را وارد کنید.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await importLegacyMigrationData({
        tenant_id: selectedTenantId,
        personnelRows: parsedAccounts,
        customerRows: parsedContacts,
        reportRows: parsedHistory,
      });

      setImportResult(res);
      showToast(res.message, 'success');
      await onRefreshData();
      setActiveStep(4);
    } catch (err: any) {
      showToast(err.message || 'خطا در درون‌ریزی داده‌ها', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentTenantObj = tenants.find(t => String(t.id) === String(selectedTenantId)) || tenants[0];

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-[#181818] border border-[#282828] rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-[#1DB954]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2.5 text-[#1DB954] text-xs font-bold uppercase tracking-wider mb-1.5">
              <Database className="w-4 h-4" />
              <span>مرکز مهاجرت و درون‌ریزی داده‌های سازمانی</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white">
              انتقال هوشمند اطلاعات از سامانه قبلی
            </h1>
            <p className="text-xs sm:text-sm text-[#A7A7A7] mt-1 max-w-2xl leading-relaxed">
              درون‌ریزی تمیز و خودکار جداول کارشناسان، پرونده‌های مشتریان و آخرین گزارش مذاکرات با رعایت روابط دایرکتوس، نرمال‌سازی شماره‌ها و پیشگیری از رکوردهای تکراری.
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

        {/* Step Indicator */}
        <div className="mt-8 pt-6 border-t border-[#252525] grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { num: 1, title: 'کارشناسان و پرسنل', subtitle: 'جدول account', count: parsedAccounts.length },
            { num: 2, title: 'پرونده‌های مشتریان', subtitle: 'جدول contact', count: parsedContacts.length },
            { num: 3, title: 'آخرین گزارش مذاکرات', subtitle: 'جدول history', count: parsedHistory.length },
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

      {/* Target Tenant Selector */}
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

      {/* STEP 1: ACCOUNT (Personnel) */}
      {activeStep === 1 && (
        <div className="bg-[#181818] border border-[#282828] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-bold">
                1
              </div>
              <div>
                <h2 className="text-base font-bold text-white">ورود اطلاعات همکاران و بازاریاب‌ها (جدول account)</h2>
                <p className="text-xs text-[#888]">محتوای جدول را به صورت کپی پیست از اکسل، متن جدول یا جیسون در کادر زیر وارد کنید.</p>
              </div>
            </div>
            <div className="text-xs font-mono text-[#1DB954] bg-[#1DB954]/10 px-3 py-1 rounded-lg border border-[#1DB954]/20">
              تعداد شناسایی‌شده: {parsedAccounts.length}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-[#AAA]">متن یا خروجی جدول account:</label>
            <textarea
              rows={8}
              value={accountText}
              onChange={(e) => setAccountText(e.target.value)}
              placeholder="مثال: uid fname lname contacts userlevel username ..."
              className="w-full bg-[#121212] border border-[#2e2e2e] rounded-xl p-3 text-xs font-mono text-[#DDD] focus:outline-none focus:border-[#1DB954] resize-y leading-relaxed dir-ltr"
            />
          </div>

          {/* Quick Preview Table */}
          {parsedAccounts.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[#252525]">
              <div className="text-xs font-bold text-white mb-2">پیش‌نمایش رکوردهای پرسنل ({parsedAccounts.length} مورد):</div>
              <div className="overflow-x-auto rounded-xl border border-[#282828]">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#202020] text-[#888] font-semibold border-b border-[#282828]">
                    <tr>
                      <th className="p-2.5">کد کاربر (uid)</th>
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

      {/* STEP 2: CONTACT (Customers) */}
      {activeStep === 2 && (
        <div className="bg-[#181818] border border-[#282828] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
                2
              </div>
              <div>
                <h2 className="text-base font-bold text-white">ورود اطلاعات مشتریان و پرونده‌ها (جدول contact)</h2>
                <p className="text-xs text-[#888]">شامل نام شرکت، صنف، موبایل‌ها، وضعیت و اتصال به بازاریاب مسئول.</p>
              </div>
            </div>
            <div className="text-xs font-mono text-[#1DB954] bg-[#1DB954]/10 px-3 py-1 rounded-lg border border-[#1DB954]/20">
              تعداد شناسایی‌شده: {parsedContacts.length}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-[#AAA]">متن یا خروجی جدول contact:</label>
            <textarea
              rows={8}
              value={contactText}
              onChange={(e) => setContactText(e.target.value)}
              placeholder="مثال: CallID uid mobiles CompanyName job managerName lastStat ..."
              className="w-full bg-[#121212] border border-[#2e2e2e] rounded-xl p-3 text-xs font-mono text-[#DDD] focus:outline-none focus:border-[#1DB954] resize-y leading-relaxed dir-ltr"
            />
          </div>

          {/* Quick Preview Table */}
          {parsedContacts.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[#252525]">
              <div className="text-xs font-bold text-white mb-2">پیش‌نمایش رکوردهای مشتریان ({parsedContacts.length} مورد):</div>
              <div className="overflow-x-auto rounded-xl border border-[#282828]">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#202020] text-[#888] font-semibold border-b border-[#282828]">
                    <tr>
                      <th className="p-2.5">شناسه تماس (CallID)</th>
                      <th className="p-2.5">نام شرکت / برند</th>
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

      {/* STEP 3: HISTORY (Reports) */}
      {activeStep === 3 && (
        <div className="bg-[#181818] border border-[#282828] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
                3
              </div>
              <div>
                <h2 className="text-base font-bold text-white">ورود آخرین گزارش مذاکرات (جدول history)</h2>
                <p className="text-xs text-[#888]">سیستم به صورت خودکار تنها آخرین مذاکره ثبت‌شده هر مشتری را فیلتر کرده و ضمیمه پرونده می‌کند.</p>
              </div>
            </div>
            <div className="text-xs font-mono text-[#1DB954] bg-[#1DB954]/10 px-3 py-1 rounded-lg border border-[#1DB954]/20">
              تعداد شناسایی‌شده: {parsedHistory.length}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-[#AAA]">متن یا خروجی جدول history:</label>
            <textarea
              rows={8}
              value={historyText}
              onChange={(e) => setHistoryText(e.target.value)}
              placeholder="مثال: ID CallID report dateTime negotiator callNum nextFollow status rating ..."
              className="w-full bg-[#121212] border border-[#2e2e2e] rounded-xl p-3 text-xs font-mono text-[#DDD] focus:outline-none focus:border-[#1DB954] resize-y leading-relaxed dir-ltr"
            />
          </div>

          {/* Quick Preview Table */}
          {parsedHistory.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[#252525]">
              <div className="text-xs font-bold text-white mb-2">پیش‌نمایش گزارش‌ها ({parsedHistory.length} مورد):</div>
              <div className="overflow-x-auto rounded-xl border border-[#282828]">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#202020] text-[#888] font-semibold border-b border-[#282828]">
                    <tr>
                      <th className="p-2.5">شناسه تماس (CallID)</th>
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

      {/* STEP 4: PREVIEW & EXECUTE */}
      {activeStep === 4 && (
        <div className="bg-[#181818] border border-[#282828] rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1DB954]/10 border border-[#1DB954]/20 flex items-center justify-center text-[#1DB954] font-bold">
              4
            </div>
            <div>
              <h2 className="text-base font-bold text-white">بررسی خلاصه و اجرای عملیات درون‌ریزی</h2>
              <p className="text-xs text-[#888]">قبل از درج در پایگاه داده، آمار کل داده‌های آماده پردازش را بررسی نمایید.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#121212] border border-[#282828] rounded-xl p-4 text-center">
              <div className="text-2xl font-black font-mono text-[#1DB954] mb-1">
                {parsedAccounts.length}
              </div>
              <div className="text-xs font-bold text-white">کارشناس و همکار</div>
              <div className="text-[10px] text-[#777] mt-0.5">آماده ایجاد در جدول personnel</div>
            </div>

            <div className="bg-[#121212] border border-[#282828] rounded-xl p-4 text-center">
              <div className="text-2xl font-black font-mono text-blue-400 mb-1">
                {parsedContacts.length}
              </div>
              <div className="text-xs font-bold text-white">پرونده مشتری</div>
              <div className="text-[10px] text-[#777] mt-0.5">آماده ایجاد در جدول customers</div>
            </div>

            <div className="bg-[#121212] border border-[#282828] rounded-xl p-4 text-center">
              <div className="text-2xl font-black font-mono text-amber-400 mb-1">
                {parsedHistory.length}
              </div>
              <div className="text-xs font-bold text-white">گزارش مذاکره</div>
              <div className="text-[10px] text-[#777] mt-0.5">فیلتر خودکار و الصاق آخرین مذاکره</div>
            </div>
          </div>

          {importResult && (
            <div className={`p-4 rounded-xl border ${
              importResult.success ? 'bg-[#1DB954]/10 border-[#1DB954]/30 text-white' : 'bg-red-950/20 border-red-500/30 text-white'
            }`}>
              <div className="flex items-center gap-2 font-bold text-sm mb-1">
                {importResult.success ? <CheckCircle2 className="w-5 h-5 text-[#1DB954]" /> : <AlertTriangle className="w-5 h-5 text-red-400" />}
                <span>{importResult.message}</span>
              </div>
              {importResult.errors && importResult.errors.length > 0 && (
                <div className="mt-2 text-xs text-red-300 space-y-1">
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
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#252525] hover:bg-[#303030] text-[#CCC] font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
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
                  <span>در حال درون‌ریزی و اتصال روابط...</span>
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
