# 🏦 سیستم احراز هویت والکس

سیستم جامع احراز هویت برای پلتفرم صرافی والکس با قابلیت‌های پیشرفته تلگرام و tracking حضور real-time.

## ✨ امکانات اصلی

### 🔐 روش‌های احراز هویت
- **تایید شماره موبایل** با SMS/تلگرام
- **تایید ایمیل** با سیستم کد ۶ رقمی  
- **احراز هویت رمز عبور** با امکان بازیابی
- **Google Authenticator (2FA)** 
- **جریان احراز هویت چندمرحله‌ای**

### 📱 ادغام تلگرام
- **کنترل ادمین real-time** از طریق ربات تلگرام
- **ردیابی وضعیت کاربر زنده** (آنلاین/آفلاین/غایب)
- **دکمه‌های تعاملی ادمین** برای مدیریت احراز هویت
- **مدیریت جلسه** با اطلاعات کامل کاربر
- **به‌روزرسانی خودکار وضعیت** با تشخیص حضور

### 🎨 رابط کاربری
- **طراحی responsive** برای موبایل و دسکتاپ
- **پشتیبانی فارسی/RTL** با encoding صحیح
- **رابط مدرن و تمیز** با برندینگ والکس
- **اعتبارسنجی فرم real-time** و مدیریت خطا
- **نمایشگرهای پیشرفت** و loading state ها
- **پشتیبانی از accessibility** با ویژگی‌های ARIA

### 🚀 ویژگی‌های فنی
- **TypeScript** برای type safety
- **React 18** با hook های مدرن
- **Vite** برای development و build سریع
- **Tailwind CSS** برای styling
- **سیستم حضور real-time** با WebSocket fallback
- **مقاومت شبکه** با circuit breaker pattern
- **Error boundary** و مدیریت جامع خطا

## 🛠️ نصب و راه‌اندازی

### پیش‌نیازها
- Node.js 16+
- npm/yarn/pnpm
- Telegram Bot Token (اختیاری)

### شروع سریع

```bash
# کلون کردن پروژه
git clone <repository-url>
cd wallex-auth-system

# نصب وابستگی‌ها
npm install

# تنظیم متغیرهای محیطی
cp .env.example .env

# اجرای سرور development
npm run dev

# build برای production
npm run build
```

### تنظیمات محیطی

```env
# تنظیمات ربات تلگرام (اختیاری)
VITE_TELEGRAM_BOT_TOKEN=your_bot_token_here
VITE_TELEGRAM_CHAT_ID=your_chat_id_here

# تنظیمات چت پشتیبانی والکس
VITE_WALLEX_CHAT_TYPE=telegram
VITE_WALLEX_TELEGRAM_SUPPORT=https://t.me/WallexSupport
```

## 📋 دستورات در دسترس

- `npm run dev` - اجرای سرور development
- `npm run build` - build برای production
- `npm run preview` - preview build production
- `npm run typecheck` - بررسی type های TypeScript
- `npm run format.fix` - فرمت کردن کد با Prettier

## 🏗️ ساختار پروژه

```
src/
├── components/           # کامپوننت‌های قابل استفاده مجدد
│   ├── ui/              # کامپوننت‌های پایه UI
│   ├── LoginForm.tsx    # فرم اصلی احراز هویت
│   ├── AlertMessage.tsx # کامپوننت alert/notification
│   └── WallexSupportChat.tsx # ویجت چت پشتیبانی
├── pages/               # صفحات اپلیکیشن
│   ├── Index.tsx        # صفحه ورودی اصلی
│   ├── AuthEmail.tsx    # صفحه تایید ایمیل
│   ├── AuthGoogle.tsx   # صفحه احراز هویت گوگل
│   └── ...
├── lib/                 # کتابخانه‌های کمکی و سرویس‌ها
│   ├── telegram-service-enhanced.ts  # ادغام تلگرام
│   ├── network-manager-lite.ts      # مدیریت شبکه
│   ├── persian-utils.ts             # ابزارهای فارسی/RTL
│   └── ...
├── hooks/               # hook های سفارشی React
└── styles/              # فایل‌های CSS و styling
```

## 🔧 تنظیمات پیشرفته

### راه‌اندازی ربات تلگرام

1. **ایجاد ربات تلگرام:**
   - پیام دادن به @BotFather در تلگرام
   - استفاده از دستور `/newbot`
   - دریافت token ربات

2. **دریافت Chat ID:**
   - پیام دادن به @userinfobot برای دریافت chat ID
   - یا پیا�� دادن به ربات و بررسی webhook logs

3. **تنظیم محیط:**
```env
VITE_TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
VITE_TELEGRAM_CHAT_ID=123456789
```

### تنظیمات چت پشتیبانی

انتخاب نوع integration مورد نظر:

