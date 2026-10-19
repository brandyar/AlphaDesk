import React from 'react';
import {
  Clock,
  MessageSquareText,
  FileCheck2,
  Star,
  Zap,
  TrendingUp,
  Layers,
} from 'lucide-react';
import { Customer } from '../../types';
import { DailyReportStats } from './types';
import {
  formatPersianDateTime,
  formatToman,
  formatStatusLabel,
  getStatusTheme,
  toPersianDigits,
  gregorianIsoToJalali,
} from '../../utils';

interface DailyReportsTabProps {
  dailyDaysCount: number;
  setDailyDaysCount: (days: number) => void;
  selectedDayDetail: string | null;
  setSelectedDayDetail: (day: string | null) => void;
  dailyReportStats: DailyReportStats;
  customers: Customer[];
}

export const DailyReportsTab: React.FC<DailyReportsTabProps> = ({
  dailyDaysCount,
  setDailyDaysCount,
  selectedDayDetail,
  setSelectedDayDetail,
  dailyReportStats,
  customers,
}) => {
  const maxDailyReports = Math.max(...dailyReportStats.daysList.map((d) => d.reportsCount), 5);

  return (
    <div className="space-y-6">
      {/* Controls & Range Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#181818] border border-[#282828] p-3.5 rounded-2xl">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#1DB954]" />
          <span className="text-xs font-bold text-white">بازه تحلیل روزانه:</span>
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
          <span>روزهای با فعالیت ثبت شده:</span>
          <span className="font-mono font-bold text-[#1DB954] bg-[#121212] px-2 py-0.5 rounded border border-[#282828]">
            {toPersianDigits(dailyReportStats.activeDaysCount)} از {toPersianDigits(dailyDaysCount)} روز
          </span>
        </div>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#181818] border border-[#282828] space-y-2 hover:border-[#383838] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#A7A7A7]">کل گزارش‌های بازه</span>
            <div className="w-8 h-8 rounded-xl bg-[#1DB954]/15 text-[#1DB954] flex items-center justify-center">
              <MessageSquareText className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-mono">
              {toPersianDigits(dailyReportStats.totalReports)}
            </span>
            <span className="text-[11px] text-[#888]">گزارش ثبت شده</span>
          </div>
          <div className="text-[11px] text-[#A7A7A7] flex items-center gap-1 pt-1 border-t border-[#242424]">
            <span>میانگین روزانه:</span>
            <span className="text-white font-bold font-mono">{toPersianDigits(dailyReportStats.avgPerActiveDay)}</span>
            <span>در روزهای فعال</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#181818] border border-[#282828] space-y-2 hover:border-[#383838] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#A7A7A7]">قراردادها و فاکتورها</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400 font-mono">
              {toPersianDigits(dailyReportStats.totalContracts)}
            </span>
            <span className="text-[11px] text-[#888]">قرارداد موفق</span>
          </div>
          <div className="text-[11px] text-[#A7A7A7] flex items-center gap-1 pt-1 border-t border-[#242424]">
            <span>مجموع مبالغ:</span>
            <span className="text-[#1DB954] font-bold font-mono">
              {dailyReportStats.totalAmount > 0 ? formatToman(dailyReportStats.totalAmount) : '۰ تومان'}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#181818] border border-[#282828] space-y-2 hover:border-[#383838] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#A7A7A7]">میانگین کیفیت مکالمات</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
              <Star className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-400 font-mono">
              {toPersianDigits(dailyReportStats.avgScore)}
            </span>
            <span className="text-xs text-[#888]">از ۱۰</span>
          </div>
          <div className="text-[11px] text-[#A7A7A7] flex items-center gap-1 pt-1 border-t border-[#242424]">
            <span>امتیاز ثبت‌شده توسط کارشناسان</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#181818] border border-[#282828] space-y-2 hover:border-[#383838] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#A7A7A7]">روز اوج ثبت گزارش</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-white font-mono">
              {dailyReportStats.peakDay && dailyReportStats.peakDay.reportsCount > 0
                ? `${toPersianDigits(dailyReportStats.peakDay.reportsCount)} گزارش`
                : 'بدون ثبت'}
            </span>
          </div>
          <div className="text-[11px] text-[#A7A7A7] flex items-center gap-1 pt-1 border-t border-[#242424]">
            <span>تاریخ:</span>
            <span className="text-white font-mono font-bold">
              {dailyReportStats.peakDay && dailyReportStats.peakDay.reportsCount > 0
                ? `${dailyReportStats.peakDay.dayName} ${toPersianDigits(dailyReportStats.peakDay.dateJalali)}`
                : '-'}
            </span>
          </div>
        </div>
      </div>

      {/* Daily Interactive Bar & Area Chart */}
      <div className="p-5 rounded-2xl bg-[#181818] border border-[#282828] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#282828] pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#1DB954]" />
            <h3 className="text-sm font-bold text-white">
              نمودار ستونی و روند ثبت گزارش‌ها در {toPersianDigits(dailyDaysCount)} روز گذشته
            </h3>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-[#1DB954]" />
              <span className="text-[#A7A7A7]">تعداد گزارش روزانه</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-400" />
              <span className="text-[#A7A7A7]">قرارداد / فاکتور</span>
            </div>
          </div>
        </div>

        {/* Custom Interactive SVG / HTML Bar Chart */}
        <div className="pt-4 pb-2">
          <div className="grid grid-cols-7 sm:grid-cols-14 gap-2 items-end h-56 px-2">
            {dailyReportStats.daysList.map((day) => {
              const heightPercent = maxDailyReports > 0 ? (day.reportsCount / maxDailyReports) * 100 : 0;
              const isSelected = selectedDayDetail === day.dateIso;
              const hasContract = day.contractsCount > 0;

              return (
                <div
                  key={day.dateIso}
                  onClick={() => setSelectedDayDetail(isSelected ? null : day.dateIso)}
                  className="group flex flex-col items-center justify-end h-full cursor-pointer relative"
                >
                  {/* Tooltip on Hover */}
                  <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute -top-14 z-30 transition-all bg-[#0d0d0d] border border-[#333] px-2.5 py-1.5 rounded-xl shadow-2xl text-[11px] text-white whitespace-nowrap">
                    <div className="font-bold text-[#1DB954]">{day.dayName} {toPersianDigits(day.dateJalali)}</div>
                    <div>{toPersianDigits(day.reportsCount)} گزارش ثبت شده</div>
                    {day.contractsCount > 0 && (
                      <div className="text-amber-400 font-bold font-mono">
                        {toPersianDigits(day.contractsCount)} قرارداد ({formatToman(day.contractsAmount)})
                      </div>
                    )}
                  </div>

                  {/* Number on top of bar */}
                  <div
                    className={`text-[10px] font-mono font-bold mb-1 transition-colors ${
                      day.reportsCount > 0 ? (isSelected ? 'text-[#1DB954]' : 'text-white') : 'text-[#444]'
                    }`}
                  >
                    {day.reportsCount > 0 ? toPersianDigits(day.reportsCount) : '۰'}
                  </div>

                  {/* Bar Pillar */}
                  <div className="w-full max-w-[28px] bg-[#242424] rounded-t-lg h-full flex flex-col justify-end p-0.5 overflow-hidden">
                    <div
                      style={{ height: `${Math.max(heightPercent, day.reportsCount > 0 ? 8 : 0)}%` }}
                      className={`w-full rounded-t-md transition-all duration-300 ${
                        isSelected
                          ? 'bg-gradient-to-t from-[#14833b] to-[#1ED760] shadow-lg shadow-[#1DB954]/50'
                          : hasContract
                          ? 'bg-gradient-to-t from-[#1DB954] to-amber-400 group-hover:brightness-125'
                          : day.reportsCount > 0
                          ? 'bg-gradient-to-t from-[#14833b] to-[#1DB954] group-hover:brightness-125'
                          : 'bg-transparent'
                      }`}
                    />
                  </div>

                  {/* X-axis date label */}
                  <div className="mt-2 text-center">
                    <div className="text-[10px] text-[#777] font-mono group-hover:text-white transition-colors truncate">
                      {toPersianDigits(day.dateJalali.split('/').slice(1).join('/'))}
                    </div>
                    <div className="text-[9px] text-[#555]">{day.dayName}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="text-center text-[11px] text-[#777] pt-2 border-t border-[#222]">
          برای مشاهده گزارش‌های ثبت‌شده هر روز، روی ستون مربوط به آن روز کلیک کنید.
        </div>
      </div>

      {/* Details of Selected Day or Full Day Breakdown Table */}
      <div className="p-5 rounded-2xl bg-[#181818] border border-[#282828] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#1DB954]" />
            <h3 className="text-sm font-bold text-white">
              {selectedDayDetail
                ? `جزئیات گزارش‌های روز ${toPersianDigits(gregorianIsoToJalali(selectedDayDetail))}`
                : 'جدول تفکیکی گزارش‌های روزانه'}
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

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-[#282828] text-[#888]">
                <th className="py-2.5 px-3 font-semibold">تاریخ (شمسی)</th>
                <th className="py-2.5 px-3 font-semibold">روز هفته</th>
                <th className="py-2.5 px-3 font-semibold">تعداد گزارش</th>
                <th className="py-2.5 px-3 font-semibold">قرارداد / فاکتور</th>
                <th className="py-2.5 px-3 font-semibold">مبلغ قراردادها</th>
                <th className="py-2.5 px-3 font-semibold">میانگین امتیاز</th>
                <th className="py-2.5 px-3 font-semibold">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222]">
              {dailyReportStats.daysList
                .filter((d) => (selectedDayDetail ? d.dateIso === selectedDayDetail : true))
                .map((day) => (
                  <tr
                    key={day.dateIso}
                    className={`hover:bg-[#202020] transition-colors ${
                      day.reportsCount > 0 ? 'text-white' : 'text-[#666]'
                    }`}
                  >
                    <td className="py-3 px-3 font-mono font-bold text-white">
                      {toPersianDigits(day.dateJalali)}
                    </td>
                    <td className="py-3 px-3 text-[#A7A7A7]">{day.dayName}</td>
                    <td className="py-3 px-3 font-mono font-bold">
                      {day.reportsCount > 0 ? (
                        <span className="px-2 py-0.5 rounded bg-[#1DB954]/15 text-[#1DB954] border border-[#1DB954]/30">
                          {toPersianDigits(day.reportsCount)} گزارش
                        </span>
                      ) : (
                        <span className="text-[#555]">۰</span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono">
                      {day.contractsCount > 0 ? (
                        <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 font-bold border border-amber-500/30">
                          {toPersianDigits(day.contractsCount)} قرارداد
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-[#1DB954]">
                      {day.contractsAmount > 0 ? formatToman(day.contractsAmount) : '-'}
                    </td>
                    <td className="py-3 px-3 font-mono">
                      {day.scoresCount > 0
                        ? `${toPersianDigits((day.scoresSum / day.scoresCount).toFixed(1))} / ۱۰`
                        : '-'}
                    </td>
                    <td className="py-3 px-3">
                      {day.reportsCount > 0 ? (
                        <button
                          onClick={() => setSelectedDayDetail(day.dateIso)}
                          className="px-2.5 py-1 rounded-lg bg-[#282828] hover:bg-[#333] text-white text-[11px] transition-colors"
                        >
                          مشاهده ریز گزارش‌ها
                        </button>
                      ) : (
                        <span className="text-[#555]">-</span>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* List of reports for selected single day */}
        {selectedDayDetail && (
          <div className="pt-4 border-t border-[#282828] space-y-3">
            <div className="font-bold text-xs text-white">
              فهرست گزارش‌های ثبت شده در تاریخ {toPersianDigits(gregorianIsoToJalali(selectedDayDetail))}:
            </div>
            {dailyReportStats.daysList
              .find((d) => d.dateIso === selectedDayDetail)
              ?.reports.map((rep) => {
                const cust = customers.find((c) => c.id === rep.customer_id);
                const stTheme = getStatusTheme(rep.negotiation_status);

                return (
                  <div
                    key={rep.id}
                    className="p-3.5 rounded-xl bg-[#121212] border border-[#262626] space-y-2 hover:border-[#3a3a3a] transition-all"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-xs text-white">
                          {cust ? cust.company_name : 'مشتری نامشخص'}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full border ${stTheme.bg} ${stTheme.color} font-medium`}
                        >
                          {formatStatusLabel(rep.negotiation_status)}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-[#888]">
                        <span>کارشناس: {rep.negotiator_name}</span>
                        <span>امتیاز: {toPersianDigits(rep.negotiation_score)}/10</span>
                        <span className="font-mono">{formatPersianDateTime(rep.date_created)}</span>
                      </div>
                    </div>

                    <p className="text-xs text-[#bbb] leading-relaxed whitespace-pre-wrap">
                      {rep.report_text}
                    </p>

                    {(rep.contract_number || rep.contract_amount) && (
                      <div className="p-2.5 rounded-lg bg-[#1DB954]/10 border border-[#1DB954]/25 text-xs flex items-center justify-between text-[#1DB954]">
                        <span className="font-bold">سند قرارداد / فاکتور: {rep.contract_number || 'ثبت شده'}</span>
                        <span className="font-mono font-bold">{formatToman(rep.contract_amount)}</span>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
};
