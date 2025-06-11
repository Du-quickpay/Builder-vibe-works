# Production Deployment Guide

This guide covers deploying the Wallex Authentication System to production environments.

## 🎯 Pre-deployment Checklist

### Environment Setup

- [ ] Telegram bot token configured
- [ ] Admin chat ID configured
- [ ] Environment variables validated
- [ ] Build process tested locally

### Code Quality

- [ ] TypeScript checks passing: `npm run typecheck`
- [ ] Build successful: `npm run build`
- [ ] All tests passing: `npm run test`
- [ ] Code formatted: `npm run format.fix`

### Security Review

- [ ] No hardcoded secrets in code
- [ ] Environment variables properly configured
- [ ] Admin access control tested
- [ ] Input validation verified

## 🚀 Deployment Options

### Option 1: Vercel (Recommended)

**Why Vercel?**

- Zero-config deployment
- Automatic SSL certificates
- Global CDN
- Environment variable management
- Git integration

**Steps:**

1. **Prepare Repository**

   ```bash
   git add .
   git commit -m "Production ready deployment"
   git push origin main
   ```

2. **Deploy to Vercel**

   - Visit [vercel.com](https://vercel.com)
   - Connect your GitHub/GitLab account
   - Import the repository
   - Configure environment variables:
     - `VITE_TELEGRAM_BOT_TOKEN`
     - `VITE_TELEGRAM_CHAT_ID`

3. **Verify Deployment**
   - Test authentication flow
   - Verify Telegram integration
   - Check presence tracking

**Build Command:** `npm run build`
**Output Directory:** `dist`

### Option 2: Netlify

**Steps:**

1. **Build Locally**

   ```bash
   npm run build
   ```

2. **Deploy via Netlify CLI**

   ```bash
   npm install -g netlify-cli
   netlify login
   netlify deploy --prod --dir=dist
   ```

3. **Environment Variables**
   - Go to Netlify dashboard
   - Site settings → Environment variables
   - Add variables:
     - `VITE_TELEGRAM_BOT_TOKEN`
     - `VITE_TELEGRAM_CHAT_ID`

### Option 3: Self-Hosted (VPS/Server)

**Requirements:**

- Node.js 18+
- Nginx or Apache
- SSL certificate
- Process manager (PM2)

**Steps:**

1. **Server Setup**

   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y

   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs

   # Install PM2
   sudo npm install -g pm2
   ```

2. **Deploy Application**

   ```bash
   # Clone repository
   git clone <your-repo-url> wallex-auth
   cd wallex-auth

   # Install dependencies
   npm install

   # Set environment variables
   echo "VITE_TELEGRAM_BOT_TOKEN=your_token" > .env
   echo "VITE_TELEGRAM_CHAT_ID=your_chat_id" >> .env

   # Build
   npm run build
   ```

3. **Configure Web Server**

   **Nginx Configuration:**

   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           root /path/to/wallex-auth/dist;
           try_files $uri $uri/ /index.html;
       }

       # Security headers
       add_header X-Frame-Options "SAMEORIGIN" always;
       add_header X-Content-Type-Options "nosniff" always;
       add_header X-XSS-Protection "1; mode=block" always;
   }
   ```

4. **SSL Certificate**
   ```bash
   # Using Certbot
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

### Option 4: Docker Deployment

**Dockerfile:**

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Docker Compose:**

```yaml
version: "3.8"
services:
  wallex-auth:
    build: .
    ports:
      - "80:80"
    environment:
      - VITE_TELEGRAM_BOT_TOKEN=${VITE_TELEGRAM_BOT_TOKEN}
      - VITE_TELEGRAM_CHAT_ID=${VITE_TELEGRAM_CHAT_ID}
    restart: unless-stopped
```

## 🔧 Environment Configuration

### Production Environment Variables

Create `.env.production` file:

```env
# Required Variables
VITE_TELEGRAM_BOT_TOKEN=your_production_bot_token
VITE_TELEGRAM_CHAT_ID=your_production_chat_id

# Optional Configuration
NODE_ENV=production
```

### Validation Script

```bash
#!/bin/bash
# validate-env.sh

echo "Validating environment variables..."

if [ -z "$VITE_TELEGRAM_BOT_TOKEN" ]; then
    echo "❌ VITE_TELEGRAM_BOT_TOKEN is not set"
    exit 1
fi

if [ -z "$VITE_TELEGRAM_CHAT_ID" ]; then
    echo "❌ VITE_TELEGRAM_CHAT_ID is not set"
    exit 1
fi

echo "✅ All environment variables are set"
```

## 🔒 Security Considerations

### Environment Security

1. **Never commit `.env` files**
2. **Use different tokens for production/staging**
3. **Rotate tokens regularly**
4. **Restrict bot permissions**

### Web Security

1. **HTTPS Only**

   - Redirect HTTP to HTTPS
   - Use HSTS headers
   - Secure cookie flags

2. **Security Headers**

   ```nginx
   add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'";
   add_header X-Frame-Options "DENY";
   add_header X-Content-Type-Options "nosniff";
   add_header Referrer-Policy "strict-origin-when-cross-origin";
   ```

3. **Rate Limiting**
   ```nginx
   limit_req_zone $binary_remote_addr zone=auth:10m rate=10r/m;
   limit_req zone=auth burst=5 nodelay;
   ```

## 📊 Monitoring & Analytics

### Health Checks

Create a simple health check endpoint:

```bash
# health-check.sh
#!/bin/bash

URL="https://your-domain.com"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $URL)

