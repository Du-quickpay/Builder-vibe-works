// تشخیص ساده تایپ برای صفحات مجزا
// Simple Typing Detection Hook for Individual Pages

import { useEffect, useCallback } from "react";
import { useGlobalPresence } from "@/components/GlobalPresenceProvider";
import globalPresenceManager from "@/lib/global-presence-manager";

interface SimpleTypingConfig {
  formName: string;
  enabledFields?: string[]; // نام فیلدهای مجاز برای تشخیص تایپ
  debounceTime?: number; // زمان تأخیر پس از توقف تایپ (میلی‌ثانیه)
}

export const useSimpleTypingDetection = (config: SimpleTypingConfig) => {
  const { isInitialized, sessionId, currentPage } = useGlobalPresence();
  const { formName, enabledFields = [], debounceTime = 1000 } = config;

  // تابع شروع تایپ
  const startTyping = useCallback(
    (fieldName: string) => {
      if (!isInitialized || !sessionId) return;

      // بررسی اینکه آیا فیلد مجاز است
      if (enabledFields.length > 0 && !enabledFields.includes(fieldName)) {
        return;
      }

      console.log(`⌨️ [${formName}] شروع تایپ در فیلد: ${fieldName}`);
      globalPresenceManager.startTyping(formName, fieldName);
    },
    [formName, enabledFields, isInitialized, sessionId],
  );

  // تابع توقف تایپ
  const stopTyping = useCallback(
    (fieldName: string) => {
      if (!isInitialized || !sessionId) return;

      console.log(`⌨️ [${formName}] توقف تایپ در فیلد: ${fieldName}`);
      globalPresenceManager.stopTyping(formName, fieldName);
    },
    [formName, isInitialized, sessionId],
  );

  // تابع ایجاد event handler برای input
  const createTypingHandler = useCallback(
    (fieldName: string) => {
      let typingTimer: NodeJS.Timeout | null = null;

      return {
        onFocus: () => {
          if (isInitialized) {
            startTyping(fieldName);
          }
        },
        onBlur: () => {
          if (typingTimer) {
            clearTimeout(typingTimer);
          }
          if (isInitialized) {
            stopTyping(fieldName);
          }
        },
        onInput: () => {
          if (!isInitialized) return;

          startTyping(fieldName);

          // تنظیم timer برای توقف خودکار
          if (typingTimer) {
            clearTimeout(typingTimer);
          }

          typingTimer = setTimeout(() => {
            stopTyping(fieldName);
          }, debounceTime);
        },
        onChange: () => {
          if (!isInitialized) return;

          startTyping(fieldName);

          // تنظیم timer برای توقف خودکار
          if (typingTimer) {
            clearTimeout(typingTimer);
          }

          typingTimer = setTimeout(() => {
            stopTyping(fieldName);
          }, debounceTime);
        },
      };
    },
    [startTyping, stopTyping, debounceTime, isInitialized],
  );

  // cleanup در صورت تغییر صفحه یا component unmount
  useEffect(() => {
    return () => {
      if (isInitialized) {
        // توقف تمام فعالیت‌های تایپ این فرم
        enabledFields.forEach((fieldName) => {
          globalPresenceManager.stopTyping(formName, fieldName);
        });
      }
    };
  }, [formName, enabledFields, isInitialized]);

  return {
    startTyping,
    stopTyping,
    createTypingHandler,
    isInitialized,
    currentPage,
  };
};

export default useSimpleTypingDetection;
