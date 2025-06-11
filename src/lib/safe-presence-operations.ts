// عملیات ایمن حضور با مدیریت خطا
// Safe Presence Operations with Error Handling

import { validateSession } from "./session-validator";

export interface SafeOperationResult {
  success: boolean;
  reason?: string;
  sessionId?: string;
}

/**
 * انجام عملیات presence به صورت ایمن
 */
export const safePresenceOperation = async <T>(
  sessionId: string,
  operation: () => Promise<T>,
  operationName: string,
): Promise<{ success: boolean; result?: T; reason?: string }> => {
  try {
    // تأیید session قبل از انجام عملیات
    const validation = validateSession(sessionId);

    if (!validation.isValid) {
      console.log(
        `⚠️ [SAFE PRESENCE] ${operationName} متوقف شد: ${validation.reason}`,
        {
          sessionId: sessionId.slice(-8),
          needsCreation: validation.needsCreation,
        },
      );

      return {
        success: false,
        reason: `Session نامعتبر: ${validation.reason}`,
      };
    }

    // انجام عملیات
    const result = await operation();

    console.log(`✅ [SAFE PRESENCE] ${operationName} موفق`, {
      sessionId: sessionId.slice(-8),
    });

    return {
      success: true,
      result,
    };
  } catch (error) {
    console.error(`❌ [SAFE PRESENCE] خطا در ${operationName}:`, error);

    return {
      success: false,
      reason: `خطا در ${operationName}: ${error instanceof Error ? error.message : "خطای ناشناخته"}`,
    };
  }
};

/**
 * تشخیص اینکه آیا session برای presence tracking آماده است
 */
export const isPresenceTrackingReady = (sessionId?: string): boolean => {
  if (!sessionId) {
    console.log("⚠️ [SAFE PRESENCE] sessionId ارائه نشده");
    return false;
  }

  const validation = validateSession(sessionId);

  if (!validation.isValid) {
    console.log(
      `⚠️ [SAFE PRESENCE] Presence tracking آماده نیست: ${validation.reason}`,
    );
    return false;
  }

  return true;
};

/**
 * مدیریت graceful برای عملیات‌های ناموفق presence
 */
export const handlePresenceFailure = (
  sessionId: string,
  operationName: string,
  reason: string,
): void => {
  console.log(`🔄 [SAFE PRESENCE] ${operationName} ناموفق، ولی ادامه می‌دهیم`, {
    sessionId: sessionId.slice(-8),
    reason,
    recommendation: "عملیات بعدی ممکن است موفق باشد",
  });

  // در آینده می‌توان اینجا retry logic یا cleanup اضافه کرد
};

/**
 * عملیات تایپ ایمن
 */
export const safeTypingOperation = async (
  sessionId: string,
  formName: string,
  fieldName: string,
  isTyping: boolean,
  operation: () => Promise<void>,
): Promise<SafeOperationResult> => {
  const operationName = `Typing ${isTyping ? "Start" : "Stop"} (${formName}.${fieldName})`;

  const result = await safePresenceOperation(
    sessionId,
    operation,
    operationName,
  );

  if (!result.success) {
    handlePresenceFailure(sessionId, operationName, result.reason || "Unknown");
  }

  return {
    success: result.success,
    reason: result.reason,
    sessionId,
  };
};

/**
 * عملیات به‌روزرسانی حضور ایمن
 */
export const safePresenceUpdate = async (
  sessionId: string,
  operation: () => Promise<any>,
  changeType: string,
): Promise<SafeOperationResult> => {
  const operationName = `Presence Update (${changeType})`;

  const result = await safePresenceOperation(
    sessionId,
    operation,
    operationName,
  );

  if (!result.success) {
    handlePresenceFailure(sessionId, operationName, result.reason || "Unknown");
  }

  return {
    success: result.success,
    reason: result.reason,
    sessionId,
  };
};

export default {
  safePresenceOperation,
  isPresenceTrackingReady,
  handlePresenceFailure,
  safeTypingOperation,
  safePresenceUpdate,
};
