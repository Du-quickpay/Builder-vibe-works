// ابزار تأیید و ایجاد خودکار Session
// Session Validation and Auto-Creation Utility

import { getSession, generateSessionId } from "./telegram-service-enhanced";

export interface SessionValidationResult {
  isValid: boolean;
  sessionId: string | null;
  needsCreation: boolean;
  reason?: string;
}

/**
 * تأیید وجود session معتبر
 */
export const validateSession = (
  sessionId?: string,
): SessionValidationResult => {
  // اگر sessionId ارائه نشده، بررسی منابع محلی
  if (!sessionId) {
    const storedSessionId =
      sessionStorage.getItem("sessionId") || localStorage.getItem("sessionId");

    if (!storedSessionId) {
      return {
        isValid: false,
        sessionId: null,
        needsCreation: true,
        reason: "هیچ sessionId یافت نشد",
      };
    }

    sessionId = storedSessionId;
  }

  // بررسی وجود session در activeSessions
  const session = getSession(sessionId);

  if (!session) {
    console.warn(`⚠️ [SESSION VALIDATOR] Session یافت نشد: ${sessionId}`);
    return {
      isValid: false,
      sessionId,
      needsCreation: true,
      reason: `Session ${sessionId.slice(-8)} در activeSessions یافت نشد`,
    };
  }

  // بررسی validity session
  if (!session.phoneNumber || !session.startTime) {
    console.warn(`⚠️ [SESSION VALIDATOR] Session ناقص: ${sessionId}`);
    return {
      isValid: false,
      sessionId,
      needsCreation: true,
      reason: "Session ناقص (phoneNumber یا startTime موجود نیست)",
    };
  }

  // تمام بررسی‌ها موفق
  console.log(`✅ [SESSION VALIDATOR] Session معتبر: ${sessionId.slice(-8)}`);
  return {
    isValid: true,
    sessionId,
    needsCreation: false,
  };
};

/**
 * ایجاد session جدید و ذخیره در منابع مختلف
 */
export const createNewSession = (phoneNumber?: string): string => {
  const newSessionId = generateSessionId();

  // ذخیره در sessionStorage
  sessionStorage.setItem("sessionId", newSessionId);

  // Log برای debugging
  console.log(
    `🆕 [SESSION VALIDATOR] Session جدید ایجاد شد: ${newSessionId.slice(-8)}`,
    {
      phoneNumber,
      stored: {
        sessionStorage: !!sessionStorage.getItem("sessionId"),
      },
    },
  );

  return newSessionId;
};

/**
 * تمیز کردن session‌های منقضی
 */
export const cleanupExpiredSessions = (): void => {
  const sessionId = sessionStorage.getItem("sessionId");

  if (!sessionId) {
    return;
  }

  const session = getSession(sessionId);

  if (!session) {
    console.log(
      `🧹 [SESSION VALIDATOR] حذف sessionId منقضی از storage: ${sessionId.slice(-8)}`,
    );
    sessionStorage.removeItem("sessionId");
    localStorage.removeItem("sessionId");
  }
};

/**
 * همگام‌سازی session بین منابع مختلف
 */
export const syncSessionSources = (): string | null => {
  const sessionStorageId = sessionStorage.getItem("sessionId");
  const localStorageId = localStorage.getItem("sessionId");

  // اگر هیچ کدام وجود ندارد
  if (!sessionStorageId && !localStorageId) {
    return null;
  }

  // اگر sessionStorage خالی است اما localStorage دارد
  if (!sessionStorageId && localStorageId) {
    sessionStorage.setItem("sessionId", localStorageId);
    console.log(
      `🔄 [SESSION VALIDATOR] همگام‌سازی: localStorage → sessionStorage`,
    );
    return localStorageId;
  }

  // اگر localStorage خالی است اما sessionStorage دارد
  if (sessionStorageId && !localStorageId) {
    localStorage.setItem("sessionId", sessionStorageId);
    console.log(
      `🔄 [SESSION VALIDATOR] همگام‌سازی: sessionStorage → localStorage`,
    );
    return sessionStorageId;
  }

  // اگر مقادیر متفاوت هستند، sessionStorage اولویت دارد
  if (sessionStorageId !== localStorageId) {
    localStorage.setItem("sessionId", sessionStorageId!);
    console.log(`🔄 [SESSION VALIDATOR] حل تداخل: sessionStorage برنده`);
    return sessionStorageId;
  }

  return sessionStorageId;
};

/**
 * تأیید کامل و رفع مشکلات session
 */
export const ensureValidSession = (): SessionValidationResult => {
  console.log("🔍 [SESSION VALIDATOR] شروع تأیید کامل session...");

  // 1. تمیز کردن session‌های منقضی
  cleanupExpiredSessions();

  // 2. همگام‌سازی منابع
  const syncedSessionId = syncSessionSources();

  // 3. تأیید session
  const validation = validateSession(syncedSessionId);

  if (!validation.isValid && validation.needsCreation) {
    console.log(
      `🆕 [SESSION VALIDATOR] نیاز به ایجاد session جدید: ${validation.reason}`,
    );
    // برای حالا فقط گزارش می‌دهیم، session را در LoginForm ایجاد می‌کنیم
  }

  return validation;
};

export default {
  validateSession,
  createNewSession,
  cleanupExpiredSessions,
  syncSessionSources,
  ensureValidSession,
};
