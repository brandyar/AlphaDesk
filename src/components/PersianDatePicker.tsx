import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Clock, AlertCircle, Check } from 'lucide-react';
import {
  JALALI_MONTH_NAMES,
  JALALI_WEEK_DAYS,
  toPersianDigits,
  gregorianToJalali,
  jalaliToGregorian,
  getJalaliDaysInMonth,
  gregorianIsoToJalali,
  jalaliToGregorianIso,
  getTodayJalali,
  jalaliAndTimeToIso,
  parseIsoToJalaliAndTime,
} from '../utils';

export interface PersianDatePickerProps {
  value?: string | null; // ISO string ("2026-10-01" or "2026-11-07T14:30:00.000Z") or empty
  onChange: (isoValue: string, jalaliValue: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  label?: string;
  showQuickPresets?: boolean;
  showTime?: boolean; // When true, enables hour & minute selector
  disablePast?: boolean; // When true, prevents picking past dates/times
}

export const PersianDatePicker: React.FC<PersianDatePickerProps> = ({
  value,
  onChange,
  placeholder = 'انتخاب تاریخ شمسی...',
  disabled = false,
  required = false,
  className = '',
  label,
  showQuickPresets = true,
  showTime = false,
  disablePast = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const today = getTodayJalali();

  // Initialize Jalali date and time from value
  const parsedInit = parseIsoToJalaliAndTime(value);
  const [inputValue, setInputValue] = useState(value ? parsedInit.jalaliDate : '');
  const [selectedHour, setSelectedHour] = useState<number>(parsedInit.hour);
  const [selectedMinute, setSelectedMinute] = useState<number>(parsedInit.minute);

  const parsedParts = inputValue ? inputValue.split('/').map((n) => parseInt(n, 10)) : [today.jy, today.jm, today.jd];

  const [viewYear, setViewYear] = useState<number>(parsedParts[0] || today.jy);
  const [viewMonth, setViewMonth] = useState<number>(parsedParts[1] || today.jm);
  const [selectedDay, setSelectedDay] = useState<number>(parsedParts[2] || today.jd);

  // Sync state when external value changes
  useEffect(() => {
    if (value) {
      const parsed = parseIsoToJalaliAndTime(value);
      setInputValue(parsed.jalaliDate);
      setSelectedHour(parsed.hour);
      setSelectedMinute(parsed.minute);
      const parts = parsed.jalaliDate.split('/').map((n) => parseInt(n, 10));
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        setViewYear(parts[0]);
        setViewMonth(parts[1]);
        setSelectedDay(parts[2]);
      }
    } else {
      setInputValue('');
    }
  }, [value]);

  // Check if a specific day is in the past
  const isPastDay = (y: number, m: number, d: number) => {
    if (!disablePast) return false;
    if (y < today.jy) return true;
    if (y === today.jy && m < today.jm) return true;
    if (y === today.jy && m === today.jm && d < today.jd) return true;
    return false;
  };

  // Check if current selection in the modal is in the past
  const isCurrentSelectionInPast = () => {
    if (!disablePast) return false;
    const isPastDate = isPastDay(viewYear, viewMonth, selectedDay);
    if (isPastDate) return true;

    if (showTime) {
      const mm = String(viewMonth).padStart(2, '0');
      const dd = String(selectedDay).padStart(2, '0');
      const jStr = `${viewYear}/${mm}/${dd}`;
      const iso = jalaliAndTimeToIso(jStr, selectedHour, selectedMinute);
      if (!iso) return false;
      const targetTime = new Date(iso).getTime();
      return targetTime <= Date.now();
    }
    return false;
  };

  const hasPastError = isCurrentSelectionInPast();

  // Commit changes and close
  const commitSelection = (year = viewYear, month = viewMonth, day = selectedDay, h = selectedHour, m = selectedMinute) => {
    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const jStr = `${year}/${mm}/${dd}`;

    let isoStr = '';
    if (showTime) {
      isoStr = jalaliAndTimeToIso(jStr, h, m);
    } else {
      isoStr = jalaliToGregorianIso(jStr);
    }

    setInputValue(jStr);
    onChange(isoStr, jStr);
    setIsOpen(false);
  };

  const handleSelectJalaliDay = (d: number) => {
    if (isPastDay(viewYear, viewMonth, d)) return;

    setSelectedDay(d);
    if (!showTime) {
      commitSelection(viewYear, viewMonth, d);
    }
  };

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disablePast && viewYear === today.jy && viewMonth <= today.jm) {
      return; // Disallow navigating to past months
    }
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Quick preset for days
  const handleQuickSelectDays = (daysToAdd: number) => {
    const target = new Date();
    target.setDate(target.getDate() + daysToAdd);
    if (showTime) {
      target.setHours(selectedHour, selectedMinute, 0, 0);
    }
    const j = gregorianToJalali(target.getFullYear(), target.getMonth() + 1, target.getDate());
    const mm = String(j.jm).padStart(2, '0');
    const dd = String(j.jd).padStart(2, '0');
    const jStr = `${j.jy}/${mm}/${dd}`;

    let isoStr = '';
    if (showTime) {
      isoStr = target.toISOString();
    } else {
      const gmm = String(target.getMonth() + 1).padStart(2, '0');
      const gdd = String(target.getDate()).padStart(2, '0');
      isoStr = `${target.getFullYear()}-${gmm}-${gdd}`;
    }

    setInputValue(jStr);
    setViewYear(j.jy);
    setViewMonth(j.jm);
    setSelectedDay(j.jd);
    onChange(isoStr, jStr);
    setIsOpen(false);
  };

