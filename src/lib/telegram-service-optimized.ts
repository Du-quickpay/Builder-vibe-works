// Optimized Telegram Service for Production
// Minimal overhead, maximum performance

import { getSession } from "./telegram-service-enhanced";
import { liteFetch } from "./network-manager-lite";

const TELEGRAM_BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHAT_ID = import.meta.env.VITE_TELEGRAM_CHAT_ID || "";

// Configuration validation
const isValidConfig = () => {
  return (
    TELEGRAM_BOT_TOKEN &&
    TELEGRAM_BOT_TOKEN.trim() !== "" &&
    !TELEGRAM_BOT_TOKEN.includes("YOUR_BOT_TOKEN") &&
    TELEGRAM_CHAT_ID &&
    TELEGRAM_CHAT_ID.trim() !== "" &&
    !TELEGRAM_CHAT_ID.includes("YOUR_CHAT_ID")
  );
};

interface CallbackHandler {
  sessionId: string;
  onCallback: (action: string) => void;
  registeredAt: number;
  lastUsed: number;
}

class OptimizedTelegramService {
  private handlers = new Map<string, CallbackHandler>();
  private isPolling = false;
  private pollInterval: NodeJS.Timeout | null = null;
  private currentPollDelay = 4000; // Start with 4 seconds
  private lastUpdateId = 0;
  private consecutiveErrors = 0;
  private maxErrors = 5; // Reduced for faster recovery
  private processingCommands = new Set<string>();
  private lastErrorLog = 0; // Rate limit error logging
  private circuitBreakerOpen = false; // Circuit breaker state
  private lastCircuitBreakerReset = 0; // Last time circuit breaker was reset

  /**
   * Register handler (simplified)
   */
  registerHandler(
    sessionId: string,
    onCallback: (action: string) => void,
  ): void {
    console.log("📝 Registering handler:", sessionId.slice(-8));

    this.handlers.set(sessionId, {
      sessionId,
      onCallback,
      registeredAt: Date.now(),
      lastUsed: Date.now(),
    });

    // Only start polling if we have valid Telegram configuration and user explicitly needs it
    if (!this.isPolling && this.validateConfiguration() && isValidConfig()) {
      console.log("🚀 Starting polling for valid Telegram configuration");
      this.startPolling();
    } else {
      console.log(
        "ℹ️ Polling disabled - either no config or demo mode to prevent network errors",
      );
    }
  }

  /**
   * Unregister handler
   */
  unregisterHandler(sessionId: string): void {
    console.log("🗑️ Unregistering handler:", sessionId.slice(-8));
    this.handlers.delete(sessionId);

    // Stop polling if no handlers
    if (this.handlers.size === 0) {
      this.stopPolling();
    }
  }

  /**
   * Validate configuration
   */
  private validateConfiguration(): boolean {
    const valid = isValidConfig();
    if (!valid) {
      console.log("🎭 Demo mode: Telegram not configured");
    }
    return valid;
  }

  /**
   * Start polling (optimized)
   */
  async startPolling(): Promise<void> {
    if (this.isPolling) return;

    console.log("🚀 Starting optimized Telegram polling");
    this.isPolling = true;
    this.consecutiveErrors = 0;
    this.currentPollDelay = 4000;
    this.circuitBreakerOpen = false;

    // Setup network listeners for recovery
    this.setupNetworkListeners();

    // Check network status before starting
    if (!navigator.onLine) {
      console.warn("⚠️ Device appears offline, but starting polling anyway");
    }

    // Validate configuration
    if (!isValidConfig()) {
      console.error(
        "❌ Invalid Telegram configuration - polling will not work",
      );
      console.log(
        "📋 Please check your VITE_TELEGRAM_BOT_TOKEN and VITE_TELEGRAM_CHAT_ID",
      );
      return;
    }

    // Test connection first before starting continuous polling
    setTimeout(async () => {
      try {
        console.log(
          "🔍 Testing Telegram connection before starting polling...",
        );
        await this.pollForUpdates();
      } catch (error) {
        console.error("❌ Telegram connection test failed:", error);

        // If initial test fails with network error, don't start polling
        if (error.message?.includes("Failed to fetch")) {
          console.error(
            "❌ Network issues detected - disabling polling to prevent spam",
          );
          this.isPolling = false;
          return;
        }

        // For other errors, try with a longer delay
        this.scheduleNextPoll(10000); // Retry in 10 seconds
      }
    }, 500);
  }

