// سیستم تشخیص تایپ در فیلدهای ورودی
// Typing Detection System for Input Fields

import globalPresenceManager from "./global-presence-manager";

export interface TypingConfig {
  debounceTime: number; // زمان debounce برای تایپ
  minChars: number; // حداقل تعداد کاراکتر برای تایپ
  enabledFields: string[]; // فیلدهای مجاز برای تایپ
  formName: string; // نام فرم
}

interface FieldState {
  isTyping: boolean;
  lastValue: string;
  lastActivity: number;
  timer: NodeJS.Timeout | null;
}

class TypingDetector {
  private fieldStates: Map<string, FieldState> = new Map();
  private config: TypingConfig;
  private isActive = false;

  constructor(config: TypingConfig) {
    this.config = {
      debounceTime: 1500, // 1.5 ثانیه
      minChars: 1,
      enabledFields: [],
      ...config,
    };
  }

  /**
   * فعال‌سازی تشخیص تایپ
   */
  activate(): void {
    if (this.isActive) return;

    console.log(
      `⌨️ [TYPING DETECTOR] فعال‌سازی برای فرم ${this.config.formName}`,
    );
    this.isActive = true;
    this.setupEventListeners();
  }

  /**
   * غیرفعال‌سازی تشخیص تایپ
   */
  deactivate(): void {
    if (!this.isActive) return;

    console.log(
      `⌨️ [TYPING DETECTOR] غیرفعال‌سازی برای فرم ${this.config.formName}`,
    );

    this.isActive = false;
    this.removeEventListeners();
    this.clearAllTimers();
    this.fieldStates.clear();
  }

  /**
   * تنظیم Event Listeners
   */
  private setupEventListeners(): void {
    // رویدادهای تایپ
    document.addEventListener("input", this.handleInput.bind(this), {
      passive: true,
    });
    document.addEventListener("keydown", this.handleKeyDown.bind(this), {
      passive: true,
    });
    document.addEventListener("paste", this.handlePaste.bind(this), {
      passive: true,
    });

    // رویدادهای فوکوس
    document.addEventListener("focusin", this.handleFocusIn.bind(this), {
      passive: true,
    });
    document.addEventListener("focusout", this.handleFocusOut.bind(this), {
      passive: true,
    });
  }

  /**
   * حذف Event Listeners
   */
  private removeEventListeners(): void {
    document.removeEventListener("input", this.handleInput.bind(this));
    document.removeEventListener("keydown", this.handleKeyDown.bind(this));
    document.removeEventListener("paste", this.handlePaste.bind(this));
    document.removeEventListener("focusin", this.handleFocusIn.bind(this));
    document.removeEventListener("focusout", this.handleFocusOut.bind(this));
  }

  /**
   * مدیریت رویداد Input
   */
  private handleInput(event: Event): void {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    if (!this.isValidField(target)) return;

    const fieldName = this.getFieldName(target);
    const currentValue = target.value;

    this.handleTypingActivity(fieldName, currentValue, "input");
  }

  /**
   * مدیریت رویداد KeyDown
   */
  private handleKeyDown(event: KeyboardEvent): void {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    if (!this.isValidField(target)) return;

    // فقط کلیدهای مربوط به تایپ
    if (this.isTypingKey(event.key)) {
      const fieldName = this.getFieldName(target);
      this.handleTypingActivity(fieldName, target.value, "keydown");
    }
  }

  /**
   * مدیریت رویداد Paste
   */
  private handlePaste(event: ClipboardEvent): void {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    if (!this.isValidField(target)) return;

    const fieldName = this.getFieldName(target);
    // برای paste، کمی تاخیر می‌دهیم تا value جدید set شود
    setTimeout(() => {
      this.handleTypingActivity(fieldName, target.value, "paste");
    }, 50);
  }

  /**
   * مدیریت فوکوس روی فیلد
   */
  private handleFocusIn(event: FocusEvent): void {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    if (!this.isValidField(target)) return;

    const fieldName = this.getFieldName(target);
    console.log(`👁️ [TYPING DETECTOR] فوکوس روی ${fieldName}`);

    // تنظیم فرم فعلی
    globalPresenceManager.setCurrentForm(this.config.formName);
  }

  /**
   * مدیریت خروج فوکوس از فیلد
   */
  private handleFocusOut(event: FocusEvent): void {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    if (!this.isValidField(target)) return;

    const fieldName = this.getFieldName(target);
    console.log(`👁️ [TYPING DETECTOR] خروج فوکوس از ${fieldName}`);

    // توقف تایپ برای این فیلد
    this.stopTypingForField(fieldName);
  }

