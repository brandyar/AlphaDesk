import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Check, Clock } from 'lucide-react';
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
} from '../utils';

interface PersianDatePickerProps {
  value?: string | null; // ISO string ("2026-10-01") or ISO datetime or empty
  onChange: (isoValue: string, jalaliValue: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  label?: string;
  showQuickPresets?: boolean;
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
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Parse current value to Jalali
  const initialJalali = value ? gregorianIsoToJalali(value) : '';
  const [inputValue, setInputValue] = useState(initialJalali);

  const today = getTodayJalali();
  const parsed = initialJalali
    ? initialJalali.split('/').map((n) => parseInt(n, 10))
    : [today.jy, today.jm, today.jd];

  const [viewYear, setViewYear] = useState<number>(parsed[0] || today.jy);
  const [viewMonth, setViewMonth] = useState<number>(parsed[1] || today.jm);
  const [selectedDay, setSelectedDay] = useState<number>(parsed[2] || today.jd);

  useEffect(() => {
    const jStr = value ? gregorianIsoToJalali(value) : '';
    setInputValue(jStr);
    if (jStr) {
      const parts = jStr.split('/').map((n) => parseInt(n, 10));
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        setViewYear(parts[0]);
        setViewMonth(parts[1]);
        setSelectedDay(parts[2]);
      }
    }
  }, [value]);

  const handleSelectJalaliDay = (d: number) => {
    setSelectedDay(d);
    const mm = String(viewMonth).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    const jStr = `${viewYear}/${mm}/${dd}`;
    const isoStr = jalaliToGregorianIso(jStr);
    setInputValue(jStr);
    onChange(isoStr, jStr);
    setIsOpen(false);
  };

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
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

