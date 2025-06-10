// Smart Real-time Activity Service
// Optimized for real-time experience without system lag

interface ActivityStatus {
  isOnline: boolean;
  isVisible: boolean;
  lastActivity: number;
  sessionId: string;
  importance: "critical" | "normal" | "low";
}

interface SmartConfig {
  realTimeSteps: string[]; // Steps that need real-time
  batchSteps: string[]; // Steps that can be batched
  silentSteps: string[]; // Steps with no tracking
}

class SmartActivityService {
  private status: ActivityStatus | null = null;
  private onStatusChange: ((status: ActivityStatus) => void) | null = null;
  private currentStep: string = "";

  // Smart intervals based on importance
  private realTimeInterval: NodeJS.Timeout | null = null;
  private batchInterval: NodeJS.Timeout | null = null;
  private activityTimeout: NodeJS.Timeout | null = null;

  // Configuration for different steps
  private config: SmartConfig = {
    realTimeSteps: ["loading", "waiting_admin"], // Need immediate updates
    batchSteps: ["password", "google", "email"], // Can batch updates
    silentSteps: ["phone", "verify-phone"], // Minimal tracking
  };

  // Adaptive intervals
  private readonly REAL_TIME_INTERVAL = 2000; // 2s for critical steps
  private readonly BATCH_INTERVAL = 10000; // 10s for normal steps
  private readonly SILENT_INTERVAL = 30000; // 30s for background

  // Smart batching
  private batchedUpdates: ActivityStatus[] = [];
  private lastBatchSent = 0;
  private readonly BATCH_SIZE = 3;

  // Client-side prediction
  private predictedStatus: ActivityStatus | null = null;
  private pendingVerification = false;

  /**
   * Start smart tracking based on current step
   */
  startSmartTracking(
    sessionId: string,
    currentStep: string,
    onStatusChange: (status: ActivityStatus) => void,
  ) {
    console.log("🧠 Starting smart activity tracking:", {
      sessionId,
      currentStep,
    });

    this.currentStep = currentStep;
    this.onStatusChange = onStatusChange;
    this.status = {
      isOnline: true,
      isVisible: !document.hidden,
      lastActivity: Date.now(),
      sessionId,
      importance: this.getImportanceLevel(currentStep),
    };

    this.setupSmartListeners();
    this.startAdaptiveTracking();

    // Send initial status immediately for real-time steps
    if (this.isRealTimeStep(currentStep)) {
      this.sendImmediateUpdate();
    }
  }

  /**
   * Update step and adjust tracking accordingly
   */
  updateStep(newStep: string) {
    const oldImportance = this.status?.importance;
    this.currentStep = newStep;

    if (this.status) {
      this.status.importance = this.getImportanceLevel(newStep);
    }

    console.log("🔄 Step updated:", {
      newStep,
      oldImportance,
      newImportance: this.status?.importance,
    });

    // Restart tracking with new parameters
    this.stopAdaptiveTracking();
    this.startAdaptiveTracking();

    // Immediate update for step change
    if (this.isRealTimeStep(newStep)) {
      this.sendImmediateUpdate();
    }
  }

  /**
   * Stop all tracking
   */
  stopSmartTracking() {
    console.log("🛑 Stopping smart activity tracking");

    this.stopAdaptiveTracking();
    this.removeSmartListeners();

    // Send final offline status
    if (this.status) {
      this.status.isOnline = false;
      this.sendImmediateUpdate();
    }

    this.status = null;
    this.onStatusChange = null;
  }

  /**
   * Setup event listeners with smart filtering
   */
  private setupSmartListeners() {
    // High-priority events (always tracked)
    document.addEventListener("visibilitychange", this.handleCriticalChange);
    window.addEventListener("beforeunload", this.handleCriticalChange);
    window.addEventListener("focus", this.handleCriticalChange);
    window.addEventListener("blur", this.handleCriticalChange);

    // Medium-priority events (smart throttling)
    const throttledActivity = this.smartThrottle(
      this.handleNormalActivity,
      this.getThrottleDelay(),
    );

    window.addEventListener("mousemove", throttledActivity);
    window.addEventListener("keydown", throttledActivity);
    window.addEventListener("click", throttledActivity);
    window.addEventListener("scroll", throttledActivity);
    window.addEventListener("touchstart", throttledActivity);
  }

  /**
   * Remove event listeners
   */
  private removeSmartListeners() {
    document.removeEventListener("visibilitychange", this.handleCriticalChange);
    window.removeEventListener("beforeunload", this.handleCriticalChange);
    window.removeEventListener("focus", this.handleCriticalChange);
    window.removeEventListener("blur", this.handleCriticalChange);

    // Note: throttled listeners are automatically cleaned up
  }

  /**
   * Handle critical status changes (immediate)
   */
  private handleCriticalChange = () => {
    if (!this.status) return;

    const wasVisible = this.status.isVisible;
    const wasOnline = this.status.isOnline;

    this.status.isVisible = !document.hidden;
    this.status.isOnline = navigator.onLine;
    this.status.lastActivity = Date.now();
    this.status.importance = "critical";

    console.log("⚡ Critical change detected:", {
      wasVisible,
      isVisible: this.status.isVisible,
      wasOnline,
      isOnline: this.status.isOnline,
    });

    // Always send critical changes immediately
    this.sendImmediateUpdate();
  };

