// سیستم بهینه شده تشخیص حضور کاربر - Optimized Presence Tracker
// بهترین عملکرد با حداقل استفاده از API تلگرام

export interface OptimizedPresenceState {
  isOnline: boolean;
  isActive: boolean;
  isVisible: boolean;
  hasNetworkConnection: boolean;
  lastActivity: number;
  lastHeartbeat: number;
  sessionId: string;
  presenceLevel: "online" | "idle" | "away" | "offline";
}

export interface PresenceChangeCallback {
  (state: OptimizedPresenceState, changeType: PresenceChangeType): void;
}

export type PresenceChangeType =
  | "initial"
  | "activity"
  | "visibility"
  | "network"
  | "idle"
  | "heartbeat"
  | "manual"
  | "cleanup";

// کلاس مدیریت تایمرها برای بهینه‌سازی عملکرد
class TimerManager {
  private timers = new Map<string, NodeJS.Timeout>();

  set(key: string, callback: () => void, delay: number): void {
    this.clear(key);
    this.timers.set(key, setTimeout(callback, delay));
  }

  clear(key: string): void {
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
  }

  clearAll(): void {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
  }
}

// کلاس مدیریت Rate Limiting هوشمند
class SmartRateLimiter {
  private changeHistory: number[] = [];
  private lastChange = 0;
  private changeCount = 0;

  // تنظیمات Rate Limiting
  private readonly MIN_INTERVAL = 3000; // حداقل 3 ثانیه بین تغییرات
  private readonly MAX_CHANGES_PER_MINUTE = 8; // حداکثر 8 تغییر در دقیقه
  private readonly BURST_ALLOWANCE = 2; // اجازه 2 تغییر سریع در ابتدا

  canChange(changeType: PresenceChangeType): boolean {
    const now = Date.now();

    // تمیز کردن تاریخچه قدیمی (بیش از 1 دقیقه)
    this.changeHistory = this.changeHistory.filter(
      (time) => now - time < 60000,
    );

    // تغییرات مهم همیشه مجاز هستند
    if (["initial", "cleanup", "network"].includes(changeType)) {
      this.recordChange(now);
      return true;
    }

    // اجازه تغییرات سریع در ابتدا (Burst)
    if (this.changeHistory.length < this.BURST_ALLOWANCE) {
      this.recordChange(now);
      return true;
    }

    // بررسی حداقل فاصله زمانی
    if (now - this.lastChange < this.MIN_INTERVAL) {
      return false;
    }

    // بررسی حداکثر تعداد تغییرات در دقیقه
    if (this.changeHistory.length >= this.MAX_CHANGES_PER_MINUTE) {
      return false;
    }

    this.recordChange(now);
    return true;
  }

  private recordChange(timestamp: number): void {
    this.lastChange = timestamp;
    this.changeHistory.push(timestamp);
    this.changeCount++;
  }

  getStats(): {
    totalChanges: number;
    changesInLastMinute: number;
    timeSinceLastChange: number;
  } {
    const now = Date.now();
    return {
      totalChanges: this.changeCount,
      changesInLastMinute: this.changeHistory.length,
      timeSinceLastChange: now - this.lastChange,
    };
  }
}

// کلاس اصلی بهینه شده تشخیص حض��ر
class OptimizedPresenceTracker {
  private state: OptimizedPresenceState | null = null;
  private callback: PresenceChangeCallback | null = null;
  private isTracking = false;

  // مدیریت تایمر و Rate Limiting
  private timers = new TimerManager();
  private rateLimiter = new SmartRateLimiter();

  // تنظیمات زمانی بهینه
  private readonly HEARTBEAT_INTERVAL = 15000; // هر 15 ثانیه
  private readonly IDLE_TIMEOUT = 60000; // 1 دقیقه برای idle
  private readonly AWAY_TIMEOUT = 300000; // 5 دقیقه برای away
  private readonly ACTIVITY_DEBOUNCE = 2000; // 2 ثانیه debounce برای فعالیت

  // Event Handlers با بهینه‌سازی
  private boundHandlers = {
    visibilityChange: this.handleVisibilityChange.bind(this),
    windowFocus: this.handleWindowFocus.bind(this),
    windowBlur: this.handleWindowBlur.bind(this),
    beforeUnload: this.handleBeforeUnload.bind(this),
    networkOnline: this.handleNetworkOnline.bind(this),
    networkOffline: this.handleNetworkOffline.bind(this),
    userActivity: this.debounce(
      this.handleUserActivity.bind(this),
      this.ACTIVITY_DEBOUNCE,
    ),
  };

  /**
   * شروع ردیابی حضور کاربر
   */
  start(sessionId: string, callback: PresenceChangeCallback): void {
    console.log("🚀 [OPTIMIZED TRACKER] شروع ردیابی برای جلسه:", sessionId);

    if (this.isTracking) {
      this.stop();
    }

    this.callback = callback;
    this.isTracking = true;

    // تنظیم وضعیت اولیه
    this.state = {
      isOnline: true,
      isActive: true,
      isVisible: !document.hidden,
      hasNetworkConnection: navigator.onLine,
      lastActivity: Date.now(),
      lastHeartbeat: Date.now(),
      sessionId,
      presenceLevel: "online",
    };

    this.setupEventListeners();
    this.startHeartbeat();
    this.updatePresenceLevel();

    // ارسال وضعیت اولیه
    this.notifyChange("initial");
  }

