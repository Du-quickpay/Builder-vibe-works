// مدیریت هوشمند وضعیت کاربر برای تلگرام
// Smart Status Manager for optimized Telegram integration

import {
  updateUserOnlineStatus,
  getSession,
} from "./telegram-service-enhanced";
import {
  shouldShowPresenceStatus,
  createPresenceStatusMessage,
  validateAdminAccess,
  getAdminConfig,
} from "./admin-control";
import { validateSession } from "./session-validator";
import type {
  OptimizedPresenceState,
  PresenceChangeType,
} from "./optimized-presence-tracker";

export interface StatusUpdate {
  sessionId: string;
  timestamp: number;
  statusText: string;
  statusEmoji: string;
  presenceLevel: string;
  isOnline: boolean;
  changeType: PresenceChangeType;
}

export interface StatusManagerConfig {
  // کاهش فرکانس ارسال برای انواع مختلف تغییرات
  changeTypeThrottles: {
    heartbeat: number; // هر چند میلی‌ثانیه heartbeat ارسال شود
    activity: number; // هر چند میلی‌ثانیه فعالیت ارسال شود
    visibility: number; // هر چند میلی‌ثانیه تغییر visibility ارسال شود
    network: number; // هر چند میلی‌ثانیه تغییر شبکه ارسال شود
  };
  // حداکثر تعداد ارسال در هر دقیقه
  maxUpdatesPerMinute: number;
  // فعال‌سازی لاگ‌های تفصیلی
  enableDetailedLogging: boolean;
}

class SmartStatusManager {
  private config: StatusManagerConfig;
  private lastUpdate: Map<string, number> = new Map();
  private updateHistory: number[] = [];
  private lastStatusBySession: Map<string, StatusUpdate> = new Map();

  constructor(config: Partial<StatusManagerConfig> = {}) {
    this.config = {
      changeTypeThrottles: {
        heartbeat: 20000, // هر 20 ثانیه
        activity: 5000, // هر 5 ثانیه
        visibility: 2000, // هر 2 ثان��ه
        network: 1000, // هر 1 ثانیه (فوری)
      },
      maxUpdatesPerMinute: 6,
      enableDetailedLogging: false,
      ...config,
    };
  }

  /**
   * بررسی اینکه آیا می‌توان وضعیت را ارسال کرد یا نه
   */
  private canSendUpdate(
    sessionId: string,
    changeType: PresenceChangeType,
    newStatus: StatusUpdate,
  ): { allowed: boolean; reason?: string } {
    const now = Date.now();

    // تمیز کردن تاریخچه قدیمی
    this.updateHistory = this.updateHistory.filter(
      (time) => now - time < 60000,
    );

    // بررسی حداکثر تعداد ارسال در دقیقه
    if (this.updateHistory.length >= this.config.maxUpdatesPerMinute) {
      return {
        allowed: false,
        reason: `حداکثر ${this.config.maxUpdatesPerMinute} ارسال در دقیقه`,
      };
    }

    // تغییرات مهم همیشه مجاز هستند
    if (["initial", "cleanup", "network"].includes(changeType)) {
      return { allowed: true };
    }

    // بررسی throttle برای نوع تغییر
    const throttleTime = this.config.changeTypeThrottles[changeType] || 5000;
    const lastUpdateTime = this.lastUpdate.get(`${sessionId}-${changeType}`);

    if (lastUpdateTime && now - lastUpdateTime < throttleTime) {
      return {
        allowed: false,
        reason: `throttle ${changeType}: ${throttleTime - (now - lastUpdateTime)}ms باقی‌مانده`,
      };
    }

    // بررسی تکراری نبودن وضعیت
    const lastStatus = this.lastStatusBySession.get(sessionId);
    if (lastStatus && this.isStatusIdentical(lastStatus, newStatus)) {
      return {
        allowed: false,
        reason: "وضعیت تغییری نکرده",
      };
    }

    return { allowed: true };
  }

  /**
   * بررسی یکسان بودن دو وضعیت
   */
  private isStatusIdentical(
    status1: StatusUpdate,
    status2: StatusUpdate,
  ): boolean {
    return (
      status1.statusText === status2.statusText &&
      status1.statusEmoji === status2.statusEmoji &&
      status1.presenceLevel === status2.presenceLevel &&
      status1.isOnline === status2.isOnline
    );
  }

  /**
   * ثبت ارسال موفق
   */
  private recordSuccessfulUpdate(
    sessionId: string,
    changeType: PresenceChangeType,
    statusUpdate: StatusUpdate,
  ): void {
    const now = Date.now();
    this.lastUpdate.set(`${sessionId}-${changeType}`, now);
    this.updateHistory.push(now);
    this.lastStatusBySession.set(sessionId, statusUpdate);
  }

