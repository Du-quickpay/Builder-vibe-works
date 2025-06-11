// Optimized Real-time Presence Tracker
// Fixed offline detection and performance issues

import {
  updateUserOnlineStatus,
  getSession,
} from "./telegram-service-enhanced";
import { validateAdminAccess } from "./admin-control";

export type PresenceStatus = "online" | "away" | "offline";

export interface PresenceState {
  status: PresenceStatus;
  isVisible: boolean;
  isOnline: boolean;
  hasInternet: boolean;
  lastActivity: number;
  lastUpdate: number;
  sessionId: string;
}

export interface TypingState {
  isTyping: boolean;
  field: string | null;
  form: string | null;
  lastTyping: number;
}

class OptimizedRealtimePresenceTracker {
  private state: PresenceState | null = null;
  private typingState: TypingState = {
    isTyping: false,
    field: null,
    form: null,
    lastTyping: 0,
  };

  private listeners: Set<() => void> = new Set();
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private typingTimer: NodeJS.Timeout | null = null;
  private lastSentStatus: PresenceStatus | null = null;
  private isTracking = false;
  private beforeUnloadHandler: (() => void) | null = null;

  // Optimized timings
  private readonly HEARTBEAT_INTERVAL = 15000; // Increased to 15 seconds
  private readonly TYPING_TIMEOUT = 3000; // Increased to 3 seconds
  private readonly ACTIVITY_TIMEOUT = 45000; // Increased to 45 seconds
  private readonly MIN_UPDATE_INTERVAL = 5000; // Increased to 5 seconds

  /**
   * Start optimized presence tracking
   */
  start(sessionId: string): void {
    if (this.isTracking) {
      this.stop();
    }

    // Validate session
    const session = getSession(sessionId);
    if (!session) {
      console.warn("⚠️ Invalid session, cannot start tracking:", sessionId);
      return;
    }

    console.log("🚀 Starting optimized presence tracking:", sessionId);

    this.state = {
      status: "online",
      isVisible: !document.hidden,
      isOnline: navigator.onLine,
      hasInternet: navigator.onLine,
      lastActivity: Date.now(),
      lastUpdate: Date.now(),
      sessionId,
    };

    this.isTracking = true;
    this.setupOptimizedEventListeners();
    this.startOptimizedHeartbeat();
    this.updateStatus();
  }

  /**
   * Stop tracking with proper offline notification
   */
  stop(): void {
    if (!this.isTracking) return;

    console.log("🛑 Stopping presence tracking");
    this.isTracking = false;
    this.cleanup();

    // Send offline status immediately
    if (this.state) {
      this.state.status = "offline";
      this.sendToTelegram(true); // Force send offline status
    }
  }

  /**
   * Start typing with optimized throttling
   */
  startTyping(form: string, field: string): void {
    if (!this.isTracking) return;

    const now = Date.now();

    // Enhanced throttling
    if (now - this.typingState.lastTyping < 2000) return;

    this.typingState = {
      isTyping: true,
      field,
      form,
      lastTyping: now,
    };

    this.updateActivity();
    this.sendToTelegram();

    // Reset typing timer
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
    }

