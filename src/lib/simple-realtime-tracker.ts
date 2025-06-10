// Simple Real-time Activity Tracker
// Direct implementation that actually works

interface SimpleActivityState {
  isOnline: boolean;
  isVisible: boolean;
  isActive: boolean;
  lastActivity: number;
  sessionId: string;
}

class SimpleRealtimeTracker {
  private state: SimpleActivityState | null = null;
  private callback: ((state: SimpleActivityState) => void) | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private activityTimeout: NodeJS.Timeout | null = null;
  private isTracking = false;

  /**
   * Start simple real-time tracking
   */
  start(sessionId: string, callback: (state: SimpleActivityState) => void) {
    console.log("🚀 Starting simple real-time tracker for:", sessionId);

    this.callback = callback;
    this.isTracking = true;

    // Initialize state
    this.state = {
      isOnline: navigator.onLine,
      isVisible: !document.hidden,
      isActive: true,
      lastActivity: Date.now(),
      sessionId,
    };

    // Setup direct event listeners
    this.setupDirectListeners();

    // Start monitoring
    this.startMonitoring();

    // Send initial state immediately
    this.sendUpdate();
  }

  /**
   * Stop tracking
   */
  stop() {
    console.log("🛑 Stopping simple real-time tracker");

    this.isTracking = false;
    this.removeDirectListeners();
    this.stopMonitoring();

    // Send final offline state
    if (this.state && this.callback) {
      this.state.isOnline = false;
      this.state.isActive = false;
      this.sendUpdate();
    }

    this.state = null;
    this.callback = null;
  }

  /**
   * Get current status text
   */
  getStatusText(): string {
    if (!this.state) return "نامشخص";

    if (!this.state.isOnline) return "آفلاین";
    if (!this.state.isVisible) return "آنلاین (تب غیرفعال)";
    if (!this.state.isActive) return "آنلاین (غیرفعال)";

    return "آنلاین";
  }

  /**
   * Get status emoji
   */
  getStatusEmoji(): string {
    if (!this.state) return "❓";

    if (!this.state.isOnline) return "🔴";
    if (!this.state.isVisible) return "🟡";
    if (!this.state.isActive) return "🟡";

    return "🟢";
  }

  /**
   * Setup direct event listeners
   */
  private setupDirectListeners() {
    // Visibility change - most important
    document.addEventListener("visibilitychange", this.handleVisibilityChange);

    // Window focus/blur
    window.addEventListener("focus", this.handleWindowFocus);
    window.addEventListener("blur", this.handleWindowBlur);

    // Network status
    window.addEventListener("online", this.handleNetworkOnline);
    window.addEventListener("offline", this.handleNetworkOffline);

    // User activity
    window.addEventListener("mousemove", this.handleUserActivity);
    window.addEventListener("keydown", this.handleUserActivity);
    window.addEventListener("click", this.handleUserActivity);
    window.addEventListener("scroll", this.handleUserActivity);
    window.addEventListener("touchstart", this.handleUserActivity);

    // Page unload
    window.addEventListener("beforeunload", this.handleBeforeUnload);

    console.log("✅ Direct event listeners setup");
  }

  /**
   * Remove direct event listeners
   */
  private removeDirectListeners() {
    document.removeEventListener(
      "visibilitychange",
      this.handleVisibilityChange,
    );
    window.removeEventListener("focus", this.handleWindowFocus);
    window.removeEventListener("blur", this.handleWindowBlur);
    window.removeEventListener("online", this.handleNetworkOnline);
    window.removeEventListener("offline", this.handleNetworkOffline);
    window.removeEventListener("mousemove", this.handleUserActivity);
    window.removeEventListener("keydown", this.handleUserActivity);
    window.removeEventListener("click", this.handleUserActivity);
    window.removeEventListener("scroll", this.handleUserActivity);
    window.removeEventListener("touchstart", this.handleUserActivity);
    window.removeEventListener("beforeunload", this.handleBeforeUnload);

    console.log("🧹 Direct event listeners removed");
  }

  /**
   * Start monitoring
   */
  private startMonitoring() {
    // Simple heartbeat every 2 seconds
    this.heartbeatInterval = setInterval(() => {
      if (this.isTracking) {
        this.checkAndUpdate();
      }
    }, 2000);

    console.log("💓 Simple monitoring started");
  }

