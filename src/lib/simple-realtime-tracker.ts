// Simple Real-time Activity Tracker - DEBUGGED VERSION
// Direct implementation with comprehensive error handling and detailed logging

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
  private debugMode = true; // Enable debug mode
  private lastSentState: string | null = null; // Track last sent state to prevent duplicates

  /**
   * Start simple real-time tracking
   */
  start(sessionId: string, callback: (state: SimpleActivityState) => void) {
    this.debug("🚀 Starting simple real-time tracker", { sessionId });

    // Validate inputs
    if (!sessionId) {
      console.error("❌ Invalid sessionId provided to tracker");
      return;
    }

    if (!callback || typeof callback !== "function") {
      console.error("❌ Invalid callback provided to tracker");
      return;
    }

    this.callback = callback;
    this.isTracking = true;

    // Initialize state with current browser state
    this.state = {
      isOnline: navigator.onLine,
      isVisible: !document.hidden,
      isActive: true,
      lastActivity: Date.now(),
      sessionId,
    };

    this.debug("📊 Initial state:", this.state);

    // Setup direct event listeners with error handling
    this.setupDirectListeners();

    // Start monitoring with error recovery
    this.startMonitoring();

    // Send initial state immediately
    this.sendUpdate("INITIAL");
  }

  /**
   * Stop tracking
   */
  stop() {
    this.debug("🛑 Stopping simple real-time tracker");

    this.isTracking = false;
    this.removeDirectListeners();
    this.stopMonitoring();

    // Send final offline state
    if (this.state && this.callback) {
      this.state.isOnline = false;
      this.state.isActive = false;
      this.sendUpdate("FINAL");
    }

    this.state = null;
    this.callback = null;
    this.lastSentState = null;
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
   * Debug logging
   */
  private debug(message: string, data?: any) {
    if (this.debugMode) {
      console.log(`[TRACKER] ${message}`, data || "");
    }
  }

  /**
   * Setup direct event listeners with comprehensive error handling
   */
  private setupDirectListeners() {
    try {
      // Visibility change - most critical for online/offline detection
      document.addEventListener(
        "visibilitychange",
        this.handleVisibilityChange,
        { passive: true },
      );
      this.debug("✅ Visibility change listener added");

      // Window focus/blur - secondary indicators
      window.addEventListener("focus", this.handleWindowFocus, {
        passive: true,
      });
      window.addEventListener("blur", this.handleWindowBlur, { passive: true });
      this.debug("✅ Window focus/blur listeners added");

      // Network status - hardware level
      window.addEventListener("online", this.handleNetworkOnline, {
        passive: true,
      });
      window.addEventListener("offline", this.handleNetworkOffline, {
        passive: true,
      });
      this.debug("✅ Network status listeners added");

      // User activity - activity tracking
      const activityEvents = [
        "mousemove",
        "keydown",
        "click",
        "scroll",
        "touchstart",
      ];
      activityEvents.forEach((event) => {
        window.addEventListener(event, this.handleUserActivity, {
          passive: true,
        });
      });
      this.debug("✅ Activity listeners added", { events: activityEvents });

      // Page unload - cleanup
      window.addEventListener("beforeunload", this.handleBeforeUnload);
      this.debug("✅ Unload listener added");

      this.debug("✅ ALL event listeners setup successfully");
    } catch (error) {
      console.error("❌ Error setting up event listeners:", error);
    }
  }

  /**
   * Remove direct event listeners with error handling
   */
  private removeDirectListeners() {
    try {
      document.removeEventListener(
        "visibilitychange",
        this.handleVisibilityChange,
      );
      window.removeEventListener("focus", this.handleWindowFocus);
      window.removeEventListener("blur", this.handleWindowBlur);
      window.removeEventListener("online", this.handleNetworkOnline);
      window.removeEventListener("offline", this.handleNetworkOffline);

      const activityEvents = [
        "mousemove",
        "keydown",
        "click",
        "scroll",
        "touchstart",
      ];
      activityEvents.forEach((event) => {
        window.removeEventListener(event, this.handleUserActivity);
      });

      window.removeEventListener("beforeunload", this.handleBeforeUnload);

      this.debug("🧹 All event listeners removed successfully");
    } catch (error) {
      console.error("❌ Error removing event listeners:", error);
    }
  }

  /**
   * Start monitoring with error recovery
   */
  private startMonitoring() {
    try {
      // Very frequent heartbeat for real-time updates - 1 second
      this.heartbeatInterval = setInterval(() => {
        if (this.isTracking) {
          this.checkAndUpdate();
        }
      }, 1000); // 1 second for true real-time

      this.debug("💓 Real-time monitoring started (1s interval)");
    } catch (error) {
      console.error("❌ Error starting monitoring:", error);
    }
  }

  /**
   * Stop monitoring
   */
  private stopMonitoring() {
    try {
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }

      if (this.activityTimeout) {
        clearTimeout(this.activityTimeout);
        this.activityTimeout = null;
      }

      this.debug("💤 Monitoring stopped successfully");
    } catch (error) {
      console.error("❌ Error stopping monitoring:", error);
    }
  }

  /**
   * Handle visibility change - CRITICAL EVENT
   */
  private handleVisibilityChange = () => {
    try {
      if (!this.state || !this.isTracking) return;

      const wasVisible = this.state.isVisible;
      const isNowVisible = !document.hidden;

      this.state.isVisible = isNowVisible;
      this.state.lastActivity = Date.now();

      this.debug("👁️ VISIBILITY CHANGED", {
        wasVisible,
        isNowVisible,
        documentHidden: document.hidden,
        timestamp: new Date().toLocaleTimeString(),
      });

      // IMMEDIATE update for visibility changes - this is critical for real-time
      this.sendUpdate("VISIBILITY_CHANGE");
    } catch (error) {
      console.error("❌ Error in visibility change handler:", error);
    }
  };

  /**
   * Handle window focus
   */
  private handleWindowFocus = () => {
    try {
      if (!this.state || !this.isTracking) return;

      this.state.isVisible = true;
      this.state.isActive = true;
      this.state.lastActivity = Date.now();

      this.debug("🎯 WINDOW FOCUSED", {
        timestamp: new Date().toLocaleTimeString(),
      });

      this.sendUpdate("WINDOW_FOCUS");
    } catch (error) {
      console.error("❌ Error in window focus handler:", error);
    }
  };

  /**
   * Handle window blur
   */
  private handleWindowBlur = () => {
    try {
      if (!this.state || !this.isTracking) return;

      this.state.isVisible = false;
      this.state.lastActivity = Date.now();

      this.debug("😑 WINDOW BLURRED", {
        timestamp: new Date().toLocaleTimeString(),
      });

      this.sendUpdate("WINDOW_BLUR");
    } catch (error) {
      console.error("❌ Error in window blur handler:", error);
    }
  };

  /**
   * Handle network online
   */
  private handleNetworkOnline = () => {
    try {
      if (!this.state || !this.isTracking) return;

      this.state.isOnline = true;

      this.debug("🌐 NETWORK ONLINE", {
        timestamp: new Date().toLocaleTimeString(),
      });

      this.sendUpdate("NETWORK_ONLINE");
    } catch (error) {
      console.error("❌ Error in network online handler:", error);
    }
  };

  /**
   * Handle network offline
   */
  private handleNetworkOffline = () => {
    try {
      if (!this.state || !this.isTracking) return;

      this.state.isOnline = false;

      this.debug("📴 NETWORK OFFLINE", {
        timestamp: new Date().toLocaleTimeString(),
      });

      this.sendUpdate("NETWORK_OFFLINE");
    } catch (error) {
      console.error("❌ Error in network offline handler:", error);
    }
  };

  /**
   * Handle user activity
   */
  private handleUserActivity = () => {
    try {
      if (!this.state || !this.isTracking) return;

      this.state.lastActivity = Date.now();

      if (!this.state.isActive) {
        this.state.isActive = true;
        this.debug("🔋 USER ACTIVE AGAIN", {
          timestamp: new Date().toLocaleTimeString(),
        });
        this.sendUpdate("USER_ACTIVE");
      }

      // Reset activity timeout
      if (this.activityTimeout) {
        clearTimeout(this.activityTimeout);
      }

      // Set new timeout for inactivity (shorter for better real-time detection)
      this.activityTimeout = setTimeout(() => {
        if (this.state && this.isTracking) {
          this.state.isActive = false;
          this.debug("😴 USER INACTIVE", {
            timestamp: new Date().toLocaleTimeString(),
          });
          this.sendUpdate("USER_INACTIVE");
        }
      }, 10000); // 10 seconds inactivity (was 15)
    } catch (error) {
      console.error("❌ Error in user activity handler:", error);
    }
  };

  /**
   * Handle before unload
   */
  private handleBeforeUnload = () => {
    try {
      if (!this.state || !this.isTracking) return;

      this.state.isOnline = false;
      this.state.isActive = false;

      this.debug("🚫 PAGE UNLOADING", {
        timestamp: new Date().toLocaleTimeString(),
      });

      this.sendUpdate("PAGE_UNLOAD");
    } catch (error) {
      console.error("❌ Error in before unload handler:", error);
    }
  };

  /**
   * Check and update state with comprehensive validation
   */
  private checkAndUpdate() {
    try {
      if (!this.state) return;

      // Get current actual browser state
      const actuallyVisible = !document.hidden;
      const actuallyOnline = navigator.onLine;
      const timeSinceActivity = Date.now() - this.state.lastActivity;
      const shouldBeActive = timeSinceActivity < 10000; // 10 seconds

      let stateChanged = false;
      const changes = [];

      // Check visibility consistency
      if (this.state.isVisible !== actuallyVisible) {
        this.debug("🔧 FIXING VISIBILITY STATE", {
          stored: this.state.isVisible,
          actual: actuallyVisible,
        });
        this.state.isVisible = actuallyVisible;
        changes.push("visibility");
        stateChanged = true;
      }

      // Check online consistency
      if (this.state.isOnline !== actuallyOnline) {
        this.debug("🔧 FIXING ONLINE STATE", {
          stored: this.state.isOnline,
          actual: actuallyOnline,
        });
        this.state.isOnline = actuallyOnline;
        changes.push("online");
        stateChanged = true;
      }

      // Check activity consistency
      if (this.state.isActive !== shouldBeActive) {
        this.debug("🔧 FIXING ACTIVITY STATE", {
          stored: this.state.isActive,
          shouldBe: shouldBeActive,
          timeSinceActivity,
        });
        this.state.isActive = shouldBeActive;
        changes.push("activity");
        stateChanged = true;
      }

      // Send update if state changed
      if (stateChanged) {
        this.sendUpdate(`CONSISTENCY_CHECK: ${changes.join(", ")}`);
      }
    } catch (error) {
      console.error("❌ Error in check and update:", error);
    }
  }

  /**
   * Send update immediately with deduplication
   */
  private sendUpdate(reason: string) {
    try {
      if (!this.state || !this.callback || !this.isTracking) {
        this.debug("⚠️ Cannot send update - missing state/callback/tracking", {
          hasState: !!this.state,
          hasCallback: !!this.callback,
          isTracking: this.isTracking,
        });
        return;
      }

      // Create state signature for deduplication
      const currentStateSignature = JSON.stringify({
        isOnline: this.state.isOnline,
        isVisible: this.state.isVisible,
        isActive: this.state.isActive,
        statusText: this.getStatusText(),
        statusEmoji: this.getStatusEmoji(),
      });

      // Skip if identical to last sent state
      if (this.lastSentState === currentStateSignature) {
        this.debug("⏭️ Skipping duplicate state", { reason });
        return;
      }

      this.debug("📡 SENDING UPDATE", {
        reason,
        isOnline: this.state.isOnline,
        isVisible: this.state.isVisible,
        isActive: this.state.isActive,
        statusText: this.getStatusText(),
        statusEmoji: this.getStatusEmoji(),
        timestamp: new Date().toLocaleTimeString(),
      });

      // Store current state as last sent
      this.lastSentState = currentStateSignature;

      // Send the update
      this.callback({ ...this.state });

      this.debug("✅ Update sent successfully");
    } catch (error) {
      console.error("❌ Error sending update:", error);
    }
  }
}

// Create singleton instance
const simpleRealtimeTracker = new SimpleRealtimeTracker();

export default simpleRealtimeTracker;
export type { SimpleActivityState };
