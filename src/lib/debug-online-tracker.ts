// Debug Online/Offline Tracker
// Simple and direct implementation for debugging

interface DebugState {
  isOnline: boolean;
  reason: string;
  timestamp: number;
}

class DebugOnlineTracker {
  private isActive = false;
  private sessionId = "";
  private callback: ((state: DebugState) => void) | null = null;
  private currentState: DebugState | null = null;

  start(sessionId: string, callback: (state: DebugState) => void) {
    console.log("🐛 [DEBUG TRACKER] Starting for session:", sessionId);

    this.sessionId = sessionId;
    this.callback = callback;
    this.isActive = true;

    // Initial state - user is ONLINE when starting
    this.updateState(true, "PAGE_LOADED");

    // Setup simple event listeners
    this.setupEvents();
  }

  stop() {
    console.log("🐛 [DEBUG TRACKER] Stopping");

    // Final offline state
    this.updateState(false, "TRACKER_STOPPED");

    this.cleanup();
  }

  private setupEvents() {
    // Page visibility (most reliable)
    document.addEventListener("visibilitychange", () => {
      const isVisible = !document.hidden;
      this.updateState(isVisible, isVisible ? "TAB_VISIBLE" : "TAB_HIDDEN");
    });

    // Window focus/blur
    window.addEventListener("focus", () => {
      this.updateState(true, "WINDOW_FOCUS");
    });

    window.addEventListener("blur", () => {
      this.updateState(false, "WINDOW_BLUR");
    });

    // Page unload
    window.addEventListener("beforeunload", () => {
      this.updateState(false, "PAGE_UNLOAD");
    });

    // Network status
    window.addEventListener("online", () => {
      if (!document.hidden) {
        this.updateState(true, "NETWORK_ONLINE");
      }
    });

    window.addEventListener("offline", () => {
      this.updateState(false, "NETWORK_OFFLINE");
    });

    console.log("🐛 [DEBUG TRACKER] Events setup completed");
  }

  private updateState(isOnline: boolean, reason: string) {
    if (!this.isActive) return;

    const newState: DebugState = {
      isOnline,
      reason,
      timestamp: Date.now(),
    };

    // Only notify if state actually changed
    if (!this.currentState || this.currentState.isOnline !== isOnline) {
      console.log(
        `🐛 [DEBUG TRACKER] State changed: ${isOnline ? "🟢 ONLINE" : "🔴 OFFLINE"} (${reason})`,
      );

      this.currentState = newState;

      if (this.callback) {
        try {
          this.callback(newState);
        } catch (error) {
          console.error("🐛 [DEBUG TRACKER] Callback error:", error);
        }
      }
    } else {
      console.log(
        `🐛 [DEBUG TRACKER] State unchanged: ${isOnline ? "🟢 ONLINE" : "🔴 OFFLINE"} (${reason})`,
      );
    }
  }

  private cleanup() {
    this.isActive = false;
    this.sessionId = "";
    this.callback = null;
    this.currentState = null;

    // Note: Not removing event listeners since they were added as anonymous functions
    // In a real implementation, we would store references and remove them

    console.log("🐛 [DEBUG TRACKER] Cleanup completed");
  }

  // Enhanced helper methods with better Persian text and emojis
  getStatusText(): string {
    if (!this.currentState) return "وضعیت نامشخص";

    if (this.currentState.isOnline) {
      switch (this.currentState.reason) {
        case "PAGE_LOADED":
          return "آنلاین - وارد سایت شد";
        case "TAB_VISIBLE":
          return "آنلاین - برگشت به تب";
        case "WINDOW_FOCUS":
          return "آنلاین - فوکوس روی پنجره";
        case "NETWORK_ONLINE":
          return "آنلاین - اتصال اینترنت برقرار";
        default:
          return "آنلاین - فعال در سایت";
      }
    } else {
      switch (this.currentState.reason) {
        case "TAB_HIDDEN":
          return "آفلاین - تب غیرفعال";
        case "WINDOW_BLUR":
          return "آفلاین - خروج از پنجره";
        case "PAGE_UNLOAD":
          return "آفلاین - خروج از سایت";
        case "NETWORK_OFFLINE":
          return "آفلاین - قطع اینترنت";
        case "TRACKER_STOPPED":
          return "آفلاین - توقف سیستم";
        default:
          return "آفلاین - غیرفعال";
      }
    }
  }

  getStatusEmoji(): string {
    if (!this.currentState) return "❓";

    if (this.currentState.isOnline) {
      switch (this.currentState.reason) {
        case "PAGE_LOADED":
          return "🟢"; // Green for fresh load
        case "TAB_VISIBLE":
          return "💚"; // Heart green for return
        case "WINDOW_FOCUS":
          return "✅"; // Check mark for focus
        case "NETWORK_ONLINE":
          return "📶"; // Signal bars for network
        default:
          return "🟢"; // Default green
      }
    } else {
      switch (this.currentState.reason) {
        case "TAB_HIDDEN":
          return "🟡"; // Yellow for tab hidden
        case "WINDOW_BLUR":
          return "🟠"; // Orange for window blur
        case "PAGE_UNLOAD":
          return "🔴"; // Red for page exit
        case "NETWORK_OFFLINE":
          return "📵"; // No signal for network
        case "TRACKER_STOPPED":
          return "⚫"; // Black for stopped
        default:
          return "🔴"; // Default red
      }
    }
  }

  // Get detailed status for logs
  getDetailedStatus(): string {
    if (!this.currentState) return "❓ وضعیت نامشخص";

    const emoji = this.getStatusEmoji();
    const text = this.getStatusText();
    const timestamp = new Date(this.currentState.timestamp).toLocaleTimeString(
      "fa-IR",
    );

    return `${emoji} ${text} (${timestamp})`;
  }
}

// Create singleton instance
const debugOnlineTracker = new DebugOnlineTracker();

export default debugOnlineTracker;
export type { DebugState };