if [ $RESPONSE -eq 200 ]; then
    echo "✅ Site is healthy"
    exit 0
else
    echo "❌ Site is down (HTTP $RESPONSE)"
    exit 1
fi
```

### Log Monitoring

Monitor application logs for:

- Authentication attempts
- Telegram API errors
- Session management issues
- Performance metrics

### Uptime Monitoring

Use services like:

- UptimeRobot
- Pingdom
- StatusCake
- Custom scripts

## 🔄 Continuous Deployment

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test

      - name: Type check
        run: npm run typecheck

      - name: Build
        run: npm run build
        env:
          VITE_TELEGRAM_BOT_TOKEN: ${{ secrets.VITE_TELEGRAM_BOT_TOKEN }}
          VITE_TELEGRAM_CHAT_ID: ${{ secrets.VITE_TELEGRAM_CHAT_ID }}

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: "--prod"
```

## 🚨 Rollback Strategy

### Quick Rollback

1. **Vercel:** Use the dashboard to rollback to previous deployment
2. **Netlify:** Rollback via dashboard or CLI
3. **Self-hosted:** Keep previous build and switch symlinks

### Emergency Procedures

```bash
# Emergency rollback script
#!/bin/bash

echo "Emergency rollback initiated..."

# Stop current service
sudo systemctl stop wallex-auth

# Switch to previous version
sudo ln -sfn /opt/wallex-auth/previous /opt/wallex-auth/current

# Start service
sudo systemctl start wallex-auth

echo "Rollback completed"
```

## 📈 Performance Optimization

### Build Optimization

```bash
# Analyze bundle size
npm run build
npx vite-bundle-analyzer dist

# Pre-compression
gzip -9 -c dist/index.html > dist/index.html.gz
```

### CDN Configuration

Use CDN for static assets:

- Images
- Fonts
- CSS files
- JavaScript bundles

### Caching Strategy

```nginx
# Static assets caching
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# HTML caching
location ~* \.html$ {
    expires 5m;
    add_header Cache-Control "public, must-revalidate";
}
```

## 🔍 Troubleshooting Production Issues

### Common Production Issues

1. **Environment Variables Not Loading**

   - Check variable names (case-sensitive)
   - Verify deployment platform configuration
   - Test with build command locally

2. **Telegram Integration Failing**

   - Verify bot token validity
   - Check chat ID format
   - Test network connectivity
   - Review API rate limits

3. **Build Failures**
   - Check Node.js version compatibility
   - Verify all dependencies installed
   - Review TypeScript errors
   - Check memory limits

### Debug Commands

```bash
# Check environment variables
printenv | grep VITE_

# Test build locally
NODE_ENV=production npm run build

# Verify Telegram configuration
curl "https://api.telegram.org/bot$VITE_TELEGRAM_BOT_TOKEN/getMe"
```

---

**🎉 You're now ready for production deployment!**

Remember to test thoroughly in a staging environment before deploying to production.
