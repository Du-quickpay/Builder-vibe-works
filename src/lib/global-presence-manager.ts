// مدیریت Global وضعیت حضور کاربر برای همه فرم‌ها
// Global Presence Manager for all forms

import optimizedPresenceTracker, {
  type OptimizedPresenceState,
  type PresenceChangeType,
} from "./optimized-presence-tracker";
import smartStatusManager from "./smart-status-manager";
import {
  isPresenceTrackingReady,
  safePresenceUpdate,
  safeTypingOperation,
} from "./safe-presence-operations";

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
      isOnline: true, // تنظیم اولیه بهتر: کاربر آنلاین فرض می‌شود
      presenceLevel: "online", // وضعیت اولیه آنل��ین
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

    // بررسی آمادگی session برای presence tracking
    if (!isPresenceTrackingReady(sessionId)) {
      console.warn(
        "⚠️ [GLOBAL PRESENCE] Session برای presence tracking آماده نیست",
      );
      return;
    }

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
   * حذف فرم
   */
  unregisterForm(subscriberId: string): void {
    const subscriber = this.subscribers.get(subscriberId);
    if (subscriber) {
      this.subscribers.delete(subscriberId);
      this.updateFormStats();

      console.log(
        `📋 [GLOBAL PRESENCE] فرم ${subscriber.formName} حذف شد (ID: ${subscriberId.slice(-8)})`,
      );
    }
  }

  /**
   * تنظیم فرم فعلی
   */
  setCurrentForm(formName: string): void {
    this.state.currentForm = formName;
    console.log(`📋 [GLOBAL PRESENCE] فرم فعلی: ${formName}`);
  }

  /**
   * شروع تایپ در فیلد مشخص
   */
  startTyping(formName: string, fieldName: string): void {
    // بررسی آمادگی session
    if (
      !this.state.sessionId ||
      !isPresenceTrackingReady(this.state.sessionId)
    ) {
      console.log(
        "⚠️ [GLOBAL PRESENCE] شروع تایپ متوقف شد: session آماده نیست",
      );
      return;
    }

    // بررسی throttle
    const now = Date.now();
    if (now - this.lastTypingSent < this.TYPING_THROTTLE) {
      return;
    }

    this.state.isTyping = true;
    this.state.typingInField = fieldName;
    this.state.lastTypingActivity = now;
    this.lastTypingSent = now;

    // تنظیم فرم فعلی
    this.state.currentForm = formName;

    // ارسال ایمن به تلگرام
    safeTypingOperation(this.state.sessionId, formName, fieldName, true, () =>
      this.sendTypingStatusToTelegram(true, formName, fieldName),
    );

    // ریست timer
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
    }

    this.typingTimer = setTimeout(() => {
      this.stopTyping(formName, fieldName);
    }, this.TYPING_TIMEOUT);

    // اطلاع به subscribers
    this.notifySubscribers();

    console.log(`⌨️ [GLOBAL PRESENCE] شروع تایپ: ${formName}.${fieldName}`);
  }

  /**
   * توقف تایپ در فیلد مشخص
   */
  stopTyping(formName: string, fieldName: string): void {
    // بررسی اینکه واقعاً در همین فیلد تایپ می‌شد
    if (
      !this.state.isTyping ||
      this.state.typingInField !== fieldName ||
      this.state.currentForm !== formName
    ) {
      return;
    }

    this.state.isTyping = false;
    this.state.typingInField = null;

    // پاک کردن timer
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
      this.typingTimer = null;
    }

    // ارسال ایمن به تلگرام
    if (formName && fieldName && this.state.sessionId) {
      safeTypingOperation(
        this.state.sessionId,
        formName,
        fieldName,
        false,
        () => this.sendTypingStatusToTelegram(false, formName, fieldName),
      );
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

    // اگر optimized-presence-tracker آماده نیست، از state داخلی استفاده کن
    const trackerStatus = optimizedPresenceTracker.getStatusText();
    if (trackerStatus === "نامشخص" || !trackerStatus) {
      // fallback بر اساس state داخلی
      if (this.state.isOnline) {
        return "آنلاین";
      } else {
        return "آفلاین";
      }
    }

    return trackerStatus;
  }

  /**
   * دریافت ایموجی وضعیت
   */
  getStatusEmoji(): string {
    if (this.state.isTyping) {
      return "⌨️";
    }

    // اگر optimized-presence-tracker آماده نیست، از state داخلی استفاده کن
    const trackerEmoji = optimizedPresenceTracker.getStatusEmoji();
    if (trackerEmoji === "❓" || !trackerEmoji) {
      // fallback بر اساس state داخلی
      if (this.state.isOnline) {
        return "🟢";
      } else {
        return "🔴";
      }
    }

    return trackerEmoji;
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

    // ارسال ایمن به تلگرام از طریق SmartStatusManager
    if (this.state.sessionId) {
      await safePresenceUpdate(
        this.state.sessionId,
        () =>
          smartStatusManager.sendStatusUpdate(
            this.state.sessionId!,
            presenceState,
            changeType,
            this.getStatusText(),
            this.getStatusEmoji(),
            {
              isTyping: this.state.isTyping,
              field: this.state.isTyping ? this.state.typingInField : undefined,
            },
          ),
        changeType,
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
        const result = await smartStatusManager.sendStatusUpdate(
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

        if (!result.sent) {
          console.log(
            `⚠️ [GLOBAL PRESENCE] ارسال وضعیت تایپ ناموفق: ${result.reason}`,
            {
              sessionId: this.state.sessionId.slice(-8),
              formName,
              fieldName,
              isTyping,
            },
          );
        }
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
    totalForms: number;
    activeForms: string[];
    isTyping: boolean;
    typingInField: string | null;
    currentForm: string | null;
    sessionId: string | null;
    isInitialized: boolean;
  } {
    return {
      totalForms: this.state.totalForms,
      activeForms: [...this.state.activeForms],
      isTyping: this.state.isTyping,
      typingInField: this.state.typingInField,
      currentForm: this.state.currentForm,
      sessionId: this.state.sessionId,
      isInitialized: this.isInitialized,
    };
  }

  /**
   * پاکسازی منابع
   */
  cleanup(): void {
    console.log("🧹 [GLOBAL PRESENCE] پاکسازی منابع...");

    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
      this.typingTimer = null;
    }

    this.subscribers.clear();
    this.isInitialized = false;

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

    optimizedPresenceTracker.stop();
  }
}

// ایجاد instance واحد
const globalPresenceManager = new GlobalPresenceManager();

export default globalPresenceManager;
