import React from 'react';
import { X } from 'lucide-react';
import { LeaveRequest, RequestStatus } from '../../types';
import { formatPersianDate } from '../../utils';

export interface ReviewRequestModalProps {
  reviewingLeave: LeaveRequest | null;
  reviewAction: RequestStatus;
  reviewManagerNote: string;
  setReviewManagerNote: (note: string) => void;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isProcessing: boolean;
}

export const ReviewRequestModal: React.FC<ReviewRequestModalProps> = ({
  reviewingLeave,
  reviewAction,
  reviewManagerNote,
  setReviewManagerNote,
  onClose,
  onConfirm,
  isProcessing,
}) => {
  if (!reviewingLeave) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
      <div className="bg-[#181818] border border-[#282828] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#282828] pb-3">
          <h3 className="font-bold text-sm text-white">
            {reviewAction === 'approved' ? 'تایید مرخصی' : 'رد درخواست مرخصی'}
          </h3>
          <button onClick={onClose} className="text-[#888] hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div className="p-3 bg-[#121212] rounded-xl text-[#B3B3B3] space-y-1">
            <div>
              <span className="text-[#777]">متقاضی: </span>
              <span className="text-white font-bold">{reviewingLeave.personnel_name}</span>
            </div>
            <div>
              <span className="text-[#777]">نوع و تاریخ: </span>
              <span className="text-white">
                {reviewingLeave.leave_type === 'daily'
                  ? `روزانه (${formatPersianDate(reviewingLeave.start_date)})`
                  : `ساعتی (${reviewingLeave.hours_count} ساعت)`}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-[#B3B3B3] mb-1">
              یادداشت و پیام مدیریت (اختیاری):
            </label>
            <textarea
              rows={3}
              value={reviewManagerNote}
              onChange={(e) => setReviewManagerNote(e.target.value)}
              placeholder="علت رد یا توضیحات تایید جهت مشاهده کارشناس..."
              className="w-full p-3 bg-[#121212] rounded-xl text-white border border-[#333] focus:border-[#1DB954] focus:outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-[#282828]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#282828] text-white text-xs font-bold"
          >
            انصراف
          </button>
          <button
            onClick={onConfirm}
            disabled={isProcessing}
            className={`px-4 py-2 rounded-xl font-bold text-xs text-black ${
              reviewAction === 'approved'
                ? 'bg-emerald-500 hover:bg-emerald-400'
                : 'bg-rose-500 hover:bg-rose-400 text-white'
            }`}
          >
            {isProcessing ? 'در حال ثبت...' : reviewAction === 'approved' ? 'تایید نهایی' : 'ثبت رد درخواست'}
          </button>
        </div>
      </div>
    </div>
  );
};
