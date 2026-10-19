# نقشه راه جامع بازآفرینی و ماژولارسازی سامانه (Refactor Roadmap)
> **سامانه مدیریت مشتریان آلفادسک (AlphaDesk CRM)**  
> **نسخه سند:** ۱.۰.۰ | **تاریخ تدوین:** ۱۴۰۵/۰۷/۲۸ (2026-10-19)

---

## ۱. ارزیابی وضعیت فعلی و تحلیل فایل‌های پرحجم (Current State Audit)

بر اساس پایش دقیق ساختار کدها، فایل‌های زیر به دلیل تجمیع مسئولیت‌ها (Violation of Single Responsibility Principle) دارای حجم نامتعارف هستند و نگهداری، خطایابی و توسعه موازی را دشوار کرده‌اند:

| رتبه | مسیر فایل | تعداد خطوط | مسئولیت‌های متراکم (Current Responsibilities) | اولویت شکستن |
| :---: | :--- | :---: | :--- | :---: |
| **۱** | `server.ts` | **۷** (قبلاً ۸,۰۴۴) | ورودی اصلی لایت‌ویت اکسپرس (تفکیک‌شده کاملاً به ساختار ماژولار در `/server`) | ✅ **انجام شد** |
| **۲** | `src/components/TeamManagementView.tsx` | **۴,۰۲۶** | لیست همکاران، ماتریس دسترسی‌ها، کارتابل تایید مرخصی، کارتابل تایید مساعده، تنظیمات و پترن‌های پیامکی، مدال‌های ویرایش پرسنل، لاگ تغییرات | 🔴 **فوق‌العاده بالا** |
| **۳** | `src/components/AnalyticsView.tsx` | **۴۳۰** (قبلاً ۱,۵۸۸) | هاب کامپوننت و مدیریت سه‌زبانه (تفکیک‌شده به ۳ تب در `analytics/`) | ✅ **انجام شد** |
| **۴** | `src/components/PersonalPortalView.tsx` | **۸۱۹** (قبلاً ۱,۵۱۷) | ویرایش پروفایل، تغییر رمز عبور، کارتابل مرخصی و مساعده (تفکیک‌شده در `personal-portal/`) | ✅ **انجام شد** |
| **۵** | `src/App.tsx` | **۱,۴۵۲** | استیت سراسری، مسیریابی تب‌ها، هندلرهای CRUD مشتریان، گزارش‌ها، لیدها، احراز هویت، سوئیچر سازمان، توست نوتیفیکیشن و هندلرهای مشترک | 🟡 **بالا** |
| **۶** | `src/components/CustomerModal.tsx` | **۱,۱37** | فرم ایجاد/ویرایش مشتری، مدیریت چند کانال ارتباطی، اعتبارسنجی تلفن‌ها، تشخیص هوشمند تداخل و تکراری بودن، انتخاب استان و شهر | 🟢 **متوسط** |
| **۷** | `src/components/CustomerDetailModal.tsx` | **۱,۰۶۴** | مشاهده پرونده کامل مشتری، تایم‌لاین گزارش‌های مذاکره، افزودن شماره تماس، دکمه‌های اقدام سریع، مدال ارجاع مالکیت | 🟢 **متوسط** |
| **۸** | `src/components/FreeCustomersView.tsx` | **۱,۰۶۰** | حوضچه مشتریان آزاد، پیش‌نمایش تاریخچه مذاکرات قبلی، اعمال سهمیه و قوانین برداشت پرونده، فیلترها و اکشن‌های گروهی | 🟢 **متوسط** |
| **۹** | `src/api.ts` | **۱,۰۱۳** | تمام توابع ارتباطی فرانت‌اند با BFF، مدیریت توکن‌ها و هدرهای سازمانی، متدهای CRUD تمام کالکشن‌ها | 🟢 **متوسط** |
| **۱۰** | `src/components/DataMigrationView.tsx` | **۹۵۹** | ایمپورت فایل‌های اکسل/CSV، نگاشت ستون‌ها، پیش‌نمایش داده‌ها و گزارش پیشرفت | ⚪ **معمولی** |
| **۱۱** | `src/components/ColdLeadsView.tsx` | **۹۲۵** | بانک لیدهای سرد، تخصیص تکی و گروهی، مدال تغییر وضعیت و تبدیل به مشتری | ⚪ **معمولی** |
| **۱۲** | `src/components/Sidebar.tsx` | **۸۷۴** | منوی اصلی، شمارنده‌های نشان‌ها، انتخاب‌گر سازمان، دراور موبایل، زیرمنوها | ⚪ **معمولی** |