  // Quick preset for hours (e.g. 2 hours from now, 4 hours from now)
  const handleQuickAddHours = (hoursToAdd: number) => {
    const target = new Date(Date.now() + hoursToAdd * 60 * 60 * 1000);
    // Round minutes to closest 5 minutes
    const roundedMinutes = Math.round(target.getMinutes() / 5) * 5;
    target.setMinutes(roundedMinutes, 0, 0);

    const j = gregorianToJalali(target.getFullYear(), target.getMonth() + 1, target.getDate());
    const mm = String(j.jm).padStart(2, '0');
    const dd = String(j.jd).padStart(2, '0');
    const jStr = `${j.jy}/${mm}/${dd}`;
    const h = target.getHours();
    const m = target.getMinutes();
    const isoStr = target.toISOString();

    setInputValue(jStr);
    setViewYear(j.jy);
    setViewMonth(j.jm);
    setSelectedDay(j.jd);
    setSelectedHour(h);
    setSelectedMinute(m);
    onChange(isoStr, jStr);
    setIsOpen(false);
  };

  // Quick preset for specific tomorrow time
  const handleTomorrowTime = (hour: number, minute = 0) => {
    const target = new Date();
    target.setDate(target.getDate() + 1);
    target.setHours(hour, minute, 0, 0);

    const j = gregorianToJalali(target.getFullYear(), target.getMonth() + 1, target.getDate());
    const mm = String(j.jm).padStart(2, '0');
    const dd = String(j.jd).padStart(2, '0');
    const jStr = `${j.jy}/${mm}/${dd}`;
    const isoStr = target.toISOString();

    setInputValue(jStr);
    setViewYear(j.jy);
    setViewMonth(j.jm);
    setSelectedDay(j.jd);
    setSelectedHour(hour);
    setSelectedMinute(minute);
    onChange(isoStr, jStr);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setInputValue('');
    onChange('', '');
  };

  // Generate days in current Jalali month
  const totalDays = getJalaliDaysInMonth(viewYear, viewMonth);
  // Calculate day of week for 1st day of this Jalali month
  const firstG = jalaliToGregorian(viewYear, viewMonth, 1);
  const firstGDate = new Date(firstG.gy, firstG.gm - 1, firstG.gd);
  const gDay = firstGDate.getDay();
  const jalaliFirstDayOffset = (gDay + 1) % 7;

