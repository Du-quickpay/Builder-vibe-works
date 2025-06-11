// مدیریت Global وضعیت حضور کاربر برای همه فرم‌ها
// Global Presence Manager for all forms

import optimizedPresenceTracker, {
  type OptimizedPresenceState,
  type PresenceChangeType,
} from "./optimized-presence-tracker";
import smartStatusManager from "./smart-status-manager";

export interface GlobalPresenceState {
  // وضعیت اصلی حضور
  isOnline: boolean;
  presenceLevel: "online" | "idle" | "away" | "offline";
  lastActivity: number;
  lastSeen: number;

  // وضعیت تایپ
  isTyping: boolean;
  typingInField: string | null; // نام فیلد در حال تایپ
  lastTypingActivity: number;

  // اطلاعات جلسه
  sessionId: string | null;
  currentForm: string | null; // نام فرم فعلی

  // آمار
  totalForms: number;
  activeForms: string[];
}

export interface PresenceSubscriber {
  id: string;
  formName: string;
  callback: (state: GlobalPresenceState) => void;
}

export interface TypingEvent {
  sessionId: string;
  formName: string;
  fieldName: string;
  isTyping: boolean;
  timestamp: number;
}

class GlobalPresenceManager {
  private state: GlobalPresenceState;
  private subscribers: Map<string, PresenceSubscriber> = new Map();
  private typingTimer: NodeJS.Timeout | null = null;
  private isInitialized = false;

  // تنظیمات
  private readonly TYPING_TIMEOUT = 3000; // 3 ثانیه بعد از توقف تایپ
  private readonly TYPING_THROTTLE = 1000; // حداکثر یک بار در ثانیه ارسال تایپ
  private lastTypingSent = 0;

  constructor() {
    this.state = {
      isOnline: false,
      presenceLevel: "offline",
      lastActivity: Date.now(),
      lastSeen: Date.now(),
      isTyping: false,
      typingInField: null,
      lastTypingActivity: 0,
      sessionId: null,
      currentForm: null,
      totalForms: 0,
      activeForms: [],
    };
  }

  /**
   * مقداردهی اولیه سیستم
   */
  initialize(sessionId: string): void {
    if (this.isInitialized) {
      this.cleanup();
    }

    console.log("🌍 [GLOBAL PRESENCE] مقداردهی اولیه برای جلسه:", sessionId);

    this.state.sessionId = sessionId;
    this.isInitialized = true;

    // شروع ردیابی حضور
    optimizedPresenceTracker.start(
      sessionId,
      this.handlePresenceChange.bind(this),
    );
  }