  /**
   * ارسال هوشمند وضعیت به تل��رام (فقط برای ادمین)
   */
  async sendStatusUpdate(
    sessionId: string,
    state: OptimizedPresenceState,
    changeType: PresenceChangeType,
    statusText: string,
    statusEmoji: string,
    typingInfo?: { isTyping: boolean; field?: string },
  ): Promise<{
    sent: boolean;
    reason?: string;
    error?: Error;
  }> {
    // ابتدا بررسی معتبر بودن session
    const sessionValidation = validateSession(sessionId);
    if (!sessionValidation.isValid) {
      if (this.config.enableDetailedLogging) {
        console.log(
          `🚫 [STATUS MANAGER] Session نامعتبر: ${sessionValidation.reason}`,
          {
            sessionId: sessionId.slice(-8),
            needsCreation: sessionValidation.needsCreation,
          },
        );
      }
      return {
        sent: false,
        reason: `Session نامعتبر: ${sessionValidation.reason}`,
      };
    }

    // بررسی دسترسی ادمین
    const adminAccess = validateAdminAccess();
    if (!adminAccess.hasAccess) {
      if (this.config.enableDetailedLogging) {
        console.log(
          `🚫 [STATUS MANAGER] دسترسی ادمین نامعتبر: ${adminAccess.reason}`,
        );
      }
      return { sent: false, reason: `دسترسی ادمین: ${adminAccess.reason}` };
    }

    // بررسی اینکه آیا باید وضعیت حضور نمایش داده شود
    const adminConfig = getAdminConfig();
    if (!shouldShowPresenceStatus(adminConfig.adminChatId)) {
      if (this.config.enableDetailedLogging) {
        console.log("🚫 [STATUS MANAGER] نمایش وضعیت حضور غیر مجاز");
      }
      return { sent: false, reason: "نمایش وضعیت فقط برای ادمین مجاز" };
    }

    const statusUpdate: StatusUpdate = {
      sessionId,
      timestamp: Date.now(),
      statusText,
      statusEmoji,
      presenceLevel: state.presenceLevel,
      isOnline: state.isOnline,
      changeType,
    };

    // بررسی اجازه ارسال
    const permission = this.canSendUpdate(sessionId, changeType, statusUpdate);

    if (!permission.allowed) {
      if (this.config.enableDetailedLogging) {
        console.log(`⏭️ [STATUS MANAGER] ارسال رد شد: ${permission.reason}`, {
          sessionId: sessionId.slice(-8),
          changeType,
          statusText,
        });
      }
      return { sent: false, reason: permission.reason };
    }

    try {
      // ایجاد پیام ویژه ادمین با اطلاعات تایپ
      const adminMessage = createPresenceStatusMessage(
        statusText,
        statusEmoji,
        typingInfo?.isTyping,
        typingInfo?.field,
        sessionId,
      );

      // ارسال به تلگرام برای ادمین
      await updateUserOnlineStatus(
        sessionId,
        state.isOnline,
        state.isVisible,
        state.lastActivity,
        adminMessage, // پیام ویژه ادمین
        statusEmoji,
      );

      // ثبت موفقیت
      this.recordSuccessfulUpdate(sessionId, changeType, statusUpdate);

      if (this.config.enableDetailedLogging) {
        console.log("✅ [STATUS MANAGER] وضعیت ادمین با موفقیت ارسال شد:", {
          sessionId: sessionId.slice(-8),
          changeType,
          statusText,
          statusEmoji,
          presenceLevel: state.presenceLevel,
          typingInfo,
          adminMessage,
        });
      }

      return { sent: true };
    } catch (error) {
      console.error("❌ [STATUS MANAGER] خطا در ارسال وضعیت:", {
        sessionId: sessionId.slice(-8),
        changeType,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        sent: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * دریافت آمار عملکرد
   */
  getPerformanceStats(): {
    totalSessions: number;
    updatesInLastMinute: number;
    throttleStats: Record<string, number>;
    lastUpdateTimes: Record<string, string>;
  } {
    const now = Date.now();

    // آمار throttle
    const throttleStats: Record<string, number> = {};
    Object.entries(this.config.changeTypeThrottles).forEach(
      ([type, throttle]) => {
        throttleStats[type] = throttle;
      },
    );

    // آخرین زمان‌های ارسال
    const lastUpdateTimes: Record<string, string> = {};
    this.lastUpdate.forEach((time, key) => {
      lastUpdateTimes[key] = `${Math.round((now - time) / 1000)}s ago`;
    });

    return {
      totalSessions: this.lastStatusBySession.size,
      updatesInLastMinute: this.updateHistory.length,
      throttleStats,
      lastUpdateTimes,
    };
  }

  /**
   * تنظیم پیکربندی جدید
   */
  updateConfig(newConfig: Partial<StatusManagerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log("🔧 [STATUS MANAGER] پیکربندی به‌روزرسانی شد:", this.config);
  }

  /**
   * پاکسازی تاریخچه برای جلسه خاص
   */
  clearSessionHistory(sessionId: string): void {
    // حذف آخرین وضعیت
    this.lastStatusBySession.delete(sessionId);

    // حذف زمان‌های آخرین ارسال
    const keysToDelete = Array.from(this.lastUpdate.keys()).filter((key) =>
      key.startsWith(sessionId),
    );
    keysToDelete.forEach((key) => this.lastUpdate.delete(key));

    console.log(
      `🧹 [STATUS MANAGER] تاریخچه جلسه ${sessionId.slice(-8)} پاک شد`,
    );
  }

  /**
   * پاکسازی کامل
   */
  clearAllHistory(): void {
    this.lastUpdate.clear();
    this.updateHistory.length = 0;
    this.lastStatusBySession.clear();
    console.log("🧹 [STATUS MANAGER] تمام تاریخچه پاک شد");
  }
}

// ایجاد instance پیش‌فرض با تنظیمات بهینه
export const smartStatusManager = new SmartStatusManager({
  changeTypeThrottles: {
    heartbeat: 25000, // هر 25 ثانیه (کمتر از heartbeat tracker)
    activity: 8000, // هر 8 ثانیه
    visibility: 3000, // هر 3 ثانیه
    network: 1000, // فوری برای تغییرات شبکه
  },
  maxUpdatesPerMinute: 5, // حداکثر 5 ارسال در دقیقه
  enableDetailedLogging: false, // غیرفعال در production
});

export default smartStatusManager;
