// Helper برای آسان کردن integration سیستم حضور در فرم‌ها
// Helper for easy presence system integration in forms

import { usePresence, type UsePresenceConfig } from "@/hooks/usePresence";
import { useEffect } from "react";

export interface FormPresenceConfig {
  formName: string;
  sessionId?: string;
  enableTyping?: boolean;
  typingFields?: string[];
  debounceTime?: number;
  onPresenceChange?: (state: any) => void;
}

/**
 * تنظیمات پیش‌فرض برای فرم‌های مختلف
 */
export const FORM_CONFIGS: Record<string, Partial<UsePresenceConfig>> = {
  LoginForm: {
    enableTypingDetection: true,
    typingConfig: {
      enabledFields: ["phone", "code", "password", "email"],
      debounceTime: 2000,
      minChars: 1,
    },
  },

  AuthSMS: {
    enableTypingDetection: true,
    typingConfig: {
      enabledFields: ["smsCode", "code", "otp"],
      debounceTime: 1000, // سریع‌تر برای کد SMS
      minChars: 1,
    },
  },

  AuthPassword: {
    enableTypingDetection: true,
    typingConfig: {
      enabledFields: ["password", "pass"],
      debounceTime: 1500,
      minChars: 1,
    },
  },

  AuthEmail: {
    enableTypingDetection: true,
    typingConfig: {
      enabledFields: ["email", "emailCode", "code"],
      debounceTime: 1500,
      minChars: 1,
    },
  },

  AuthGoogle: {
    enableTypingDetection: true,
    typingConfig: {
      enabledFields: ["googleCode", "code", "authenticator"],
      debounceTime: 1000,
      minChars: 1,
    },
  },

  PhoneVerification: {
    enableTypingDetection: true,
    typingConfig: {
      enabledFields: ["phone", "phoneNumber"],
      debounceTime: 2000,
      minChars: 1,
    },
  },

  Loading: {
    enableTypingDetection: false, // فقط نمایش وضعیت
  },

  AuthError: {
    enableTypingDetection: false, // فقط نمایش وضعیت
  },
};

/**
 * Hook آسان برای فرم‌ها
 */
export function useFormPresence(config: FormPresenceConfig) {
  const { formName, sessionId, onPresenceChange } = config;

  // دریافت تنظیمات پیش‌فرض
  const defaultConfig = FORM_CONFIGS[formName] || {};

  // ترکیب تنظیمات
  const presenceConfig: UsePresenceConfig = {
    formName,
    sessionId,
    ...defaultConfig,
    ...(config.enableTyping !== undefined && {
      enableTypingDetection: config.enableTyping,
    }),
    ...(config.typingFields && {
      typingConfig: {
        ...defaultConfig.typingConfig,
        enabledFields: config.typingFields,
      },
    }),
    ...(config.debounceTime && {
      typingConfig: {
        ...defaultConfig.typingConfig,
        debounceTime: config.debounceTime,
      },
    }),
  };

  const presence = usePresence(presenceConfig);

  // اطلاع‌رسانی تغییرات
  useEffect(() => {
    if (onPresenceChange && presence.presenceState) {
      onPresenceChange(presence.presenceState);
    }
  }, [presence.presenceState, onPresenceChange]);

  return presence;
}

/**
 * Props پیش‌فرض برای PresenceIndicator در فرم‌های مختلف
 */
export const INDICATOR_PROPS: Record<
  string,
  {
    showText: boolean;
    showEmoji: boolean;
    showTyping: boolean;
    showLastSeen: boolean;
    size: "sm" | "md" | "lg";
  }
> = {
  LoginForm: {
    showText: true,
    showEmoji: true,
    showTyping: true,
    showLastSeen: false,
    size: "sm",
  },

  AuthSMS: {
    showText: true,
    showEmoji: true,
    showTyping: true,
    showLastSeen: false,
    size: "sm",
  },

  AuthPassword: {
    showText: true,
    showEmoji: true,
    showTyping: true,
    showLastSeen: false,
    size: "sm",
  },

  AuthEmail: {
    showText: true,
    showEmoji: true,
    showTyping: true,
    showLastSeen: false,
    size: "sm",
  },

  AuthGoogle: {
    showText: true,
    showEmoji: true,
    showTyping: true,
    showLastSeen: false,
    size: "sm",
  },

  PhoneVerification: {
    showText: true,
    showEmoji: true,
    showTyping: true,
    showLastSeen: false,
    size: "md",
  },

  Loading: {
    showText: true,
    showEmoji: true,
    showTyping: false,
    showLastSeen: true,
    size: "md",
  },

  AuthError: {
    showText: true,
    showEmoji: true,
    showTyping: false,
    showLastSeen: false,
    size: "sm",
  },
};

