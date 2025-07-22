// Global Presence Manager - Centralized presence state management
// Manages presence state across all components and forms

import litePresenceTracker, { type PresenceState, type TypingState } from "./presence-tracker-lite";

export interface GlobalPresenceState {
  // Core presence data
  presenceLevel: "online" | "idle" | "away" | "offline";
  isOnline: boolean;
  isVisible: boolean;
  lastSeen: number;
  lastActivity: number;

  // Typing state
  isTyping: boolean;
  typingInField?: string;
  typingInForm?: string;
  lastTyping: number;

  // Session info
  sessionId: string;
  currentForm?: string;

  // Network state
  networkStatus: "connected" | "disconnected" | "slow";
  lastUpdate: number;
}

export type PresenceSubscriber = (state: GlobalPresenceState | null) => void;

class GlobalPresenceManager {
  private state: GlobalPresenceState | null = null;
  private subscribers: Map<string, PresenceSubscriber> = new Map();
  private forms: Map<string, string> = new Map(); // formName -> subscriberId
  private updateTimer: NodeJS.Timeout | null = null;

  constructor() {
    // Listen to lite tracker changes
    litePresenceTracker.addListener(this.handleTrackerUpdate.bind(this));
    
    // Setup periodic updates
    this.startPeriodicUpdates();
  }

  /**
   * Register a form/component to receive presence updates
   */
  registerForm(formName: string, callback: PresenceSubscriber): string {
    const subscriberId = `${formName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.subscribers.set(subscriberId, callback);
    this.forms.set(formName, subscriberId);
    
    console.log(`📊 [GLOBAL PRESENCE] Registered ${formName} (${subscriberId.slice(-8)})`);
    
    // Send current state immediately
    if (this.state) {
      callback(this.state);
    }
    
    return subscriberId;
  }

  /**
   * Unregister a form/component
   */
  unregisterForm(subscriberId: string): void {
    this.subscribers.delete(subscriberId);
    
    // Remove from forms map
    for (const [formName, id] of this.forms.entries()) {
      if (id === subscriberId) {
        this.forms.delete(formName);
        break;
      }
    }
    
    console.log(`📊 [GLOBAL PRESENCE] Unregistered ${subscriberId.slice(-8)}`);
  }

  /**
   * Set current active form
   */
  setCurrentForm(formName: string): void {
    if (this.state) {
      this.state.currentForm = formName;
      this.notifySubscribers();
    }
  }

  /**
   * Get current presence state
   */
  getState(): GlobalPresenceState | null {
    return this.state ? { ...this.state } : null;
  }

  /**
   * Get status text based on current state
   */
  getStatusText(): string {
    if (!this.state) return "offline";

    if (this.state.isTyping && this.state.typingInForm) {
      return `typing in ${this.state.typingInForm}`;
    }

    switch (this.state.presenceLevel) {
      case "online":
        return "online";
      case "idle":
        return "idle";
      case "away":
        return "away";
      case "offline":
      default:
        return "offline";
    }
  }

  /**
   * Get status emoji based on current state
   */
  getStatusEmoji(): string {
    if (!this.state) return "🔴";
    
    if (this.state.isTyping) return "⌨️";
    if (!this.state.isOnline) return "📵";

    switch (this.state.presenceLevel) {
      case "online":
        return "🟢";
      case "idle":
        return "🟡";
      case "away":
        return "🟠";
      case "offline":
      default:
        return "🔴";
    }
  }

  /**
   * Get network status
   */
  getNetworkStatus(): string {
    if (!this.state) return "disconnected";
    return this.state.networkStatus;
  }

  /**
   * Handle updates from lite tracker
   */
  private handleTrackerUpdate(): void {
    const presenceState = litePresenceTracker.getState();
    const typingState = litePresenceTracker.getTypingState();

    if (!presenceState) {
      this.state = null;
      this.notifySubscribers();
      return;
    }

    // Map presence state to global state
    this.state = {
      // Core presence
      presenceLevel: this.mapPresenceLevel(presenceState.status),
      isOnline: presenceState.isOnline && presenceState.status !== "offline",
      isVisible: presenceState.isVisible,
      lastSeen: presenceState.lastActivity,
      lastActivity: presenceState.lastActivity,

      // Typing state
      isTyping: typingState.isTyping,
      typingInField: typingState.field || undefined,
      typingInForm: typingState.form || undefined,
      lastTyping: typingState.lastTyping,

      // Session info
      sessionId: presenceState.sessionId,
      currentForm: this.state?.currentForm,

      // Network state
      networkStatus: this.determineNetworkStatus(presenceState),
      lastUpdate: Date.now(),
    };

    this.notifySubscribers();
  }

  /**
   * Map presence status to global presence level
   */
  private mapPresenceLevel(status: string): "online" | "idle" | "away" | "offline" {
    switch (status) {
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
   * Determine network status
   */
  private determineNetworkStatus(presenceState: PresenceState): "connected" | "disconnected" | "slow" {
    if (!navigator.onLine || !presenceState.isOnline) {
      return "disconnected";
    }

    // Simple heuristic: if last activity was recent, consider connected
    const timeSinceActivity = Date.now() - presenceState.lastActivity;
    if (timeSinceActivity > 60000) {
      return "slow";
    }

    return "connected";
  }

  /**
   * Notify all subscribers
   */
  private notifySubscribers(): void {
    this.subscribers.forEach((callback, subscriberId) => {
      try {
        callback(this.state);
      } catch (error) {
        console.warn(`📊 [GLOBAL PRESENCE] Error notifying ${subscriberId.slice(-8)}:`, error);
      }
    });
  }

  /**
   * Start periodic updates
   */
  private startPeriodicUpdates(): void {
    // Update every 5 seconds to ensure fresh data
    this.updateTimer = setInterval(() => {
      if (this.state) {
        this.state.lastUpdate = Date.now();
        this.notifySubscribers();
      }
    }, 5000);
  }

  /**
   * Stop periodic updates
   */
  private stopPeriodicUpdates(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    this.stopPeriodicUpdates();
    this.subscribers.clear();
    this.forms.clear();
    this.state = null;
  }
}

// Create and export singleton instance
const globalPresenceManager = new GlobalPresenceManager();

export default globalPresenceManager;
