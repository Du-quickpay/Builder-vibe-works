# 📞 راهنمای چت پشتیبانی والکس

## 🎯 **امکانات**

سیستم چت پشتیبانی والکس به شما امکان integrate کردن چت آنلاین اصلی والکس را می‌دهد تا ساپورت‌های والکس مستقیماً پاسخ‌گو باشند.

## 🔧 **انواع Integration موجود**

### 1. **Telegram Support** (پیش‌فرض)

```env
VITE_WALLEX_CHAT_TYPE=telegram
VITE_WALLEX_TELEGRAM_SUPPORT=https://t.me/WallexSupport
```

- **مزایا**: ساده، سریع، مستقیم
- **نحوه کار**: کلیک دکمه → باز شدن چت تلگرام در تب جدید

### 2. **Iframe Integration**

```env
VITE_WALLEX_CHAT_TYPE=iframe
VITE_WALLEX_CHAT_URL=https://wallex.ir/support-chat
```

- **مزایا**: چت در همان صفحه، تجربه یکپارچه
- **نیاز**: URL صفحه چت اختصاصی والکس

### 3. **Intercom Integration**

```env
VITE_WALLEX_CHAT_TYPE=intercom
VITE_WALLEX_INTERCOM_ID=your_app_id
```

- **مزایا**: پیشرفته‌ترین امکانات، تیکت‌ها، history
- **نیاز**: حساب Intercom والکس

### 4. **Zendesk Chat**

```env
VITE_WALLEX_CHAT_TYPE=zendesk
VITE_WALLEX_ZENDESK_DOMAIN=wallex.zendesk.com
```

- **مزایا**: سیستم تیکت قدرتمند، گزارشات تفصیلی
- **نیاز**: حساب Zendesk والکس

### 5. **Crisp Chat**

```env
VITE_WALLEX_CHAT_TYPE=crisp
VITE_WALLEX_CRISP_ID=your_website_id
```

- **مزایا**: رابط کاربری زیبا، امکانات مدرن
- **نیاز**: حساب Crisp والکس

### 6. **Custom Widget**

```env
VITE_WALLEX_CHAT_TYPE=widget
```

- **مزایا**: کاملاً سفارشی، برند اختصاصی والکس
- **نیاز**: widget اختصاصی والکس

## 🔗 **نحوه اتصال به والکس**

### **گزینه 1: اتصال مستقیم (توصیه می‌شود)**

اگر والکس API یا widget چت دارد:

1. **تماس با تیم فنی والکس** برای دریافت:

   - URL چت آنلاین
   - ID های integration
   - Script widget (اگر دارند)

2. **تنظیم متغیرهای محیطی**:

```env
VITE_WALLEX_CHAT_TYPE=iframe
VITE_WALLEX_CHAT_URL=https://wallex.ir/live-chat
```

### **گزینه 2: Telegram (فعلی)**

```env
VITE_WALLEX_CHAT_TYPE=telegram
VITE_WALLEX_TELEGRAM_SUPPORT=https://t.me/WallexSupport
```

### **گزینه 3: شخص‌سازی کامل**

می‌توانید در فایل `src/lib/wallex-support-config.ts` تنظیمات را شخصی‌سازی کنید:

```typescript
// Custom configuration
const customConfig: WallexSupportChatConfig = {
  type: "iframe",
  enabled: true,
  iframeUrl: "https://wallex.ir/custom-chat",
  buttonText: "گفتگو با والکس",
  welcomeMessage: "کارشناسان والکس آماده پاسخگویی هستند",
  supportTeamName: "تیم پشتیبانی والکس",
  iframeHeight: "600px",
};
```

## 🎨 **شخصی‌سازی ظاهر**

### **تغییر متن دکمه**

```typescript
config = {
  buttonText: "متن دلخواه شما",
  welcomeMessage: "پیام خوشامدگویی",
  supportTeamName: "نام تیم پشتیبانی",
};
```

### **تنظیم اندازه Modal**

```typescript
config = {
  iframeHeight: "500px", // ارتفاع چت
};
```

## 📋 **راهنمای پیاده‌سازی برای والکس**

### **مرحله 1: تعیین نوع Integration**

```bash
# بررسی امکانات موجود والکس
- آیا والکس صفحه چت مجزا دارد؟
- آیا از Intercom/Zendesk استفاده می‌کنند؟
- آیا widget اختصاصی دارند؟
```

### **مرحله 2: تنظیم متغیرها**

```bash
# کپی .env.example به .env
cp .env.example .env

# ویرایش فایل .env
VITE_WALLEX_CHAT_TYPE=iframe
VITE_WALLEX_CHAT_URL=https://wallex.ir/live-support
```

### **مرحله 3: تست و راه‌اندازی**

```bash
# ران کردن پروژه
npm run dev

# تست دکمه پشتیبانی در صفحه اصلی
```

## 🔍 **Test Cases**

### **تست عملکرد**

1. کلیک دکمه پشتیبانی
2. بررسی باز شدن صحیح چت/modal
3. تست روی موبایل و دسکتاپ
4. بررسی loading states

### **تست Integration**

1. **Telegram**: باز شدن چت در تب جدید
2. **Iframe**: نمایش صحیح صفحه چت
3. **Third-party**: اتصال صحیح به سرویس

## ⚡ **Performance**

- **Bundle Size**: +7KB (gzipped)
- **Load Time**: بدون تاثیر بر سرعت بارگذاری اولیه
- **Lazy Loading**: widget ها به صورت lazy load می‌شوند

## 🛡️ **امنیت**

- **CSP**: سازگار با Content Security Policy
- **HTTPS**: همه integration ها از HTTPS استفاده می‌کنند
- **Privacy**: عدم ذخیره اطلاعات محرمانه

## 📱 **سازگاری**

- ✅ **Mobile**: کاملاً responsive
- ✅ **Desktop**: تجربه بهینه
- ✅ **Browsers**: همه مرورگرهای مدرن
- ✅ **RTL**: پشتیبانی کامل از راست به چپ

## 🎉 **مزایای Integration با والکس اصلی**

### **برای کاربران**

- پاسخ‌های سریع‌تر از تیم اصلی والکس
- دسترسی به history مکالمات
- امکان پیگیری تیکت‌ها
- تجربه یکپارچه و حرفه‌ای

### **برای والکس**

- مدیریت متمرکز پشتیبانی
- ردیابی کیفیت خدمات
- آمار و گزارش‌گیری
- کاهش بار کاری

## 📞 **مراحل عملیاتی شدن**

1. **هماهنگی با والکس**: تماس با تیم فنی برای دریافت API/URL
2. **تنظیم .env**: ویرایش فایل تنظیمات
3. **تست**: بررسی عملکرد در محیط development
4. **Deploy**: انتشار در محیط production

---

**💡 نکته**: برای بهترین تجربه، توصیه می‌شود از integration مستقیم با سیستم چت اصلی والکس استفاده کنید.
