import React from 'react';
import {
  Users,
  UserCheck,
  Target,
  Award,
  BarChart3,
  Building,
} from 'lucide-react';
import { Customer } from '../../types';
import { DailyCustomerStats } from './types';
import {
  formatStatusLabel,
  getStatusTheme,
  toPersianDigits,
  gregorianIsoToJalali,
} from '../../utils';

interface CustomerCoverageTabProps {
  dailyDaysCount: number;
  setDailyDaysCount: (days: number) => void;
  selectedDayDetail: string | null;
  setSelectedDayDetail: (day: string | null) => void;
  dailyCustomerStats: DailyCustomerStats;
  onSelectCustomer?: (customer: Customer) => void;
}

export const CustomerCoverageTab: React.FC<CustomerCoverageTabProps> = ({
  dailyDaysCount,
  setDailyDaysCount,
  selectedDayDetail,
  setSelectedDayDetail,
  dailyCustomerStats,
  onSelectCustomer,
}) => {
  const maxDailyCustomers = Math.max(...dailyCustomerStats.daysList.map((d) => d.uniqueCount), 5);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#181818] border border-[#282828] p-3.5 rounded-2xl">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-[#1DB954]" />
          <span className="text-xs font-bold text-white">بازه پایش تعامل با مشتریان:</span>
          <div className="flex items-center gap-1.5 bg-[#121212] p-1 rounded-xl border border-[#282828]">
            {[7, 14, 30].map((days) => (
              <button
                key={days}
                onClick={() => {
                  setDailyDaysCount(days);
                  setSelectedDayDetail(null);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  dailyDaysCount === days
                    ? 'bg-[#1DB954] text-black font-mono shadow-sm'
                    : 'text-[#888] hover:text-white font-mono'
                }`}
              >
                {days} روز گذشته
              </button>
            ))}
          </div>
        </div>

        <div className="text-xs text-[#888] flex items-center gap-2">
          <span>کل مشتریان تحت پوشش:</span>
          <span className="font-mono font-bold text-[#1DB954] bg-[#121212] px-2.5 py-0.5 rounded border border-[#282828]">
            {toPersianDigits(dailyCustomerStats.totalAssignedCustomers)} مشتری
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-[#181818] border border-[#282828] space-y-2 hover:border-[#383838] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#A7A7A7]">مشتریان منحصر‌به‌فرد پیگیری‌شده</span>
            <div className="w-8 h-8 rounded-xl bg-[#1DB954]/15 text-[#1DB954] flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-mono">
              {toPersianDigits(dailyCustomerStats.totalUniqueCustomersTouched)}
            </span>
            <span className="text-xs text-[#888]">مشتری یکتا</span>
          </div>
          <div className="text-[11px] text-[#A7A7A7] pt-1 border-t border-[#242424]">
            در بازه {toPersianDigits(dailyDaysCount)} روز اخیر حداقل یک‌بار مذاکره شده‌اند
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#181818] border border-[#282828] space-y-2 hover:border-[#383838] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#A7A7A7]">میانگین پوشش مشتری در روز</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-blue-400 font-mono">
              {toPersianDigits(dailyCustomerStats.avgCustomersPerDay)}
            </span>
            <span className="text-xs text-[#888]">مشتری در روز</span>
          </div>
          <div className="text-[11px] text-[#A7A7A7] pt-1 border-t border-[#242424]">
            میانگین تعداد پرونده‌های مشتریان بررسی‌شده در هر روز تقویمی
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#181818] border border-[#282828] space-y-2 hover:border-[#383838] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#A7A7A7]">نرخ پوشش کل پرونده‌ها</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400 font-mono">
              {dailyCustomerStats.totalAssignedCustomers > 0
                ? toPersianDigits(
                    (
                      (dailyCustomerStats.totalUniqueCustomersTouched /
                        dailyCustomerStats.totalAssignedCustomers) *
                      100
                    ).toFixed(1)
                  )
                : '۰'}
              %
            </span>
            <span className="text-xs text-[#888]">پوشش پرونده‌ها</span>
          </div>
          <div className="text-[11px] text-[#A7A7A7] pt-1 border-t border-[#242424]">
            درصد مشتریان تخصیص‌یافته که پیگیری روی آن‌ها انجام شده است
          </div>
        </div>
      </div>

      {/* Daily Customer Interaction Chart */}
      <div className="p-5 rounded-2xl bg-[#181818] border border-[#282828] space-y-4">
        <div className="flex items-center justify-between border-b border-[#282828] pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#1DB954]" />
            <h3 className="text-sm font-bold text-white">
              نمودار تعامل روزانه با مشتریان منحصر‌به‌فرد
            </h3>
          </div>
        </div>

        <div className="pt-4 pb-2">
          <div className="grid grid-cols-7 sm:grid-cols-14 gap-2 items-end h-52 px-2">
            {dailyCustomerStats.daysList.map((day) => {
              const heightPercent = maxDailyCustomers > 0 ? (day.uniqueCount / maxDailyCustomers) * 100 : 0;
              const isSelected = selectedDayDetail === day.dateIso;

              return (
                <div
                  key={day.dateIso}
                  onClick={() => setSelectedDayDetail(isSelected ? null : day.dateIso)}
                  className="group flex flex-col items-center justify-end h-full cursor-pointer relative"
                >
                  {/* Tooltip */}
                  <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute -top-12 z-30 transition-all bg-[#0d0d0d] border border-[#333] px-2.5 py-1 rounded-xl shadow-2xl text-[11px] text-white whitespace-nowrap">
                    <div className="font-bold text-[#1DB954]">{day.dayName} {toPersianDigits(day.dateJalali)}</div>
                    <div>{toPersianDigits(day.uniqueCount)} مشتری منحصر‌به‌فرد</div>
                  </div>

                  {/* Top Count */}
                  <div
                    className={`text-[10px] font-mono font-bold mb-1 ${
                      day.uniqueCount > 0 ? 'text-white' : 'text-[#444]'
                    }`}
                  >
                    {day.uniqueCount > 0 ? toPersianDigits(day.uniqueCount) : '۰'}
                  </div>

                  {/* Bar */}
                  <div className="w-full max-w-[28px] bg-[#242424] rounded-t-lg h-full flex flex-col justify-end p-0.5 overflow-hidden">
                    <div
                      style={{ height: `${Math.max(heightPercent, day.uniqueCount > 0 ? 8 : 0)}%` }}
                      className={`w-full rounded-t-md transition-all duration-300 ${
                        isSelected
                          ? 'bg-gradient-to-t from-blue-600 to-blue-400 shadow-lg shadow-blue-500/50'
                          : day.uniqueCount > 0
                          ? 'bg-gradient-to-t from-blue-700 to-blue-400 group-hover:brightness-125'
                          : 'bg-transparent'
                      }`}
                    />
                  </div>

                  {/* Date */}
                  <div className="mt-2 text-center">
                    <div className="text-[10px] text-[#777] font-mono truncate">
                      {toPersianDigits(day.dateJalali.split('/').slice(1).join('/'))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Customers Engaged Table */}
      <div className="p-5 rounded-2xl bg-[#181818] border border-[#282828] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-[#1DB954]" />
            <h3 className="text-sm font-bold text-white">
              {selectedDayDetail
                ? `مشتریان پیگیری‌شده در تاریخ ${toPersianDigits(gregorianIsoToJalali(selectedDayDetail))}`
                : 'فهرست تعاملات مشتریان در بازه جاری'}
            </h3>
          </div>
          {selectedDayDetail && (
            <button
              onClick={() => setSelectedDayDetail(null)}
              className="text-xs text-[#1DB954] hover:underline"
            >
              نمایش همه روزها
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-[#282828] text-[#888]">
                <th className="py-2.5 px-3 font-semibold">تاریخ</th>
                <th className="py-2.5 px-3 font-semibold">نام مشتری / فروشگاه</th>
                <th className="py-2.5 px-3 font-semibold">حوزه فعالیت / شهر</th>
                <th className="py-2.5 px-3 font-semibold">آخرین وضعیت ثبت‌شده</th>
                <th className="py-2.5 px-3 font-semibold">امتیاز مذاکره</th>
                <th className="py-2.5 px-3 font-semibold">کارشناس پیگیری</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222]">
              {dailyCustomerStats.daysList
                .filter((d) => (selectedDayDetail ? d.dateIso === selectedDayDetail : true))
                .flatMap((day) =>
                  day.customersList.map((item, idx) => {
                    const stTheme = getStatusTheme(item.latestReport.negotiation_status);
                    return (
                      <tr
                        key={`${day.dateIso}-${item.latestReport.id}-${idx}`}
                        className="hover:bg-[#202020] transition-colors"
                      >
                        <td className="py-3 px-3 font-mono text-[#888]">
                          {toPersianDigits(day.dateJalali)} ({day.dayName})
                        </td>
                        <td className="py-3 px-3 font-bold text-white">
                          {item.customer ? (
                            <button
                              onClick={() => onSelectCustomer && onSelectCustomer(item.customer!)}
                              className="hover:text-[#1DB954] transition-colors"
                            >
                              {item.customer.company_name}
                            </button>
                          ) : (
                            'مشتری بدون پرونده'
                          )}
                        </td>
                        <td className="py-3 px-3 text-[#A7A7A7]">
                          {item.customer?.business_type || '-'} ({item.customer?.city || '-'})
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`text-[10px] px-2.5 py-0.5 rounded-full border ${stTheme.bg} ${stTheme.color} font-medium`}
                          >
                            {formatStatusLabel(item.latestReport.negotiation_status)}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-amber-400">
                          {toPersianDigits(item.latestReport.negotiation_score)}/10
                        </td>
                        <td className="py-3 px-3 text-white">
                          {item.latestReport.negotiator_name}
                        </td>
                      </tr>
                    );
                  })
                )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
