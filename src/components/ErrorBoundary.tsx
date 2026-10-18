import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, LayoutDashboard } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[360px] p-8 flex flex-col items-center justify-center text-center bg-[#181818] border border-[#282828] rounded-2xl space-y-4 my-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 stroke-[2.2]" />
          </div>
          <div className="space-y-1.5 max-w-md">
            <h3 className="text-base font-bold text-white">
              {this.props.fallbackTitle || 'خطا در بارگذاری این بخش'}
            </h3>
            <p className="text-xs text-[#A7A7A7] leading-relaxed">
              ارتباط با پایگاه داده یا نمایش محتوای این تب با اختلال موقت مواجه شد. می‌توانید با کلیک روی دکمه زیر مجدداً تلاش کنید.
            </p>
            {this.state.error?.message && (
              <p className="text-[11px] font-mono text-red-400/80 bg-black/40 px-3 py-1.5 rounded-lg border border-red-500/10 truncate mt-2" dir="ltr">
                {this.state.error.message}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={this.handleReset}
              className="px-5 py-2.5 rounded-full bg-[#1DB954] hover:bg-[#1ED760] text-black font-extrabold text-xs transition-all flex items-center gap-2 shadow-lg shadow-[#1DB954]/20"
            >
              <RefreshCw className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>تلاش مجدد</span>
            </button>
            <button
              onClick={() => {
                this.handleReset();
                if (typeof window !== 'undefined') {
                  window.location.hash = '';
                }
              }}
              className="px-4 py-2.5 rounded-full bg-[#282828] hover:bg-[#333] text-white font-bold text-xs transition-colors flex items-center gap-1.5"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>صفحه اصلی</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