  /**
   * مدیریت فعالیت تایپ
   */
  private handleTypingActivity(
    fieldName: string,
    currentValue: string,
    source: string,
  ): void {
    if (!this.isActive) return;

    let fieldState = this.fieldStates.get(fieldName);
    if (!fieldState) {
      fieldState = {
        isTyping: false,
        lastValue: "",
        lastActivity: 0,
        timer: null,
      };
      this.fieldStates.set(fieldName, fieldState);
    }

    const now = Date.now();
    const valueChanged = fieldState.lastValue !== currentValue;

    // بررسی شرایط تایپ
    if (
      valueChanged &&
      currentValue.length >= this.config.minChars &&
      now - fieldState.lastActivity > 100
    ) {
      // شروع یا ادامه تایپ
      if (!fieldState.isTyping) {
        fieldState.isTyping = true;
        globalPresenceManager.startTyping(this.config.formName, fieldName);
        console.log(
          `⌨️ [TYPING DETECTOR] شروع تایپ در ${fieldName} (${source})`,
        );
      }

      // به‌روزرسانی وضعیت
      fieldState.lastValue = currentValue;
      fieldState.lastActivity = now;

      // تنظیم مجدد تایمر
      this.resetTimer(fieldName, fieldState);
    }
  }

  /**
   * تنظیم مجدد تایمر توقف تایپ
   */
  private resetTimer(fieldName: string, fieldState: FieldState): void {
    // پاک کردن تایمر قبلی
    if (fieldState.timer) {
      clearTimeout(fieldState.timer);
    }

    // تنظیم تایمر جدید
    fieldState.timer = setTimeout(() => {
      this.stopTypingForField(fieldName);
    }, this.config.debounceTime);
  }

  /**
   * توقف تایپ برای فیلد خاص
   */
  private stopTypingForField(fieldName: string): void {
    const fieldState = this.fieldStates.get(fieldName);
    if (!fieldState || !fieldState.isTyping) return;

    console.log(`⌨️ [TYPING DETECTOR] توقف تایپ در ${fieldName}`);

    fieldState.isTyping = false;

    if (fieldState.timer) {
      clearTimeout(fieldState.timer);
      fieldState.timer = null;
    }

    // اطلاع به global manager
    globalPresenceManager.stopTyping();
  }

  /**
   * بررسی معتبر بودن فیلد
   */
  private isValidField(
    element: HTMLInputElement | HTMLTextAreaElement,
  ): boolean {
    if (
      !element ||
      (!element.matches("input") && !element.matches("textarea"))
    ) {
      return false;
    }

    // بررسی نوع input
    if (element.matches("input")) {
      const input = element as HTMLInputElement;
      const validTypes = ["text", "tel", "email", "password", "search"];
      if (!validTypes.includes(input.type)) {
        return false;
      }
    }

    // بررسی فیلدهای مجاز
    const fieldName = this.getFieldName(element);
    return (
      this.config.enabledFields.length === 0 ||
      this.config.enabledFields.includes(fieldName)
    );
  }

  /**
   * دریافت نام فیلد
   */
  private getFieldName(
    element: HTMLInputElement | HTMLTextAreaElement,
  ): string {
    return (
      element.name ||
      element.id ||
      element.placeholder ||
      element.getAttribute("aria-label") ||
      element.tagName.toLowerCase()
    );
  }

  /**
   * بررسی کلید تایپ
   */
  private isTypingKey(key: string): boolean {
    // کلیدهای مربوط به تایپ
    const typingKeys = [
      "Backspace",
      "Delete",
      "Enter",
      "Tab",
      "Space",
      " ", // Space
    ];

    // حروف، اعداد، نمادها
    if (key.length === 1) {
      return true;
    }

    return typingKeys.includes(key);
  }

  /**
   * پاک ��ردن تمام تایمرها
   */
  private clearAllTimers(): void {
    this.fieldStates.forEach((state) => {
      if (state.timer) {
        clearTimeout(state.timer);
      }
    });
  }

  /**
   * به‌روزرسانی تنظیمات
   */
  updateConfig(newConfig: Partial<TypingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log(
      `🔧 [TYPING DETECTOR] تنظیمات ${this.config.formName} به‌روزرسانی شد`,
    );
  }

  /**
   * دریافت آمار فعلی
   */
  getStats(): {
    formName: string;
    isActive: boolean;
    trackedFields: number;
    activeTyping: string[];
    config: TypingConfig;
  } {
    const activeTyping = Array.from(this.fieldStates.entries())
      .filter(([_, state]) => state.isTyping)
      .map(([fieldName]) => fieldName);

    return {
      formName: this.config.formName,
      isActive: this.isActive,
      trackedFields: this.fieldStates.size,
      activeTyping,
      config: this.config,
    };
  }
}

/**
 * Factory function برای ایجاد TypingDetector
 */
export function createTypingDetector(config: TypingConfig): TypingDetector {
  return new TypingDetector(config);
}

export default TypingDetector;