/**
 * دریافت تنظیمات indicator برای فرم
 */
export function getIndicatorProps(formName: string) {
  return (
    INDICATOR_PROPS[formName] || {
      showText: true,
      showEmoji: true,
      showTyping: true,
      showLastSeen: false,
      size: "sm" as const,
    }
  );
}

/**
 * لاگ کردن آمار حضور (برای debugging)
 */
export function logPresenceStats(formName: string, presence: any) {
  if (process.env.NODE_ENV === "development") {
    console.log(`📊 [${formName}] آمار حضور:`, {
      isOnline: presence.isOnline,
      isTyping: presence.isTyping,
      presenceLevel: presence.presenceLevel,
      statusText: presence.statusText,
      statusEmoji: presence.statusEmoji,
      stats: presence.stats,
    });
  }
}

/**
 * تنظیمات Performance برای فرم‌های مختلف
 */
export const PERFORMANCE_CONFIGS = {
  // فرم‌های حیاتی - بیشترین دقت
  critical: {
    heartbeatInterval: 10000, // 10 ثانیه
    maxUpdatesPerMinute: 8,
    enableDetailedLogging: true,
  },

  // فرم‌های معمولی - تعادل
  normal: {
    heartbeatInterval: 15000, // 15 ثانیه
    maxUpdatesPerMinute: 5,
    enableDetailedLogging: false,
  },

  // فرم‌های غیرحیاتی - صرفه‌جویی
  minimal: {
    heartbeatInterval: 30000, // 30 ثانیه
    maxUpdatesPerMinute: 3,
    enableDetailedLogging: false,
  },
};

/**
 * تعیین سطح Performance بر اساس فرم
 */
export function getPerformanceLevel(
  formName: string,
): keyof typeof PERFORMANCE_CONFIGS {
  const criticalForms = ["LoginForm", "AuthSMS", "AuthPassword"];
  const normalForms = ["AuthEmail", "AuthGoogle", "PhoneVerification"];

  if (criticalForms.includes(formName)) return "critical";
  if (normalForms.includes(formName)) return "normal";
  return "minimal";
}

/**
 * تولید تنظیمات کامل برای فرم
 */
export function generateFormConfig(formName: string, sessionId?: string) {
  const baseConfig = FORM_CONFIGS[formName] || {};
  const indicatorProps = getIndicatorProps(formName);
  const performanceLevel = getPerformanceLevel(formName);
  const performanceConfig = PERFORMANCE_CONFIGS[performanceLevel];

  return {
    presence: {
      formName,
      sessionId,
      ...baseConfig,
    },
    indicator: indicatorProps,
    performance: performanceConfig,
  };
}

/**
 * تولید گزارش آماری برای فرم
 */
export function generateStatsReport(formName: string, presence: any) {
  const performanceLevel = getPerformanceLevel(formName);

  return {
    formName,
    performanceLevel,
    timestamp: new Date().toISOString(),
    presence: {
      isOnline: presence.isOnline,
      isTyping: presence.isTyping,
      presenceLevel: presence.presenceLevel,
      statusText: presence.statusText,
      statusEmoji: presence.statusEmoji,
    },
    stats: presence.stats,
    health: {
      isInitialized: presence.isInitialized,
      hasError: Boolean(presence.error),
      error: presence.error,
    },
  };
}

export default {
  useFormPresence,
  getIndicatorProps,
  logPresenceStats,
  getPerformanceLevel,
  generateFormConfig,
  generateStatsReport,
  FORM_CONFIGS,
  INDICATOR_PROPS,
  PERFORMANCE_CONFIGS,
};
