import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
} from 'lucide-react';
import { toPersianDigits } from '../utils';

interface PaginationControlProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  displayedCount: number;
  isLoading?: boolean;
  onPageChange: (newPage: number) => void;
  label?: string;
}

export const PaginationControl: React.FC<PaginationControlProps> = ({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  displayedCount,
  isLoading = false,
  onPageChange,
  label = 'رکورد',
}) => {
  if (totalCount === 0) return null;

  const validPageSize = Math.max(1, Number(pageSize) || 25);
  const rawPages = totalPages > 0 ? totalPages : Math.ceil(totalCount / validPageSize);
  const safeTotalPages = Math.min(Math.max(1, isFinite(rawPages) ? rawPages : 1), 10000);
  const safeCurrentPage = Math.min(Math.max(1, Number(currentPage) || 1), safeTotalPages);

  // Generate visible page numbers safely and in O(1) time
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (safeTotalPages <= 7) {
      for (let i = 1; i <= safeTotalPages; i++) pages.push(i);
      return pages;
    }

    pages.push(1);
    if (safeCurrentPage > 3) {
      pages.push('...');
    }

    const start = Math.max(2, safeCurrentPage - 1);
    const end = Math.min(safeTotalPages - 1, safeCurrentPage + 1);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (safeCurrentPage < safeTotalPages - 2) {
      pages.push('...');
    }
    pages.push(safeTotalPages);
    return pages;
  };

  const startRecord = Math.min((safeCurrentPage - 1) * pageSize + 1, totalCount);
  const endRecord = Math.min(startRecord + displayedCount - 1, totalCount);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-[#282828] text-xs text-slate-500 dark:text-[#A7A7A7]">
      {/* Total Count Info */}
      <div className="flex items-center gap-2">
        {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600 dark:text-[#1DB954]" />}
        <span>
          نمایش{' '}
          <span className="font-bold text-slate-900 dark:text-white font-mono">
            {toPersianDigits(startRecord)} تا {toPersianDigits(endRecord)}
          </span>{' '}
          از <span className="font-bold text-emerald-600 dark:text-[#1DB954] font-mono">{toPersianDigits(totalCount)}</span> {label}
        </span>
      </div>

      {/* Page Navigation Buttons */}
      <div className="flex items-center gap-1.5 dir-rtl">
        {/* First Page */}
        <button
          onClick={() => onPageChange(1)}
          disabled={safeCurrentPage <= 1 || isLoading}
          title="صفحه اول"
          className="w-8 h-8 rounded-xl bg-white dark:bg-[#181818] border border-slate-200 dark:border-[#282828] flex items-center justify-center text-slate-600 hover:text-slate-900 dark:text-[#A7A7A7] dark:hover:text-white hover:border-emerald-500/50 dark:hover:border-[#1DB954]/50 hover:bg-slate-50 dark:hover:bg-[#222222] disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shadow-xs"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>

        {/* Previous Page */}
        <button
          onClick={() => onPageChange(safeCurrentPage - 1)}
          disabled={safeCurrentPage <= 1 || isLoading}
          title="صفحه قبلی"
          className="w-8 h-8 rounded-xl bg-white dark:bg-[#181818] border border-slate-200 dark:border-[#282828] flex items-center justify-center text-slate-600 hover:text-slate-900 dark:text-[#A7A7A7] dark:hover:text-white hover:border-emerald-500/50 dark:hover:border-[#1DB954]/50 hover:bg-slate-50 dark:hover:bg-[#222222] disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shadow-xs"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Page Numbers */}
        <div className="flex items-center gap-1 mx-1">
          {getPageNumbers().map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`ellipsis-${idx}`} className="px-1.5 text-slate-400 dark:text-[#555] font-mono">
                  ...
                </span>
              );
            }
            const isCurrent = p === safeCurrentPage;
            return (
              <button
                key={`page-${p}`}
                onClick={() => onPageChange(Number(p))}
                disabled={isLoading}
                className={`min-w-8 h-8 px-2 rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center cursor-pointer ${
                  isCurrent
                    ? 'bg-[#1DB954] text-black shadow-md shadow-[#1DB954]/20 scale-105'
                    : 'bg-white dark:bg-[#181818] border border-slate-200 dark:border-[#282828] text-slate-600 hover:text-slate-900 dark:text-[#A7A7A7] dark:hover:text-white hover:border-slate-300 dark:hover:border-[#333] shadow-xs'
                }`}
              >
                {toPersianDigits(p)}
              </button>
            );
          })}
        </div>

        {/* Next Page */}
        <button
          onClick={() => onPageChange(safeCurrentPage + 1)}
          disabled={safeCurrentPage >= safeTotalPages || isLoading}
          title="صفحه بعدی"
          className="w-8 h-8 rounded-xl bg-white dark:bg-[#181818] border border-slate-200 dark:border-[#282828] flex items-center justify-center text-slate-600 hover:text-slate-900 dark:text-[#A7A7A7] dark:hover:text-white hover:border-emerald-500/50 dark:hover:border-[#1DB954]/50 hover:bg-slate-50 dark:hover:bg-[#222222] disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shadow-xs"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Last Page */}
        <button
          onClick={() => onPageChange(safeTotalPages)}
          disabled={safeCurrentPage >= safeTotalPages || isLoading}
          title="صفحه آخر"
          className="w-8 h-8 rounded-xl bg-white dark:bg-[#181818] border border-slate-200 dark:border-[#282828] flex items-center justify-center text-slate-600 hover:text-slate-900 dark:text-[#A7A7A7] dark:hover:text-white hover:border-emerald-500/50 dark:hover:border-[#1DB954]/50 hover:bg-slate-50 dark:hover:bg-[#222222] disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shadow-xs"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
