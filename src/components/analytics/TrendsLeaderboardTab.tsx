import React from 'react';
import {
  Calendar,
  PieChart,
  Target,
  Award,
  User,
} from 'lucide-react';
import { PeriodPreset, PeriodicStats } from './types';
import {
  formatToman,
  getStatusTheme,
  toPersianDigits,
} from '../../utils';
import { PersianDatePicker } from '../PersianDatePicker';

interface TrendsLeaderboardTabProps {
  periodPreset: PeriodPreset;
  setPeriodPreset: (preset: PeriodPreset) => void;
  customStartDate: string;
  setCustomStartDate: (date: string) => void;
  customEndDate: string;
  setCustomEndDate: (date: string) => void;
  periodicStats: PeriodicStats;
  userIsAdmin: boolean;
}

export const TrendsLeaderboardTab: React.FC<TrendsLeaderboardTabProps> = ({
  periodPreset,
  setPeriodPreset,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
  periodicStats,
  userIsAdmin,
}) => {
  return (
    <div className="space-y-6">
      {/* Period Preset & Custom Date Selector */}
      <div className="bg-[#181818] border border-[#282828] p-4 rounded-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#1DB954]" />
            <span className="text-xs font-bold text-white">انتخاب بازه زمانی دوره:</span>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[#121212] p-1 rounded-xl border border-[#282828]">
            {[
              { id: 'today' as PeriodPreset, label: 'امروز' },
              { id: 'last_7_days' as PeriodPreset, label: '۷ روز گذشته' },
              { id: 'last_30_days' as PeriodPreset, label: '۳۰ روز گذشته' },
              { id: 'last_90_days' as PeriodPreset, label: '۳ ماه گذشته' },
              { id: 'this_year' as PeriodPreset, label: 'امسال' },
              { id: 'custom' as PeriodPreset, label: 'بازه دلخواه' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setPeriodPreset(item.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  periodPreset === item.id
                    ? 'bg-[#1DB954] text-black shadow-md'
                    : 'text-[#888] hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Range Pickers if 'custom' is active */}
        {periodPreset === 'custom' && (
          <div className="pt-3 border-t border-[#262626] grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in">
            <div>
              <PersianDatePicker
                label="از تاریخ (شروع دوره)"
                value={customStartDate}
                onChange={(iso) => setCustomStartDate(iso)}
              />
            </div>
            <div>
              <PersianDatePicker
                label="تا تاریخ (پایان دوره)"
                value={customEndDate}
                onChange={(iso) => setCustomEndDate(iso)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Period Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        <div className="p-4 rounded-2xl bg-[#181818] border border-[#282828] space-y-1">
          <span className="text-[11px] text-[#A7A7A7]">کل گزارش‌های دوره</span>
          <div className="text-2xl font-black text-white font-mono">
            {toPersianDigits(periodicStats.totalReports)}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#181818] border border-[#282828] space-y-1">
          <span className="text-[11px] text-[#A7A7A7]">مشتریان پیگیری‌شده</span>
          <div className="text-2xl font-black text-blue-400 font-mono">
            {toPersianDigits(periodicStats.totalUniqueCustomers)}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#181818] border border-[#282828] space-y-1">
          <span className="text-[11px] text-[#A7A7A7]">قراردادهای نهایی</span>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            {toPersianDigits(periodicStats.totalContracts)}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#181818] border border-[#282828] space-y-1 sm:col-span-2 lg:col-span-1 xl:col-span-2">
          <span className="text-[11px] text-[#A7A7A7]">مجموع ارزش قراردادها</span>
          <div className="text-lg font-black text-[#1DB954] font-mono truncate">
            {periodicStats.totalContractAmount > 0
              ? formatToman(periodicStats.totalContractAmount)
              : '۰ تومان'}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#181818] border border-[#282828] space-y-1">
          <span className="text-[11px] text-[#A7A7A7]">نرخ تبدیل موفق</span>
          <div className="text-2xl font-black text-amber-400 font-mono">
            {toPersianDigits(periodicStats.conversionRate)}%
          </div>
        </div>
      </div>

      {/* Status Breakdown & Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Status Distribution Donut-style List */}
        <div className="p-5 rounded-2xl bg-[#181818] border border-[#282828] space-y-4">
          <div className="flex items-center gap-2 border-b border-[#282828] pb-3">
            <PieChart className="w-4 h-4 text-[#1DB954]" />
            <h3 className="text-sm font-bold text-white">توزیع وضعیت‌های مذاکره در این دوره</h3>
          </div>

          <div className="space-y-2.5">
            {Object.entries(periodicStats.statusBreakdown).length > 0 ? (
              Object.entries(periodicStats.statusBreakdown)
                .sort((a, b) => b[1] - a[1])
                .map(([statusName, count]) => {
                  const percent =
                    periodicStats.totalReports > 0
                      ? ((count / periodicStats.totalReports) * 100).toFixed(1)
                      : '0';
                  const theme = getStatusTheme(statusName);

                  return (
                    <div key={statusName} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2 font-medium text-white">
                          <span className={`w-2.5 h-2.5 rounded-full ${theme.dot}`} />
                          <span>{statusName}</span>
                        </span>
                        <span className="font-mono text-[#A7A7A7]">
                          {toPersianDigits(count)} ({toPersianDigits(percent)}%)
                        </span>
                      </div>
                      <div className="w-full bg-[#242424] h-2 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${percent}%` }}
                          className="h-full rounded-full bg-[#1DB954] transition-all duration-500"
                        />
                      </div>
                    </div>
                  );
                })
            ) : (
              <div className="p-8 text-center text-xs text-[#888]">
                هیچ گزارشی در بازه انتخابی ثبت نشده است.
              </div>
            )}
          </div>
        </div>

        {/* Sales Conversion Funnel */}
        <div className="p-5 rounded-2xl bg-[#181818] border border-[#282828] space-y-4">
          <div className="flex items-center gap-2 border-b border-[#282828] pb-3">
            <Target className="w-4 h-4 text-[#1DB954]" />
            <h3 className="text-sm font-bold text-white">قیف تبدیل عملکرد دوره (Conversion Funnel)</h3>
          </div>

          <div className="space-y-3 pt-2">
            {/* Step 1 */}
            <div className="p-3 rounded-xl bg-[#121212] border border-[#282828] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center font-mono">
                  ۱
                </span>
                <div>
                  <div className="text-xs font-bold text-white">مشتریان در مرحله تماس اولیه</div>
                  <div className="text-[10px] text-[#888]">شروع ارتباط و اعلام نیاز</div>
                </div>
              </div>
              <div className="text-sm font-black font-mono text-white">
                {toPersianDigits(periodicStats.totalUniqueCustomers)}
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-3 rounded-xl bg-[#121212] border border-[#282828] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold text-xs flex items-center justify-center font-mono">
                  ۲
                </span>
                <div>
                  <div className="text-xs font-bold text-white">پیگیری‌های فعال و مذاکره</div>
                  <div className="text-[10px] text-[#888]">ارسال پروپوزال و مذاکره مالی</div>
                </div>
              </div>
              <div className="text-sm font-black font-mono text-amber-400">
                {toPersianDigits(
                  (periodicStats.statusBreakdown['پیگیری قرارداد'] || 0) +
                    (periodicStats.statusBreakdown['پیش نویس قرارداد'] || 0) +
                    (periodicStats.statusBreakdown['پیگیری قبل از انقضا'] || 0)
                )}
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-3 rounded-xl bg-[#1DB954]/10 border border-[#1DB954]/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#1DB954] text-black font-bold text-xs flex items-center justify-center font-mono">
                  ۳
                </span>
                <div>
                  <div className="text-xs font-bold text-[#1DB954]">قرارداد نهایی و صدور فاکتور</div>
                  <div className="text-[10px] text-[#A7A7A7]">فروش قطعی و درآمدزایی</div>
                </div>
              </div>
              <div className="text-sm font-black font-mono text-[#1DB954]">
                {toPersianDigits(periodicStats.totalContracts)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Personnel Leaderboard / Performance Matrix (Admin Only) */}
      {userIsAdmin && (
        <div className="p-5 rounded-2xl bg-[#181818] border border-[#282828] space-y-4">
          <div className="flex items-center justify-between border-b border-[#282828] pb-3">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">
                جدول مقایسه عملکرد و رتبه‌بندی پرسنل در این دوره
              </h3>
            </div>
            <span className="text-xs text-[#888]">بر اساس تعداد قراردادها و حجم فعالیت</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-[#282828] text-[#888]">
                  <th className="py-2.5 px-3 font-semibold">رتبه</th>
                  <th className="py-2.5 px-3 font-semibold">نام کارشناس</th>
                  <th className="py-2.5 px-3 font-semibold">تعداد گزارش‌ها</th>
                  <th className="py-2.5 px-3 font-semibold">مشتریان یکتا</th>
                  <th className="py-2.5 px-3 font-semibold">قراردادهای نهایی</th>
                  <th className="py-2.5 px-3 font-semibold">مجموع مبالغ (تومان)</th>
                  <th className="py-2.5 px-3 font-semibold">میانگین امتیاز</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222]">
                {periodicStats.personnelRanking.map((p, idx) => (
                  <tr key={p.personnelName} className="hover:bg-[#202020] transition-colors">
                    <td className="py-3 px-3 font-mono font-bold">
                      {idx === 0 ? (
                        <span className="w-6 h-6 rounded-full bg-amber-400 text-black flex items-center justify-center text-xs">
                          ۱
                        </span>
                      ) : idx === 1 ? (
                        <span className="w-6 h-6 rounded-full bg-gray-300 text-black flex items-center justify-center text-xs">
                          ۲
                        </span>
                      ) : idx === 2 ? (
                        <span className="w-6 h-6 rounded-full bg-amber-700 text-white flex items-center justify-center text-xs">
                          ۳
                        </span>
                      ) : (
                        <span className="text-[#888] pr-2">{idx + 1}</span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-bold text-white flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-[#1DB954]" />
                      <span>{p.personnelName}</span>
                    </td>
                    <td className="py-3 px-3 font-mono text-[#ddd]">
                      {toPersianDigits(p.reportsCount)}
                    </td>
                    <td className="py-3 px-3 font-mono text-blue-400 font-bold">
                      {toPersianDigits(p.uniqueCustomersCount)}
                    </td>
                    <td className="py-3 px-3 font-mono text-emerald-400 font-black">
                      {toPersianDigits(p.contractsCount)}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-[#1DB954]">
                      {p.totalAmount > 0 ? formatToman(p.totalAmount) : '-'}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-amber-400">
                      {toPersianDigits(p.avgScore)}/10
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
