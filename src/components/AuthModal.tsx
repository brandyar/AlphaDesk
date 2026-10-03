import React, { useState } from 'react';
import {
  LogIn,
  UserPlus,
  Mail,
  Lock,
  User,
  Phone,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  X
} from 'lucide-react';
import { loginUser, registerUser } from '../api';
import { AuthResponse } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onAuthSuccess: (authData: AuthResponse) => void;
  initialMode?: 'login' | 'register';
  canClose?: boolean;
  isFullScreen?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  initialMode = 'login',
  canClose = true,
  isFullScreen = false,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim() || !password.trim()) {
      setErrorMessage('لطفاً ایمیل و کلمه عبور را وارد کنید.');
      return;
    }

    if (mode === 'register') {
      if (!name.trim()) {
        setErrorMessage('لطفاً نام و نام خانوادگی را وارد کنید.');
        return;
      }
      if (password.length < 6) {
        setErrorMessage('کلمه عبور باید حداقل ۶ کاراکتر باشد.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('تکرار کلمه عبور با کلمه عبور مطابقت ندارد.');
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const res = await loginUser(email.trim(), password);
        setSuccessMessage('با موفقیت وارد شدید.');
        setTimeout(() => {
          onAuthSuccess(res);
          if (onClose) onClose();
        }, 400);
      } else {
        const res = await registerUser({
          email: email.trim(),
          password,
          name: name.trim(),
          phone: phone.trim(),
        });
        setSuccessMessage('ثبت نام با موفقیت انجام شد و وارد شدید.');
        setTimeout(() => {
          onAuthSuccess(res);
          if (onClose) onClose();
        }, 500);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'خطا در برقراری ارتباط با سرور.');
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <div className="relative w-full max-w-md bg-[#181818] border border-[#2e2e2e] rounded-2xl shadow-2xl shadow-black/90 overflow-hidden text-right">
      {/* Header decoration */}
      <div className="h-1.5 bg-gradient-to-r from-[#1DB954] via-[#1ED760] to-[#2ebd59]" />

      {canClose && onClose && !isFullScreen && (
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-1.5 rounded-full text-[#A7A7A7] hover:text-white hover:bg-[#282828] transition-colors"
          title="بستن"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      <div className="p-6 sm:p-7">
        {/* Logo & Title */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#1DB954]/15 border border-[#1DB954]/30 flex items-center justify-center text-[#1DB954] mb-3 shadow-lg shadow-[#1DB954]/10">
            {mode === 'login' ? <LogIn className="w-6 h-6" /> : <UserPlus className="w-6 h-6" />}
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            {mode === 'login' ? 'ورود به سامانه CRM آلفادسک' : 'عضویت و ثبت نام کاربر جدید'}
          </h2>
          <p className="text-xs text-[#A7A7A7] mt-1">
            {mode === 'login'
              ? 'برای دسترسی به پنل و اطلاعات پرونده‌ها وارد حساب خود شوید'
              : 'ایجاد حساب کاربری جهت مدیریت و پیگیری مشتریان'}
          </p>
        </div>

        {/* Mode Tabs */}
        <div className="grid grid-cols-2 p-1 bg-[#121212] rounded-xl border border-[#282828] mb-5">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`py-2 text-xs sm:text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mode === 'login'
                ? 'bg-[#282828] text-white shadow-sm font-bold text-[#1DB954]'
                : 'text-[#A7A7A7] hover:text-white'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>ورود</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`py-2 text-xs sm:text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mode === 'register'
                ? 'bg-[#282828] text-white shadow-sm font-bold text-[#1DB954]'
                : 'text-[#A7A7A7] hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>ثبت نام</span>
          </button>
        </div>

        {/* Alert Messages */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-[#E22134]/15 border border-[#E22134]/30 text-[#E22134] text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="flex-1">{errorMessage}</div>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-[#1DB954]/15 border border-[#1DB954]/30 text-[#1DB954] text-xs flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="flex-1">{successMessage}</div>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs text-[#A7A7A7] mb-1">نام و نام خانوادگی</label>
                <div className="relative">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثال: سارا احمدی"
                    required
                    className="w-full h-10 bg-[#121212] border border-[#2e2e2e] focus:border-[#1DB954] focus:ring-1 focus:ring-[#1DB954] rounded-xl pr-9 pl-3 text-xs sm:text-sm text-white placeholder-[#555555] focus:outline-none transition-all"
                  />
                  <User className="w-4 h-4 text-[#777777] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs text-[#A7A7A7] mb-1">شماره تماس (اختیاری)</label>
                <div className="relative">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="مثال: 09123456789"
                    dir="ltr"
                    className="w-full h-10 bg-[#121212] border border-[#2e2e2e] focus:border-[#1DB954] focus:ring-1 focus:ring-[#1DB954] rounded-xl pr-9 pl-3 text-xs sm:text-sm text-white placeholder-[#555555] focus:outline-none transition-all text-right"
                  />
                  <Phone className="w-4 h-4 text-[#777777] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs text-[#A7A7A7] mb-1">پست الکترونیک (ایمیل)</label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.ir"
                required
                dir="ltr"
                className="w-full h-10 bg-[#121212] border border-[#2e2e2e] focus:border-[#1DB954] focus:ring-1 focus:ring-[#1DB954] rounded-xl pr-9 pl-3 text-xs sm:text-sm text-white placeholder-[#555555] focus:outline-none transition-all text-left"
              />
              <Mail className="w-4 h-4 text-[#777777] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#A7A7A7] mb-1">کلمه عبور</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="حداقل ۶ کاراکتر"
                required
                dir="ltr"
                className="w-full h-10 bg-[#121212] border border-[#2e2e2e] focus:border-[#1DB954] focus:ring-1 focus:ring-[#1DB954] rounded-xl pr-9 pl-10 text-xs sm:text-sm text-white placeholder-[#555555] focus:outline-none transition-all text-left"
              />
              <Lock className="w-4 h-4 text-[#777777] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#777777] hover:text-white p-1"
                title={showPassword ? 'پنهان کردن' : 'نمایش'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-xs text-[#A7A7A7] mb-1">تکرار کلمه عبور</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="تکرار کلمه عبور"
                  required
                  dir="ltr"
                  className="w-full h-10 bg-[#121212] border border-[#2e2e2e] focus:border-[#1DB954] focus:ring-1 focus:ring-[#1DB954] rounded-xl pr-9 pl-3 text-xs sm:text-sm text-white placeholder-[#555555] focus:outline-none transition-all text-left"
                />
                <Lock className="w-4 h-4 text-[#777777] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 mt-2 bg-[#1DB954] hover:bg-[#1ED760] disabled:bg-[#1DB954]/50 text-black font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#1DB954]/20 hover:scale-[1.01] active:scale-[0.99] transition-all"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : mode === 'login' ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>ورود به حساب کاربری</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>ایجاد حساب و ورود</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );

  if (isFullScreen) {
    return (
      <div className="min-h-screen bg-[#121212] text-white flex flex-col justify-center items-center p-4 relative overflow-hidden select-none">
        {/* Background glow & subtle patterns */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#1DB954]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-64 h-64 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />

        {/* Brand header */}
        <div className="flex items-center gap-3 mb-6 z-10 animate-fade-in">
          <div className="w-10 h-10 rounded-xl bg-[#1DB954] flex items-center justify-center text-black font-black text-xl shadow-lg shadow-[#1DB954]/20">
            α
          </div>
          <div className="text-right">
            <h1 className="text-lg font-bold text-white tracking-wide">AlphaDesk CRM</h1>
            <p className="text-[11px] text-[#A7A7A7]">سامانه یکپارچه مدیریت ارتباط با مشتریان</p>
          </div>
        </div>

        {/* Main Card */}
        <div className="z-10 w-full max-w-md animate-fade-in">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      {content}
    </div>
  );
};