  /**
   * ثبت فرم جدید
   */
  registerForm(
    formName: string,
    callback: (state: GlobalPresenceState) => void,
  ): string {
    const subscriberId = `${formName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const subscriber: PresenceSubscriber = {
      id: subscriberId,
      formName,
      callback,
    };

    this.subscribers.set(subscriberId, subscriber);

    // به‌روزرسانی آمار فرم‌ها
    this.updateFormStats();

    console.log(
      `📋 [GLOBAL PRESENCE] فرم ${formName} ثبت شد (ID: ${subscriberId.slice(-8)})`,
    );

    // ارسال وضعیت فعلی به فرم جدید
    callback(this.state);

    return subscriberId;
  }

  /**
   * لغو ثبت فرم
   */
  unregisterForm(subscriberId: string): void {
    const subscriber = this.subscribers.get(subscriberId);
    if (subscriber) {
      this.subscribers.delete(subscriberId);
      this.updateFormStats();
      console.log(`📋 [GLOBAL PRESENCE] فرم ${subscriber.formName} لغو ثبت شد`);
    }
  }

  /**
   * تنظیم فرم فعلی
   */
  setCurrentForm(formName: string): void {
    if (this.state.currentForm !== formName) {
      this.state.currentForm = formName;
      console.log(`📋 [GLOBAL PRESENCE] فرم فعلی: ${formName}`);
      this.notifySubscribers();
    }
  }

  /**
   * شروع تایپ در فیلد
   */
  startTyping(formName: string, fieldName: string): void {
    const now = Date.now();
    const wasTyping = this.state.isTyping;

    // به‌روزرسانی وضعیت تایپ
    this.state.isTyping = true;
    this.state.typingInField = fieldName;
    this.state.lastTypingActivity = now;
    this.state.currentForm = formName;

    // پاک کردن تایمر قبلی
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
    }

    // تنظیم تایمر جدید برای توقف تایپ
    this.typingTimer = setTimeout(() => {
      this.stopTyping();
    }, this.TYPING_TIMEOUT);

    // ارسال به تلگرام (با throttling)
    if (!wasTyping || now - this.lastTypingSent > this.TYPING_THROTTLE) {
      this.sendTypingStatusToTelegram(true, formName, fieldName);
      this.lastTypingSent = now;
    }

    // اطلاع به subscribers
    this.notifySubscribers();

    console.log(`⌨️ [GLOBAL PRESENCE] شروع تایپ در ${formName}.${fieldName}`);
  }

  /**
   * توقف تایپ
   */
  stopTyping(): void {
    if (!this.state.isTyping) return;

    console.log("⌨️ [GLOBAL PRESENCE] توقف تایپ");

    const formName = this.state.currentForm;
    const fieldName = this.state.typingInField;

    this.state.isTyping = false;
    this.state.typingInField = null;

    // پاک کردن تایمر
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
      this.typingTimer = null;
    }

    // ارسال به تلگرام
    if (formName && fieldName) {
      this.sendTypingStatusToTelegram(false, formName, fieldName);
    }

    // اطلاع به subscribers
    this.notifySubscribers();
  }

  /**
   * دریافت وضعیت فعلی
   */
  getCurrentState(): GlobalPresenceState {
    return { ...this.state };
  }

  /**
   * دریافت متن وضعیت به فارسی
   */
  getStatusText(): string {
    if (
      this.state.isTyping &&
      this.state.currentForm &&
      this.state.typingInField
    ) {
      return `در حال تایپ در ${this.state.currentForm}`;
    }

    return optimizedPresenceTracker.getStatusText();
  }

  /**
   * دریافت ایموجی وضعیت
   */
  getStatusEmoji(): string {
    if (this.state.isTyping) {
      return "⌨️";
    }

    return optimizedPresenceTracker.getStatusEmoji();
  }

  /**
   * مدیریت تغییرات حضور از OptimizedPresenceTracker
   */
  private async handlePresenceChange(
    presenceState: OptimizedPresenceState,
    changeType: PresenceChangeType,
  ): Promise<void> {
    // به‌روزرسانی وضعیت
    this.state.isOnline = presenceState.isOnline;
    this.state.presenceLevel = presenceState.presenceLevel;
    this.state.lastActivity = presenceState.lastActivity;
    this.state.lastSeen = presenceState.lastHeartbeat;

    // ارسال به تلگرام از طریق SmartStatusManager
    if (this.state.sessionId) {
      await smartStatusManager.sendStatusUpdate(
        this.state.sessionId,
        presenceState,
        changeType,
        this.getStatusText(),
        this.getStatusEmoji(),
        {
          isTyping: this.state.isTyping,
          field: this.state.isTyping ? this.state.typingInField : undefined,
        },
      );
    }

    // اطلاع به تمام فرم‌ها
    this.notifySubscribers();

    console.log(`🌍 [GLOBAL PRESENCE] تغییر وضعیت: ${changeType}`, {
      presenceLevel: this.state.presenceLevel,
      isOnline: this.state.isOnline,
      isTyping: this.state.isTyping,
      currentForm: this.state.currentForm,
      activeForms: this.state.activeForms.length,
    });
  }

  /**
   * ارسال وضعیت تایپ به تلگرام
   */
  private async sendTypingStatusToTelegram(
    isTyping: boolean,
    formName: string,
    fieldName: string,
  ): Promise<void> {
    if (!this.state.sessionId) return;

    try {
      // ایجاد متن خاص برای تایپ
      const typingText = isTyping
        ? `در حال تایپ در ${formName} (${fieldName})`
        : optimizedPresenceTracker.getStatusText();

      const typingEmoji = isTyping
        ? "⌨️"
        : optimizedPresenceTracker.getStatusEmoji();

      // ایجاد state موقت برای ارسال
      const currentPresenceState = optimizedPresenceTracker.getCurrentState();
      if (currentPresenceState) {
        await smartStatusManager.sendStatusUpdate(
          this.state.sessionId,
          currentPresenceState,
          "activity",
          typingText,
          typingEmoji,
          {
            isTyping,
            field: isTyping ? `${formName} (${fieldName})` : undefined,
          },
        );
      }

      console.log(
        `⌨️ [GLOBAL PRESENCE] وضعیت تایپ ارسال شد: ${isTyping ? "شروع" : "توقف"}`,
      );
    } catch (error) {
      console.error("❌ [GLOBAL PRESENCE] خطا در ارسال وضعیت تایپ:", error);
    }
  }

  /**
   * اطلاع‌رسانی به تمام subscribers
   */
  private notifySubscribers(): void {
    this.subscribers.forEach((subscriber) => {
      try {
        subscriber.callback(this.state);
      } catch (error) {
        console.error(
          `❌ [GLOBAL PRESENCE] خطا در اطلاع‌رسانی به ${subscriber.formName}:`,
          error,
        );
      }
    });
  }

  /**
   * به‌روزرسانی آمار فرم‌ها
   */
  private updateFormStats(): void {
    const activeForms = Array.from(
      new Set(Array.from(this.subscribers.values()).map((s) => s.formName)),
    );

    this.state.totalForms = this.subscribers.size;
    this.state.activeForms = activeForms;
  }

  /**
   * دریافت آمار عملکرد
   */
  getPerformanceStats(): {
    subscribers: number;
    activeForms: string[];
    isTyping: boolean;
    currentForm: string | null;
    presenceLevel: string;
    lastActivity: string;
  } {
    return {
      subscribers: this.subscribers.size,
      activeForms: this.state.activeForms,
      isTyping: this.state.isTyping,
      currentForm: this.state.currentForm,
      presenceLevel: this.state.presenceLevel,
      lastActivity: new Date(this.state.lastActivity).toLocaleString("fa-IR"),
    };
  }

  /**
   * پاکسازی منابع
   */
  cleanup(): void {
    console.log("🧹 [GLOBAL PRESENCE] شروع پاکسازی");

    // توقف تایپ
    this.stopTyping();

    // توقف ردیابی حضور
    optimizedPresenceTracker.stop();

    // پاکسازی subscribers
    this.subscribers.clear();

    // پاکسازی تاریخچه
    if (this.state.sessionId) {
      smartStatusManager.clearSessionHistory(this.state.sessionId);
    }

    // بازنشانی وضعیت
    this.state = {
      isOnline: false,
      presenceLevel: "offline",
      lastActivity: Date.now(),
      lastSeen: Date.now(),
      isTyping: false,
      typingInField: null,
      lastTypingActivity: 0,
      sessionId: null,
      currentForm: null,
      totalForms: 0,
      activeForms: [],
    };

    this.isInitialized = false;

    console.log("🧹 [GLOBAL PRESENCE] پاکسازی کامل شد");
  }
}

// ایجاد instance singleton
export const globalPresenceManager = new GlobalPresenceManager();

// Export
export default globalPresenceManager;