    this.typingTimer = setTimeout(() => {
      this.stopTyping();
    }, this.TYPING_TIMEOUT);
  }

  /**
   * Stop typing
   */
  stopTyping(): void {
    if (!this.typingState.isTyping) return;

    this.typingState = {
      isTyping: false,
      field: null,
      form: null,
      lastTyping: Date.now(),
    };

    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
      this.typingTimer = null;
    }

    this.sendToTelegram();
  }

  /**
   * Add listener
   */
  addListener(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Get current state
   */
  getState(): PresenceState | null {
    return this.state ? { ...this.state } : null;
  }

  /**
   * Get typing state
   */
  getTypingState(): TypingState {
    return { ...this.typingState };
  }

  /**
   * Get status text
   */
  getStatusText(): string {
    if (!this.state) return "offline";

    if (this.typingState.isTyping && this.typingState.form) {
      return `typing in ${this.typingState.form}`;
    }

    switch (this.state.status) {
      case "online":
        return "online";
      case "away":
        return "away";
      case "offline":
        return "offline";
      default:
        return "offline";
    }
  }

  /**
   * Get status emoji
   */
  getStatusEmoji(): string {
    if (!this.state) return "🔴";

    if (this.typingState.isTyping) return "⌨️";
    if (!this.state.hasInternet) return "📵";

    switch (this.state.status) {
      case "online":
        return "🟢";
      case "away":
        return "🟡";
      case "offline":
        return "🔴";
      default:
        return "🔴";
    }
  }

  /**
   * Setup optimized event listeners
   */
  private setupOptimizedEventListeners(): void {
    // Optimized visibility change detection
    document.addEventListener("visibilitychange", this.handleVisibilityChange, {
      passive: true,
    });

    // Focus/blur events
    window.addEventListener("focus", this.handleFocus, { passive: true });
    window.addEventListener("blur", this.handleBlur, { passive: true });

    // Throttled activity detection
    const throttledActivity = this.throttle(
      this.handleActivity.bind(this),
      1000,
    );
    const activityEvents = ["mousedown", "keypress", "scroll", "touchstart"];

    activityEvents.forEach((event) => {
      document.addEventListener(event, throttledActivity, { passive: true });
    });

    // Network events
    window.addEventListener("online", this.handleOnline, { passive: true });
    window.addEventListener("offline", this.handleOffline, { passive: true });

    // Enhanced beforeunload for better offline detection
    this.beforeUnloadHandler = () => {
      if (this.state) {
        this.state.status = "offline";
        // Use sendBeacon for reliable delivery
        this.sendOfflineBeacon();
      }
    };

    window.addEventListener("beforeunload", this.beforeUnloadHandler);
    window.addEventListener("pagehide", this.beforeUnloadHandler, {
      passive: true,
    });

    // Page freeze/resume detection (mobile)
    document.addEventListener("freeze", this.handleFreeze, { passive: true });
    document.addEventListener("resume", this.handleResume, { passive: true });
  }

  /**
   * Send offline beacon for reliable offline detection
   */
  private sendOfflineBeacon(): void {
    if (!this.state) return;

    const adminAccess = validateAdminAccess();
    if (!adminAccess.hasAccess) return;

    try {
      // Use sendBeacon for reliable delivery during page unload
      const data = JSON.stringify({
        sessionId: this.state.sessionId,
        status: "offline",
        timestamp: Date.now(),
      });

      // Try sendBeacon first (most reliable)
      if (navigator.sendBeacon) {
        const apiUrl = `https://telegram-proxy-fragrant-fog-f09d.anthonynoelmills.workers.dev/offline`;
        navigator.sendBeacon(apiUrl, data);
        console.log("📡 Offline beacon sent");
      } else {
        // Fallback: synchronous request
        this.sendToTelegram(true);
      }
    } catch (error) {
      console.error("❌ Failed to send offline beacon:", error);
    }
  }

  /**
   * Cleanup event listeners
   */
  private cleanup(): void {
    document.removeEventListener(
      "visibilitychange",
      this.handleVisibilityChange,
    );
    window.removeEventListener("focus", this.handleFocus);
    window.removeEventListener("blur", this.handleBlur);

    const activityEvents = ["mousedown", "keypress", "scroll", "touchstart"];
    activityEvents.forEach((event) => {
      document.removeEventListener(event, this.handleActivity);
    });

    window.removeEventListener("online", this.handleOnline);
    window.removeEventListener("offline", this.handleOffline);

    if (this.beforeUnloadHandler) {
      window.removeEventListener("beforeunload", this.beforeUnloadHandler);
      window.removeEventListener("pagehide", this.beforeUnloadHandler);
    }

    document.removeEventListener("freeze", this.handleFreeze);
    document.removeEventListener("resume", this.handleResume);

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
      this.typingTimer = null;
    }
  }

  /**
   * Start optimized heartbeat
   */
  private startOptimizedHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.checkActivityTimeout();
      this.sendToTelegram();
    }, this.HEARTBEAT_INTERVAL);
  }

  /**
   * Event handlers
   */
  private handleVisibilityChange = (): void => {
    if (!this.state) return;

    this.state.isVisible = !document.hidden;
    this.updateActivity();
    this.updateStatus();
  };

  private handleFocus = (): void => {
    this.updateActivity();
    this.updateStatus();
  };

  private handleBlur = (): void => {
    this.updateStatus();
  };

  private handleActivity = (): void => {
    this.updateActivity();
  };

  private handleOnline = (): void => {
    if (!this.state) return;

    this.state.isOnline = true;
    this.state.hasInternet = true;
    this.updateActivity();
    this.updateStatus();
  };

  private handleOffline = (): void => {
    if (!this.state) return;

    this.state.isOnline = false;
    this.state.hasInternet = false;
    this.updateStatus();
  };

  private handleFreeze = (): void => {
    if (this.state) {
      this.state.status = "away";
      this.sendToTelegram();
    }
  };

  private handleResume = (): void => {
    this.updateActivity();
    this.updateStatus();
  };

  /**
   * Update activity timestamp
   */
  private updateActivity(): void {
    if (!this.state) return;

    this.state.lastActivity = Date.now();
    this.updateStatus();
  }

  /**
   * Check activity timeout
   */
  private checkActivityTimeout(): void {
    if (!this.state) return;

    const now = Date.now();
    const inactiveTime = now - this.state.lastActivity;

    if (
      inactiveTime > this.ACTIVITY_TIMEOUT &&
      this.state.status === "online"
    ) {
      this.updateStatus();
    }
  }

  /**
   * Update status with optimization
   */
  private updateStatus(): void {
    if (!this.state) return;

    const oldStatus = this.state.status;
    const now = Date.now();

    // Determine new status
    if (!this.state.isOnline || !this.state.hasInternet) {
      this.state.status = "offline";
    } else if (!this.state.isVisible) {
      this.state.status = "away";
    } else if (now - this.state.lastActivity > this.ACTIVITY_TIMEOUT) {
      this.state.status = "away";
    } else {
      this.state.status = "online";
    }

    // Send to Telegram if status changed or enough time passed
    const shouldSend =
      oldStatus !== this.state.status ||
      now - this.state.lastUpdate > this.MIN_UPDATE_INTERVAL;

    if (shouldSend) {
      this.state.lastUpdate = now;
      this.sendToTelegram();
    }

    // Notify listeners
    this.notifyListeners();
  }

  /**
   * Send to Telegram with optimization
   */
  private async sendToTelegram(forceOffline: boolean = false): Promise<void> {
    if (!this.state) return;

    // Validate session
    const session = getSession(this.state.sessionId);
    if (!session) {
      console.warn(
        "⚠️ Session expired, stopping tracker:",
        this.state.sessionId,
      );
      this.stop();
      return;
    }

    // Check admin access
    const adminAccess = validateAdminAccess();
    if (!adminAccess.hasAccess) return;

    // Prevent duplicate status sends (unless forced)
    if (
      !forceOffline &&
      this.lastSentStatus === this.state.status &&
      !this.typingState.isTyping
    ) {
      return;
    }

    try {
      const statusText = this.getStatusText();
      const statusEmoji = this.getStatusEmoji();

      await updateUserOnlineStatus(
        this.state.sessionId,
        this.state.status === "online",
        this.state.isVisible,
        this.state.lastActivity,
        statusText,
        statusEmoji,
      );

      this.lastSentStatus = this.state.status;

      console.log("✅ Status sent:", {
        status: this.state.status,
        isTyping: this.typingState.isTyping,
        statusText,
      });
    } catch (error) {
      console.error("❌ Failed to send status:", error);
    }
  }

  /**
   * Notify listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach((callback) => {
      try {
        callback();
      } catch (error) {
        console.error("❌ Listener error:", error);
      }
    });
  }

  /**
   * Throttle function for performance
   */
  private throttle(func: Function, limit: number): Function {
    let inThrottle: boolean;
    return function (this: any, ...args: any[]) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }
}

// Create singleton instance
const optimizedRealtimePresenceTracker = new OptimizedRealtimePresenceTracker();

export default optimizedRealtimePresenceTracker;