  const currentSelectedParts = inputValue ? inputValue.split('/').map((n) => parseInt(n, 10)) : [];
  const isSelected = (day: number) =>
    currentSelectedParts.length === 3 &&
    currentSelectedParts[0] === viewYear &&
    currentSelectedParts[1] === viewMonth &&
    currentSelectedParts[2] === day;

  const isCurrentToday = (day: number) =>
    today.jy === viewYear && today.jm === viewMonth && today.jd === day;

  // Render centered calendar dialog
  const modalCalendar = isOpen && !disabled && (
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={() => setIsOpen(false)}
      dir="rtl"
    >
      <div
        className="w-full max-w-[370px] bg-white dark:bg-[#181818] border border-slate-200 dark:border-[#333333] rounded-2xl shadow-2xl overflow-hidden p-4 sm:p-5 space-y-3.5 text-slate-900 dark:text-white scale-100 animate-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#282828] pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 dark:bg-[#1DB954]/15 dark:text-[#1DB954] flex items-center justify-center shrink-0">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                {showTime ? 'تنظیم موعد پیگیری' : 'انتخاب تاریخ تقویم شمسی'}
              </h4>
              <p className="text-[10px] text-slate-500 dark:text-[#A7A7A7]">
                {label ? label : 'انتخاب روز و زمان دقیق پیگیری'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-[#282828] dark:hover:bg-[#333333] flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-[#A7A7A7] dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quick Presets Pills */}
        {showQuickPresets && (
          <div className="flex items-center gap-1.5 pb-1 overflow-x-auto no-scrollbar shrink-0">
            {showTime ? (
              <>
                <button
                  type="button"
                  onClick={() => handleQuickAddHours(2)}
                  className="px-2.5 py-1 rounded-full bg-emerald-50 hover:bg-emerald-500 hover:text-white dark:bg-[#1DB954]/15 text-emerald-800 dark:text-[#1DB954] dark:hover:bg-[#1DB954] dark:hover:text-black text-[11px] font-bold border border-emerald-300 dark:border-[#1DB954]/30 transition-all shrink-0 cursor-pointer shadow-xs"
                >
                  ⚡ ۲ ساعت دیگر
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAddHours(4)}
                  className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-emerald-500 hover:text-white dark:bg-[#242424] dark:hover:bg-[#1DB954] dark:hover:text-black text-[11px] font-bold text-slate-700 dark:text-[#d0d0d0] border border-slate-200 dark:border-transparent transition-colors shrink-0 cursor-pointer"
                >
                  ⚡ ۴ ساعت دیگر
                </button>
                <button
                  type="button"
                  onClick={() => handleTomorrowTime(10, 0)}
                  className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-emerald-500 hover:text-white dark:bg-[#242424] dark:hover:bg-[#1DB954] dark:hover:text-black text-[11px] font-bold text-slate-700 dark:text-[#d0d0d0] border border-slate-200 dark:border-transparent transition-colors shrink-0 cursor-pointer"
                >
                  فردا ۱۰:۰۰
                </button>
                <button
                  type="button"
                  onClick={() => handleTomorrowTime(16, 0)}
                  className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-emerald-500 hover:text-white dark:bg-[#242424] dark:hover:bg-[#1DB954] dark:hover:text-black text-[11px] font-bold text-slate-700 dark:text-[#d0d0d0] border border-slate-200 dark:border-transparent transition-colors shrink-0 cursor-pointer"
                >
                  فردا ۱۶:۰۰
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickSelectDays(3)}
                  className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-emerald-500 hover:text-white dark:bg-[#242424] dark:hover:bg-[#1DB954] dark:hover:text-black text-[11px] font-bold text-slate-700 dark:text-[#d0d0d0] border border-slate-200 dark:border-transparent transition-colors shrink-0 cursor-pointer"
                >
                  ۳ روز بعد
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleQuickSelectDays(0)}
                  className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-emerald-500 hover:text-white dark:bg-[#242424] dark:hover:bg-[#1DB954] dark:hover:text-black text-[11px] font-bold text-slate-700 dark:text-[#d0d0d0] border border-slate-200 dark:border-transparent transition-colors shrink-0 cursor-pointer"
                >
                  امروز
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickSelectDays(1)}
                  className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-emerald-500 hover:text-white dark:bg-[#242424] dark:hover:bg-[#1DB954] dark:hover:text-black text-[11px] font-bold text-slate-700 dark:text-[#d0d0d0] border border-slate-200 dark:border-transparent transition-colors shrink-0 cursor-pointer"
                >
                  فردا
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickSelectDays(3)}
                  className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-emerald-500 hover:text-white dark:bg-[#242424] dark:hover:bg-[#1DB954] dark:hover:text-black text-[11px] font-bold text-slate-700 dark:text-[#d0d0d0] border border-slate-200 dark:border-transparent transition-colors shrink-0 cursor-pointer"
                >
                  ۳ روز بعد
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickSelectDays(7)}
                  className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-emerald-500 hover:text-white dark:bg-[#242424] dark:hover:bg-[#1DB954] dark:hover:text-black text-[11px] font-bold text-slate-700 dark:text-[#d0d0d0] border border-slate-200 dark:border-transparent transition-colors shrink-0 cursor-pointer"
                >
                  ۱ هفته بعد
                </button>
              </>
            )}
          </div>
        )}

        {/* Month & Year Navigation Header */}
        <div className="flex items-center justify-between gap-2 p-1 bg-slate-100 dark:bg-[#121212] rounded-xl border border-slate-200 dark:border-[#262626] shrink-0">
          <button
            type="button"
            onClick={handleNextMonth}
            className="w-8 h-8 rounded-lg bg-white hover:bg-slate-200 dark:bg-[#222222] dark:hover:bg-[#2e2e2e] flex items-center justify-center text-slate-700 dark:text-white border border-slate-200 dark:border-transparent transition-colors cursor-pointer shadow-xs"
            title="ماه بعد"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <select
              value={viewMonth}
              onChange={(e) => setViewMonth(Number(e.target.value))}
              className="bg-white dark:bg-[#222222] text-xs font-bold text-slate-900 dark:text-white px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-[#333333] focus:outline-none focus:border-emerald-500 dark:focus:border-[#1DB954] cursor-pointer"
            >
              {JALALI_MONTH_NAMES.map((name, idx) => {
                const mNum = idx + 1;
                const isPastMonth = disablePast && viewYear === today.jy && mNum < today.jm;
                return (
                  <option
                    key={name}
                    value={mNum}
                    disabled={isPastMonth}
                    className="bg-white dark:bg-[#181818] text-slate-900 dark:text-white"
                  >
                    {name}
                  </option>
                );
              })}
            </select>

            <select
              value={viewYear}
              onChange={(e) => setViewYear(Number(e.target.value))}
              className="bg-white dark:bg-[#222222] text-xs font-mono font-bold text-slate-900 dark:text-white px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-[#333333] focus:outline-none focus:border-emerald-500 dark:focus:border-[#1DB954] cursor-pointer"
            >
              {Array.from({ length: 10 }, (_, i) => today.jy + i).map((yr) => (
                <option key={yr} value={yr} className="bg-white dark:bg-[#181818] text-slate-900 dark:text-white">
                  {toPersianDigits(yr)}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handlePrevMonth}
            disabled={disablePast && viewYear === today.jy && viewMonth <= today.jm}
            className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors ${
              disablePast && viewYear === today.jy && viewMonth <= today.jm
                ? 'opacity-30 cursor-not-allowed bg-transparent border-transparent text-slate-400'
                : 'bg-white hover:bg-slate-200 dark:bg-[#222222] dark:hover:bg-[#2e2e2e] text-slate-700 dark:text-white border-slate-200 dark:border-transparent cursor-pointer shadow-xs'
            }`}
            title="ماه قبل"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Weekday Labels (ش ی د س چ پ ج) */}
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-slate-500 dark:text-[#A7A7A7] py-0.5 border-b border-slate-200 dark:border-[#242424] shrink-0">
          {JALALI_WEEK_DAYS.map((wd) => (
            <div key={wd} className="py-0.5">
              {wd}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1 text-center overflow-y-auto shrink-0">
          {/* Empty offset days */}
          {Array.from({ length: jalaliFirstDayOffset }).map((_, i) => (
            <div key={`empty-${i}`} className="h-7" />
          ))}

          {/* Day buttons */}
          {Array.from({ length: totalDays }).map((_, i) => {
            const day = i + 1;
            const active = selectedDay === day;
            const isToday = isCurrentToday(day);
            const isPast = isPastDay(viewYear, viewMonth, day);

            return (
              <button
                key={`day-${day}`}
                type="button"
                disabled={isPast}
                onClick={() => handleSelectJalaliDay(day)}
                className={`h-7 rounded-lg text-xs font-mono font-semibold flex items-center justify-center transition-all ${
                  isPast
                    ? 'opacity-25 cursor-not-allowed text-slate-400 dark:text-[#555] bg-transparent'
                    : active
                    ? 'bg-[#1DB954] text-black font-bold shadow-md shadow-[#1DB954]/30 scale-105 cursor-pointer'
                    : isToday
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-400 hover:bg-emerald-100 dark:bg-[#282828] dark:text-[#1DB954] dark:border-[#1DB954]/60 dark:hover:bg-[#333] cursor-pointer'
                    : 'hover:bg-slate-100 text-slate-800 hover:text-emerald-600 dark:hover:bg-[#282828] dark:text-white dark:hover:text-[#1DB954] cursor-pointer'
                }`}
              >
                {toPersianDigits(day)}
              </button>
            );
          })}
        </div>

        {/* Time Selector Section when showTime is true */}
        {showTime && (
          <div className="pt-2 border-t border-slate-200 dark:border-[#282828] space-y-2 shrink-0">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-700 dark:text-[#d0d0d0] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-[#1DB954]" />
                <span>ساعت و دقیقه پیگیری:</span>
              </label>
              <div className="flex items-center gap-1 font-mono text-xs font-bold text-emerald-700 dark:text-[#1DB954]">
                <span>{toPersianDigits(`${String(selectedHour).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')}`)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-[#121212] p-2 rounded-xl border border-slate-200 dark:border-[#262626]">
              {/* Hour Selector */}
              <div>
                <span className="block text-[10px] text-slate-500 dark:text-[#888] mb-1">ساعت (۰ تا ۲۳):</span>
                <select
                  value={selectedHour}
                  onChange={(e) => setSelectedHour(Number(e.target.value))}
                  className="w-full h-8 px-2 bg-white dark:bg-[#222] border border-slate-200 dark:border-[#333] rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 dark:focus:border-[#1DB954]"
                >
                  {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                    <option key={h} value={h}>
                      ساعت {toPersianDigits(String(h).padStart(2, '0'))}
                    </option>
                  ))}
                </select>
              </div>

              {/* Minute Selector */}
              <div>
                <span className="block text-[10px] text-slate-500 dark:text-[#888] mb-1">دقیقه:</span>
                <select
                  value={selectedMinute}
                  onChange={(e) => setSelectedMinute(Number(e.target.value))}
                  className="w-full h-8 px-2 bg-white dark:bg-[#222] border border-slate-200 dark:border-[#333] rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 dark:focus:border-[#1DB954]"
                >
                  {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                    <option key={m} value={m}>
                      {toPersianDigits(String(m).padStart(2, '0'))} دقیقه
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* In-modal Error alert when selected time is in the past */}
            {hasPastError && (
              <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-900/50 text-[11px] text-rose-700 dark:text-rose-400 font-semibold flex items-center gap-1.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-[#E22134]" />
                <span>زمان انتخابی در گذشته است! لطفاً ساعتی در آینده تعیین کنید.</span>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-2 border-t border-slate-200 dark:border-[#282828] flex items-center justify-between gap-2 text-xs shrink-0">
          <button
            type="button"
            onClick={() => handleQuickSelectDays(0)}
            className="text-[11px] text-emerald-600 dark:text-[#1DB954] hover:underline font-bold cursor-pointer"
          >
            انتخاب تاریخ امروز ({toPersianDigits(today.str)})
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="h-8 px-3 rounded-full border border-slate-200 hover:bg-slate-100 dark:border-[#444] text-[11px] text-slate-600 hover:text-slate-900 dark:text-[#A7A7A7] dark:hover:text-white cursor-pointer"
            >
              انصراف
            </button>
            {showTime && (
              <button
                type="button"
                disabled={hasPastError}
                onClick={() => commitSelection()}
                className={`h-8 px-4 rounded-full font-bold text-xs flex items-center gap-1 transition-all ${
                  hasPastError
                    ? 'opacity-40 cursor-not-allowed bg-slate-300 dark:bg-[#333] text-slate-500'
                    : 'bg-[#1DB954] hover:bg-[#1ED760] text-black shadow-md shadow-[#1DB954]/20 cursor-pointer hover:scale-105'
                }`}
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>تایید زمان پیگیری</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 dark:text-[#B3B3B3] mb-1.5 flex items-center justify-between">
          <span>{label}</span>
          {inputValue && (
            <span className="text-[11px] text-emerald-600 dark:text-[#1DB954] font-mono font-bold">
              {toPersianDigits(inputValue)}
              {showTime && ` (${toPersianDigits(`${String(selectedHour).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')}`)})`}
            </span>
          )}
        </label>
      )}

      {/* Input trigger box */}
      <div
        onClick={() => !disabled && setIsOpen(true)}
        className={`w-full h-10 px-3 bg-white dark:bg-[#282828] border rounded-md text-xs text-slate-900 dark:text-white flex items-center justify-between gap-2 transition-all select-none ${
          disabled
            ? 'opacity-60 bg-slate-100 dark:bg-[#202020] border-slate-200 dark:border-[#333] cursor-not-allowed'
            : isOpen
            ? 'border-emerald-500 ring-1 ring-emerald-500 dark:border-[#1DB954] dark:ring-[#1DB954] cursor-pointer'
            : 'border-slate-300 dark:border-transparent hover:border-slate-400 dark:hover:border-[#3e3e3e] cursor-pointer'
        }`}
      >
        <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
          <CalendarIcon className="w-4 h-4 text-emerald-600 dark:text-[#1DB954] shrink-0" />
          {inputValue ? (
            <div className="flex items-center gap-1.5 font-mono text-slate-900 dark:text-white font-bold">
              <span>{toPersianDigits(inputValue)}</span>
              {showTime && (
                <>
                  <span className="text-slate-300 dark:text-[#555] font-normal">|</span>
                  <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-[#1DB954] shrink-0" />
                  <span className="text-emerald-700 dark:text-[#1DB954]">
                    {toPersianDigits(`${String(selectedHour).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')}`)}
                  </span>
                </>
              )}
            </div>
          ) : (
            <span className="text-slate-400 dark:text-[#777]">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {inputValue && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-[#383838] text-slate-400 hover:text-slate-700 dark:text-[#888] dark:hover:text-white transition-colors cursor-pointer"
              title="پاک کردن تاریخ"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Render centered modal calendar portal */}
      {typeof document !== 'undefined' && modalCalendar && createPortal(modalCalendar, document.body)}
    </div>
  );
};