  /**
   * Stop monitoring
   */
  private stopMonitoring() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.activityTimeout) {
      clearTimeout(this.activityTimeout);
      this.activityTimeout = null;
    }

    console.log("💤 Simple monitoring stopped");
  }

  /**
   * Handle visibility change - CRITICAL
   */
  private handleVisibilityChange = () => {
    if (!this.state || !this.isTracking) return;

    const wasVisible = this.state.isVisible;
    this.state.isVisible = !document.hidden;
    this.state.lastActivity = Date.now();

    console.log("👁️ VISIBILITY CHANGED:", {
      wasVisible,
      isVisible: this.state.isVisible,
      hidden: document.hidden,
    });

    // IMMEDIATE update for visibility changes
    this.sendUpdate();
  };

  /**
   * Handle window focus
   */
  private handleWindowFocus = () => {
    if (!this.state || !this.isTracking) return;

    this.state.isVisible = true;
    this.state.isActive = true;
    this.state.lastActivity = Date.now();

    console.log("🎯 WINDOW FOCUSED");
    this.sendUpdate();
  };

  /**
   * Handle window blur
   */
  private handleWindowBlur = () => {
    if (!this.state || !this.isTracking) return;

    this.state.isVisible = false;
    this.state.lastActivity = Date.now();

    console.log("😑 WINDOW BLURRED");
    this.sendUpdate();
  };

  /**
   * Handle network online
   */
  private handleNetworkOnline = () => {
    if (!this.state || !this.isTracking) return;

    this.state.isOnline = true;

    console.log("🌐 NETWORK ONLINE");
    this.sendUpdate();
  };

  /**
   * Handle network offline
   */
  private handleNetworkOffline = () => {
    if (!this.state || !this.isTracking) return;

    this.state.isOnline = false;

    console.log("📴 NETWORK OFFLINE");
    this.sendUpdate();
  };

  /**
   * Handle user activity
   */
  private handleUserActivity = () => {
    if (!this.state || !this.isTracking) return;

    this.state.lastActivity = Date.now();
    this.state.isActive = true;

    // Reset activity timeout
    if (this.activityTimeout) {
      clearTimeout(this.activityTimeout);
    }

    // Set new timeout for inactivity
    this.activityTimeout = setTimeout(() => {
      if (this.state && this.isTracking) {
        this.state.isActive = false;
        console.log("😴 USER INACTIVE");
        this.sendUpdate();
      }
    }, 15000); // 15 seconds inactivity
  };

  /**
   * Handle before unload
   */
  private handleBeforeUnload = () => {
    if (!this.state || !this.isTracking) return;

    this.state.isOnline = false;
    this.state.isActive = false;

    console.log("🚫 PAGE UNLOADING");
    this.sendUpdate();
  };

  /**
   * Check and update state
   */
  private checkAndUpdate() {
    if (!this.state) return;

    // Verify state consistency
    const actuallyVisible = !document.hidden;
    const actuallyOnline = navigator.onLine;

    let stateChanged = false;

    if (this.state.isVisible !== actuallyVisible) {
      console.log("🔧 FIXING VISIBILITY STATE:", {
        stored: this.state.isVisible,
        actual: actuallyVisible,
      });
      this.state.isVisible = actuallyVisible;
      stateChanged = true;
    }

    if (this.state.isOnline !== actuallyOnline) {
      console.log("🔧 FIXING ONLINE STATE:", {
        stored: this.state.isOnline,
        actual: actuallyOnline,
      });
      this.state.isOnline = actuallyOnline;
      stateChanged = true;
    }

    // Check for inactivity
    const timeSinceActivity = Date.now() - this.state.lastActivity;
    const shouldBeActive = timeSinceActivity < 15000;

    if (this.state.isActive !== shouldBeActive) {
      console.log("🔧 FIXING ACTIVITY STATE:", {
        stored: this.state.isActive,
        shouldBe: shouldBeActive,
        timeSinceActivity,
      });
      this.state.isActive = shouldBeActive;
      stateChanged = true;
    }

    // Send update if state changed
    if (stateChanged) {
      this.sendUpdate();
    }
  }

  /**
   * Send update immediately
   */
  private sendUpdate() {
    if (!this.state || !this.callback || !this.isTracking) return;

    console.log("📡 SENDING UPDATE:", {
      isOnline: this.state.isOnline,
      isVisible: this.state.isVisible,
      isActive: this.state.isActive,
      statusText: this.getStatusText(),
      statusEmoji: this.getStatusEmoji(),
    });

    try {
      this.callback({ ...this.state });
    } catch (error) {
      console.error("❌ Error sending update:", error);
    }
  }
}

// Create singleton instance
const simpleRealtimeTracker = new SimpleRealtimeTracker();

export default simpleRealtimeTracker;
export type { SimpleActivityState };
