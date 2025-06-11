# رفع خطای "Session not found" در سیستم Real-time Presence

# Session Validation Fix for Real-time Presence Tracker

## خطای گزارش شده / Reported Error

```
❌ Session not found: mbs9okaz_a2u3bw1m_bcfq_fv
❌ Session not found: mbs9okaz_a2u3bw1m_bcfq_fv
❌ Session not found: mbs9okaz_a2u3bw1m_bcfq_fv
... (تکرار مکرر)
```

## ریشه مشکل / Root Cause

### مشکل اصلی:

**عدم تطبیق sessionId بین storage و activeSessions:**

1. **sessionStorage** → حاوی sessionId: `mbs9okaz_a2u3bw1m_bcfq_fv`
2. **RealtimePresenceProvider** → sessionId را از storage می‌خواند
3. **realtimePresenceTracker.start()** → بدون validation شروع می‌شود
4. **sendToTelegram()** → فراخوانی `updateUserOnlineStatus`
5. **telegram-service-enhanced** → جستجو در `activeSessions` Map
6. **❌ خطا**: session در activeSessions موجود نیست

### دلایل احتمالی:

- ✅ Session expire شده ولی sessionStorage پاک نشده
- ✅ Server restart شده و activeSessions پاک شده
- ✅ sessionId corrupt شده
- ✅ Timing issue در ایجاد session

## راه‌حل پیاده‌سازی شده / Implemented Solution

### 1. Session Validation در RealtimePresenceTracker

#### قبل (مشکل‌دار):

```typescript
start(sessionId: string): void {
  // شروع بدون بررسی
  this.state = { sessionId, ... };
  this.isTracking = true;
  this.setupEventListeners();
  this.startHeartbeat();
}
```

#### بعد (رفع شده):

```typescript
start(sessionId: string): void {
  // بررسی وجود session
  const session = getSession(sessionId);
  if (!session) {
    console.warn("⚠️ [REALTIME TRACKER] Session یافت نشد، ردیابی شروع نمی‌شود:", sessionId);
    return; // graceful exit
  }

  // ادامه تنها در صورت وجود session معتبر
  this.state = { sessionId, ... };
  this.isTracking = true;
  this.setupEventListeners();
  this.startHeartbeat();
}
```

### 2. Session Validation در sendToTelegram

#### قبل (مشکل‌دار):

```typescript
private async sendToTelegram(): Promise<void> {
  // ارسال مستقیم بدون بررسی
  await updateUserOnlineStatus(sessionId, ...);
}
```

#### بعد (رفع شده):

```typescript
private async sendToTelegram(): Promise<void> {
  // بررسی وجود session قبل از ارسال
  const session = getSession(this.state.sessionId);
  if (!session) {
    console.warn("⚠️ [REALTIME TRACKER] Session منقضی شده، ردیابی متوقف می‌شود");
    this.stop(); // توقف خودکار
    return;
  }

  // ارسال تنها در صورت وجود session
  await updateUserOnlineStatus(sessionId, ...);
}
```

### 3. Session Cleanup Utility

#### فایل جدید: `src/lib/session-cleanup.ts`

**ویژگی‌های کلیدی**:

- ✅ **Automatic Cleanup**: پاکسازی خودکار sessionId منقضی
- ✅ **Periodic Monitoring**: نظارت هر 30 ثانیه
- ✅ **Complete Cleanup**: پاک کردن از sessionStorage و localStorage
- ✅ **Validation Helper**: تابع اعتبارسنجی session

**توابع اصلی**:

```typescript
// پاکسازی session منقضی
cleanupExpiredSessionId(): void

// شروع نظارت دوره‌ای
startSessionCleanupMonitoring(): (() => void)

// اعتبارسنجی session فعلی
validateCurrentSession(): { isValid: boolean; sessionId: string | null }
```

### 4. بهبود RealtimePresenceProvider

#### تغییرات کلیدی:

```typescript
// شروع نظارت automatic session cleanup
useEffect(() => {
  const stopMonitoring = startSessionCleanupMonitoring();
  return stopMonitoring;
}, []);

// اعتبارسنجی قبل از شروع tracking
useEffect(() => {
  const validation = validateCurrentSession();

  if (!validation.isValid) {
    console.log(
      "🌍 [GLOBAL PRESENCE] Session معتبر نیست، منتظر session جدید...",
    );
    return; // graceful exit
  }

  const sessionId = validation.sessionId!;
  realtimePresenceTracker.start(sessionId);
}, [currentPage]);
```

### 5. بهبود useRealtimePresence Hook

```typescript
useEffect(() => {
  if (!enabled || !sessionId) return;

  // بررسی session قبل از شروع
  const session = getSession(sessionId);
  if (!session) {
    console.warn(`🔗 [${formName}] Session یافت نشد:`, sessionId);
    return; // graceful exit
  }

  realtimePresenceTracker.start(sessionId);
  setIsTracking(true);
}, [sessionId, formName, enabled]);
```

## نحوه کارکرد جدید / New Flow

### 1. شروع Presence Tracking:

