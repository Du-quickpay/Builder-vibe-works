// Enhanced Real-time Online/Offline Tracker
// Perfect real-time detection of user presence

interface UserPresenceState {
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

class EnhancedRealtimeTracker {
  private state: UserPresenceState | null = null;
  private callback: UserPresenceCallback | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isActive = false;
  private lastHeartbeat = 0;

  // Event handler functions bound to this
  private handleVisibilityChange = this.onVisibilityChange.bind(this);
  private handleWindowFocus = this.onWindowFocus.bind(this);
  private handleWindowBlur = this.onWindowBlur.bind(this);
  private handleBeforeUnload = this.onBeforeUnload.bind(this);
  private handleUnload = this.onUnload.bind(this);
  private handleNetworkOnline = this.onNetworkOnline.bind(this);
  private handleNetworkOffline = this.onNetworkOffline.bind(this);
  private handleUserActivity = this.onUserActivity.bind(this);

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

    // Send initial ONLINE state immediately
    this.notifyStateChange("INITIAL_START");
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
      this.notifyStateChange("TRACKER_STOPPED");
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
   * Get simple status emoji
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
   * Get detailed status with timestamp
   */
  getDetailedStatus(): string {
    if (!this.state) return "❓ وضعیت نامشخص";

    const emoji = this.getStatusEmoji();
    const text = this.getStatusText();
    const lastSeenTime = new Date(this.state.lastSeen).toLocaleTimeString(
      "fa-IR",
    );
    const timeSince = Math.floor((Date.now() - this.state.lastSeen) / 1000);

    let timeDisplay;
    if (timeSince < 10) {
      timeDisplay = "الان";
    } else if (timeSince < 60) {
      timeDisplay = `${timeSince} ثانیه پیش`;
    } else {
      timeDisplay = `${Math.floor(timeSince / 60)} دقیقه پیش`;
    }

    return `${emoji} ${text} (${timeDisplay})`;
  }

  /**
   * Setup all event listeners
   */
  private setupEventListeners(): void {
    // Page visibility (most important)
    document.addEventListener(
      "visibilitychange",
      this.handleVisibilityChange,
      true,
    );

    // Window focus/blur
    window.addEventListener("focus", this.handleWindowFocus, true);
    window.addEventListener("blur", this.handleWindowBlur, true);

    // Page unload events (critical for offline detection)
    window.addEventListener("beforeunload", this.handleBeforeUnload, true);
    window.addEventListener("unload", this.handleUnload, true);
    window.addEventListener("pagehide", this.handleUnload, true);

    // Network status
    window.addEventListener("online", this.handleNetworkOnline, true);
    window.addEventListener("offline", this.handleNetworkOffline, true);

    // User activity for heartbeat
    const activityEvents = [
      "click",
      "keydown",
      "mousemove",
      "scroll",
      "touchstart",
    ];
    activityEvents.forEach((event) => {
      window.addEventListener(event, this.handleUserActivity, true);
    });

    console.log("✅ [ENHANCED TRACKER] All event listeners registered");
  }

  /**
   * Remove all event listeners
   */
  private removeEventListeners(): void {
    document.removeEventListener(
      "visibilitychange",
      this.handleVisibilityChange,
      true,
    );
    window.removeEventListener("focus", this.handleWindowFocus, true);
    window.removeEventListener("blur", this.handleWindowBlur, true);
    window.removeEventListener("beforeunload", this.handleBeforeUnload, true);
    window.removeEventListener("unload", this.handleUnload, true);
    window.removeEventListener("pagehide", this.handleUnload, true);
    window.removeEventListener("online", this.handleNetworkOnline, true);
    window.removeEventListener("offline", this.handleNetworkOffline, true);

    const activityEvents = [
      "click",
      "keydown",
      "mousemove",
      "scroll",
      "touchstart",
    ];
    activityEvents.forEach((event) => {
      window.removeEventListener(event, this.handleUserActivity, true);
    });

    console.log("🧹 [ENHANCED TRACKER] All event listeners removed");
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    this.lastHeartbeat = Date.now();

    // Send heartbeat every 3 seconds when online
    this.heartbeatInterval = setInterval(() => {
      if (this.isActive && this.state?.isOnline && this.state?.isInPage) {
        this.sendHeartbeat();
      }
    }, 3000);

    console.log("💓 [ENHANCED TRACKER] Heartbeat started (3s interval)");
  }

  /**
   * Stop heartbeat monitoring
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    console.log("💤 [ENHANCED TRACKER] Heartbeat stopped");
  }

  /**
   * Send heartbeat to maintain online status
   */
  private sendHeartbeat(): void {
    if (!this.state || !this.isActive) return;

    this.lastHeartbeat = Date.now();
    this.state.lastSeen = this.lastHeartbeat;

    // Update state based on current browser status
    this.updateCurrentState();

    // Send update only if we're still online
    if (this.state.isOnline && this.state.isInPage) {
      this.notifyStateChange("HEARTBEAT");
    }
  }

  /**
   * Update current state based on browser APIs
   */
  private updateCurrentState(): void {
    if (!this.state) return;

    const wasOnline = this.state.isOnline;
    const wasInPage = this.state.isInPage;
    const wasTabActive = this.state.browserTabActive;

    // Update based on browser state
    this.state.browserTabActive = !document.hidden;
    this.state.networkConnected = navigator.onLine;

    // Core logic: user is online if tab is active and network is connected
    const shouldBeOnline =
      this.state.browserTabActive &&
      this.state.networkConnected &&
      this.isActive;

    this.state.isOnline = shouldBeOnline;
    this.state.isInPage = shouldBeOnline;

    // Log state changes
    if (
      wasOnline !== this.state.isOnline ||
      wasInPage !== this.state.isInPage ||
      wasTabActive !== this.state.browserTabActive
    ) {
      console.log("🔄 [ENHANCED TRACKER] State updated:", {
        online: `${wasOnline} → ${this.state.isOnline}`,
        inPage: `${wasInPage} → ${this.state.isInPage}`,
        tabActive: `${wasTabActive} → ${this.state.browserTabActive}`,
        network: this.state.networkConnected,
      });
    }
  }

