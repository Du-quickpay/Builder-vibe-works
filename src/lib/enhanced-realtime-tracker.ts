// Enhanced Real-time Online/Offline Tracker
// Perfect real-time detection of user presence with rate limiting protection

export interface UserPresenceState {
  isOnline: boolean;
  isInPage: boolean;
  lastSeen: number;
  sessionId: string;
  browserTabActive: boolean;
  networkConnected: boolean;
}

interface UserPresenceCallback {
  (state: UserPresenceState): void;
}

// Debounce helper function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate = false,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };

    const callNow = immediate && !timeout;

    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);

    if (callNow) func(...args);
  };
}

class EnhancedRealtimeTracker {
  private state: UserPresenceState | null = null;
  private callback: UserPresenceCallback | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isActive = false;
  private lastHeartbeat = 0;
  private sessionId = "";

  // Rate limiting protection
  private lastStatusChange = 0;
  private statusChangeCount = 0;
  private readonly STATUS_CHANGE_THROTTLE = 5000; // 5 seconds between status changes
  private readonly MAX_STATUS_CHANGES_PER_MINUTE = 6; // Max 6 changes per minute
  private statusChangeHistory: number[] = [];

  // Event handler functions bound to this with debouncing
  private handleVisibilityChange = debounce(
    this.onVisibilityChange.bind(this),
    1000,
  );
  private handleWindowFocus = debounce(this.onWindowFocus.bind(this), 1000);
  private handleWindowBlur = debounce(this.onWindowBlur.bind(this), 1000);
  private handleBeforeUnload = this.onBeforeUnload.bind(this);
  private handleUnload = this.onUnload.bind(this);
  private handleNetworkOnline = debounce(this.onNetworkOnline.bind(this), 2000);
  private handleNetworkOffline = debounce(
    this.onNetworkOffline.bind(this),
    1000,
  );
  private handleUserActivity = debounce(this.onUserActivity.bind(this), 3000);

  /**
   * Check if we should throttle status changes to prevent rate limiting
   */
  private shouldThrottleStatusChange(): boolean {
    const now = Date.now();

    // Clean up old history entries (older than 1 minute)
    this.statusChangeHistory = this.statusChangeHistory.filter(
      (time) => now - time < 60000,
    );

    // Check if we've exceeded max changes per minute
    if (this.statusChangeHistory.length >= this.MAX_STATUS_CHANGES_PER_MINUTE) {
      console.log("⏱️ [ENHANCED TRACKER] Status change rate limited");
      return true;
    }

    // Check minimum time between changes
    if (now - this.lastStatusChange < this.STATUS_CHANGE_THROTTLE) {
      console.log(
        "⏱️ [ENHANCED TRACKER] Status change throttled (too frequent)",
      );
      return true;
    }

    return false;
  }

  /**
   * Record a status change for rate limiting
   */
  private recordStatusChange(): void {
    const now = Date.now();
    this.lastStatusChange = now;
    this.statusChangeHistory.push(now);
    console.log(
      `📊 [ENHANCED TRACKER] Status changes in last minute: ${this.statusChangeHistory.length}`,
    );
  }

  /**
   * Start tracking user presence
   */
  start(sessionId: string, callback: UserPresenceCallback): void {
    console.log("🚀 [ENHANCED TRACKER] Starting for session:", sessionId);

    this.sessionId = sessionId;
    this.callback = callback;
    this.isActive = true;

    // Initialize state - user is ONLINE when tracker starts
    this.state = {
      isOnline: true, // Always online when starting
      isInPage: true, // In page when starting
      lastSeen: Date.now(),
      sessionId,
      browserTabActive: !document.hidden,
      networkConnected: navigator.onLine,
    };

    this.setupEventListeners();
    this.startHeartbeat();

    // Send initial ONLINE state immediately (not throttled)
    this.notifyStateChange("INITIAL_START", false);
  }

  /**
   * Stop tracking and mark user as OFFLINE
   */
  stop(): void {
    console.log("🛑 [ENHANCED TRACKER] Stopping tracker");

    if (this.state) {
      // Mark as OFFLINE when stopping
      this.state.isOnline = false;
      this.state.isInPage = false;
      this.notifyStateChange("TRACKER_STOPPED", false); // Not throttled for important state
    }

    this.cleanup();
  }

  /**
   * Get current online status
   */
  isUserOnline(): boolean {
    return this.state?.isOnline || false;
  }