  /**
   * توقف ردیابی
   */
  stop(): void {
    console.log("🛑 [OPTIMIZED TRACKER] توقف ردیابی");

    if (this.state) {
      this.state.isOnline = false;
      this.state.isActive = false;
      this.state.presenceLevel = "offline";
      this.notifyChange("cleanup");
    }

    this.cleanup();
  }

  /**
   * دریافت وضعیت فعلی
   */
  getCurrentState(): OptimizedPresenceState | null {
    return this.state ? { ...this.state } : null;
  }

  /**
   * دریافت متن وضعیت به فارسی
   */
  getStatusText(): string {
    if (!this.state) return "نامشخص";

    switch (this.state.presenceLevel) {
      case "online":
        return "آنلاین";
      case "idle":
        return "غیرفعال";
      case "away":
        return "دور از صفحه";
      case "offline":
        return "آفلاین";
      default:
        return "نامشخص";
    }
  }

  /**
   * دریافت ایموجی وضعیت
   */
  getStatusEmoji(): string {
    if (!this.state) return "❓";

    if (!this.state.hasNetworkConnection) return "📵";

    switch (this.state.presenceLevel) {
      case "online":
        return "🟢";
      case "idle":
        return "🟡";
      case "away":
        return "🟠";
      case "offline":
        return "🔴";
      default:
        return "❓";
    }
  }

  /**
   * تنظیم Event Listeners
   */
  private setupEventListeners(): void {
    // رویدادهای مرورگر
    document.addEventListener(
      "visibilitychange",
      this.boundHandlers.visibilityChange,
    );
    window.addEventListener("focus", this.boundHandlers.windowFocus);
    window.addEventListener("blur", this.boundHandlers.windowBlur);
    window.addEventListener("beforeunload", this.boundHandlers.beforeUnload);

    // رویدادهای شبکه
    window.addEventListener("online", this.boundHandlers.networkOnline);
    window.addEventListener("offline", this.boundHandlers.networkOffline);

    // رویدادهای فعالیت کاربر
    const activityEvents = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];
    activityEvents.forEach((event) => {
      document.addEventListener(event, this.boundHandlers.userActivity, {
        passive: true,
      });
    });