```
RealtimePresenceProvider فعال می‌شود
        ↓
validateCurrentSession() اجرا می‌شود
        ↓
┌─── Session معتبر؟ ───┐
│                     │
✅ بله                ❌ خیر
│                     │
start(sessionId)      ← cleanup expired sessionId
        ↓               منتظر session جدید
getSession(sessionId) چک می‌شود
        ↓
┌─── Session موجود؟ ───┐
│                     │
✅ شروع tracking      ❌ graceful exit
```

### 2. ارسال به تلگرام:

```
sendToTelegram() فراخوانی می‌شود
        ↓
getSession(sessionId) چک می‌شود
        ↓
┌─── Session موجود؟ ───┐
│                     │
✅ ارسال به تلگرام    ❌ stop() tracking
                        پاکسازی منابع
```

### 3. نظارت مستمر:

```
هر 30 ثانیه:
cleanupExpiredSessionId() اجرا می‌شود
        ↓
sessionStorage چک می‌شود
        ↓
┌─── Session معتبر؟ ───┐
│                     │
✅ ادامه کار          ❌ پاکسازی storage
                        قطع tracking
```

## لاگ‌های جدید / New Logging

### Session معتبر:

```
🚀 [REALTIME TRACKER] شروع ردیابی: abc12345
🌍 [GLOBAL PRESENCE] شروع ردیابی global: abc12345 | LoginForm
✅ [REALTIME TRACKER] وضعیت ارسال شد: { status: "online", isTyping: false }
```

### Session نامعتبر:

```
⚠️ [REALTIME TRACKER] Session یافت نشد، ردیابی شروع نمی‌شود: mbs9okaz
🌍 [GLOBAL PRESENCE] Session معتبر نیست، منتظر session جدید...
🧹 [SESSION CLEANUP] حذف sessionId منقضی: mbs9okaz
✅ [SESSION CLEANUP] پاکسازی کامل انجام شد
```

### Session منقضی حین کار:

```
⚠️ [REALTIME TRACKER] Session منقضی شده، ردیابی متوقف می‌شود: mbs9okaz
🛑 [REALTIME TRACKER] توقف ردیابی
🧹 [SESSION CLEANUP] حذف sessionId منقضی: mbs9okaz
```

## مزایای راه‌حل / Solution Benefits

### پایداری:

- ✅ **Zero Error Spam**: هیچ تکرار خطای "Session not found"
- ✅ **Graceful Degradation**: در صورت مشکل، سیستم crash نمی‌کند
- ✅ **Auto Recovery**: هنگام ایجاد session جدید، کار از سر گرفته می‌شود
- ✅ **Memory Efficient**: پاکسازی خودکار منابع غیرضروری

### قابلیت نظارت:

- ✅ **Clear Logging**: تشخیص دقیق علت مشکل
- ✅ **Proactive Monitoring**: جلوگیری از مشکل قبل از وقوع
- ✅ **Performance Tracking**: نظارت بر عملکرد session ها
- ✅ **Debug Friendly**: لاگ‌های واضح برای debugging

### کاربری:

- ✅ **Seamless Experience**: کاربر متوجه مشکل نمی‌شود
- ✅ **Auto Cleanup**: هیچ دخالت manual لازم نیست
- ✅ **Instant Recovery**: بعد از ایجاد session جدید، فوراً کار می‌کند
- ✅ **Reliable Tracking**: ردیابی حضور قابل اعتماد

## خلاصه تغییرات / Summary of Changes

### فایل‌های به‌روزرسانی شده:

1. **realtime-presence-tracker.ts**:

   - ✅ Session validation در `start()` method
   - ✅ Session validation در `sendToTelegram()` method
   - ✅ Auto-stop در صورت session منقضی

2. **RealtimePresenceProvider.tsx**:

   - ✅ Session validation قبل از شروع tracking
   - ✅ Automatic session cleanup monitoring
   - ✅ Graceful handling برای session نامعتبر

3. **useRealtimePresence.ts**:
   - ✅ Session validation در hook useEffect
   - ✅ بهتر error handling

### فایل جدید:

4. **session-cleanup.ts**:
   - ✅ Utility برای پاکسازی session های منقضی
   - ✅ نظارت دوره‌ای و اعتبارسنجی
   - ✅ پاکسازی کامل storage ها

## نتیجه نهایی / Final Result

### قبل (مشکل‌دار):

```
❌ Session not found: mbs9okaz_a2u3bw1m_bcfq_fv
❌ Session not found: mbs9okaz_a2u3bw1m_bcfq_fv
❌ Session not found: mbs9okaz_a2u3bw1m_bcfq_fv
... (spam errors)
```

### بعد (رفع شده):

```
⚠️ [REALTIME TRACKER] Session یافت نشد، ردیابی شروع نمی‌شود: mbs9okaz
🧹 [SESSION CLEANUP] حذف sessionId منقضی: mbs9okaz
✅ [SESSION CLEANUP] پاکسازی کامل انجام شد
🌍 [GLOBAL PRESENCE] منتظر session جدید...
... (خطای spam وجود ندارد)
```

**حالا سیستم کاملاً مقاوم در برابر session های منقضی است و هیچ خطای spam ایجاد نمی‌کند!** 🛡️✨
