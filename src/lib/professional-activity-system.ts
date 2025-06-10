// Professional Real-time Activity System
// Enterprise-grade tracking with perfect accuracy and zero lag

interface ActivityState {
  isOnline: boolean;
  isVisible: boolean;
  isActive: boolean;
  lastActivity: number;
  sessionId: string;
  connectionQuality: "excellent" | "good" | "poor";
  browserSupport: "full" | "partial" | "limited";
}

interface ActivityConfig {
  enableRealTime: boolean;
  updateInterval: number;
  criticalEventsOnly: boolean;
  debugMode: boolean;
}

class ProfessionalActivitySystem {
  private state: ActivityState | null = null;
  private callback: ((state: ActivityState) => void) | null = null;
  private config: ActivityConfig;

  // Real-time monitoring
  private monitoringInterval: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private activityCheckInterval: NodeJS.Timeout | null = null;

  // Event tracking
  private lastEventTime = 0;
  private eventCount = 0;
  private isInitialized = false;

  // Performance optimization
  private updateQueue: ActivityState[] = [];
  private lastUpdateSent = 0;
  private isUpdating = false;

  // Browser feature detection
  private features = {
    visibilityAPI: typeof document.hidden !== "undefined",
    pageLifecycle: "onpagehide" in window,
    beacon: typeof navigator.sendBeacon === "function",
    observerAPI: typeof IntersectionObserver !== "undefined",
  };

  constructor(config: Partial<ActivityConfig> = {}) {
    this.config = {
      enableRealTime: true,
      updateInterval: 1000, // 1 second for real-time
      criticalEventsOnly: false,
      debugMode: false,
      ...config,
    };

    this.detectBrowserCapabilities();
    this.initializeSystem();
  }

  /**
   * Start professional tracking
   */
  startTracking(
    sessionId: string,
    callback: (state: ActivityState) => void,
    currentStep: string = "unknown",
  ) {
    this.log("🚀 Starting professional activity tracking", {
      sessionId,
      currentStep,
      features: this.features,
    });

    this.callback = callback;
    this.state = {
      isOnline: navigator.onLine,
      isVisible: !document.hidden,
      isActive: true,
      lastActivity: Date.now(),
      sessionId,
      connectionQuality: this.detectConnectionQuality(),
      browserSupport: this.detectBrowserSupport(),
    };

    this.setupEventListeners();
    this.startMonitoring();
    this.isInitialized = true;

    // Send initial state immediately
    this.sendUpdate(true);
  }

  /**
   * Stop tracking
   */
  stopTracking() {
    this.log("🛑 Stopping professional activity tracking");

    this.cleanup();

    // Send final offline state
    if (this.state && this.callback) {
      this.state.isOnline = false;
      this.state.isActive = false;
      this.sendUpdate(true);
    }

    this.isInitialized = false;
    this.state = null;
    this.callback = null;
  }

