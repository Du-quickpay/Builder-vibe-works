// User Activity Tracking Service
// Tracks user online/offline status and page visibility in real-time

interface ActivityStatus {
  isOnline: boolean;
  isVisible: boolean;
  lastActivity: number;
  sessionId: string;
}

class UserActivityService {
  private status: ActivityStatus | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private activityTimeout: NodeJS.Timeout | null = null;
  private onStatusChange: ((status: ActivityStatus) => void) | null = null;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds - further optimized
  private readonly ACTIVITY_TIMEOUT = 30000; // 30 seconds without activity = inactive

  // Conservative rate limiting to prevent system overload
  private lastStatusUpdate = 0;
  private readonly MIN_UPDATE_INTERVAL = 15000; // Minimum 15 seconds between updates
  private readonly IMPORTANT_UPDATE_INTERVAL = 5000; // 5 seconds for important changes
  private pendingUpdate: NodeJS.Timeout | null = null;
  private lastStatusSent: string = "";
  private lastImportantUpdate = 0;
  private updateCount = 0; // Track total updates

  /**
   * Start tracking user activity for a session
   */
  startTracking(
    sessionId: string,
    onStatusChange: (status: ActivityStatus) => void,
  ) {
    console.log("🔍 Starting user activity tracking for session:", sessionId);

    this.onStatusChange = onStatusChange;
    this.status = {
      isOnline: true,
      isVisible: !document.hidden,
      lastActivity: Date.now(),
      sessionId,
    };

    this.setupEventListeners();
    this.startHeartbeat();

    // Send initial status with delay to prevent immediate spam
    setTimeout(() => {
      this.broadcastStatus();
    }, 2000);
  }

  /**
   * Stop tracking user activity
   */
  stopTracking() {
    console.log("🛑 Stopping user activity tracking");

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.activityTimeout) {
      clearTimeout(this.activityTimeout);
      this.activityTimeout = null;
    }

    if (this.pendingUpdate) {
      clearTimeout(this.pendingUpdate);
      this.pendingUpdate = null;
    }

    this.removeEventListeners();

    // Send offline status before stopping (but respect rate limiting)
    if (this.status) {
      this.status.isOnline = false;
      this.broadcastStatusImmediate(); // Only for final offline status
    }