  const handleQuickSelect = (daysToAdd: number) => {
    const now = new Date();
    now.setDate(now.getDate() + daysToAdd);
    const j = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
    const mm = String(j.jm).padStart(2, '0');
    const dd = String(j.jd).padStart(2, '0');
    const jStr = `${j.jy}/${mm}/${dd}`;
    const g = jalaliToGregorian(j.jy, j.jm, j.jd);
    const gmm = String(g.gm).padStart(2, '0');
    const gdd = String(g.gd).padStart(2, '0');
    const isoStr = `${g.gy}-${gmm}-${gdd}`;

    setInputValue(jStr);
    setViewYear(j.jy);
    setViewMonth(j.jm);
    setSelectedDay(j.jd);
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
      className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={() => setIsOpen(false)}
      dir="rtl"
    >
      <div
        className="w-full max-w-[340px] bg-[#181818] border border-[#333333] rounded-2xl shadow-2xl overflow-hidden p-4 sm:p-5 space-y-4 text-white scale-100 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="flex items-center justify-between border-b border-[#282828] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#1DB954]/15 text-[#1DB954] flex items-center justify-center">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">انتخاب تاریخ تقویم شمسی</h4>
              <p className="text-[10px] text-[#A7A7A7]">
                {label ? label : 'انتخاب روز و ماه مورد نظر'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="w-7 h-7 rounded-full bg-[#282828] hover:bg-[#333333] flex items-center justify-center text-[#A7A7A7] hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quick Presets Pills */}
        {showQuickPresets && (
          <div className="flex items-center gap-1.5 pb-1 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => handleQuickSelect(0)}
              className="px-2.5 py-1 rounded-full bg-[#242424] hover:bg-[#1DB954] hover:text-black text-[11px] font-bold text-[#d0d0d0] transition-colors shrink-0"
            >
              امروز
            </button>
            <button
              type="button"
              onClick={() => handleQuickSelect(1)}
              className="px-2.5 py-1 rounded-full bg-[#242424] hover:bg-[#1DB954] hover:text-black text-[11px] font-bold text-[#d0d0d0] transition-colors shrink-0"
            >
              فردا
            </button>
            <button
              type="button"
              onClick={() => handleQuickSelect(3)}
              className="px-2.5 py-1 rounded-full bg-[#242424] hover:bg-[#1DB954] hover:text-black text-[11px] font-bold text-[#d0d0d0] transition-colors shrink-0"
            >
              ۳ روز بعد
            </button>
            <button
              type="button"
              onClick={() => handleQuickSelect(7)}
              className="px-2.5 py-1 rounded-full bg-[#242424] hover:bg-[#1DB954] hover:text-black text-[11px] font-bold text-[#d0d0d0] transition-colors shrink-0"
            >
              ۱ هفته بعد
            </button>
            <button
              type="button"
              onClick={() => handleQuickSelect(30)}
              className="px-2.5 py-1 rounded-full bg-[#242424] hover:bg-[#1DB954] hover:text-black text-[11px] font-bold text-[#d0d0d0] transition-colors shrink-0"
            >
              ۱ ماه بعد
            </button>
          </div>
        )}

        {/* Month & Year Navigation Header */}
        <div className="flex items-center justify-between gap-2 p-1 bg-[#121212] rounded-xl border border-[#262626]">
          <button
            type="button"
            onClick={handleNextMonth}
            className="w-8 h-8 rounded-lg bg-[#222222] hover:bg-[#2e2e2e] flex items-center justify-center text-white transition-colors"
            title="ماه بعد"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <select
              value={viewMonth}
              onChange={(e) => setViewMonth(Number(e.target.value))}
              className="bg-[#222222] text-xs font-bold text-white px-2.5 py-1.5 rounded-lg border border-[#333333] focus:outline-none focus:border-[#1DB954] cursor-pointer"
            >
              {JALALI_MONTH_NAMES.map((name, idx) => (
                <option key={name} value={idx + 1}>
                  {name}
                </option>
              ))}
            </select>

            <select
              value={viewYear}
              onChange={(e) => setViewYear(Number(e.target.value))}
              className="bg-[#222222] text-xs font-mono font-bold text-white px-2.5 py-1.5 rounded-lg border border-[#333333] focus:outline-none focus:border-[#1DB954] cursor-pointer"
            >
              {Array.from({ length: 15 }, (_, i) => today.jy - 5 + i).map((yr) => (
                <option key={yr} value={yr}>
                  {toPersianDigits(yr)}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handlePrevMonth}
            className="w-8 h-8 rounded-lg bg-[#222222] hover:bg-[#2e2e2e] flex items-center justify-center text-white transition-colors"
            title="ماه قبل"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Weekday Labels (ش ی د س چ پ ج) */}
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-[#A7A7A7] py-1 border-b border-[#242424]">
          {JALALI_WEEK_DAYS.map((wd) => (
            <div key={wd} className="py-0.5">
              {wd}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {/* Empty offset days */}
          {Array.from({ length: jalaliFirstDayOffset }).map((_, i) => (
            <div key={`empty-${i}`} className="h-8" />
          ))}

          {/* Day buttons */}
          {Array.from({ length: totalDays }).map((_, i) => {
            const day = i + 1;
            const active = isSelected(day);
            const isToday = isCurrentToday(day);

            return (
              <button
                key={`day-${day}`}
                type="button"
                onClick={() => handleSelectJalaliDay(day)}
                className={`h-8 rounded-lg text-xs font-mono font-semibold flex items-center justify-center transition-all ${
                  active
                    ? 'bg-[#1DB954] text-black font-bold shadow-md shadow-[#1DB954]/30 scale-105'
                    : isToday
                    ? 'bg-[#282828] text-[#1DB954] border border-[#1DB954]/60 hover:bg-[#333]'
                    : 'hover:bg-[#282828] text-white hover:text-[#1DB954]'
                }`}
              >
                {toPersianDigits(day)}
              </button>
            );
          })}
        </div>

        {/* Footer Status & Actions */}
        <div className="pt-3 border-t border-[#282828] flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => handleQuickSelect(0)}
            className="text-[11px] text-[#1DB954] hover:underline font-bold"
          >
            انتخاب تاریخ امروز ({toPersianDigits(today.str)})
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="h-7 px-3 rounded-full border border-[#444] text-[11px] text-[#A7A7A7] hover:text-white"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5 flex items-center justify-between">
          <span>{label}</span>
          {inputValue && (
            <span className="text-[11px] text-[#1DB954] font-mono">
              {toPersianDigits(inputValue)}
            </span>
          )}
        </label>
      )}

      {/* Input trigger box */}
      <div
        onClick={() => !disabled && setIsOpen(true)}
        className={`w-full h-10 px-3 bg-[#282828] border rounded-md text-xs text-white flex items-center justify-between gap-2 transition-all select-none ${
          disabled
            ? 'opacity-60 bg-[#202020] border-[#333] cursor-not-allowed'
            : isOpen
            ? 'border-[#1DB954] ring-1 ring-[#1DB954] cursor-pointer'
            : 'border-transparent hover:border-[#3e3e3e] cursor-pointer'
        }`}
      >
        <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
          <CalendarIcon className="w-4 h-4 text-[#1DB954] shrink-0" />
          {inputValue ? (
            <span className="font-mono text-white tracking-wide font-bold">
              {toPersianDigits(inputValue)}
            </span>
          ) : (
            <span className="text-[#777]">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {inputValue && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded hover:bg-[#383838] text-[#888] hover:text-white transition-colors"
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