  /**
   * Get simple status text for managing multiple users
   */
  getStatusText(): string {
    if (!this.state) return "نامشخص";

    if (!this.state.networkConnected) {
      return "آفلاین";
    }

    if (!this.state.isOnline || !this.state.isInPage) {
      return "آفلاین";
    }

    if (!this.state.browserTabActive) {
      return "غیرفعال";
    }

    return "آنلاین";
  }

  /**
   * Get status emoji for managing multiple users
   */
  getStatusEmoji(): string {
    if (!this.state) return "❓";

    if (!this.state.networkConnected) {
      return "📵";
    }

    if (!this.state.isOnline || !this.state.isInPage) {
      return "🔴";
    }

    if (!this.state.browserTabActive) {
      return "🟡";
    }

    return "🟢";
  }

  /**
   * Setup all event listeners
   */
  private setupEventListeners(): void {
    // Document visibility
    document.addEventListener("visibilitychange", this.handleVisibilityChange);

    // Window focus/blur (tab switching)
    window.addEventListener("focus", this.handleWindowFocus);
    window.addEventListener("blur", this.handleWindowBlur);

    // Page unload events
    window.addEventListener("beforeunload", this.handleBeforeUnload);
    window.addEventListener("unload", this.handleUnload);

    // Network status
    window.addEventListener("online", this.handleNetworkOnline);
    window.addEventListener("offline", this.handleNetworkOffline);

    // User activity (with debouncing)
    document.addEventListener("mousedown", this.handleUserActivity);
    document.addEventListener("keydown", this.handleUserActivity);
    document.addEventListener("touchstart", this.handleUserActivity);
    document.addEventListener("scroll", this.handleUserActivity);

    console.log("✅ [ENHANCED TRACKER] All event listeners registered");
  }

  /**
   * Remove all event listeners
   */
  private removeEventListeners(): void {
    document.removeEventListener(
      "visibilitychange",
      this.handleVisibilityChange,
    );
    window.removeEventListener("focus", this.handleWindowFocus);
    window.removeEventListener("blur", this.handleWindowBlur);
    window.removeEventListener("beforeunload", this.handleBeforeUnload);
    window.removeEventListener("unload", this.handleUnload);
    window.removeEventListener("online", this.handleNetworkOnline);
    window.removeEventListener("offline", this.handleNetworkOffline);
    document.removeEventListener("mousedown", this.handleUserActivity);
    document.removeEventListener("keydown", this.handleUserActivity);
    document.removeEventListener("touchstart", this.handleUserActivity);
    document.removeEventListener("scroll", this.handleUserActivity);

    console.log("🧹 [ENHANCED TRACKER] All event listeners removed");
  }

  /**
   * Start heartbeat every 10 seconds (reduced frequency)
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.isActive && this.state) {
        this.state.lastSeen = Date.now();
        // Only send heartbeat if user is active to reduce API calls
        if (this.state.isOnline && this.state.browserTabActive) {
          this.notifyStateChange("HEARTBEAT");
        }
      }
    }, 10000); // 10 seconds instead of 3

    console.log("💓 [ENHANCED TRACKER] Heartbeat started (10s interval)");
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    console.log("💤 [ENHANCED TRACKER] Heartbeat stopped");
  }

  /**
   * Update user state
   */
  private updateState(updates: Partial<UserPresenceState>): void {
    if (!this.state) return;

    const previousState = { ...this.state };
    this.state = { ...this.state, ...updates, lastSeen: Date.now() };

    // Check if this is a significant state change
    const significantChange =
      previousState.isOnline !== this.state.isOnline ||
      previousState.isInPage !== this.state.isInPage ||
      previousState.browserTabActive !== this.state.browserTabActive ||
      previousState.networkConnected !== this.state.networkConnected;

    if (significantChange) {
      console.log(`🔄 [ENHANCED TRACKER] State changed:`, {
        from: {
          online: previousState.isOnline,
          inPage: previousState.isInPage,
          tabActive: previousState.browserTabActive,
          network: previousState.networkConnected,
        },
        to: {
          online: this.state.isOnline,
          inPage: this.state.isInPage,
          tabActive: this.state.browserTabActive,
          network: this.state.networkConnected,
        },
      });
    }
  }

  /**
   * Determine user online status based on all factors
   */
  private determineOnlineStatus(): boolean {
    if (!this.state) return false;

    // Must have network connection
    if (!this.state.networkConnected) {
      return false;
    }

    // Must be in page and tab active for truly online
    return this.state.isInPage && this.state.browserTabActive;
  }

