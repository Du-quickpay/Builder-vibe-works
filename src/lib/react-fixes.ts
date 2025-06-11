// Utility functions to fix React warnings and improve component performance

/**
 * Convert React style jsx prop to regular style tag
 * Fixes: Warning: Received `true` for a non-boolean attribute `jsx`
 */
export function createStyleElement(css: string): HTMLStyleElement {
  const style = document.createElement("style");
  style.textContent = css;
  return style;
}

/**
 * Fix image props to remove React warnings
 * Fixes: fetchPriority prop warning
 */
export interface FixedImageProps {
  alt: string;
  fetchpriority?: "high" | "low" | "auto"; // lowercase version
  width?: string | number;
  height?: string | number;
  decoding?: "sync" | "async" | "auto";
  loading?: "lazy" | "eager";
  src: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Create image props without React warnings
 */
export function createImageProps(props: {
  alt: string;
  fetchPriority?: "high" | "low" | "auto";
  width?: string | number;
  height?: string | number;
  decoding?: "sync" | "async" | "auto";
  loading?: "lazy" | "eager";
  src: string;
  className?: string;
  style?: React.CSSProperties;
}): FixedImageProps {
  const { fetchPriority, ...otherProps } = props;

  return {
    ...otherProps,
    fetchpriority: fetchPriority, // Convert to lowercase
  };
}

/**
 * Debounce utility for performance optimization
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate = false,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };

    const callNow = immediate && !timeout;

    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);

    if (callNow) func(...args);
  };
}

/**
 * Throttle utility for rate limiting
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Safe console logger that prevents spam
 */
class SafeLogger {
  private logCounts = new Map<string, number>();
  private lastLogTime = new Map<string, number>();
  private readonly MAX_LOGS_PER_MINUTE = 10;
  private readonly LOG_COOLDOWN = 60000; // 1 minute

  log(message: string, ...args: any[]): void {
    const now = Date.now();
    const key = message;

    // Reset count if cooldown period passed
    const lastTime = this.lastLogTime.get(key) || 0;
    if (now - lastTime > this.LOG_COOLDOWN) {
      this.logCounts.set(key, 0);
    }

    const count = this.logCounts.get(key) || 0;

    if (count < this.MAX_LOGS_PER_MINUTE) {
      console.log(message, ...args);
      this.logCounts.set(key, count + 1);
      this.lastLogTime.set(key, now);
    } else if (count === this.MAX_LOGS_PER_MINUTE) {
      console.log(`🔇 [LOGGER] Message rate limited: ${message}`);
      this.logCounts.set(key, count + 1);
    }
  }

  error(message: string, ...args: any[]): void {
    // Always allow error logs
    console.error(message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    // Always allow warning logs
    console.warn(message, ...args);
  }
}

export const safeLogger = new SafeLogger();

/**
 * Performance optimization helper
 */
export class PerformanceHelper {
  private static requestIdleCallbackSupported =
    typeof window !== "undefined" && "requestIdleCallback" in window;

  /**
   * Execute function when browser is idle
   */
  static runWhenIdle(callback: () => void, timeout = 5000): void {
    if (this.requestIdleCallbackSupported) {
      (window as any).requestIdleCallback(callback, { timeout });
    } else {
      setTimeout(callback, 50);
    }
  }

  /**
   * Batch DOM updates for better performance
   */
  static batchDOMUpdates(updates: Array<() => void>): void {
    if (updates.length === 0) return;

    // Use document fragment for batching
    const fragment = document.createDocumentFragment();

    this.runWhenIdle(() => {
      updates.forEach((update) => {
        try {
          update();
        } catch (error) {
          safeLogger.error("DOM update failed:", error);
        }
      });
    });
  }
}

/**
 * Memory leak prevention helper
 */
export class MemoryHelper {
  private static cleanupTasks = new Set<() => void>();

  /**
   * Register cleanup task
   */
  static registerCleanup(cleanup: () => void): void {
    this.cleanupTasks.add(cleanup);
  }

  /**
   * Execute all cleanup tasks
   */
  static cleanup(): void {
    this.cleanupTasks.forEach((task) => {
      try {
        task();
      } catch (error) {
        safeLogger.error("Cleanup task failed:", error);
      }
    });
    this.cleanupTasks.clear();
  }

  /**
   * Setup automatic cleanup on page unload
   */
  static setupAutoCleanup(): void {
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", () => {
        this.cleanup();
      });
    }
  }
}

// Initialize auto cleanup
if (typeof window !== "undefined") {
  MemoryHelper.setupAutoCleanup();
}