  /**
   * Optimized polling with proper error handling
   */
  private async pollForUpdates(): Promise<void> {
    try {
      if (!this.isPolling) return;

      // Validate configuration before polling
      if (!isValidConfig()) {
        console.log("⚠️ Invalid Telegram configuration, stopping polling");
        console.log(
          "📋 Please set valid VITE_TELEGRAM_BOT_TOKEN and VITE_TELEGRAM_CHAT_ID in your .env file",
        );
        this.stopPolling();
        return;
      }

      // Skip polling if offline
      if (!navigator.onLine) {
        console.log("🌐 Device offline, skipping poll");
        this.scheduleNextPoll(5000); // Check again in 5 seconds
        return;
      }

      // Circuit breaker: skip polling if too many recent failures
      if (this.circuitBreakerOpen) {
        const timeSinceReset = Date.now() - this.lastCircuitBreakerReset;
        if (timeSinceReset < 30000) {
          // 30 seconds
          console.log("⚡ Circuit breaker open, skipping poll");
          this.scheduleNextPoll(10000); // Check again in 10 seconds
          return;
        } else {
          // Try to reset circuit breaker
          this.circuitBreakerOpen = false;
          this.consecutiveErrors = Math.floor(this.consecutiveErrors / 2); // Reduce error count
          console.log("🔄 Circuit breaker reset, attempting to resume polling");
        }
      }

      // Early network connectivity check
      if (!navigator.onLine) {
        console.warn("📶 Offline detected - skipping poll");
        this.scheduleNextPoll(5000);
        return;
      }

      // Create manual AbortController for better browser compatibility
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      let response;
      try {
        response = await liteFetch(
          `getUpdates?offset=${this.lastUpdateId + 1}&limit=10&timeout=20`,
          {
            method: "GET",
            signal: controller.signal,
          },
          TELEGRAM_BOT_TOKEN,
        );
        clearTimeout(timeoutId);
      } catch (fetchError: any) {
        clearTimeout(timeoutId);

        // Increment error count immediately for all fetch errors
        this.consecutiveErrors++;

        // Handle specific fetch errors gracefully without throwing
        if (fetchError.name === "AbortError") {
          console.warn("⏰ Request timeout - check your internet connection");
          this.scheduleNextPoll(Math.min(this.currentPollDelay * 2, 30000));
          return;
        } else if (fetchError.message?.includes("Failed to fetch")) {
          // Only log every 10th error to prevent spam
          if (this.consecutiveErrors % 10 === 1) {
            console.warn(`🌐 Network error - unable to connect to Telegram API (${this.consecutiveErrors} errors)`);
          }
          // Stop polling after persistent failures
          if (this.consecutiveErrors >= 10) {
            console.error("❌ Too many network failures - stopping polling");
            this.stopPolling();
            return;
          }
          this.scheduleNextPoll(Math.min(this.currentPollDelay * 2, 60000));
          return;
        } else {
          console.warn("❌ Unexpected fetch error:", fetchError.message);
          this.scheduleNextPoll(Math.min(this.currentPollDelay * 2, 30000));
          return;
        }
      }

      if (!response.ok) {
        // Handle authentication errors by stopping polling immediately
        if (response.status === 401) {
          console.error(
            "❌ Invalid bot token (401 Unauthorized) - stopping polling",
          );
          console.log(
            "📋 Please check your VITE_TELEGRAM_BOT_TOKEN in your .env file",
          );
          this.stopPolling();
          return;
        }

        // Handle 404 errors (bot token doesn't exist)
        if (response.status === 404) {
          console.error("❌ Bot not found (404) - stopping polling");
          console.log(
            "🔍 Please verify your VITE_TELEGRAM_BOT_TOKEN is correct",
          );
          this.stopPolling();
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.ok) {
        throw new Error(`API Error: ${data.description || "Unknown"}`);
      }

      // Process updates
      if (data.result && data.result.length > 0) {
        for (const update of data.result) {
          this.lastUpdateId = update.update_id;

          if (update.callback_query) {
            await this.handleCallback(update.callback_query);
          }
        }
      }

      // Reset on success
      this.consecutiveErrors = 0;
      this.currentPollDelay = Math.max(4000, this.currentPollDelay * 0.9);

      // Reset circuit breaker on successful operation
      if (this.circuitBreakerOpen) {
        console.log("✅ Circuit breaker reset - polling successful");
        this.circuitBreakerOpen = false;
      }

      // Schedule next poll
      this.scheduleNextPoll();
    } catch (error: any) {
      // This catch should only handle errors not caught by the fetch try-catch
      // Most fetch errors should already be handled above

      // Check if it's a network connectivity issue
      const isNetworkError =
        error.name === "AbortError" ||
        error.name === "TypeError" ||
        error.message?.includes("Network error") ||
        error.message?.includes("Failed to fetch") ||
        error.message?.includes("timeout") ||
        error.message?.includes("fetch") ||
        error.message?.includes("unable to connect") ||
        error.code === "NETWORK_ERROR" ||
        !navigator.onLine;

      // For persistent "Failed to fetch" errors, stop polling entirely
      if (
        error.message?.includes("Failed to fetch") &&
        this.consecutiveErrors >= 5
      ) {
        console.error(
          "❌ Critical: Too many 'Failed to fetch' errors - stopping polling",
        );
        this.stopPolling();
        return;
      }

      if (isNetworkError) {
        // Rate limit network error logging (once every 15 seconds)
        const now = Date.now();
        if (now - this.lastErrorLog > 15000) {
          console.warn(
            `🌐 Polling error (${this.consecutiveErrors}/${this.maxErrors * 2}):`,
            error.message || "Unknown network error",
          );
          this.lastErrorLog = now;
        }

        // For network errors, use exponential backoff
        const backoffMultiplier = Math.min(
          3,
          1.5 + this.consecutiveErrors * 0.1,
        );
        this.currentPollDelay = Math.min(
          60000,
          this.currentPollDelay * backoffMultiplier,
        );

        // Activate circuit breaker for repeated network errors
        if (this.consecutiveErrors >= this.maxErrors) {
          console.warn("⚡ Activating circuit breaker due to network issues");
          this.circuitBreakerOpen = true;
          this.lastCircuitBreakerReset = Date.now();
        }

        // Be more patient with network errors
        if (this.consecutiveErrors >= this.maxErrors * 2) {
          console.error("❌ Persistent network issues, pausing polling");
          this.stopPolling();

          // Check network status before restarting
          setTimeout(() => {
            if (this.handlers.size > 0 && navigator.onLine) {
              console.log("🔄 Network restored, restarting polling...");
              this.consecutiveErrors = 0;
              this.currentPollDelay = 4000;
              this.circuitBreakerOpen = false;
              this.startPolling();
            }
          }, 60000); // Wait 1 minute for network issues
          return;
        }
      } else {
        // Rate limit regular error logging too
        const now = Date.now();
        if (now - this.lastErrorLog > 5000) {
          console.warn(
            `⚠️ Polling error (${this.consecutiveErrors}/${this.maxErrors}):`,
            error.message,
          );
          this.lastErrorLog = now;
        }

        // Regular exponential backoff for non-network errors
        this.currentPollDelay = Math.min(20000, this.currentPollDelay * 1.5);

        // Stop if too many errors
        if (this.consecutiveErrors >= this.maxErrors) {
          console.error("❌ Too many errors, stopping polling");
          this.stopPolling();

          // Restart after delay
          setTimeout(() => {
            if (this.handlers.size > 0) {
              console.log("�� Restarting polling...");
              this.consecutiveErrors = 0;
              this.currentPollDelay = 4000;
              this.startPolling();
            }
          }, 30000);
          return;
        }
      }

      // Schedule next poll with backoff delay
      this.scheduleNextPoll();
    }
  }

  /**
   * Schedule next poll with optional custom delay
   */
  private scheduleNextPoll(customDelay?: number): void {
    if (!this.isPolling) return;

    const delay = customDelay || this.currentPollDelay;

    if (this.pollInterval) {
      clearTimeout(this.pollInterval);
      this.pollInterval = null;
    }

    this.pollInterval = setTimeout(async () => {
      try {
        await this.pollForUpdates();
      } catch (error) {
        console.error("❌ Scheduled polling failed:", error);
        // If it's a critical error, increase the delay
        if (this.consecutiveErrors >= this.maxErrors) {
          this.scheduleNextPoll(Math.min(60000, this.currentPollDelay * 2));
        } else {
          this.scheduleNextPoll();
        }
      }
    }, delay);
  }

  /**
   * Setup network event listeners for auto-recovery
   */
  private setupNetworkListeners(): void {
    const handleOnline = () => {
      if (this.isPolling && this.consecutiveErrors > 0) {
        console.log("🌐 Network restored, resetting error count");
        this.consecutiveErrors = 0;
        this.currentPollDelay = 4000; // Reset to normal polling
      }
    };

    const handleOffline = () => {
      console.log("🌐 Network went offline");
    };

    // Remove existing listeners first
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);

    // Add new listeners
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
  }

