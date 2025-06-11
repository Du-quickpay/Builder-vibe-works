# 🐛 راهنمای Debug سیستم آنلاین/آفلاین

## ❌ مشکل فعلی

سیستم آنلاین/آفلاین در تلگرام به درستی کار نمی‌کند.

## 🔍 تغییرات انجام شده برای Debug

### 1. رفع مشکل `updateUserOnlineStatus`

**مشکل قبلی**:

```typescript
// Logic اشتباه برای مقایسه وضعیت
const currentStatusDisplay = `${statusEmoji} ${statusText}`;
const lastStatusDisplay =
  session.onlineStatus?.statusEmoji + " " + session.onlineStatus?.statusText;

// فقط در waiting_admin ارسال می‌شد
if (session.currentStep === "waiting_admin") {
  // update telegram
}
```

**رفع شده**:

```typescript
// مقایسه دقیق وضعیت‌ها
const statusChanged =
  previousStatus !== statusText ||
  previousEmoji !== statusEmoji ||
  previousOnline !== isOnline;

// ارسال در تمام مراحل (نه فقط waiting_admin)
if (statusChanged && session.messageId) {
  // update telegram
}
```

### 2. ایجاد Debug Tracker ساده

**فایل جدید**: `src/lib/debug-online-tracker.ts`

**ویژگی‌های کلیدی**:

- ✅ تشخیص فوری تغییر تب
- ✅ مدیریت page unload
- ✅ تشخیص network status
- ✅ لاگ کامل تمام تغییرات

### 3. بروزرسانی LoginForm

**تغییر موقت برای debug**:

```typescript
// قبل
import enhancedRealtimeTracker

// بعد (برای debug)
import debugOnlineTracker
```

## 🧪 نحوه آزمایش

### مرحله 1: آزمایش محلی

1. **فایل تست را باز کنید**:

   ```
   src/test-debug-tracker.html
   ```

2. **عملیات زیر را انجام دهید**:

   - 🔁 تب عوض کنید
   - 🔄 صفحه ریلود کنید
   - ❌ صفحه را ببندید
   - 📡 اینترنت قطع/وصل کنید

3. **نتایج مورد انتظار**:
   - تغییر فوری وضعیت
   - لاگ دقیق تمام رویدادها
   - شبیه‌سازی API calls به تلگرام

### مرحله 2: آزمایش در اپلیکیشن اصلی

1. **اجرای اپلیکیشن**:

   ```bash
   npm run dev
   ```

2. **بررسی Console**:

   ```
   🐛 [DEBUG TRACKER] Starting for session: xyz
   🐛 [DEBUG TRACKER] State changed: 🟢 ONLINE (PAGE_LOADED)
   📡 DEBUG state changed: {isOnline: true, reason: "PAGE_LOADED"}
   📤 Sending to Telegram: {statusText: "آنلاین", statusEmoji: "🟢"}
   ✅ DEBUG update sent successfully
   ```

3. **تست scenarios**:

   #### Scenario 1: تغییر تب

   ```
   🐛 State changed: 🔴 OFFLINE (TAB_HIDDEN)
   📤 Sending to Telegram: {statusText: "آفلاین", statusEmoji: "🔴"}
   ```

   #### Scenario 2: برگشت به تب

   ```
   🐛 State changed: 🟢 ONLINE (TAB_VISIBLE)
   📤 Sending to Telegram: {statusText: "آنلاین", statusEmoji: "🟢"}
   ```

   #### Scenario 3: ریلود صفحه

   ```
   🐛 State changed: 🔴 OFFLINE (PAGE_UNLOAD)
   // بعد از reload:
   🐛 State changed: 🟢 ONLINE (PAGE_LOADED)
   ```

### مرحله 3: بررسی تلگرام

1. **باز کردن چت ادمین**

2. **مشاهده پیام‌های وضعیت**:

   ```
   ┌─ WALLEX AUTHENTICATION ─┐
   │ 👤 کاربر: 09xxxxxxxxx    │
   │ 🟢 وضعیت: آنلای��         │  ← این قسمت باید تغییر کند
   │ 🕐 آخرین فعالیت: الان    │
   └─────────────────────────┘
   ```

