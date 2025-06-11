// سیستم Real-time ردیابی حضور کاربر
// High-Performance Real-time Presence Tracker

import {
  updateUserOnlineStatus,
  getSession,
} from "./telegram-service-enhanced";
import { isAdmin, validateAdminAccess } from "./admin-control";

export type PresenceStatus = "online" | "away" | "offline";

export interface PresenceState {
  status: PresenceStatus;
  isVisible: boolean;
  isOnline: boolean;
  hasInternet: boolean;
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

class RealtimePresenceTracker {
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

  // تنظیمات بهینه
  private readonly HEARTBEAT_INTERVAL = 10000; // 10 ثانیه
  private readonly TYPING_TIMEOUT = 2000; // 2 ثانیه
  private readonly ACTIVITY_TIMEOUT = 30000; // 30 ثانیه
  private readonly MIN_UPDATE_INTERVAL = 3000; // 3 ثانیه

  /**
   * شروع ردیابی Real-time
   */
  start(sessionId: string): void {
    if (this.isTracking) {
      this.stop();
    }

    // بررسی وجود session
    const session = getSession(sessionId);
    if (!session) {
      console.warn(
        "⚠️ [REALTIME TRACKER] Session یافت نشد، ردیابی شروع نمی‌شود:",
        sessionId,
      );
      return;
    }

    console.log("🚀 [REALTIME TRACKER] شروع ردیابی:", sessionId);

    this.state = {
      status: "online",
      isVisible: !document.hidden,
      isOnline: navigator.onLine,
      hasInternet: navigator.onLine,
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
   * توقف ردیابی
   */
  stop(): void {
    if (!this.isTracking) return;

    console.log("🛑 [REALTIME TRACKER] توقف ردیابی");

    this.isTracking = false;
    this.cleanup();

    if (this.state) {
      this.state.status = "offline";
      this.sendToTelegram();
    }
  }

  /**
   * شروع تایپ
   */
  startTyping(form: string, field: string): void {
    if (!this.isTracking) return;

    const now = Date.now();

    // throttling برای جلوگیری از spam
    if (now - this.typingState.lastTyping < 1000) return;

    this.typingState = {
      isTyping: true,
      field,
      form,
      lastTyping: now,
    };

    this.updateActivity();
    this.sendToTelegram();

    // تنظیم timer برای auto-stop
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
    }

    this.typingTimer = setTimeout(() => {
      this.stopTyping();
    }, this.TYPING_TIMEOUT);
  }

  /**
   * توقف تایپ
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
   * ثبت listener برای تغییرات
   */
  addListener(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * دریافت وضعیت فعلی
   */
  getState(): PresenceState | null {
    return this.state ? { ...this.state } : null;
  }

  /**
   * دریافت وضعیت تایپ
   */
  getTypingState(): TypingState {
    return { ...this.typingState };
  }

  /**
   * دریافت متن وضعیت
   */
  getStatusText(): string {
    if (!this.state) return "آفلاین";

    if (this.typingState.isTyping && this.typingState.form) {
      return `در حال تایپ در ${this.typingState.form}`;
    }

    switch (this.state.status) {
      case "online":
        return "آنلاین";
      case "away":
        return "غیرفعال";
      case "offline":
        return "آفلاین";
      default:
        return "آفلاین";
    }
  }

  /**
   * دریافت ایموجی وضعیت
   */
  getStatusEmoji(): string {
    if (!this.state) return "🔴";

    if (this.typingState.isTyping) return "⌨️";

    if (!this.state.hasInternet) return "📵";

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
   * تنظیم Event Listeners
   */
  private setupEventListeners(): void {
    // visibility change
    document.addEventListener("visibilitychange", this.handleVisibilityChange);

    // focus/blur
    window.addEventListener("focus", this.handleFocus);
    window.addEventListener("blur", this.handleBlur);

    // activity events
    const activityEvents = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
    ];
    activityEvents.forEach((event) => {
      document.addEventListener(event, this.handleActivity, { passive: true });
    });

    // network events
    window.addEventListener("online", this.handleOnline);
    window.addEventListener("offline", this.handleOffline);

    // beforeunload
    window.addEventListener("beforeunload", this.handleBeforeUnload);
  }

  /**
   * حذف Event Listeners
   */
  private cleanup(): void {
    document.removeEventListener(
      "visibilitychange",
      this.handleVisibilityChange,
    );
    window.removeEventListener("focus", this.handleFocus);
    window.removeEventListener("blur", this.handleBlur);

    const activityEvents = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
    ];
    activityEvents.forEach((event) => {
      document.removeEventListener(event, this.handleActivity);
    });

    window.removeEventListener("online", this.handleOnline);
    window.removeEventListener("offline", this.handleOffline);
    window.removeEventListener("beforeunload", this.handleBeforeUnload);

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
   * شروع Heartbeat
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.checkActivityTimeout();
      this.sendToTelegram();
    }, this.HEARTBEAT_INTERVAL);
  }