---

## ۲. اصول راهبردی شکستن فایل‌ها بدون قطعی و خطا (Zero-Regression Principles)

برای تضمین عدم ایجاد هرگونه اختلال یا افت عملکرد در سامانه، رعایت اصول زیر **الزامی** است:

1. **انتقال گام‌به‌گام (In-Place Extraction):** هیچ فایلی به یکباره پاک یا بازنویسی کلی نمی‌شود؛ ابتدا توابع و ساب‌کامپوننت‌ها به فایل‌های مقصد جدید منتقل شده و از طریق فایل اصلی Re-export یا Import می‌شوند.
2. **پایداری تایپ‌ها (Contract Preservation):** تمام تایپ‌ها در `src/types.ts` بدون تغییر باقی مانده یا در صورت نیاز فقط تایپ‌های اختصاصی همان زیرماژول در مجاورت خودش اضافه می‌شوند.
3. **عدم تغییر در اندپوینت‌های API:** تمام مسیرهای BFF (`/api/*`) دقیقاً فرمت، هدرها، پارامترهای ورودی و ساختار خروجی قبلی را حفظ می‌کنند.
4. **تست و تایید پس از هر فاز:** پس از انجام هر بخش، ابزارهای `tsc --noEmit` (`lint_applet`) و `compile_applet` به همراه تست عملیاتی اندپوینت‌های مربوطه اجرا و تایید سلامت می‌شوند.

---

## ۳. معماری هدف (Target Architecture)

### ۳.۱. ساختار پیشنهادی برای بک‌اند و BFF (`server/`)
به جای یک فایل متمرکز ۸,۰۰۰ خطی، سرور به لایه‌های استاندارد تفکیک می‌شود:

```
server/
├── index.ts                      # نقطه ورود و راه‌اندازی سرور (کمتر از ۱۰۰ خط)
├── config.ts                     # متغیرهای محیطی، پورت، نقش‌ها و تنظیمات دایرکتوس
├── directus/
│   ├── client.ts                 # کلاینت ارتباط با دایرکتوس (directusFetch, retry, token)
│   ├── sync.ts                   # همگام‌سازی پرسنل و سازمان‌ها (ensurePersonnel, ensureTenants)
│   └── cache.ts                  # مدیریت کش و Invalidation
├── services/
│   ├── sms.service.ts            # سرویس هوشمند ارسال پترن‌های IPPanel و جایگذاری متغیرها
│   ├── phoneNormalizer.ts        # نرمال‌سازی شماره‌های تماس ایران و بررسی تداخل
│   └── auth.service.ts           # بررسی نشست، توکن و اعتبارسنجی رمز عبور
├── middlewares/
│   ├── auth.middleware.ts        # استخراج کاربر و سازمان (getRequestUser, matchesTenant)
│   └── rateLimit.middleware.ts   # کنترل نرخ درخواست‌ها و محافظت اندپوینت‌ها
└── routes/
    ├── auth.routes.ts            # لاگین، ثبت‌نام، پروفایل و تغییر رمز
    ├── customers.routes.ts       # مدیریت پرونده مشتریان و شماره‌های تماس
    ├── reports.routes.ts         # ثبت و گزارش‌های مذاکره و فاکتورها
    ├── coldLeads.routes.ts       # لیدهای سرد و تبدیل به پرونده
    ├── leaveRequests.routes.ts   # ثبت، تایید/رد و لیست درخواست‌های مرخصی
    ├── advanceRequests.routes.ts # درخواست‌های مساعده مالی
    ├── personnel.routes.ts       # لیست همکاران، ایجاد و ویرایش سطوح دسترسی
    ├── tenants.routes.ts         # مدیریت سازمان‌ها و شعب
    ├── adminReports.routes.ts    # گزارشات کار روزانه پرسنل
    ├── analytics.routes.ts       # داده‌ها و تجمیع نمودارهای آماری
    ├── projectSettings.routes.ts # پترن‌های پیامکی و تنظیمات سامانه
    └── migration.routes.ts       # هاب درون‌ریزی و انتقال داده‌ها
```