    this.status = null;
    this.onStatusChange = null;
  }

  /**
   * Setup event listeners for activity tracking
   */
  private setupEventListeners() {
    // Page visibility changes (tab switching)
    document.addEventListener("visibilitychange", this.handleVisibilityChange);

    // User activity events (throttled)
    window.addEventListener("mousemove", this.throttledUserActivity);
    window.addEventListener("keydown", this.handleUserActivity);
    window.addEventListener("click", this.handleUserActivity);
    window.addEventListener("scroll", this.throttledUserActivity);
    window.addEventListener("touchstart", this.handleUserActivity);

    // Page unload (user closing tab/browser)
    window.addEventListener("beforeunload", this.handleBeforeUnload);
    window.addEventListener("unload", this.handleUnload);

    // Network status
    window.addEventListener("online", this.handleNetworkOnline);
    window.addEventListener("offline", this.handleNetworkOffline);

    // Focus events
    window.addEventListener("focus", this.handleWindowFocus);
    window.addEventListener("blur", this.handleWindowBlur);
  }

  /**
   * Remove event listeners
   */
  private removeEventListeners() {
    document.removeEventListener(
      "visibilitychange",
      this.handleVisibilityChange,
    );
    window.removeEventListener("mousemove", this.throttledUserActivity);
    window.removeEventListener("keydown", this.handleUserActivity);
    window.removeEventListener("click", this.handleUserActivity);
    window.removeEventListener("scroll", this.throttledUserActivity);
    window.removeEventListener("touchstart", this.handleUserActivity);
    window.removeEventListener("beforeunload", this.handleBeforeUnload);
    window.removeEventListener("unload", this.handleUnload);
    window.removeEventListener("online", this.handleNetworkOnline);
    window.removeEventListener("offline", this.handleNetworkOffline);
    window.removeEventListener("focus", this.handleWindowFocus);
    window.removeEventListener("blur", this.handleWindowBlur);
  }

  /**
   * Throttled user activity handler to prevent spam (optimized for performance)
   */
  private throttledUserActivity = this.throttle(
    () => this.handleUserActivity(),
    10000,
  );

  /**
   * Throttle function to limit event frequency
   */
  private throttle(func: () => void, delay: number) {
    let timeoutId: NodeJS.Timeout | null = null;
    let lastExecTime = 0;

    return () => {
      const currentTime = Date.now();

      if (currentTime - lastExecTime > delay) {
        func();
        lastExecTime = currentTime;
      } else {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(
          () => {
            func();
            lastExecTime = Date.now();
          },
          delay - (currentTime - lastExecTime),
        );
      }
    };
  }

  /**
   * Handle visibility change (tab switching)
   */
  private handleVisibilityChange = () => {
    if (!this.status) return;

    const wasVisible = this.status.isVisible;
    this.status.isVisible = !document.hidden;
    this.status.lastActivity = Date.now();

    console.log("👁️ Visibility changed:", {
      isVisible: this.status.isVisible,
      wasVisible,
      hidden: document.hidden,
    });

    // Visibility changes are critical - send immediately with minimal rate limiting
    this.broadcastImportantStatus();
  };

  /**
   * Handle user activity
   */
  private handleUserActivity = () => {
    if (!this.status) return;

    this.status.lastActivity = Date.now();

    // Reset activity timeout
    if (this.activityTimeout) {
      clearTimeout(this.activityTimeout);
    }

    // Set new timeout for inactivity
    this.activityTimeout = setTimeout(() => {
      if (this.status) {
        console.log("😴 User inactive for too long");
        this.broadcastStatus();
      }
    }, this.ACTIVITY_TIMEOUT);

    // Don't broadcast on every activity, let heartbeat handle it
  };

  /**
   * Handle before page unload
   */
  private handleBeforeUnload = () => {
    if (!this.status) return;

    console.log("🚪 User is leaving the page");
    this.status.isOnline = false;
    this.status.isVisible = false;

    // Try to send status synchronously
    this.sendStatusSync();
  };

  /**
   * Handle page unload
   */
  private handleUnload = () => {
    if (!this.status) return;

    this.status.isOnline = false;
    this.status.isVisible = false;
    this.sendStatusSync();
  };

  /**
   * Handle network online
   */
  private handleNetworkOnline = () => {
    if (!this.status) return;

    console.log("🌐 Network is back online");
    this.status.isOnline = true;
    this.broadcastImportantStatus(); // Network changes are critical
  };

  /**
   * Handle network offline
   */
  private handleNetworkOffline = () => {
    if (!this.status) return;

    console.log("🌐 Network went offline");
    this.status.isOnline = false;
    this.broadcastImportantStatus(); // Network changes are critical
  };

  /**
   * Handle window focus
   */
  private handleWindowFocus = () => {
    if (!this.status) return;

    console.log("🎯 Window gained focus");
    this.status.isVisible = true;
    this.status.lastActivity = Date.now();
    this.broadcastImportantStatus(); // Focus changes are critical
  };

  /**
   * Handle window blur
   */
  private handleWindowBlur = () => {
    if (!this.status) return;

    console.log("😑 Window lost focus");
    this.status.isVisible = false;
    this.broadcastImportantStatus(); // Focus changes are critical
  };

  /**
   * Start heartbeat to periodically send status
   */
  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.status && this.status.isOnline) {
        console.log("💓 Heartbeat - checking if status update needed");
        this.broadcastStatus();
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  /**
   * Broadcast important status changes with throttling
   */
  private broadcastImportantStatus() {
    if (!this.status || !this.onStatusChange) return;

    const currentStatusText = this.getStatusText();
    const now = Date.now();

    // Prevent excessive updates - max 10 per session
    if (this.updateCount > 10) {
      console.log("🛑 Update limit reached, skipping status broadcast");
      return;
    }

    // Check if status actually changed
    if (currentStatusText === this.lastStatusSent) {
      console.log(
        "📡 Important status unchanged, skipping:",
        currentStatusText,
      );
      return;
    }

    // Use rate limiting for important changes
    if (now - this.lastImportantUpdate < this.IMPORTANT_UPDATE_INTERVAL) {
      console.log("⚡ Important status rate limited, scheduling update");

      // Cancel any pending update
      if (this.pendingUpdate) {
        clearTimeout(this.pendingUpdate);
      }

      // Schedule with delay for important updates
      this.pendingUpdate = setTimeout(
        () => {
          this.broadcastStatusImmediate();
          this.pendingUpdate = null;
        },
        this.IMPORTANT_UPDATE_INTERVAL - (now - this.lastImportantUpdate),
      );

      return;
    }

    this.lastImportantUpdate = now;
    this.updateCount++;
    this.updateCount++;
    this.broadcastStatusImmediate();
  }

  /**
   * Broadcast status change with regular rate limiting
   */
  private broadcastStatus() {
    if (!this.status || !this.onStatusChange) return;

    const currentStatusText = this.getStatusText();
    const now = Date.now();

    // Check if status actually changed
    if (currentStatusText === this.lastStatusSent) {
      console.log(
        "📡 Status unchanged, skipping broadcast:",
        currentStatusText,
      );
      return;
    }

    // Check rate limiting for regular updates
    if (now - this.lastStatusUpdate < this.MIN_UPDATE_INTERVAL) {
      console.log("⏱️ Rate limited, scheduling status update");

      // Cancel any pending update
      if (this.pendingUpdate) {
        clearTimeout(this.pendingUpdate);
      }

      // Schedule update after rate limit period
      this.pendingUpdate = setTimeout(
        () => {
          this.broadcastStatusImmediate();
          this.pendingUpdate = null;
        },
        this.MIN_UPDATE_INTERVAL - (now - this.lastStatusUpdate),
      );

      return;
    }

    this.broadcastStatusImmediate();
  }

  /**
   * Broadcast status immediately (bypassing rate limiting)
   */
  private broadcastStatusImmediate() {
    if (!this.status || !this.onStatusChange) return;

    const statusCopy = { ...this.status };
    const statusText = this.getStatusText();

    console.log("📡 Broadcasting status:", {
      isOnline: statusCopy.isOnline,
      isVisible: statusCopy.isVisible,
      inactiveSince: Date.now() - statusCopy.lastActivity,
      statusText,
    });

    this.lastStatusUpdate = Date.now();
    this.lastStatusSent = statusText;
    this.onStatusChange(statusCopy);
  }

  /**
   * Send status synchronously (for page unload)
   */
  private sendStatusSync() {
    if (!this.status || !this.onStatusChange) return;

    try {
      // Use sendBeacon for reliable delivery during page unload
      const statusData = JSON.stringify({
        sessionId: this.status.sessionId,
        isOnline: false,
        isVisible: false,
        timestamp: Date.now(),
      });

      if (navigator.sendBeacon) {
        // This would be used with a server endpoint
        // navigator.sendBeacon('/api/user-status', statusData);
        console.log("📡 Would send beacon:", statusData);
      }

      // Also try the callback
      this.onStatusChange({
        ...this.status,
        isOnline: false,
        isVisible: false,
      });
    } catch (error) {
      console.error("❌ Failed to send sync status:", error);
    }
  }

  /**
   * Get current status
   */
  getCurrentStatus(): ActivityStatus | null {
    return this.status ? { ...this.status } : null;
  }

  /**
   * Get status text for display
   */
  getStatusText(): string {
    if (!this.status) return "نامشخص";

    if (!this.status.isOnline) {
      return "آفلاین";
    }

    if (!this.status.isVisible) {
      return "آنلاین (تب غیرفعال)";
    }

    // Check if user has been inactive
    const inactiveTime = Date.now() - this.status.lastActivity;
    if (inactiveTime > this.ACTIVITY_TIMEOUT) {
      return "آنلاین (غیرفعال)";
    }

    return "آنلاین";
  }

  /**
   * Get status emoji
   */
  getStatusEmoji(): string {
    if (!this.status) return "❓";

    if (!this.status.isOnline) {
      return "🔴"; // Offline
    }

    if (!this.status.isVisible) {
      return "🟡"; // Online but tab inactive
    }

    // Check if user has been inactive
    const inactiveTime = Date.now() - this.status.lastActivity;
    if (inactiveTime > this.ACTIVITY_TIMEOUT) {
      return "🟡"; // Online but inactive
    }

    return "🟢"; // Active
  }
}

// Create singleton instance
const userActivityService = new UserActivityService();

export default userActivityService;

// Export types
export type { ActivityStatus };