  /**
   * Update current step (affects tracking behavior)
   */
  updateStep(step: string) {
    if (!this.state) return;

    this.log("📍 Step updated", { step });

    // Adjust configuration based on step
    this.adjustConfigForStep(step);

    // Force immediate update for step changes
    this.sendUpdate(true);
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
   * Initialize system capabilities
   */
  private initializeSystem() {
    this.log("🔧 Initializing professional activity system", {
      features: this.features,
      config: this.config,
    });

    // Test critical browser APIs
    this.testBrowserAPIs();
  }

  /**
   * Setup comprehensive event listeners
   */
  private setupEventListeners() {
    // Critical visibility events
    if (this.features.visibilityAPI) {
      document.addEventListener(
        "visibilitychange",
        this.handleVisibilityChange,
      );
    }

    // Window focus events
    window.addEventListener("focus", this.handleWindowFocus);
    window.addEventListener("blur", this.handleWindowBlur);

    // Network events
    window.addEventListener("online", this.handleNetworkOnline);
    window.addEventListener("offline", this.handleNetworkOffline);

    // Page lifecycle events
    if (this.features.pageLifecycle) {
      window.addEventListener("pagehide", this.handlePageHide);
      window.addEventListener("pageshow", this.handlePageShow);
    }

    // Unload events
    window.addEventListener("beforeunload", this.handleBeforeUnload);
    window.addEventListener("unload", this.handleUnload);

    // User activity events (optimized)
    const activityEvents = [
      "mousemove",
      "keydown",
      "click",
      "scroll",
      "touchstart",
    ];
    const throttledHandler = this.throttle(this.handleUserActivity, 500);

    activityEvents.forEach((event) => {
      window.addEventListener(event, throttledHandler, { passive: true });
    });

    this.log("✅ Event listeners setup complete");
  }

  /**
   * Remove all event listeners
   */
  private removeEventListeners() {
    if (this.features.visibilityAPI) {
      document.removeEventListener(
        "visibilitychange",
        this.handleVisibilityChange,
      );
    }

    window.removeEventListener("focus", this.handleWindowFocus);
    window.removeEventListener("blur", this.handleWindowBlur);
    window.removeEventListener("online", this.handleNetworkOnline);
    window.removeEventListener("offline", this.handleNetworkOffline);

    if (this.features.pageLifecycle) {
      window.removeEventListener("pagehide", this.handlePageHide);
      window.removeEventListener("pageshow", this.handlePageShow);
    }

    window.removeEventListener("beforeunload", this.handleBeforeUnload);
    window.removeEventListener("unload", this.handleUnload);

    this.log("🧹 Event listeners removed");
  }

  /**
   * Start real-time monitoring
   */
  private startMonitoring() {
    // Real-time state monitoring
    this.monitoringInterval = setInterval(() => {
      this.checkActivityState();
    }, this.config.updateInterval);

    // Heartbeat for connection verification
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 5000); // 5 second heartbeat

    // Activity validation
    this.activityCheckInterval = setInterval(() => {
      this.validateActivity();
    }, 10000); // 10 second activity check

    this.log("💓 Monitoring started");
  }