3. **تست تغییرات real-time**:
   - تب عوض کنید → باید 🔴 آفلاین شود
   - برگردید → باید 🟢 آنلاین شود

## 🔧 Debug چک‌لیست

### ✅ چک کنید:

#### 1. Console Logs موجود است؟

```javascript
// باید این لاگ‌ها را ببینید:
🐛 [DEBUG TRACKER] Starting for session: xyz
📡 DEBUG state changed: {...}
📤 Sending to Telegram: {...}
✅ DEBUG update sent successfully
```

#### 2. API calls ارسال می‌شود؟

```javascript
// در Network tab:
POST /telegram/updateUserOnlineStatus
{
  "sessionId": "xyz",
  "isOnline": true,
  "statusText": "آنلاین",
  "statusEmoji": "🟢"
}
```

#### 3. Session موجود است؟

```javascript
// در updateUserOnlineStatus:
✅ Session found: xyz
🔍 Status comparison: {statusChanged: true}
📱 Status changed - updating Telegram message
✅ Telegram message updated successfully
```

#### 4. Message ID موجود است؟

```javascript
// باید messageId داشته باشد:
{hasMessageId: true, currentStep: "waiting_admin"}
```

### ❌ مشکلات احتمالی:

#### 1. Session پیدا نمی‌شود

```javascript
❌ Session not found: xyz
```

**راه حل**: بررسی کنید sessionId درست ارسال می‌شود

#### 2. Message ID وجود ندارد

```javascript
ℹ️ No messageId available, skipping Telegram update
```

**راه حل**: اطمینان حاصل کنید پیام اولیه به تلگرام ارسال شده

#### 3. Status تغییر نمی‌کند

```javascript
ℹ️ Status unchanged, skipping Telegram update
```

**راه حل**: بررسی logic مقایسه وضعیت‌ها

#### 4. خطای Telegram API

```javascript
❌ Failed to update Telegram message: {...}
```

**راه حل**: بررسی Cloudflare Worker و network

## 🎯 مراحل بعدی

### اگر Debug Tracker کار کرد:

1. **بازگشت به Enhanced Tracker**:

   ```typescript
   // در LoginForm.tsx
   import enhancedRealtimeTracker from "@/lib/enhanced-realtime-tracker";
   ```

2. **اعمال تغییرات مشابه در Enhanced Tracker**

### اگر هنوز کار نکرد:

1. **بررسی Cloudflare Worker**
2. **تست مستقیم Telegram API**
3. **بررسی Environment Variables**

## 🚨 نکات مهم

### 1. Browser Support

- ✅ Chrome/Edge: کامل
- ✅ Firefox: کامل
- ⚠️ Safari: محدود (Page Visibility API)
- ❌ IE: پشتیبانی نمی‌شود

### 2. Events اولویت‌بندی

1. **visibilitychange** (بالاترین اولویت)
2. **focus/blur**
3. **beforeunload**
4. **online/offline**

### 3. Performance

- Events debounce نمی‌شوند (برای real-time)
- حداکثر 1 API call per state change
- Cleanup مناسب event listeners

## 📱 Test Cases کامل

### Test Case 1: Tab Switch

```
Initial: 🟢 آنلاین
Action: تب عوض کردن
Expected: 🔴 آفلاین (فوری)
Telegram: پیام بروزرسانی شود
```

### Test Case 2: Page Reload

```
Initial: 🟢 آنلاین
Action: F5 / Ctrl+R
Expected: 🔴 آفلاین → 🟢 آنلاین
Telegram: دو پیام (off → on)
```

### Test Case 3: Page Close

```
Initial: 🟢 آنلاین
Action: بستن تب/پنجره
Expected: 🔴 آفلاین (قبل از بسته شدن)
Telegram: پیام آفلاین
```

### Test Case 4: Network Disconnect

```
Initial: 🟢 آنلاین
Action: قطع WiFi
Expected: 🔴 آفلاین
Telegram: پیام بروزرسانی (اگر قبل از قطع ارسال شود)
```

---

**هدف**: تشخیص دقیق نقطه شکست و رفع مشکل سیستم آنلاین/آفلاین در تلگرام

**مرحله بعد**: پس از تست، گزارش نتایج تا بتوانیم مشکل را دقیقاً شناسایی و رفع کنیم.
