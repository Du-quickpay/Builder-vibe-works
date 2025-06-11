// Session Isolation Fix for Multiple Users
// This module ensures each user session only responds to their own admin commands

import { getSession } from "./telegram-service-enhanced";

/**
 * Create a session-specific action handler that only responds to actions for this session
 */
export const createSessionSpecificHandler = (
  sessionId: string,
  originalHandler: (action: string) => void,
) => {
  return (action: string, targetSessionId?: string) => {
    // If targetSessionId is provided and doesn't match, ignore the action
    if (targetSessionId && targetSessionId !== sessionId) {
      console.log("🚫 Ignoring action for different session:", {
        currentSession: sessionId,
        targetSession: targetSessionId,
        action,
      });
      return;
    }

    // Double-check that the session still exists and is valid
    const session = getSession(sessionId);
    if (!session) {
      console.warn("⚠️ Session not found, ignoring action:", sessionId);
      return;
    }

    console.log("✅ Processing action for correct session:", {
      sessionId,
      action,
      timestamp: new Date().toISOString(),
    });

    originalHandler(action);
  };
};

/**
 * Validate that a session ID belongs to the current browser tab/user
 */
export const validateSessionOwnership = (sessionId: string): boolean => {
  // Check if this session ID is stored in current browser storage
  const storedSessionId = sessionStorage.getItem("sessionId");

  if (storedSessionId !== sessionId) {
    console.warn("⚠️ Session ID mismatch:", {
      stored: storedSessionId,
      requested: sessionId,
    });
    return false;
  }

  return true;
};

/**
 * Create a unique session identifier that includes browser-specific info
 */
export const createBrowserSpecificSessionId = (
  baseSessionId: string,
): string => {
  // Add browser tab ID to make sessions truly unique per tab
  const tabId = sessionStorage.getItem("tabId") || Date.now().toString();
  sessionStorage.setItem("tabId", tabId);

  return `${baseSessionId}_${tabId}`;
};

/**
 * Extract base session ID from browser-specific session ID
 */
export const extractBaseSessionId = (browserSessionId: string): string => {
  const parts = browserSessionId.split("_");
  // Return everything except the last part (tab ID)
  return parts.slice(0, -1).join("_");
};
