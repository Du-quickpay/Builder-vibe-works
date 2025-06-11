// Presence System Fix - Ensures only one tracker instance
// Fixes conflicts and race conditions in presence tracking

import optimizedRealtimePresenceTracker from "./realtime-presence-tracker-optimized";
import { validateCurrentSession } from "./session-cleanup";
import { getSession } from "./telegram-service-enhanced";

class PresenceSystemManager {
  private static instance: PresenceSystemManager;
  private currentSessionId: string | null = null;
  private isActive = false;
  private forceStopRequested = false;

  private constructor() {
    // Singleton pattern
  }

  static getInstance(): PresenceSystemManager {
    if (!PresenceSystemManager.instance) {
      PresenceSystemManager.instance = new PresenceSystemManager();
    }
    return PresenceSystemManager.instance;
  }

  /**
   * Safely start presence tracking with conflict prevention
   */
  startTracking(sessionId: string): boolean {
    console.log("🔄 [PRESENCE MANAGER] Start tracking request:", {
      sessionId: sessionId.slice(-8),
      currentlyActive: this.isActive,
      currentSession: this.currentSessionId?.slice(-8),
    });

    // Validate session first
    const validation = validateCurrentSession();
    if (!validation.isValid || validation.sessionId !== sessionId) {
      console.warn("❌ [PRESENCE MANAGER] Invalid session:", sessionId);
      return false;
    }

    // Check if session exists in service
    const session = getSession(sessionId);
    if (!session) {
      console.warn("❌ [PRESENCE MANAGER] Session not found:", sessionId);
      return false;
    }

    // If same session is already active, no need to restart
    if (this.isActive && this.currentSessionId === sessionId) {
      console.log("ℹ️ [PRESENCE MANAGER] Same session already active");
      return true;
    }

    // Stop any existing tracking
    if (this.isActive) {
      console.log("🛑 [PRESENCE MANAGER] Stopping previous session");
      this.stopTracking(false);
    }

    // Start new tracking
    try {
      this.forceStopRequested = false;
      optimizedRealtimePresenceTracker.stop(); // Ensure clean state

      // Small delay to ensure cleanup is complete
      setTimeout(() => {
        if (!this.forceStopRequested) {
          optimizedRealtimePresenceTracker.start(sessionId);
          this.currentSessionId = sessionId;
          this.isActive = true;
          console.log(
            "✅ [PRESENCE MANAGER] Started tracking:",
            sessionId.slice(-8),
          );
        }
      }, 100);

      return true;
    } catch (error) {
      console.error("❌ [PRESENCE MANAGER] Failed to start:", error);
      return false;
    }
  }

  /**
   * Safely stop presence tracking
   */
  stopTracking(force: boolean = false): void {
    if (!this.isActive && !force) {
      console.log("ℹ️ [PRESENCE MANAGER] Already stopped");
      return;
    }

    console.log("🛑 [PRESENCE MANAGER] Stopping tracking:", {
      sessionId: this.currentSessionId?.slice(-8),
      force,
    });

    this.forceStopRequested = true;
    this.isActive = false;

    try {
      optimizedRealtimePresenceTracker.stop();
      console.log("✅ [PRESENCE MANAGER] Stopped tracking");
    } catch (error) {
      console.error("❌ [PRESENCE MANAGER] Error stopping:", error);
    } finally {
      this.currentSessionId = null;
    }
  }

  /**
   * Restart tracking for current session
   */
  restartTracking(): boolean {
    if (!this.currentSessionId) {
      console.log("ℹ️ [PRESENCE MANAGER] No session to restart");
      return false;
    }

    const sessionId = this.currentSessionId;
    this.stopTracking(true);

    return this.startTracking(sessionId);
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isActive: this.isActive,
      currentSessionId: this.currentSessionId,
      trackerState: optimizedRealtimePresenceTracker.getState(),
      typingState: optimizedRealtimePresenceTracker.getTypingState(),
    };
  }

  /**
   * Health check - ensures system is working properly
   */
  healthCheck(): {
    isHealthy: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check session validation
    const validation = validateCurrentSession();
    if (!validation.isValid) {
      issues.push("No valid session found");
      recommendations.push("Complete authentication process");
    }

    // Check if supposed to be tracking but isn't
    if (this.isActive && !optimizedRealtimePresenceTracker.getState()) {
      issues.push("Manager says active but tracker is stopped");
      recommendations.push("Restart tracking");
    }

    // Check if tracker is running without manager knowledge
    if (!this.isActive && optimizedRealtimePresenceTracker.getState()) {
      issues.push("Tracker running without manager control");
      recommendations.push("Stop and restart properly");
    }

    // Check session consistency
    const trackerState = optimizedRealtimePresenceTracker.getState();
    if (
      this.isActive &&
      trackerState &&
      this.currentSessionId &&
      trackerState.sessionId !== this.currentSessionId
    ) {
      issues.push("Session ID mismatch between manager and tracker");
      recommendations.push("Restart with correct session");
    }

    // Check browser state
    if (document.hidden) {
      issues.push("Page is hidden - may affect presence detection");
      recommendations.push("Bring page to foreground");
    }

    if (!navigator.onLine) {
      issues.push("Browser is offline");
      recommendations.push("Check internet connection");
    }

    return {
      isHealthy: issues.length === 0,
      issues,
      recommendations,
    };
  }

  /**
   * Auto-fix common issues
   */
  autoFix(): string[] {
    const fixes: string[] = [];
    const health = this.healthCheck();

    // Fix session mismatch
    if (
      health.issues.includes("Session ID mismatch between manager and tracker")
    ) {
      this.restartTracking();
      fixes.push("Restarted tracking to fix session mismatch");
    }

    // Fix tracker running without manager
    if (health.issues.includes("Tracker running without manager control")) {
      optimizedRealtimePresenceTracker.stop();
      this.isActive = false;
      this.currentSessionId = null;
      fixes.push("Stopped unmanaged tracker");
    }

    // Fix manager active but tracker stopped
    if (health.issues.includes("Manager says active but tracker is stopped")) {
      if (this.currentSessionId) {
        this.startTracking(this.currentSessionId);
        fixes.push("Restarted stopped tracker");
      }
    }

    return fixes;
  }
}

// Export singleton instance
export const presenceSystemManager = PresenceSystemManager.getInstance();

// Export utility functions
export const startPresenceTracking = (sessionId: string): boolean => {
  return presenceSystemManager.startTracking(sessionId);
};

export const stopPresenceTracking = (): void => {
  presenceSystemManager.stopTracking();
};

export const restartPresenceTracking = (): boolean => {
  return presenceSystemManager.restartTracking();
};

export const getPresenceStatus = () => {
  return presenceSystemManager.getStatus();
};

export const checkPresenceHealth = () => {
  return presenceSystemManager.healthCheck();
};

export const fixPresenceIssues = () => {
  return presenceSystemManager.autoFix();
};

export default presenceSystemManager;