  /**
   * Event Handlers
   */
  private handleVisibilityChange = (): void => {
    if (!this.state) return;

    this.state.isVisible = !document.hidden;
    this.updateActivity();
    this.updateStatus();
  };

  private handleFocus = (): void => {
    this.updateActivity();
    this.updateStatus();
  };

  private handleBlur = (): void => {
    this.updateStatus();
  };

  private handleActivity = (): void => {
    this.updateActivity();
  };

  private handleOnline = (): void => {
    if (!this.state) return;

    this.state.isOnline = true;
    this.state.hasInternet = true;
    this.updateActivity();
    this.updateStatus();
  };

  private handleOffline = (): void => {
    if (!this.state) return;

    this.state.isOnline = false;
    this.state.hasInternet = false;
    this.updateStatus();
  };

  private handleBeforeUnload = (): void => {
    if (this.state) {
      this.state.status = "offline";
      this.sendToTelegram();
    }
  };

  /**
   * به‌روزرسانی فعالیت
   */
  private updateActivity(): void {
    if (!this.state) return;

    this.state.lastActivity = Date.now();
    this.updateStatus();
  }

  /**
   * بررسی timeout فعالیت
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
   * به‌روزرسانی وضعیت
   */
  private updateStatus(): void {
    if (!this.state) return;

    const oldStatus = this.state.status;
    const now = Date.now();

    // تعیین وضعیت جدید
    if (!this.state.isOnline || !this.state.hasInternet) {
      this.state.status = "offline";
    } else if (!this.state.isVisible) {
      this.state.status = "away";
    } else if (now - this.state.lastActivity > this.ACTIVITY_TIMEOUT) {
      this.state.status = "away";
    } else {
      this.state.status = "online";
    }

    // ارسال به تلگرام در صورت تغییر یا گذشت زمان کافی
    const shouldSend =
      oldStatus !== this.state.status ||
      now - this.state.lastUpdate > this.MIN_UPDATE_INTERVAL;

    if (shouldSend) {
      this.state.lastUpdate = now;
      this.sendToTelegram();
    }

    // اطلاع به listeners
    this.notifyListeners();
  }

  /**
   * ارسال به تلگرام
   */
  private async sendToTelegram(): Promise<void> {
    if (!this.state) return;

    // بررسی وجود session
    const session = getSession(this.state.sessionId);
    if (!session) {
      console.warn(
        "⚠️ [REALTIME TRACKER] Session منقضی شده، ردیابی متوقف می‌شود:",
        this.state.sessionId,
      );
      this.stop();
      return;
    }

    // بررسی دسترسی ادمین
    const adminAccess = validateAdminAccess();
    if (!adminAccess.hasAccess) return;

    // جلوگیری از ارسال مکرر همان وضعیت
    if (
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

      console.log("✅ [REALTIME TRACKER] وضعیت ارسال شد:", {
        status: this.state.status,
        isTyping: this.typingState.isTyping,
        statusText,
      });
    } catch (error) {
      console.error("❌ [REALTIME TRACKER] خطا در ارسال:", error);
    }
  }

  /**
   * اطلاع‌رسانی به listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach((callback) => {
      try {
        callback();
      } catch (error) {
        console.error("❌ [REALTIME TRACKER] خطا در listener:", error);
      }
    });
  }
}

// ایجاد instance واحد
const realtimePresenceTracker = new RealtimePresenceTracker();

export default realtimePresenceTracker;