  /**
   * Handle callback (optimized)
   */
  private async handleCallback(callbackQuery: any): Promise<void> {
    const { data: callbackData, id: callbackId } = callbackQuery;

    // Parse callback
    const parsed = this.parseCallbackData(callbackData);
    if (!parsed) {
      console.log("❌ Invalid callback format:", callbackData);
      return;
    }

    const { action, sessionId } = parsed;

    // Find handler
    const handler = this.handlers.get(sessionId);
    if (!handler) {
      console.log("❌ No handler for session:", sessionId.slice(-8));
      return;
    }

    // Prevent duplicate processing
    if (this.processingCommands.has(sessionId)) {
      console.log("⏳ Command already processing for:", sessionId.slice(-8));
      return;
    }

    console.log("🎯 Processing callback:", {
      action,
      sessionId: sessionId.slice(-8),
    });

    // Special debug for incorrect_email_code
    if (action === "incorrect_email_code") {
      console.log("🚫 Processing incorrect_email_code callback:", {
        action,
        sessionId: sessionId.slice(-8),
        handlerExists: !!handler,
        processingAlready: this.processingCommands.has(sessionId),
      });
    }

    // Process callback
    this.processingCommands.add(sessionId);

    try {
      // Answer callback (fire and forget)
      this.answerCallbackQuery(callbackId, `✅ ${action}`).catch(() => {});

      // Execute callback
      handler.lastUsed = Date.now();
      handler.onCallback(action);
    } catch (error) {
      console.error("❌ Callback error:", error);
    } finally {
      this.processingCommands.delete(sessionId);
    }
  }