  /**
   * Stop monitoring
   */
  private stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.activityCheckInterval) {
      clearInterval(this.activityCheckInterval);
      this.activityCheckInterval = null;
    }

    this.log("💤 Monitoring stopped");
  }

  /**
   * Handle critical visibility changes
   */
  private handleVisibilityChange = () => {
    if (!this.state) return;

    const wasVisible = this.state.isVisible;
    this.state.isVisible = !document.hidden;
    this.state.lastActivity = Date.now();

    this.log("👁️ Visibility changed", {
      wasVisible,
      isVisible: this.state.isVisible,
      hidden: document.hidden,
    });

    // Critical event - send immediately
    this.sendUpdate(true);
  };

  /**
   * Handle window focus
   */
  private handleWindowFocus = () => {
    if (!this.state) return;

    this.state.isVisible = true;
    this.state.isActive = true;
    this.state.lastActivity = Date.now();

    this.log("🎯 Window focused");
    this.sendUpdate(true);
  };

  /**
   * Handle window blur
   */
  private handleWindowBlur = () => {
    if (!this.state) return;

    this.state.isVisible = false;
    this.state.lastActivity = Date.now();

    this.log("😑 Window blurred");
    this.sendUpdate(true);
  };

  /**
   * Handle network online
   */
  private handleNetworkOnline = () => {
    if (!this.state) return;

    this.state.isOnline = true;
    this.state.connectionQuality = this.detectConnectionQuality();

    this.log("🌐 Network online");
    this.sendUpdate(true);
  };

  /**
   * Handle network offline
   */
  private handleNetworkOffline = () => {
    if (!this.state) return;

    this.state.isOnline = false;
    this.state.connectionQuality = "poor";

    this.log("📴 Network offline");
    this.sendUpdate(true);
  };

  /**
   * Handle page hide
   */
  private handlePageHide = () => {
    if (!this.state) return;

    this.state.isVisible = false;
    this.state.isActive = false;

    this.log("🚪 Page hidden");
    this.sendBeaconUpdate();
  };

  /**
   * Handle page show
   */
  private handlePageShow = () => {
    if (!this.state) return;

    this.state.isVisible = true;
    this.state.isActive = true;
    this.state.lastActivity = Date.now();

    this.log("👋 Page shown");
    this.sendUpdate(true);
  };

  /**
   * Handle before unload
   */
  private handleBeforeUnload = () => {
    if (!this.state) return;

    this.state.isOnline = false;
    this.state.isActive = false;

    this.log("⚠️ Before unload");
    this.sendBeaconUpdate();
  };

  /**
   * Handle unload
   */
  private handleUnload = () => {
    if (!this.state) return;

    this.state.isOnline = false;
    this.state.isActive = false;

    this.log("🚫 Page unload");
    this.sendBeaconUpdate();
  };

  /**
   * Handle user activity
   */
  private handleUserActivity = () => {
    if (!this.state) return;

    this.state.lastActivity = Date.now();
    this.state.isActive = true;
    this.eventCount++;

    // Don't spam updates for regular activity
    if (!this.config.criticalEventsOnly) {
      this.queueUpdate();
    }
  };

  /**
   * Check current activity state
   */
  private checkActivityState() {
    if (!this.state) return;

    const now = Date.now();
    const timeSinceActivity = now - this.state.lastActivity;

    // Update active state based on recent activity
    const wasActive = this.state.isActive;
    this.state.isActive = timeSinceActivity < 30000; // 30 seconds

    // Update connection quality
    this.state.connectionQuality = this.detectConnectionQuality();

    // Send update if critical state changed
    if (wasActive !== this.state.isActive) {
      this.log("⚡ Activity state changed", {
        wasActive,
        isActive: this.state.isActive,
        timeSinceActivity,
      });
      this.sendUpdate(true);
    }
  }

  /**
   * Send heartbeat
   */
  private sendHeartbeat() {
    if (!this.state || !this.config.enableRealTime) return;

    this.log("💓 Heartbeat");
    this.queueUpdate();
  }

  /**
   * Validate activity
   */
  private validateActivity() {
    if (!this.state) return;

    // Validate state consistency
    if (document.hidden && this.state.isVisible) {
      this.log("🔧 Fixing visibility state");
      this.state.isVisible = false;
      this.sendUpdate(true);
    }

    if (!navigator.onLine && this.state.isOnline) {
      this.log("🔧 Fixing online state");
      this.state.isOnline = false;
      this.sendUpdate(true);
    }
  }

  /**
   * Queue update for batching
   */
  private queueUpdate() {
    if (!this.state) return;

    this.updateQueue.push({ ...this.state });

    // Process queue if it's getting full
    if (this.updateQueue.length >= 3) {
      this.processQueue();
    }
  }

  /**
   * Process update queue
   */
  private processQueue() {
    if (this.updateQueue.length === 0 || this.isUpdating) return;

    // Get latest state from queue
    const latestState = this.updateQueue[this.updateQueue.length - 1];
    this.updateQueue = [];

    this.sendUpdate(false, latestState);
  }

  /**
   * Send update
   */
  private sendUpdate(immediate: boolean = false, customState?: ActivityState) {
    if (!this.callback || this.isUpdating) return;

    const stateToSend = customState || this.state;
    if (!stateToSend) return;

    const now = Date.now();

    // Rate limiting for non-immediate updates
    if (!immediate && now - this.lastUpdateSent < this.config.updateInterval) {
      return;
    }

    this.isUpdating = true;
    this.lastUpdateSent = now;

    try {
      this.log("📡 Sending update", {
        immediate,
        state: stateToSend,
      });

      this.callback({ ...stateToSend });
    } catch (error) {
      this.log("❌ Error sending update", error);
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * Send beacon update for page unload
   */
  private sendBeaconUpdate() {
    if (!this.state || !this.features.beacon) return;

    try {
      const data = JSON.stringify({
        sessionId: this.state.sessionId,
        isOnline: false,
        isVisible: false,
        isActive: false,
        timestamp: Date.now(),
      });

      // Note: This would typically send to a server endpoint
      // navigator.sendBeacon('/api/activity', data);
      this.log("📡 Beacon update sent", data);
    } catch (error) {
      this.log("❌ Error sending beacon", error);
    }
  }

  /**
   * Detect browser capabilities
   */
  private detectBrowserCapabilities() {
    this.features = {
      visibilityAPI: typeof document.hidden !== "undefined",
      pageLifecycle: "onpagehide" in window,
      beacon: typeof navigator.sendBeacon === "function",
      observerAPI: typeof IntersectionObserver !== "undefined",
    };

    this.log("🔍 Browser capabilities detected", this.features);
  }

  /**
   * Test browser APIs
   */
  private testBrowserAPIs() {
    const tests = {
      visibilityAPI: () => typeof document.hidden !== "undefined",
      localStorage: () => typeof Storage !== "undefined",
      sessionStorage: () => typeof sessionStorage !== "undefined",
      webWorkers: () => typeof Worker !== "undefined",
      serviceWorkers: () => "serviceWorker" in navigator,
    };

    const results: Record<string, boolean> = {};
    for (const [test, func] of Object.entries(tests)) {
      try {
        results[test] = func();
      } catch {
        results[test] = false;
      }
    }

    this.log("🧪 API tests completed", results);
  }

  /**
   * Detect connection quality
   */
  private detectConnectionQuality(): "excellent" | "good" | "poor" {
    if (!navigator.onLine) return "poor";

    // Use Network Information API if available
    const connection = (navigator as any).connection;
    if (connection) {
      const downlink = connection.downlink;
      if (downlink >= 10) return "excellent";
      if (downlink >= 1.5) return "good";
      return "poor";
    }

    // Fallback based on response times
    if (this.lastEventTime > 0) {
      const responseTime = Date.now() - this.lastEventTime;
      if (responseTime < 100) return "excellent";
      if (responseTime < 500) return "good";
      return "poor";
    }

    return "good"; // Default assumption
  }

  /**
   * Detect browser support level
   */
  private detectBrowserSupport(): "full" | "partial" | "limited" {
    const requiredFeatures = ["visibilityAPI", "pageLifecycle", "beacon"];
    const supportedCount = requiredFeatures.filter(
      (feature) => this.features[feature as keyof typeof this.features],
    ).length;

    if (supportedCount === requiredFeatures.length) return "full";
    if (supportedCount >= 2) return "partial";
    return "limited";
  }

  /**
   * Adjust configuration based on step
   */
  private adjustConfigForStep(step: string) {
    const criticalSteps = ["loading", "waiting_admin"];
    const realTimeSteps = ["loading", "waiting_admin", "password", "google"];

    this.config.criticalEventsOnly = !criticalSteps.includes(step);
    this.config.enableRealTime = realTimeSteps.includes(step);

    if (criticalSteps.includes(step)) {
      this.config.updateInterval = 500; // 500ms for critical steps
    } else if (realTimeSteps.includes(step)) {
      this.config.updateInterval = 1000; // 1s for real-time steps
    } else {
      this.config.updateInterval = 5000; // 5s for other steps
    }

    this.log("⚙️ Configuration adjusted for step", {
      step,
      config: this.config,
    });
  }

  /**
   * Throttle function
   */
  private throttle(func: () => void, delay: number) {
    let timeoutId: NodeJS.Timeout | null = null;
    let lastExecTime = 0;

    return () => {
      const currentTime = Date.now();

      if (currentTime - lastExecTime > delay) {
        func.call(this);
        lastExecTime = currentTime;
      } else {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(
          () => {
            func.call(this);
            lastExecTime = Date.now();
          },
          delay - (currentTime - lastExecTime),
        );
      }
    };
  }

  /**
   * Cleanup resources
   */
  private cleanup() {
    this.stopMonitoring();
    this.removeEventListeners();
    this.updateQueue = [];
    this.isUpdating = false;
  }

  /**
   * Professional logging
   */
  private log(message: string, data?: any) {
    if (!this.config.debugMode) return;

    const timestamp = new Date().toISOString();
    const prefix = `[ActivitySystem ${timestamp}]`;

    if (data) {
      console.log(`${prefix} ${message}`, data);
    } else {
      console.log(`${prefix} ${message}`);
    }
  }
}

// Create singleton instance with debug mode
const professionalActivitySystem = new ProfessionalActivitySystem({
  debugMode: true,
  enableRealTime: true,
  updateInterval: 1000,
});

export default professionalActivitySystem;
export type { ActivityState, ActivityConfig };