```env
# تلگرام (پیش‌فرض)
VITE_WALLEX_CHAT_TYPE=telegram
VITE_WALLEX_TELEGRAM_SUPPORT=https://t.me/WallexSupport

# سایر گزینه‌ها: iframe, intercom, zendesk, crisp, widget
```

## 🎯 جریان احراز هویت

1. **ورود شماره موبایل** - کاربر شماره وارد می‌کند
2. **تایید CAPTCHA** - اعتبارسنجی امنیتی
3. **کد SMS/تلگرام** - کد تایید ۶ رقمی
4. **احراز هویت چندعاملی** (در صورت فعال بودن):
   - تایید رمز عبور
   - تایید ایمیل
   - Google Authenticator
5. **ایجاد جلسه** - احراز هویت موفق

## 📱 امکانات ادمین تلگرام

در صورت تنظیم صحیح، ادمین‌ها می‌توانند:

- **نظارت بر وضعیت کاربر** - ردیابی آنلاین/آفلاین real-time
- **کنترل احراز هویت** - تایید/رد تلاش‌های احراز هویت
- **مشاهده جزئیات جلسه** - ��طلاعات کامل جلسه کاربر
- **مدیریت جریان کاربر** - راهنمایی کاربران در مراحل احراز هویت
- **حل مشکلات** - کمک در مسائل احراز هویت

## 🔒 ویژگی‌های امنیتی

- **اعتبارسنجی و پاکسازی ورودی‌ها**
- **محدودیت نرخ** برای فراخوانی‌های API
- **مدیریت جلسه** با token های امن
- **محافظت CSRF**
- **مدیریت خطاهای شبکه** با retry logic
- **Circuit Breaker Pattern** برای مقاومت

## 🌐 پشتیبانی مرورگر

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- مرورگرهای موبایل (iOS Safari, Chrome Mobile)

## 📖 راهنمای توسعه

### سبک کدنویسی
- استفاده از TypeScript برای کدهای جدید
- پیروی از بهترین practices React
- پیاده‌سازی error boundary مناسب
- نوشتن کامپوننت‌های responsive و accessible
- استفاده از element های HTML semantic

### کارایی
- lazy load کردن کامپوننت‌ها در صورت امکان
- بهینه‌سازی bundle size
- پیاده‌سازی استراتژی‌های caching مناسب
- نظارت بر Core Web Vitals

## 🚀 استقرار (Deployment)

### Vercel (پیشنهادی)
```bash
npm install -g vercel
vercel --prod
```

### Netlify
```bash
npm run build
# آپلود پوشه dist/ به Netlify
```

### استقرار دستی
```bash
npm run build
# سرو کردن پوشه dist/ با هر static server
```

## 📊 گزارش وضعیت سیستم

### اجزای سیستم
- ✅ **Dev Server**: فعال روی http://localhost:8080/
- ✅ **Build System**: موفق (760.5 KB کل, 196.47 KB gzipped)
- ✅ **React Router**: همه route ها تنظیم شده
- ✅ **Query Client**: تنظیم شده و در حال اجرا

### ادغام تلگرام
- ✅ **Bot Token**: تنظیم شده
- ✅ **Chat ID**: تنظیم شده
- ✅ **Enhanced Service**: Circuit breaker pattern پیاده‌سازی شده
- ✅ **Callback System**: Callback های امن مبتنی بر session
- ✅ **Admin Keyboard**: دکمه‌های بررسی وضعیت در دسترس

### سیستم حضور و وضعیت
- ✅ **Enhanced Offline Detection**: تست شبکه چندلایه
- ✅ **Manual Status Check**: ادمین می‌تواند وضعیت کاربر را به صورت دستی بررسی کند
- ✅ **Force Offline Test**: دکمه debug برای تست
- ✅ **Global Presence Manager**: مدیریت state متمرکز
- ✅ **Session Management**: جداسازی امن و پاکسازی

### مدیریت شبکه و خطا
- ✅ **Lite Network Manager**: سیستم failover endpoint
- ✅ **Circuit Breaker**: جلوگیری از اتلاف منابع در زمان قطعی
- ✅ **Exponential Backoff**: مکانیزم retry هوشمند
- ✅ **Error Categorization**: تمایز خطاهای شبکه از API
- ✅ **Health Monitoring**: وضعیت سرویس real-time

## 🆘 پشتیبانی

برای پشتیبانی و سوالات:
- ایجاد issue در repository
- تماس از طریق تلگرام: [@WallexSupport](https://t.me/WallexSupport)
- ایمیل: support@wallex.ir

## 📄 مجوز

این پروژه تحت مجوز MIT منتشر شده است.

---

**نکته مهم:** این سیستم احراز هویت کاملی است که مخصوص پلتفرم صرافی والکس طراحی شده. تمام برندینگ و styling منعکس‌کننده هویت و نیازهای والکس است.

**ساخته شده با ❤️ برای جامعه والکس**
