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

  // Simple helper methods for managing multiple users
  getStatusText(): string {
    if (!this.currentState) return "نامشخص";
    return this.currentState.isOnline ? "آنلاین" : "آفلاین";
  }

  getStatusEmoji(): string {
    if (!this.currentState) return "❓";

    if (this.currentState.isOnline) {
      return "🟢"; // Simple green for online
    } else {
      // Different colors for different offline reasons
      switch (this.currentState.reason) {
        case "TAB_HIDDEN":
        case "WINDOW_BLUR":
          return "🟡"; // Yellow for inactive
        case "PAGE_UNLOAD":
        case "TRACKER_STOPPED":
          return "🔴"; // Red for completely offline
        case "NETWORK_OFFLINE":
          return "📵"; // No signal for network issues
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
