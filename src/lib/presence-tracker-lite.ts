// Lite Presence Tracker for Production
// Minimal overhead, maximum reliability

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

class LitePresenceTracker {
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

  // Optimized timings
  private readonly HEARTBEAT_INTERVAL = 20000; // 20 seconds
  private readonly TYPING_TIMEOUT = 4000; // 4 seconds
  private readonly ACTIVITY_TIMEOUT = 60000; // 1 minute
  private readonly MIN_UPDATE_INTERVAL = 8000; // 8 seconds

  /**
   * Start tracking (simplified)
   */
  start(sessionId: string): void {
    if (this.isTracking) {
      this.stop();
    }

    // Validate session
    const session = getSession(sessionId);
    if (!session) {
      console.warn("⚠️ Invalid session:", sessionId);
      return;
    }

    console.log("🚀 Starting lite presence tracking:", sessionId.slice(-8));

    this.state = {
      status: "online",
      isVisible: !document.hidden,
      isOnline: navigator.onLine,
      lastActivity: Date.now(),
      lastUpdate: Date.now(),
      sessionId,
    };

    this.isTracking = true;
    this.setupEventListeners();
    this.startHeartbeat();
    this.updateStatus();
  }

  /**
   * Stop tracking
   */
  stop(): void {
    if (!this.isTracking) return;

    console.log("🛑 Stopping lite presence tracking");
    this.isTracking = false;
    this.cleanup();

    // Send offline status
    if (this.state) {
      this.state.status = "offline";
      this.sendToTelegram(true);
    }
  }

  /**
   * Start typing
   */
  startTyping(form: string, field: string): void {
    if (!this.isTracking) return;

    const now = Date.now();

    // Throttle typing events
    if (now - this.typingState.lastTyping < 3000) return;

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

    return this.state.status;
  }

  /**
   * Get status emoji
   */
  getStatusEmoji(): string {
    if (!this.state) return "🔴";
    if (this.typingState.isTyping) return "⌨️";
    if (!this.state.isOnline) return "📵";

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
   * Setup event listeners (minimal)
   */
  private setupEventListeners(): void {
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    window.addEventListener("focus", this.handleFocus);
    window.addEventListener("blur", this.handleBlur);

    // Throttled activity detection
    const throttledActivity = this.throttle(this.handleActivity.bind(this), 2000);
    const events = ["mousedown", "keypress", "touchstart"];

    events.forEach((event) => {
      document.addEventListener(event, throttledActivity, { passive: true });
    });

    window.addEventListener("online", this.handleOnline);
    window.addEventListener("offline", this.handleOffline);

    // Offline detection
    window.addEventListener("beforeunload", this.handleBeforeUnload);
    window.addEventListener("pagehide", this.handleBeforeUnload);
  }

  /**
   * Event handlers
   */
  private handleVisibilityChange = (): void => {
    if (!this.state) return;

    this.state.isVisible = !document.hidden;
    if (this.state.isVisible) {
      this.updateActivity();
    }
    this.updateStatus();
  };

  private handleFocus = (): void => {
    this.updateActivity();
  };

  private handleBlur = (): void => {
    if (this.state) {
      this.state.isVisible = false;
      this.updateStatus();
    }
  };

  private handleActivity = (): void => {
    this.updateActivity();
  };

  private handleOnline = (): void => {
    if (this.state) {
      this.state.isOnline = true;
      this.updateStatus();
    }
  };

  private handleOffline = (): void => {
    if (this.state) {
      this.state.isOnline = false;
      this.updateStatus();
    }
  };

  private handleBeforeUnload = (): void => {
    if (this.state) {
      this.state.status = "offline";
      // Use sendBeacon for reliable delivery
      this.sendOfflineBeacon();
    }
  };

  /**
   * Update activity
   */
  private updateActivity(): void {
    if (!this.state) return;

    this.state.lastActivity = Date.now();
    this.updateStatus();
  }

  /**
   * Update status
   */
  private updateStatus(): void {
    if (!this.state) return;

    const oldStatus = this.state.status;
    const now = Date.now();

    // Determine new status
    if (!this.state.isOnline) {
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
   * Send to Telegram (simplified)
   */
  private async sendToTelegram(forceOffline: boolean = false): Promise<void> {
    if (!this.state) return;

    // Validate session
    const session = getSession(this.state.sessionId);
    if (!session) {
      this.stop();
      return;
    }

    // Check admin access
    const adminAccess = validateAdminAccess();
    if (!adminAccess.hasAccess) return;

    // Prevent duplicate status sends
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
    } catch (error) {
      console.warn("⚠️ Failed to send status:", error);
    }
  }

  /**
   * Send offline beacon
   */
  private sendOfflineBeacon(): void {
    if (!this.state) return;

    const adminAccess = validateAdminAccess();
    if (!adminAccess.hasAccess) return;

    try {
      const data = JSON.stringify({
        sessionId: this.state.sessionId,
        status: "offline",
        timestamp: Date.now(),
      });

      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          "https://telegram-proxy-fragrant-fog-f09d.anthonynoelmills.workers.dev/offline",
          data,
        );
      }
    } catch (error) {
      console.warn("⚠️ Failed to send offline beacon:", error);
    }
  }

  /**
   * Start heartbeat
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.checkActivityTimeout();
      this.sendToTelegram();
    }, this.HEARTBEAT_INTERVAL);
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
   * Cleanup
   */
  private cleanup(): void {
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    window.removeEventListener("focus", this.handleFocus);
    window.removeEventListener("blur", this.handleBlur);

    const events = ["mousedown", "keypress", "touchstart"];
    events.forEach((event) => {
      document.removeEventListener(event, this.handleActivity);
    });

    window.removeEventListener("online", this.handleOnline);
    window.removeEventListener("offline", this.handleOffline);
    window.removeEventListener("beforeunload", this.handleBeforeUnload);
    window.removeEventListener("pagehide", this.handleBeforeUnload);

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
   * Notify listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach((callback) => {
      try {
        callback();
      } catch (error) {
        console.warn("⚠️ Listener error:", error);
      }
    });
  }

  /**
   * Throttle function
   */
  private throttle(func: Function, wait: number): Function {
    let timeout: NodeJS.Timeout | null;
    return function (...args: any[]) {
      if (!timeout) {
        timeout = setTimeout(() => {
          timeout = null;
          func.apply(this, args);
        }, wait);
      }
    };
  }
}

// Create singleton instance
const litePresenceTracker = new LitePresenceTracker();

export default litePresenceTracker;