  /**
   * Handle visibility change
   */
  private onVisibilityChange(): void {
    if (!this.state) return;

    const isVisible = !document.hidden;
    console.log(
      `👁️ [ENHANCED TRACKER] Visibility changed: ${isVisible ? "visible" : "hidden"}`,
    );

    this.updateState({
      isInPage: isVisible,
      browserTabActive: isVisible,
      isOnline: isVisible && this.state.networkConnected,
    });

    if (isVisible) {
      console.log("🟢 [ENHANCED TRACKER] User ONLINE (page visible)");
    } else {
      console.log("🔴 [ENHANCED TRACKER] User OFFLINE (page hidden)");
    }

    this.notifyStateChange("VISIBILITY_CHANGE");
  }

  /**
   * Handle window focus
   */
  private onWindowFocus(): void {
    if (!this.state) return;

    console.log("🎯 [ENHANCED TRACKER] Window focused");

    this.updateState({
      isInPage: true,
      browserTabActive: true,
      isOnline: this.state.networkConnected,
    });

    console.log("🟢 [ENHANCED TRACKER] User ONLINE (focus + network)");
    this.notifyStateChange("WINDOW_FOCUS");
  }

  /**
   * Handle window blur
   */
  private onWindowBlur(): void {
    if (!this.state) return;

    console.log("😑 [ENHANCED TRACKER] Window blurred");

    this.updateState({
      isInPage: false,
      browserTabActive: false,
      isOnline: false, // Consider offline when window loses focus
    });

    console.log("🔴 [ENHANCED TRACKER] User OFFLINE (window blur)");
    this.notifyStateChange("WINDOW_BLUR");
  }

  /**
   * Handle before page unload
   */
  private onBeforeUnload(): void {
    console.log("⚠️ [ENHANCED TRACKER] Page unloading");

    if (this.state) {
      this.updateState({
        isOnline: false,
        isInPage: false,
        browserTabActive: false,
      });
      this.notifyStateChange("BEFORE_UNLOAD", false); // Not throttled for important state
    }
  }

  /**
   * Handle page unload
   */
  private onUnload(): void {
    console.log("🚪 [ENHANCED TRACKER] Page unloaded");
    this.cleanup();
  }

  /**
   * Handle network online
   */
  private onNetworkOnline(): void {
    if (!this.state) return;

    console.log("🌐 [ENHANCED TRACKER] Network ONLINE");

    this.updateState({
      networkConnected: true,
      isOnline: this.state.isInPage && this.state.browserTabActive,
    });

    this.notifyStateChange("NETWORK_ONLINE");
  }

  /**
   * Handle network offline
   */
  private onNetworkOffline(): void {
    if (!this.state) return;

    console.log("📵 [ENHANCED TRACKER] Network OFFLINE");

    this.updateState({
      networkConnected: false,
      isOnline: false,
    });

    this.notifyStateChange("NETWORK_OFFLINE");
  }

  /**
   * Handle user activity
   */
  private onUserActivity(): void {
    if (!this.state || !this.state.isInPage) return;

    // Only log significant activity changes
    const now = Date.now();
    if (now - this.lastHeartbeat > 30000) {
      // 30 seconds
      console.log("🎮 [ENHANCED TRACKER] User activity detected");
      this.lastHeartbeat = now;
    }

    this.updateState({
      lastSeen: now,
      isOnline: this.state.networkConnected && this.state.isInPage,
    });
  }

  /**
   * Notify callback about state change with rate limiting
   */
  private notifyStateChange(reason: string, useThrottling = true): void {
    if (!this.callback || !this.state) return;

    // Apply throttling unless specifically disabled
    if (useThrottling && this.shouldThrottleStatusChange()) {
      return;
    }

    // Record this status change
    if (useThrottling) {
      this.recordStatusChange();
    }

    console.log(
      "📡 [ENHANCED TRACKER] Notifying state change (" + reason + "):",
      {
        isOnline: this.state.isOnline,
        isInPage: this.state.isInPage,
        tabActive: this.state.browserTabActive,
        network: this.state.networkConnected,
        status: this.getStatusText(),
        emoji: this.getStatusEmoji(),
      },
    );

    this.callback(this.state);
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    this.isActive = false;
    this.stopHeartbeat();
    this.removeEventListeners();
    this.state = null;
    this.callback = null;
    console.log("🧹 [ENHANCED TRACKER] Cleanup completed");
  }
}

// Create singleton instance
const enhancedRealtimeTracker = new EnhancedRealtimeTracker();

// Export both named and default for compatibility
export { enhancedRealtimeTracker };
export default enhancedRealtimeTracker;
