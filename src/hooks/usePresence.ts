// React Hook برای مدیریت حضور کاربر و تشخیص تایپ
// React Hook for User Presence and Typing Detection

import { useEffect, useState, useCallback, useRef } from "react";
import globalPresenceManager, {
  type GlobalPresenceState,
} from "@/lib/global-presence-manager";
import { createTypingDetector, type TypingConfig } from "@/lib/typing-detector";

export interface UsePresenceConfig {
  formName: string; // نام فرم
  enableTypingDetection?: boolean; // فعال‌سازی تشخیص تایپ
  typingConfig?: Partial<TypingConfig>; // تنظیمات تایپ
  sessionId?: string; // شناسه جلسه (اختیاری)
}

export interface UsePresenceReturn {
  // وضعیت حضور
  presenceState: GlobalPresenceState | null;
  isOnline: boolean;
  isTyping: boolean;
  presenceLevel: string;
  statusText: string;
  statusEmoji: string;

  // عملکردها
  setCurrentForm: (formName: string) => void;
  startTyping: (fieldName: string) => void;
  stopTyping: () => void;

  // آمار
  stats: {
    globalStats: ReturnType<typeof globalPresenceManager.getPerformanceStats>;
    typingStats?: any;
  };

  // وضعیت hook
  isInitialized: boolean;
  error: string | null;
}

export function usePresence(config: UsePresenceConfig): UsePresenceReturn {
  const [presenceState, setPresenceState] =
    useState<GlobalPresenceState | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // refs برای tracking
  const subscriberIdRef = useRef<string | null>(null);
  const typingDetectorRef = useRef<ReturnType<
    typeof createTypingDetector
  > | null>(null);

  const {
    formName,
    enableTypingDetection = true,
    typingConfig,
    sessionId,
  } = config;

  /**
   * مقداردهی اولیه سیستم
   */
  const initialize = useCallback(async () => {
    try {
      console.log(`🔗 [USE PRESENCE] مقداردهی اولیه برای ${formName}`);

      // اگر sessionId داده شده، سیستم global را مقداردهی کنیم
      if (sessionId) {
        globalPresenceManager.initialize(sessionId);
      }

      // ثبت فرم در سیستم global
      const subscriberId = globalPresenceManager.registerForm(
        formName,
        setPresenceState,
      );
      subscriberIdRef.current = subscriberId;

      // راه‌اندازی تشخیص تایپ
      if (enableTypingDetection) {
        const detector = createTypingDetector({
          formName,
          debounceTime: 1500,
          minChars: 1,
          enabledFields: [], // همه فیلدها
          ...typingConfig,
        });

        detector.activate();
        typingDetectorRef.current = detector;
      }

      setIsInitialized(true);
      setError(null);

      console.log(`✅ [USE PRESENCE] ${formName} با موفقیت مقداردهی شد`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "خطای نامشخص";
      setError(errorMessage);
      console.error(`❌ [USE PRESENCE] خطا در مقداردهی ${formName}:`, err);
    }
  }, [formName, enableTypingDetection, typingConfig, sessionId]);

  /**
   * پاکسازی منابع
   */
  const cleanup = useCallback(() => {
    console.log(`🧹 [USE PRESENCE] پاکسازی ${formName}`);

    // لغو ثبت فرم
    if (subscriberIdRef.current) {
      globalPresenceManager.unregisterForm(subscriberIdRef.current);
      subscriberIdRef.current = null;
    }

    // غیرفعال‌سازی تشخیص تایپ
    if (typingDetectorRef.current) {
      typingDetectorRef.current.deactivate();
      typingDetectorRef.current = null;
    }

    setPresenceState(null);
    setIsInitialized(false);
    setError(null);
  }, [formName]);

  /**
   * تنظیم فرم فعلی
   */
  const setCurrentForm = useCallback((newFormName: string) => {
    globalPresenceManager.setCurrentForm(newFormName);
  }, []);

  /**
   * شروع تایپ دستی
   */
  const startTyping = useCallback(
    (fieldName: string) => {
      globalPresenceManager.startTyping(formName, fieldName);
    },
    [formName],
  );

  /**
   * توقف تایپ دستی
   */
  const stopTyping = useCallback(() => {
    globalPresenceManager.stopTyping();
  }, []);

  /**
   * دریافت آمار عملکرد
   */
  const getStats = useCallback(() => {
    const globalStats = globalPresenceManager.getPerformanceStats();
    const typingStats = typingDetectorRef.current?.getStats();

    return {
      globalStats,
      typingStats,
    };
  }, []);

  // مقداردهی اولیه در mount
  useEffect(() => {
    initialize();
    return cleanup;
  }, [initialize, cleanup]);

  // تنظیم فرم فعلی وقتی component mount می‌شود
  useEffect(() => {
    if (isInitialized) {
      globalPresenceManager.setCurrentForm(formName);
    }
  }, [formName, isInitialized]);

  // مقادیر محاسبه شده
  const isOnline = presenceState?.isOnline ?? false;
  const isTyping = presenceState?.isTyping ?? false;
  const presenceLevel = presenceState?.presenceLevel ?? "offline";
  const statusText = presenceState
    ? globalPresenceManager.getStatusText()
    : "نامشخص";
  const statusEmoji = presenceState
    ? globalPresenceManager.getStatusEmoji()
    : "❓";

  return {
    // وضعیت حضور
    presenceState,
    isOnline,
    isTyping,
    presenceLevel,
    statusText,
    statusEmoji,

    // عملکردها
    setCurrentForm,
    startTyping,
    stopTyping,

    // آمار
    stats: getStats(),

    // وضعیت hook
    isInitialized,
    error,
  };
}

/**
 * Hook ساده فقط برای نمایش وضعیت
 */
export function usePresenceStatus(formName: string) {
  const { presenceState, statusText, statusEmoji, isOnline, isTyping } =
    usePresence({
      formName,
      enableTypingDetection: false, // فقط نمایش
    });

  return {
    presenceState,
    statusText,
    statusEmoji,
    isOnline,
    isTyping,
  };
}

/**
 * Hook برای تشخیص تایپ فقط
 */
export function useTypingDetection(
  formName: string,
  typingConfig?: Partial<TypingConfig>,
) {
  const { isTyping, startTyping, stopTyping } = usePresence({
    formName,
    enableTypingDetection: true,
    typingConfig,
  });

  return {
    isTyping,
    startTyping,
    stopTyping,
  };
}

/**
 * Hook برای مدیریت کامل حضور (برای فرم‌های اصلی)
 */
export function useCompletePresence(
  formName: string,
  sessionId: string,
  options?: {
    typingConfig?: Partial<TypingConfig>;
  },
) {
  return usePresence({
    formName,
    sessionId,
    enableTypingDetection: true,
    typingConfig: options?.typingConfig,
  });
}

export default usePresence;