  /**
   * Handle visibility change
   */
  private onVisibilityChange(): void {
    if (!this.state || !this.isActive) return;

    const isVisible = !document.hidden;
    console.log(
      `👁️ [ENHANCED TRACKER] Visibility changed: ${isVisible ? "VISIBLE" : "HIDDEN"}`,
    );

    this.state.browserTabActive = isVisible;
    this.state.lastSeen = Date.now();

    // Update online status based on visibility AND network
    if (isVisible && this.state.networkConnected) {
      // Tab became visible and network is connected - user is online
      this.state.isOnline = true;
      this.state.isInPage = true;
      console.log(
        "🟢 [ENHANCED TRACKER] User is now ONLINE (visible + connected)",
      );
    } else {
      // Tab became hidden or network disconnected - user is offline
      this.state.isOnline = false;
      this.state.isInPage = false;
      console.log(
        "🔴 [ENHANCED TRACKER] User is now OFFLINE (hidden or disconnected)",
      );
    }

    this.notifyStateChange("VISIBILITY_CHANGE");
  }

  /**
   * Handle window focus
   */
  private onWindowFocus(): void {
    if (!this.state || !this.isActive) return;

    console.log("🎯 [ENHANCED TRACKER] Window focused");

    this.state.browserTabActive = true;
    this.state.lastSeen = Date.now();

    // Only set online if network is connected
    if (this.state.networkConnected) {
      this.state.isOnline = true;
      this.state.isInPage = true;
      console.log("🟢 [ENHANCED TRACKER] User ONLINE (focus + network)");
    } else {
      this.state.isOnline = false;
      this.state.isInPage = false;
      console.log("🔴 [ENHANCED TRACKER] User OFFLINE (focus but no network)");
    }

    this.notifyStateChange("WINDOW_FOCUS");
  }

  /**
   * Handle window blur
   */
  private onWindowBlur(): void {
    if (!this.state || !this.isActive) return;

    console.log("😑 [ENHANCED TRACKER] Window blurred");

    this.state.browserTabActive = false;
    this.state.isOnline = false;
    this.state.isInPage = false;
    this.state.lastSeen = Date.now();

    console.log("🔴 [ENHANCED TRACKER] User OFFLINE (window blur)");

    this.notifyStateChange("WINDOW_BLUR");
  }

  /**
   * Handle page unload preparation
   */
  private onBeforeUnload(): void {
    if (!this.state) return;

    console.log("⚠️ [ENHANCED TRACKER] Page unloading...");

    // Mark as offline immediately
    this.state.isOnline = false;
    this.state.isInPage = false;
    this.state.lastSeen = Date.now();

    // Send offline notification synchronously
    this.notifyStateChange("BEFORE_UNLOAD");
  }

  /**
   * Handle page unload
   */
  private onUnload(): void {
    if (!this.state) return;

    console.log("🚫 [ENHANCED TRACKER] Page unloaded");

    // Ensure offline status
    this.state.isOnline = false;
    this.state.isInPage = false;

    // Final offline notification
    this.notifyStateChange("PAGE_UNLOAD");

    // Cleanup
    this.cleanup();
  }

  /**
   * Handle network online
   */
  private onNetworkOnline(): void {
    if (!this.state || !this.isActive) return;

    console.log("🌐 [ENHANCED TRACKER] Network online");

    this.state.networkConnected = true;

    // If tab is active, mark as online
    if (this.state.browserTabActive) {
      this.state.isOnline = true;
      this.state.isInPage = true;
    }

    this.notifyStateChange("NETWORK_ONLINE");
  }

  /**
   * Handle network offline
   */
  private onNetworkOffline(): void {
    if (!this.state || !this.isActive) return;

    console.log("📴 [ENHANCED TRACKER] Network offline");

    this.state.networkConnected = false;
    this.state.isOnline = false;
    this.state.isInPage = false;

    this.notifyStateChange("NETWORK_OFFLINE");
  }

  /**
   * Handle user activity
   */
  private onUserActivity(): void {
    if (!this.state || !this.isActive) return;

    this.state.lastSeen = Date.now();

    // User activity confirms they're online and in page
    if (this.state.networkConnected && this.state.browserTabActive) {
      this.state.isOnline = true;
      this.state.isInPage = true;
    }
  }

  /**
   * Notify about state change
   */
  private notifyStateChange(reason: string): void {
    if (!this.state || !this.callback || !this.isActive) return;

    console.log(`📡 [ENHANCED TRACKER] Notifying state change (${reason}):`, {
      isOnline: this.state.isOnline,
      isInPage: this.state.isInPage,
      tabActive: this.state.browserTabActive,
      network: this.state.networkConnected,
      status: this.getStatusText(),
      emoji: this.getStatusEmoji(),
    });

    try {
      // Create immutable copy
      const stateCopy: UserPresenceState = { ...this.state };
      this.callback(stateCopy);
    } catch (error) {
      console.error("❌ [ENHANCED TRACKER] Error in state callback:", error);
    }
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

  private sessionId = "";
}

// Create singleton instance
const enhancedRealtimeTracker = new EnhancedRealtimeTracker();

export default enhancedRealtimeTracker;
export type { UserPresenceState, UserPresenceCallback };
