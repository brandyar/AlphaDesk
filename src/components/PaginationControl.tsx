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

  const safeTotalPages = Math.max(1, totalPages || Math.ceil(totalCount / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), safeTotalPages);

  // Generate visible page numbers (e.g., [1, 2, 3, '...', 1400])
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const delta = 1; // Number of pages before and after current page

    for (let i = 1; i <= safeTotalPages; i++) {
      if (
        i === 1 ||
        i === safeTotalPages ||
        (i >= safeCurrentPage - delta && i <= safeCurrentPage + delta)
      ) {
        pages.push(i);
      } else if (
        (i === safeCurrentPage - delta - 1 && safeCurrentPage - delta > 2) ||
        (i === safeCurrentPage + delta + 1 && safeCurrentPage + delta < safeTotalPages - 1)
      ) {
        if (!pages.includes('...')) {
          pages.push('...');
        }
      }
    }
    return pages;
  };

  const startRecord = Math.min((safeCurrentPage - 1) * pageSize + 1, totalCount);
  const endRecord = Math.min(startRecord + displayedCount - 1, totalCount);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#282828] text-xs text-[#A7A7A7]">
      {/* Total Count Info */}
      <div className="flex items-center gap-2">
        {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1DB954]" />}
        <span>
          نمایش{' '}
          <span className="font-bold text-white font-mono">
            {toPersianDigits(startRecord)} تا {toPersianDigits(endRecord)}
          </span>{' '}
          از <span className="font-bold text-[#1DB954] font-mono">{toPersianDigits(totalCount)}</span> {label}
        </span>
      </div>

      {/* Page Navigation Buttons */}
      <div className="flex items-center gap-1.5 dir-rtl">
        {/* First Page */}
        <button
          onClick={() => onPageChange(1)}
          disabled={safeCurrentPage <= 1 || isLoading}
          title="صفحه اول"
          className="w-8 h-8 rounded-xl bg-[#181818] border border-[#282828] flex items-center justify-center text-[#A7A7A7] hover:text-white hover:border-[#1DB954]/50 hover:bg-[#222222] disabled:opacity-30 disabled:pointer-events-none transition-all"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>

        {/* Previous Page */}
        <button
          onClick={() => onPageChange(safeCurrentPage - 1)}
          disabled={safeCurrentPage <= 1 || isLoading}
          title="صفحه قبلی"
          className="w-8 h-8 rounded-xl bg-[#181818] border border-[#282828] flex items-center justify-center text-[#A7A7A7] hover:text-white hover:border-[#1DB954]/50 hover:bg-[#222222] disabled:opacity-30 disabled:pointer-events-none transition-all"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Page Numbers */}
        <div className="flex items-center gap-1 mx-1">
          {getPageNumbers().map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`ellipsis-${idx}`} className="px-1.5 text-[#555] font-mono">
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
                className={`min-w-8 h-8 px-2 rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center ${
                  isCurrent
                    ? 'bg-[#1DB954] text-black shadow-md shadow-[#1DB954]/20 scale-105'
                    : 'bg-[#181818] border border-[#282828] text-[#A7A7A7] hover:text-white hover:border-[#333]'
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
          className="w-8 h-8 rounded-xl bg-[#181818] border border-[#282828] flex items-center justify-center text-[#A7A7A7] hover:text-white hover:border-[#1DB954]/50 hover:bg-[#222222] disabled:opacity-30 disabled:pointer-events-none transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Last Page */}
        <button
          onClick={() => onPageChange(safeTotalPages)}
          disabled={safeCurrentPage >= safeTotalPages || isLoading}
          title="صفحه آخر"
          className="w-8 h-8 rounded-xl bg-[#181818] border border-[#282828] flex items-center justify-center text-[#A7A7A7] hover:text-white hover:border-[#1DB954]/50 hover:bg-[#222222] disabled:opacity-30 disabled:pointer-events-none transition-all"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
