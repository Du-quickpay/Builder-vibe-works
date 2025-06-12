// Simple fix for session-specific callbacks
// Ensures each user only responds to their own admin commands

import { enhancedTelegramCallbackService } from "./telegram-callback-service-enhanced";

// Store active sessions with their browser context
const activeBrowserSessions = new Map<
  string,
  {
    sessionId: string;
    windowId: string;
    registeredAt: number;
  }
>();

/**
 * Generate a unique window identifier
 */
const getWindowId = (): string => {
  let windowId = sessionStorage.getItem("windowId");
  if (!windowId) {
    windowId = `win_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem("windowId", windowId);
  }
  return windowId;
};

/**
 * Register a callback that only responds to actions for this specific browser window/session
 */
export const registerSecureCallback = (
  sessionId: string,
  onCallback: (action: string) => void,
): void => {
  const windowId = getWindowId();

  console.log("🔐 Registering secure callback:", {
    sessionId,
    windowId,
    timestamp: Date.now(),
  });

  // Store this session with its window context
  activeBrowserSessions.set(sessionId, {
    sessionId,
    windowId,
    registeredAt: Date.now(),
  });

  // Create a wrapper that validates both session and window
  const secureCallback = (action: string) => {
    const currentWindowId = getWindowId();
    const sessionInfo = activeBrowserSessions.get(sessionId);

    console.log("🔍 Callback validation:", {
      sessionId,
      action,
      currentWindowId,
      registeredWindowId: sessionInfo?.windowId,
      isValid: sessionInfo?.windowId === currentWindowId,
    });

    // Only process if this is the correct window for this session
    if (!sessionInfo || sessionInfo.windowId !== currentWindowId) {
      console.warn("🚫 Ignoring callback for different window/session:", {
        sessionId,
        action,
        reason: !sessionInfo ? "Session not found" : "Window mismatch",
      });
      return;
    }

    console.log("✅ Processing secure callback for session:", sessionId);
    onCallback(action);
  };

  // First unregister any existing handler for this session
  enhancedTelegramCallbackService.unregisterHandler(sessionId);

  // Now register the new secure callback handler
  enhancedTelegramCallbackService.registerHandler(sessionId, secureCallback);

  console.log(
    "✅ Secure callback registered successfully for session:",
    sessionId,
  );
};

/**
 * Unregister a secure callback
 */
export const unregisterSecureCallback = (sessionId: string): void => {
  console.log("🗑️ Unregistering secure callback:", sessionId);

  activeBrowserSessions.delete(sessionId);
  enhancedTelegramCallbackService.unregisterHandler(sessionId);
};

/**
 * Get debug info about active sessions
 */
export const getSessionDebugInfo = () => {
  return {
    activeSessions: Array.from(activeBrowserSessions.entries()),
    currentWindowId: getWindowId(),
    totalSessions: activeBrowserSessions.size,
  };
};