### ۳.۲. ساختار پیشنهادی برای فرانت‌اند (`src/components/`)
کامپوننت‌های بزرگ به ساب‌فولدرهای ماژولار با کامپوننت مادر و بخش‌های تفکیک‌شده تبدیل می‌شوند:

```
src/
├── components/
│   ├── team/
│   │   ├── TeamManagementView.tsx    # کامپوننت دربرگیرنده و مدیریت تب‌ها
│   │   ├── ColleaguesListTab.tsx     # لیست همکاران و کارت‌های دسترسی
│   │   ├── ColleagueModal.tsx        # مدال افزودن/ویرایش همکار
│   │   ├── PermissionsMatrix.tsx     # ماتریس دسترسی‌های تیک‌به‌تیک
│   │   ├── LeaveApprovalsTab.tsx     # کارتابل تایید و رد مرخصی‌ها
│   │   ├── AdvanceApprovalsTab.tsx   # کارتابل تایید و رد مساعده حقوق
│   │   ├── SmsSettingsTab.tsx        # تنظیمات و تست پترن‌های پیامک ippanel
│   │   └── ReviewRequestModal.tsx    # مدال اختصاصی تایید/رد به همراه توضیحات
│   ├── personal-portal/
│   │   ├── PersonalPortalView.tsx    # کنترلر اصلی پنل شخصی
│   │   ├── ProfileTab.tsx            # اطلاعات فردی و بارگذاری آواتار
│   │   ├── PasswordTab.tsx           # تغییر رمز عبور
│   │   ├── LeaveRequestsTab.tsx      # فرم ثبت مرخصی و جدول سوابق
│   │   └── AdvanceRequestsTab.tsx    # فرم ثبت مساعده و جدول سوابق
│   ├── analytics/
│   │   ├── AnalyticsView.tsx         # لایه اصلی و سوئیچر زبانه‌ها
│   │   ├── DailyReportsTab.tsx       # تحلیل روزانه گزارش‌ها و نمودار ستونی
│   │   ├── CustomerCoverageTab.tsx   # تحلیل تعامل با مشتریان
│   │   ├── TrendsLeaderboardTab.tsx  # قیف فروش، بازه تاریخی و لیدربورد پرسنل
│   │   └── ChartComponents.tsx       # نمودارهای میله‌ای و خطی SVG ریسپانسیو
│   └── customer/
│       ├── CustomerModal.tsx         # فرم ثبت/ویرایش مشتری
│       ├── ContactChannelsInput.tsx  # ورودی کانال‌های ارتباطی تفکیک‌شده
│       └── CustomerDetailModal.tsx   # جزئیات پرونده و تاریخچه تماس‌ها
├── hooks/
│   ├── useAuth.ts                    # هوک اختصاصی نشست و اطلاعات کاربر لاگین
│   ├── useLeaveRequests.ts           # هوک دریافت و ثبت مرخصی
│   ├── useAdvanceRequests.ts         # هوک درخواست‌های مساعده
│   └── useCustomers.ts               # هوک فیلتر و جستجوی پرونده‌ها
```

---

## ۴. برنامه فازبندی‌شده اجرا (Phased Execution Plan)

### 📌 فاز ۱: ماژولارسازی کامپوننت مدیریت همکاران (`TeamManagementView`)
- [x] استخراج تب تنظیمات و پترن‌های پیامک به `src/components/team/SmsSettingsTab.tsx`
"- [x] استخراج کارتابل‌های تایید مرخصی به `LeaveApprovalsTab.tsx` و `ReviewRequestModal.tsx`
- [x] استخراج ماتریس دسترسی‌ها به `PermissionsMatrix.tsx`
- [x] اتصال کامپوننت اصلی `TeamManagementView.tsx` به این بخش‌ها و حفظ کامل State
- [x] تست و اعتبارسنجی بیلد (تایید موفق `tsc` و `vite build`)