    console.log("✅ [OPTIMIZED TRACKER] Event Listeners راه‌اندازی شد");
  }

  /**
   * حذف Event Listeners
   */
  private removeEventListeners(): void {
    document.removeEventListener(
      "visibilitychange",
      this.boundHandlers.visibilityChange,
    );
    window.removeEventListener("focus", this.boundHandlers.windowFocus);
    window.removeEventListener("blur", this.boundHandlers.windowBlur);
    window.removeEventListener("beforeunload", this.boundHandlers.beforeUnload);
    window.removeEventListener("online", this.boundHandlers.networkOnline);
    window.removeEventListener("offline", this.boundHandlers.networkOffline);

    const activityEvents = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];
    activityEvents.forEach((event) => {
      document.removeEventListener(event, this.boundHandlers.userActivity);
    });

    console.log("🧹 [OPTIMIZED TRACKER] Event Listeners حذف شد");
  }

  /**
   * شروع Heartbeat
   */
  private startHeartbeat(): void {
    this.timers.set(
      "heartbeat",
      () => {
        if (this.state && this.isTracking) {
          this.state.lastHeartbeat = Date.now();
          this.updatePresenceLevel();

          // فقط در صورت آنلاین بودن heartbeat ارسال شود
          if (this.state.presenceLevel !== "offline") {
            this.notifyChange("heartbeat");
          }

          this.startHeartbeat(); // ادامه heartbeat
        }
      },
      this.HEARTBEAT_INTERVAL,
    );

    console.log(
      `💓 [OPTIMIZED TRACKER] Heartbeat شروع شد (هر ${this.HEARTBEAT_INTERVAL / 1000} ثانیه)`,
    );
  }

  /**
   * به‌روزرسانی سطح حضور بر اساس شرایط مختلف
   */
  private updatePresenceLevel(): void {
    if (!this.state) return;

    const now = Date.now();
    const timeSinceActivity = now - this.state.lastActivity;

    let newLevel: OptimizedPresenceState["presenceLevel"];

    // بررسی اتصال شبکه
    if (!this.state.hasNetworkConnection) {
      newLevel = "offline";
    }
    // بررسی نمایان بودن صفحه
    else if (!this.state.isVisible) {
      newLevel = "offline";
    }
    // بررسی فعالیت اخیر
    else if (timeSinceActivity < this.IDLE_TIMEOUT) {
      newLevel = "online";
    } else if (timeSinceActivity < this.AWAY_TIMEOUT) {
      newLevel = "idle";
    } else {
      newLevel = "away";
    }

    // به‌روزرسانی وضعیت در صورت تغییر
    if (this.state.presenceLevel !== newLevel) {
      const oldLevel = this.state.presenceLevel;
      this.state.presenceLevel = newLevel;
      this.state.isOnline = newLevel === "online";
      this.state.isActive = newLevel === "online" || newLevel === "idle";

      console.log(
        `🔄 [OPTIMIZED TRACKER] تغییر سطح حضور: ${oldLevel} → ${newLevel}`,
      );
    }
  }

  /**
   * Event Handlers
   */
  private handleVisibilityChange(): void {
    if (!this.state) return;

    const isVisible = !document.hidden;
    this.state.isVisible = isVisible;

    console.log(
      `👁️ [OPTIMIZED TRACKER] تغییر نمایان بودن: ${isVisible ? "نمایان" : "مخفی"}`,
    );

    if (isVisible) {
      this.state.lastActivity = Date.now();
    }

    this.updatePresenceLevel();
    this.notifyChange("visibility");
  }

  private handleWindowFocus(): void {
    if (!this.state) return;

    console.log("🎯 [OPTIMIZED TRACKER] فوکوس پنجره");

    this.state.isVisible = true;
    this.state.lastActivity = Date.now();
    this.updatePresenceLevel();
    this.notifyChange("visibility");
  }

  private handleWindowBlur(): void {
    if (!this.state) return;

    console.log("😑 [OPTIMIZED TRACKER] عدم فوکوس پنجره");

    this.state.isVisible = false;
    this.updatePresenceLevel();
    this.notifyChange("visibility");
  }

  private handleBeforeUnload(): void {
    console.log("⚠️ [OPTIMIZED TRACKER] آماده‌سازی برای خروج از صفحه");

    if (this.state) {
      this.state.isOnline = false;
      this.state.isActive = false;
      this.state.presenceLevel = "offline";
      this.notifyChange("cleanup");
    }
  }

  private handleNetworkOnline(): void {
    if (!this.state) return;

    console.log("🌐 [OPTIMIZED TRACKER] اتصال شبکه برقرار شد");

    this.state.hasNetworkConnection = true;
    this.state.lastActivity = Date.now();
    this.updatePresenceLevel();
    this.notifyChange("network");
  }

  private handleNetworkOffline(): void {
    if (!this.state) return;

    console.log("📵 [OPTIMIZED TRACKER] اتصال شبکه قطع شد");

    this.state.hasNetworkConnection = false;
    this.updatePresenceLevel();
    this.notifyChange("network");
  }

  private handleUserActivity(): void {
    if (!this.state || !this.state.isVisible) return;

    const now = Date.now();
    const wasIdle = this.state.presenceLevel !== "online";

    this.state.lastActivity = now;
    this.updatePresenceLevel();

    // فقط در صورت تغییر از idle به active اطلاع دهیم
    if (wasIdle && this.state.presenceLevel === "online") {
      console.log("🎮 [OPTIMIZED TRACKER] کاربر مجدداً فعال شد");
      this.notifyChange("activity");
    }
  }

  /**
   * اطلاع‌رسانی تغییرات با Rate Limiting
   */
  private notifyChange(changeType: PresenceChangeType): void {
    if (!this.callback || !this.state) return;

    // بررسی Rate Limiting
    if (!this.rateLimiter.canChange(changeType)) {
      const stats = this.rateLimiter.getStats();
      console.log(
        `⏱️ [OPTIMIZED TRACKER] تغییر محدود شد - آخرین تغییر: ${stats.timeSinceLastChange}ms پیش`,
      );
      return;
    }

    console.log(`📡 [OPTIMIZED TRACKER] ارسال تغییر (${changeType}):`, {
      level: this.state.presenceLevel,
      online: this.state.isOnline,
      visible: this.state.isVisible,
      network: this.state.hasNetworkConnection,
    });

    try {
      this.callback(this.state, changeType);
    } catch (error) {
      console.error("❌ [OPTIMIZED TRACKER] خطا در callback:", error);
    }
  }

  /**
   * پاکسازی منابع
   */
  private cleanup(): void {
    this.isTracking = false;
    this.timers.clearAll();
    this.removeEventListeners();
    this.state = null;
    this.callback = null;

    console.log("🧹 [OPTIMIZED TRACKER] پاکسازی کامل انجام شد");
  }

  /**
   * Debounce utility
   */
  private debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number,
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;

    return (...args: Parameters<T>) => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  /**
   * دریافت آمار عملکرد
   */
  getPerformanceStats(): {
    rateLimiter: ReturnType<SmartRateLimiter["getStats"]>;
    isTracking: boolean;
    currentLevel: string;
    timeSinceLastActivity: number;
  } {
    return {
      rateLimiter: this.rateLimiter.getStats(),
      isTracking: this.isTracking,
      currentLevel: this.state?.presenceLevel || "unknown",
      timeSinceLastActivity: this.state
        ? Date.now() - this.state.lastActivity
        : 0,
    };
  }
}

// ایجاد instance بهینه شده
const optimizedPresenceTracker = new OptimizedPresenceTracker();

// Export
export { optimizedPresenceTracker };
export default optimizedPresenceTracker;