  /**
   * Parse callback data
   */
  private parseCallbackData(
    callbackData: string,
  ): { action: string; sessionId: string } | null {
    try {
      const parts = callbackData.split("_");
      if (parts.length < 2) return null;

      let action: string;
      let sessionId: string;

      if (parts[0] === "auth") {
        // Handle compound auth actions like auth_email_code
        if (parts[1] === "email" && parts[2] === "code") {
          action = "auth_email_code";
          sessionId = parts.slice(3).join("_");
        } else {
          action = parts[1];
          sessionId = parts.slice(2).join("_");
        }
      } else if (parts[0] === "incorrect") {
        // Handle compound incorrect actions like incorrect_email_code
        if (parts[1] === "email" && parts[2] === "code") {
          action = "incorrect_email_code";
          sessionId = parts.slice(3).join("_");
          console.log("🔍 Parsed incorrect_email_code callback:", {
            action,
            sessionId,
            callbackData,
          });
        } else {
          action = `incorrect_${parts[1]}`;
          sessionId = parts.slice(2).join("_");
        }
      } else if (parts[0] === "complete") {
        action = "complete";
        sessionId = parts.slice(2).join("_");
      } else if (parts[0] === "check") {
        action = "check_status";
        sessionId = parts.slice(2).join("_");
      } else {
        return null;
      }

      return { action, sessionId };
    } catch {
      return null;
    }
  }

  /**
   * Answer callback query (simplified)
   */
  private async answerCallbackQuery(
    callbackQueryId: string,
    text: string,
  ): Promise<void> {
    if (!this.validateConfiguration()) return;

    try {
      await liteFetch(
        "answerCallbackQuery",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            callback_query_id: callbackQueryId,
            text: text,
            show_alert: false,
          }),
          signal: AbortSignal.timeout(3000),
        },
        TELEGRAM_BOT_TOKEN,
      );
    } catch {
      // Silently handle errors
    }
  }

  /**
   * Stop polling
   */
  stopPolling(): void {
    this.isPolling = false;
    if (this.pollInterval) {
      clearTimeout(this.pollInterval);
      this.pollInterval = null;
    }
    console.log("🛑 Stopped Telegram polling");
  }

  /**
   * Get active handlers count
   */
  getActiveHandlersCount(): number {
    return this.handlers.size;
  }

  /**
   * Get polling status
   */
  getPollingStatus(): {
    isPolling: boolean;
    handlersCount: number;
    consecutiveErrors: number;
    currentDelay: number;
    circuitBreakerOpen: boolean;
  } {
    return {
      isPolling: this.isPolling,
      handlersCount: this.handlers.size,
      consecutiveErrors: this.consecutiveErrors,
      currentDelay: this.currentPollDelay,
      circuitBreakerOpen: this.circuitBreakerOpen,
    };
  }
}

// Create singleton instance
const telegramService = new OptimizedTelegramService();

// Export functions
export const registerSecureCallback = (
  sessionId: string,
  onCallback: (action: string) => void,
): void => {
  telegramService.registerHandler(sessionId, onCallback);
};

export const unregisterSecureCallback = (sessionId: string): void => {
  telegramService.unregisterHandler(sessionId);
};

export const getTelegramPollingStatus = () => {
  return telegramService.getPollingStatus();
};

export default telegramService;