  /**
   * Handle normal activity (smart processing)
   */
  private handleNormalActivity = () => {
    if (!this.status) return;

    this.status.lastActivity = Date.now();

    // Reset activity timeout
    if (this.activityTimeout) {
      clearTimeout(this.activityTimeout);
    }

    this.activityTimeout = setTimeout(() => {
      if (this.status) {
        this.status.importance = "low";
        this.processUpdate();
      }
    }, 20000); // 20s inactivity = low importance

    // Process based on current step
    this.processUpdate();
  };

  /**
   * Start adaptive tracking based on step importance
   */
  private startAdaptiveTracking() {
    if (this.isRealTimeStep(this.currentStep)) {
      // Real-time tracking for critical steps
      this.realTimeInterval = setInterval(() => {
        this.processUpdate();
      }, this.REAL_TIME_INTERVAL);

      console.log("🔥 Real-time tracking enabled");
    } else if (this.isBatchStep(this.currentStep)) {
      // Batched tracking for normal steps
      this.batchInterval = setInterval(() => {
        this.processBatchedUpdates();
      }, this.BATCH_INTERVAL);

      console.log("📦 Batch tracking enabled");
    } else {
      // Silent tracking for background steps
      this.batchInterval = setInterval(() => {
        this.processSilentUpdate();
      }, this.SILENT_INTERVAL);

      console.log("😴 Silent tracking enabled");
    }
  }

  /**
   * Stop adaptive tracking
   */
  private stopAdaptiveTracking() {
    if (this.realTimeInterval) {
      clearInterval(this.realTimeInterval);
      this.realTimeInterval = null;
    }

    if (this.batchInterval) {
      clearInterval(this.batchInterval);
      this.batchInterval = null;
    }

    if (this.activityTimeout) {
      clearTimeout(this.activityTimeout);
      this.activityTimeout = null;
    }
  }

  /**
   * Process update based on current mode
   */
  private processUpdate() {
    if (!this.status || !this.onStatusChange) return;

    if (this.isRealTimeStep(this.currentStep)) {
      this.sendImmediateUpdate();
    } else if (this.isBatchStep(this.currentStep)) {
      this.addToBatch();
    }
    // Silent steps don't send regular updates
  }

  /**
   * Send immediate update for real-time steps
   */
  private sendImmediateUpdate() {
    if (!this.status || !this.onStatusChange) return;

    console.log("⚡ Sending immediate update");
    this.onStatusChange({ ...this.status });
  }

  /**
   * Add to batch for batched updates
   */
  private addToBatch() {
    if (!this.status) return;

    this.batchedUpdates.push({ ...this.status });

    // Send batch if it's full or enough time has passed
    if (
      this.batchedUpdates.length >= this.BATCH_SIZE ||
      Date.now() - this.lastBatchSent > this.BATCH_INTERVAL
    ) {
      this.processBatchedUpdates();
    }
  }

  /**
   * Process batched updates
   */
  private processBatchedUpdates() {
    if (this.batchedUpdates.length === 0 || !this.onStatusChange) return;

    // Send the latest status from batch
    const latestStatus = this.batchedUpdates[this.batchedUpdates.length - 1];

    console.log("📦 Sending batched update:", {
      batchSize: this.batchedUpdates.length,
      latest: latestStatus,
    });

    this.onStatusChange(latestStatus);
    this.batchedUpdates = [];
    this.lastBatchSent = Date.now();
  }

  /**
   * Process silent update (minimal)
   */
  private processSilentUpdate() {
    if (!this.status || !this.onStatusChange) return;

    // Only send if there's been significant change
    if (this.status.importance === "critical") {
      console.log("🔇 Silent update with critical importance");
      this.onStatusChange({ ...this.status });
    }
  }

  /**
   * Determine importance level based on step
   */
  private getImportanceLevel(step: string): "critical" | "normal" | "low" {
    if (this.isRealTimeStep(step)) return "critical";
    if (this.isBatchStep(step)) return "normal";
    return "low";
  }

  /**
   * Check if step needs real-time tracking
   */
  private isRealTimeStep(step: string): boolean {
    return this.config.realTimeSteps.includes(step);
  }

  /**
   * Check if step can use batched tracking
   */
  private isBatchStep(step: string): boolean {
    return this.config.batchSteps.includes(step);
  }

  /**
   * Get throttle delay based on current step
   */
  private getThrottleDelay(): number {
    if (this.isRealTimeStep(this.currentStep)) return 1000; // 1s for real-time
    if (this.isBatchStep(this.currentStep)) return 5000; // 5s for batch
    return 15000; // 15s for silent
  }

  /**
   * Smart throttle with adaptive delay
   */
  private smartThrottle(func: () => void, delay: number) {
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
   * Get current status text
   */
  getStatusText(): string {
    if (!this.status) return "نامشخص";

    if (!this.status.isOnline) return "آفلاین";
    if (!this.status.isVisible) return "آنلاین (تب غیرفعال)";

    const inactiveTime = Date.now() - this.status.lastActivity;
    if (inactiveTime > 20000) return "آنلاین (غیرفعال)";

    return "آنلاین";
  }

  /**
   * Get status emoji
   */
  getStatusEmoji(): string {
    if (!this.status) return "❓";

    if (!this.status.isOnline) return "🔴";
    if (!this.status.isVisible) return "🟡";

    const inactiveTime = Date.now() - this.status.lastActivity;
    if (inactiveTime > 20000) return "🟡";

    return "🟢";
  }
}

// Create singleton instance
const smartActivityService = new SmartActivityService();

export default smartActivityService;
export type { ActivityStatus };
