// Wallex Support Chat Configurations
// Different integration options for Wallex support team

import type { WallexSupportChatConfig } from '@/components/WallexSupportChat';

// Environment-based configuration
const WALLEX_CHAT_TYPE = import.meta.env.VITE_WALLEX_CHAT_TYPE || 'telegram';
const WALLEX_TELEGRAM_SUPPORT = import.meta.env.VITE_WALLEX_TELEGRAM_SUPPORT || 'https://t.me/WallexSupport';
const WALLEX_CHAT_URL = import.meta.env.VITE_WALLEX_CHAT_URL;
const WALLEX_INTERCOM_ID = import.meta.env.VITE_WALLEX_INTERCOM_ID;
const WALLEX_ZENDESK_DOMAIN = import.meta.env.VITE_WALLEX_ZENDESK_DOMAIN;
const WALLEX_CRISP_ID = import.meta.env.VITE_WALLEX_CRISP_ID;

// Configuration presets for different integration types
export const WALLEX_SUPPORT_CONFIGS: Record<string, WallexSupportChatConfig> = {
  // Option 1: Telegram Support (default)
  telegram: {
    type: 'telegram',
    enabled: true,
    telegramUrl: WALLEX_TELEGRAM_SUPPORT,
    telegramUsername: '@WallexSupport',
    buttonText: 'پشتیبانی والکس',
    welcomeMessage: 'برای دریافت پشتیبانی سریع، روی دکمه کلیک کنید',
    supportTeamName: 'تیم پشتیبانی والکس',
  },

  // Option 2: Wallex Official Website Chat (if available)
  iframe: {
    type: 'iframe',
    enabled: true,
    iframeUrl: WALLEX_CHAT_URL || 'https://wallex.ir/support-chat',
    iframeHeight: '500px',
    buttonText: 'چت زنده والکس',
    welcomeMessage: 'در حال اتصال به تیم پشتیبانی والکس...',
    supportTeamName: 'پشتیبانی آنلاین والکس',
  },

  // Option 3: Intercom Integration
  intercom: {
    type: 'intercom',
    enabled: true,
    serviceId: WALLEX_INTERCOM_ID,
    serviceDomain: 'widget.intercom.io',
    widgetScript: 'https://widget.intercom.io/widget/' + WALLEX_INTERCOM_ID,
    buttonText: 'پشتیبانی فوری',
    welcomeMessage: 'تیم پشتیبانی والکس آماده کمک به شماست',
    supportTeamName: 'Wallex Support via Intercom',
    iframeHeight: '450px',
  },

  // Option 4: Zendesk Chat
  zendesk: {
    type: 'zendesk',
    enabled: true,
    serviceDomain: WALLEX_ZENDESK_DOMAIN || 'wallex.zendesk.com',
    buttonText: 'پشتیبانی تخصصی',
    welcomeMessage: 'چت مستقیم با کارشناسان والکس',
    supportTeamName: 'Wallex Technical Support',
    iframeHeight: '450px',
  },

  // Option 5: Crisp Chat
  crisp: {
    type: 'crisp',
    enabled: true,
    serviceId: WALLEX_CRISP_ID,
    widgetScript: 'https://client.crisp.chat/l.js',
    buttonText: 'گفتگوی آنلاین',
    welcomeMessage: 'گفتگوی زنده با تیم والکس',
    supportTeamName: 'Wallex Live Chat',
    iframeHeight: '400px',
  },

  // Option 6: Custom Widget (if Wallex has their own)
  widget: {
    type: 'widget',
    enabled: true,
    widgetScript: 'https://wallex.ir/assets/js/chat-widget.js',
    widgetId: 'wallex-chat-widget',
    buttonText: 'ویجت والکس',
    welcomeMessage: 'ویجت اختصاصی پشتیبانی والکس',
    supportTeamName: 'Wallex Official Widget',
  },
};

// Get current configuration
export const getCurrentWallexSupportConfig = (): WallexSupportChatConfig => {
  const configKey = WALLEX_CHAT_TYPE as keyof typeof WALLEX_SUPPORT_CONFIGS;
  
  if (configKey in WALLEX_SUPPORT_CONFIGS) {
    return WALLEX_SUPPORT_CONFIGS[configKey];
  }
  
  // Fallback to telegram
  return WALLEX_SUPPORT_CONFIGS.telegram;
};

// Helper function to validate configuration
export const validateWallexSupportConfig = (config: WallexSupportChatConfig): boolean => {
  if (!config.enabled) return false;

  switch (config.type) {
    case 'telegram':
      return !!config.telegramUrl;
    case 'iframe':
      return !!config.iframeUrl;
    case 'intercom':
      return !!config.serviceId;
    case 'zendesk':
      return !!config.serviceDomain;
    case 'crisp':
      return !!config.serviceId;
    case 'widget':
      return !!config.widgetScript;
    default:
      return false;
  }
};

// Environment configuration helper
export const getWallexSupportFromEnv = (): WallexSupportChatConfig => {
  const config = getCurrentWallexSupportConfig();
  
  // Override with environment variables if available
  if (WALLEX_CHAT_URL && config.type === 'iframe') {
    config.iframeUrl = WALLEX_CHAT_URL;
  }
  
  if (WALLEX_INTERCOM_ID && config.type === 'intercom') {
    config.serviceId = WALLEX_INTERCOM_ID;
    config.widgetScript = 'https://widget.intercom.io/widget/' + WALLEX_INTERCOM_ID;
  }
  
  if (WALLEX_ZENDESK_DOMAIN && config.type === 'zendesk') {
    config.serviceDomain = WALLEX_ZENDESK_DOMAIN;
  }
  
  if (WALLEX_CRISP_ID && config.type === 'crisp') {
    config.serviceId = WALLEX_CRISP_ID;
  }
  
  return config;
};

export default getCurrentWallexSupportConfig;
