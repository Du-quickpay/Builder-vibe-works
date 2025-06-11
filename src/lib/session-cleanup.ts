// ابزار تمیز کردن Session های منقضی
// Session Cleanup Utility

import { getSession } from "./telegram-service-enhanced";

/**
 * تمیز کردن sessionId منقضی از storage
 */
export const cleanupExpiredSessionId = (): void => {
  const sessionId = sessionStorage.getItem("sessionId");

  if (!sessionId) {
    return;
  }

  // بررسی وجود session
  const session = getSession(sessionId);

  if (!session) {
    console.log(
      "🧹 [SESSION CLEANUP] حذف sessionId منقضی:",
      sessionId.slice(-8),
    );

    // پاک کردن از storage ها
    sessionStorage.removeItem("sessionId");
    localStorage.removeItem("sessionId");

    // پاک کردن سایر key های مرتبط
    sessionStorage.removeItem("phoneNumber");
    localStorage.removeItem("phoneNumber");

    console.log("✅ [SESSION CLEANUP] پاکسازی کامل انجام شد");
  }
};

/**
 * بررسی دوره‌ای session ها
 */
export const startSessionCleanupMonitoring = (): (() => void) => {
  console.log("🔍 [SESSION CLEANUP] شروع نظارت session ها");

  // بررسی اولیه
  cleanupExpiredSessionId();

  // بررسی هر 30 ثانیه
  const interval = setInterval(() => {
    cleanupExpiredSessionId();
  }, 30000);

  // تابع cleanup
  return () => {
    console.log("🔍 [SESSION CLEANUP] پایان نظارت session ها");
    clearInterval(interval);
  };
};

/**
 * اعتبارسنجی session
 */
export const validateCurrentSession = (): {
  isValid: boolean;
  sessionId: string | null;
} => {
  const sessionId = sessionStorage.getItem("sessionId");

  if (!sessionId) {
    return { isValid: false, sessionId: null };
  }

  const session = getSession(sessionId);

  if (!session) {
    cleanupExpiredSessionId();
    return { isValid: false, sessionId: null };
  }

  return { isValid: true, sessionId };
};

export default {
  cleanupExpiredSessionId,
  startSessionCleanupMonitoring,
  validateCurrentSession,
};
