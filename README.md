# Wallex Authentication System

A comprehensive authentication system for Wallex exchange platform with Telegram integration and real-time presence tracking.

## 🌟 Features

### 🔐 Authentication Methods
- **Phone Number Verification** with SMS/Telegram integration
- **Email Verification** with 6-digit code system
- **Password Authentication** with recovery options
- **Google Authenticator (2FA)** support
- **Multi-step Authentication** flow

### 📱 Telegram Integration
- **Real-time Admin Control** via Telegram bot
- **Live User Status Tracking** (online/offline/away)
- **Interactive Admin Buttons** for authentication management
- **Session Management** with detailed user information
- **Automatic Status Updates** with presence detection

### 🎨 UI/UX Features
- **Responsive Design** optimized for mobile and desktop
- **Persian/RTL Support** with proper text encoding
- **Clean Modern Interface** with Wallex branding
- **Real-time Form Validation** and error handling
- **Progress Indicators** and loading states
- **Accessibility Support** with proper ARIA attributes

### 🚀 Technical Features
- **TypeScript** for type safety
- **React 18** with modern hooks
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Real-time Presence System** with WebSocket fallback
- **Network Resilience** with circuit breaker pattern
- **Error Boundary** and comprehensive error handling

## 🛠️ Installation

### Prerequisites
- Node.js 16+ 
- npm/yarn/pnpm
- Telegram Bot Token (optional)

### Quick Start

1. **Clone the repository:**
```bash
git clone <repository-url>
cd wallex-auth-system
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up environment variables:**
```bash
cp .env.example .env
```

Edit `.env` file with your configuration:
```env
# Telegram Bot Configuration (Optional)
VITE_TELEGRAM_BOT_TOKEN=your_bot_token_here
VITE_TELEGRAM_CHAT_ID=your_chat_id_here

# Wallex Support Chat Configuration
VITE_WALLEX_CHAT_TYPE=telegram
VITE_WALLEX_TELEGRAM_SUPPORT=https://t.me/WallexSupport
```

4. **Start development server:**
```bash
npm run dev
```

5. **Build for production:**
```bash
npm run build
```

## 📋 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production  
- `npm run preview` - Preview production build
- `npm run typecheck` - Run TypeScript type checking
- `npm run format.fix` - Format code with Prettier

## 🏗️ Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── ui/              # Base UI components (buttons, inputs, etc.)
│   ├── LoginForm.tsx    # Main authentication form
│   ├── AlertMessage.tsx # Alert/notification component
│   └── WallexSupportChat.tsx # Support chat widget
├── pages/               # Application pages
│   ├── Index.tsx        # Main entry page
│   ├── AuthEmail.tsx    # Email verification page
│   ├── AuthGoogle.tsx   # Google Auth page
│   └── ...
├── lib/                 # Utility libraries and services
│   ├── telegram-service-enhanced.ts  # Telegram integration
│   ├── network-manager-lite.ts      # Network handling
│   ├── persian-utils.ts             # Persian/RTL utilities
│   └── ...
├── hooks/               # Custom React hooks
└── styles/              # CSS and styling files
```

## 🔧 Configuration

### Telegram Bot Setup (Optional)

1. **Create a Telegram Bot:**
   - Message @BotFather on Telegram
   - Use `/newbot` command
   - Get your bot token

2. **Get Chat ID:**
   - Message @userinfobot to get your chat ID
   - Or message your bot and check webhook logs

3. **Configure Environment:**
```env
VITE_TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
VITE_TELEGRAM_CHAT_ID=123456789
```

### Support Chat Configuration

Choose your preferred support integration:

```env
# Telegram (Default)
VITE_WALLEX_CHAT_TYPE=telegram
VITE_WALLEX_TELEGRAM_SUPPORT=https://t.me/WallexSupport

# Other options: iframe, intercom, zendesk, crisp, widget
```

## 🎯 Authentication Flow

1. **Phone Number Entry** - User enters mobile number
2. **CAPTCHA Verification** - Security verification
3. **SMS/Telegram Code** - 6-digit verification code
4. **Multi-Factor Auth** (if enabled):
   - Password verification
   - Email verification  
   - Google Authenticator
5. **Session Creation** - Successful authentication

## 📱 Telegram Admin Features

When properly configured, admins can:

- **Monitor User Status** - Real-time online/offline tracking
- **Control Authentication** - Approve/reject auth attempts
- **View Session Details** - Complete user session information
- **Manage User Flow** - Guide users through auth steps
- **Error Resolution** - Help with authentication issues

## 🔒 Security Features

- **Input Validation** and sanitization
- **Rate Limiting** for API calls
- **Session Management** with secure tokens
- **CSRF Protection** 
- **Network Error Handling** with retry logic
- **Circuit Breaker Pattern** for resilience

## 🌐 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari, Chrome Mobile)

## 📖 Development Guidelines

### Code Style
- Use TypeScript for all new code
- Follow React best practices
- Implement proper error boundaries
- Write responsive, accessible components
- Use semantic HTML elements

### Performance
- Lazy load components when possible
- Optimize bundle size
- Implement proper caching strategies
- Monitor Core Web Vitals

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm install -g vercel
vercel --prod
```

### Netlify
```bash
npm run build
# Upload dist/ folder to Netlify
```

### Manual Deploy
```bash
npm run build
# Serve dist/ folder with any static server
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact via Telegram: [@WallexSupport](https://t.me/WallexSupport)
- Email: support@wallex.ir

## 🏆 Acknowledgments

Built with ❤️ for the Wallex community.

---

**Note:** This is a complete authentication system designed for the Wallex exchange platform. All branding and styling reflects Wallex's identity and requirements.