### 📌 فاز ۲: ماژولارسازی پنل شخصی پرسنل (`PersonalPortalView`)
- [x] تفکیک تب ثبت و پیگیری مرخصی به `src/components/personal-portal/LeaveRequestsTab.tsx`
- [x] تفکیک تب ثبت و پیگیری مساعده به `src/components/personal-portal/AdvanceRequestsTab.tsx`
- [x] تفکیک تب اطلاعات کاربری و تغییر رمز به `src/components/personal-portal/ProfileTab.tsx` و `PasswordTab.tsx`
- [x] کامپایل و تست فرآیند ثبت و مشاهده سوابق (کاهش حجم از ۱,۵۱۸ خط به ۸۱۹ خط با موفقیت کامل)

### 📌 فاز ۳: ماژولارسازی گزارشات تحلیلی و نموداری (`AnalyticsView`)
- [x] تفکیک نمودارهای عملکرد گزارش‌محور به `src/components/analytics/DailyReportsTab.tsx`
- [x] تفکیک نمودارهای پوشش مشتریان به `src/components/analytics/CustomerCoverageTab.tsx`
- [x] تفکیک روندهای دوره‌ای و جدول لیدربورد به `src/components/analytics/TrendsLeaderboardTab.tsx`
- [x] جداسازی تایپ‌ها و ساختار اشتراکی به `src/components/analytics/types.ts`
- [x] کامپایل، اعتبارسنجی تایپ‌ها (`tsc --noEmit`) و بیلد موفق (کاهش حجم `AnalyticsView.tsx` از ۱,۵۸۹ خط به ۴۳۰ خط)

### 📌 فاز ۴: تفکیک ماژولار بک‌اند (`server.ts`)
- [x] ایجاد دایرکتوری `server/` و استخراج لایه‌های هسته (`config.ts`, `directus/client.ts`, `services/sms.service.ts`, `services/phoneNormalizer.ts`, `middlewares/auth.middleware.ts`, `middlewares/rateLimit.middleware.ts`)
- [x] استخراج روت‌های مرخصی و مساعده (`leaveRequests.routes.ts`, `advanceRequests.routes.ts`)
- [x] استخراج روت‌های احراز هویت و پرسنل (`auth.routes.ts`, `personnel.routes.ts`)
- [x] استخراج روت‌های مشتریان و گزارشات (`customers.routes.ts`, `reports.routes.ts`, `coldLeads.routes.ts`, `adminReports.routes.ts`, `tenants.routes.ts`, `system.routes.ts`)
- [x] جایگزینی هسته `server.ts` به عنوان Mount Point و هاب نهایی اکسپرس (کاهش حجم از ۸,۰۴۴ خط به ۷ خط با حفظ کامل عملکردها)

### 📌 فاز ۵: سبک‌سازی `App.tsx` و `api.ts`
- [ ] ایجاد Custom Hooks اختصاصی برای مدیریت درخواست‌ها و کش محلی
- [ ] تفکیک توابع فراخوانی API به فایل‌های اختصاصی (`api/customers.ts`, `api/reports.ts`, `api/leave.ts`, ...)
- [ ] ساده‌سازی ساختار لایه روت در `App.tsx`

---

## ۵. چک‌لیست پایش و تضمین سلامت (Quality Assurance Checklist)

قبل و بعد از هر تغییر فاز، بررسی‌های زیر به صورت سیستمی صورت می‌پذیرد:
1. اجرای دستور `npm run lint` و رفع هرگونه خطای تایپ یا ایمپورت نامعتبر.
2. اجرای `npm run build` و حصول اطمینان از خروجی موفق در پوشه `dist/`.
3. تست کارکردی ثبت مرخصی و مساعده در دایرکتوس.
4. تست ارسال پیامک‌های نوتیفیکیشن ippanel با شبیه‌سازی کدهای پترن.
5. تست ورود، بارگذاری لیست‌ها و سوئیچ بین سازمان‌ها بدون تغییر رفتار برای کاربران.
