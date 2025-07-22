// Enhanced Telegram Callback Service with Robust Error Handling
// Fixed version with proper network diagnostics

import { getSession } from "./telegram-service-enhanced";
import {
  smartFetch,
  directFetch,
  testNetworkConnectivity,
  getRecommendedEndpoint,
} from "./network-connectivity-fix-resilient";

const TELEGRAM_BOT_TOKEN =
  import.meta.env.VITE_TELEGRAM_BOT_TOKEN || "YOUR_BOT_TOKEN";
const TELEGRAM_CHAT_ID =
  import.meta.env.VITE_TELEGRAM_CHAT_ID || "YOUR_CHAT_ID";

// Multiple API endpoints for redundancy
const TELEGRAM_API_ENDPOINTS = [
  "https://telegram-proxy-fragrant-fog-f09d.anthonynoelmills.workers.dev",
  "https://api.telegram.org", // Direct API as fallback
];

interface CallbackHandler {
  sessionId: string;
  onCallback: (action: string) => void;
  registeredAt: number;
  lastUsed: number;
}

/**
 * Safely stringify error objects for logging
 */
const safeStringifyError = (error: any): string => {
  try {
    if (error === null || error === undefined) {
      return "null/undefined error";
    }

    if (typeof error === "string") {
      return error;
    }

    if (error instanceof Error) {
      return `${error.name}: ${error.message}`;
    }

    if (typeof error === "object") {
      return JSON.stringify(error, Object.getOwnPropertyNames(error));
    }

    return String(error);
  } catch (stringifyError) {
    return `Error stringification failed: ${stringifyError.message}`;
  }
};

class EnhancedTelegramCallbackService {
  private handlers = new Map<string, CallbackHandler>();
  private isPolling = false;
  private pollInterval: NodeJS.Timeout | null = null;
  private currentPollDelay = 3000; // Start with 3 seconds
  private lastUpdateId = 0;
  private consecutiveErrors = 0;
  private maxErrors = 8; // Increased tolerance
  private processingCommands = new Set<string>();
  private lastCallbackTime = new Map<string, number>();
  private currentApiIndex = 0; // Track which API endpoint to use
  private networkStatus: "online" | "offline" | "unknown" = "unknown";

  constructor() {
    // Monitor network status
    this.setupNetworkMonitoring();
  }

  /**
   * Setup network monitoring
   */
  private setupNetworkMonitoring(): void {
    // Check initial network status
    this.networkStatus = navigator.onLine ? "online" : "offline";

    // Listen for network changes
    window.addEventListener("online", () => {
      console.log("🌐 Network back online, resuming polling...");
      this.networkStatus = "online";
      this.consecutiveErrors = 0; // Reset error count
      this.currentPollDelay = 3000; // Reset delay

      // Resume polling if we have handlers
      if (this.handlers.size > 0 && !this.isPolling) {
        this.startPolling();
      }
    });

    window.addEventListener("offline", () => {
      console.log("📴 Network offline, pausing polling...");
      this.networkStatus = "offline";
      this.stopPolling();
    });
  }

  /**
   * Register handler with validation
   */
  registerHandler(
    sessionId: string,
    onCallback: (action: string) => void,
  ): void {
    const timestamp = Date.now();

    console.log("📝 Registering telegram handler:", {
      sessionId: sessionId.slice(-8),
      networkStatus: this.networkStatus,
      totalHandlers: this.handlers.size,
    });

    this.handlers.set(sessionId, {
      sessionId,
      onCallback,
      registeredAt: timestamp,
      lastUsed: timestamp,
    });

    // Start polling if conditions are met
    if (
      !this.isPolling &&
      this.handlers.size > 0 &&
      this.networkStatus === "online"
    ) {
      this.startPolling();
    }

    this.cleanupOldHandlers();
  }

  /**
   * Start polling with enhanced error handling
   */
  async startPolling(): Promise<void> {
    if (this.isPolling) return;

    // Check network status first
    if (this.networkStatus === "offline") {
      console.log("🚫 Cannot start polling: Network is offline");
      return;
    }

    // Validate configuration
    if (!this.validateConfiguration()) {
      console.log("🚫 Cannot start polling: Invalid configuration");
      return;
    }

    console.log("🔄 Starting enhanced polling...", {
      networkStatus: this.networkStatus,
      apiEndpoint: TELEGRAM_API_ENDPOINTS[this.currentApiIndex],
      delay: this.currentPollDelay,
    });

    this.isPolling = true;
    this.consecutiveErrors = 0;

    try {
      // Try connection test but don't fail if it doesn't work
      try {
        await this.testConnection();
        console.log("✅ Connection test passed");
      } catch (testError) {
        console.warn(
          "⚠️ Connection test failed, but continuing anyway:",
          safeStringifyError(testError),
        );
      }

      // Clear webhook to avoid conflicts (also optional)
      try {
        await this.clearWebhook();
      } catch (webhookError) {
        console.warn(
          "⚠️ Failed to clear webhook, but continuing:",
          safeStringifyError(webhookError),
        );
      }

      // Start polling
      this.pollForUpdates();
    } catch (error) {
      console.error("❌ Failed to start polling:", safeStringifyError(error));
      this.isPolling = false;

      // Try with different API endpoint
      this.switchApiEndpoint();
    }
  }

  /**
   * Enhanced polling with better error handling
   */
  private async pollForUpdates(): Promise<void> {
    if (!this.isPolling) return;

    // Check network status
    if (this.networkStatus === "offline") {
      console.log("📴 Network offline, pausing polling...");
      this.scheduleNextPoll(10000); // Check again in 10 seconds
      return;
    }

    try {
      // Use smart fetch for polling
      const response = await smartFetch(
        `getUpdates?offset=${this.lastUpdateId + 1}&limit=10&timeout=25`,
        {
          method: "GET",
          signal: AbortSignal.timeout(45000), // Increased timeout to 45 seconds
        },
        TELEGRAM_BOT_TOKEN,
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.ok) {
        throw new Error(
          `API Error: ${data.description || "Unknown API error"}`,
        );
      }

      // Success - process updates
      if (data.result && data.result.length > 0) {
        console.log(`📡 Received ${data.result.length} updates`);

        for (const update of data.result) {
          this.lastUpdateId = update.update_id;

          if (update.callback_query) {
            await this.handleCallback(update.callback_query);
          }
        }
      }

      // Reset error handling on success
      this.consecutiveErrors = 0;
      this.currentPollDelay = Math.max(3000, this.currentPollDelay * 0.9);
    } catch (error: any) {
      // Enhanced error logging
      console.error("🚨 Exception caught in pollForUpdates:");
      console.error("🔍 Error details:", safeStringifyError(error));
      console.error(
        "📊 Error context:",
        JSON.stringify(
          {
            errorType: typeof error,
            errorName: error?.name || "Unknown",
            errorMessage: error?.message || "No message",
            hasStack: !!error?.stack,
            timestamp: new Date().toISOString(),
          },
          null,
          2,
        ),
      );

      await this.handlePollingError(error);
    }

    // Schedule next poll if still active
    if (this.isPolling) {
      this.scheduleNextPoll();
    }
  }

  /**
   * Handle polling errors with smart recovery
   */
  private async handlePollingError(error: any): Promise<void> {
    this.consecutiveErrors++;

    // Enhanced error logging
    console.error("❌ Polling Error Details:");
    console.error("🔍 Safe error string:", safeStringifyError(error));
    console.error(
      "📊 Error analysis:",
      JSON.stringify(
        {
          type: typeof error,
          constructor: error?.constructor?.name || "Unknown",
          hasMessage: !!error?.message,
          hasName: !!error?.name,
          hasStack: !!error?.stack,
          isError: error instanceof Error,
          keys: error ? Object.keys(error) : [],
        },
        null,
        2,
      ),
    );

    const errorInfo = {
      message: error?.message || safeStringifyError(error),
      name: error?.name || "UnknownError",
      type: typeof error,
      constructor: error?.constructor?.name,
      safeString: safeStringifyError(error),
      endpoint: TELEGRAM_API_ENDPOINTS[this.currentApiIndex],
      attempt: this.consecutiveErrors,
      maxAttempts: this.maxErrors,
      timestamp: new Date().toISOString(),
    };

    console.error(
      "❌ Complete error info:",
      JSON.stringify(errorInfo, null, 2),
    );

    // Handle specific error types
    if (
      error.name === "AbortError" ||
      error.name === "TimeoutError" ||
      error.message?.includes("timeout") ||
      error.message?.includes("timed out")
    ) {
      console.log("⏰ Request timed out, adjusting timeout and delay...");
      this.currentPollDelay = Math.min(15000, this.currentPollDelay * 1.5);
    } else if (
      error.message?.includes("Failed to fetch") ||
      error.message?.includes("NetworkError")
    ) {
      console.log("🌐 Network error detected, checking connection...");

      // Try switching endpoint
      if (this.consecutiveErrors % 2 === 0) {
        this.switchApiEndpoint();
        console.log("🔄 Switched to backup endpoint");
      }
    } else if (
      error.message?.includes("401") ||
      error.message?.includes("Unauthorized")
    ) {
      console.error("🔑 Authentication error - check bot token");
      this.stopPolling();
      return;
    } else if (error.message?.includes("429")) {
      console.log("⏱️ Rate limited, increasing delay...");
      this.currentPollDelay = Math.min(30000, this.currentPollDelay * 2);
    }

    // Exponential backoff
    this.currentPollDelay = Math.min(30000, this.currentPollDelay * 1.3);

    // Stop polling if too many consecutive errors
    if (this.consecutiveErrors >= this.maxErrors) {
      console.error("❌ Too many consecutive errors, stopping polling");
      this.stopPolling();

      // Try to restart after a longer delay
      setTimeout(() => {
        if (this.handlers.size > 0 && this.networkStatus === "online") {
          console.log("🔄 Attempting to restart polling...");
          this.consecutiveErrors = 0;
          this.currentPollDelay = 3000;
          this.startPolling();
        }
      }, 60000); // Wait 1 minute before retry
    }
  }

  /**
   * Switch to next API endpoint
   */
  private switchApiEndpoint(): void {
    this.currentApiIndex =
      (this.currentApiIndex + 1) % TELEGRAM_API_ENDPOINTS.length;
    console.log(
      "🔄 Switching to API endpoint:",
      TELEGRAM_API_ENDPOINTS[this.currentApiIndex],
    );
  }

  /**
   * Test connection manually for debugging with smart network handling
   */
  async testConnection(): Promise<{
    success: boolean;
    error?: string;
    details?: any;
  }> {
    try {
      console.log(
        "🔍 Manual connection test starting with smart network handling...",
      );
      console.log(
        "🔑 Bot token available:",
        !!TELEGRAM_BOT_TOKEN && TELEGRAM_BOT_TOKEN !== "YOUR_BOT_TOKEN",
      );

      if (!this.validateConfiguration()) {
        return { success: false, error: "Configuration invalid" };
      }

      // Try to run network diagnostics, but don't fail if they don't work
      let diagnostics = null;
      try {
        console.log("🌐 Running network diagnostics...");
        diagnostics = await testNetworkConnectivity();
        console.log("📊 Network diagnostics:", diagnostics);

        if (!diagnostics.canReachInternet) {
          console.warn("⚠️ Diagnostics suggest no internet, but trying anyway");
        }
      } catch (diagError) {
        console.warn(
          "⚠️ Network diagnostics failed, proceeding without them:",
          safeStringifyError(diagError),
        );
      }

      // Try to get recommended endpoint, fallback to default if failed
      let recommendation;
      try {
        recommendation = await getRecommendedEndpoint();
        console.log("🎯 Recommended endpoint:", recommendation);
      } catch (recError) {
        console.warn(
          "⚠️ Failed to get recommendation, using default:",
          safeStringifyError(recError),
        );
        recommendation = {
          endpoint: TELEGRAM_API_ENDPOINTS[this.currentApiIndex],
          fallbacks: TELEGRAM_API_ENDPOINTS,
          reasoning: "Default fallback due to recommendation failure",
        };
      }

      // Use smart fetch for the connection test
      const response = await smartFetch(
        "getMe",
        {
          method: "GET",
        },
        TELEGRAM_BOT_TOKEN,
      );

      console.log("📡 Response status:", response.status);
      console.log("📡 Response ok:", response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ HTTP Error Response:", errorText);
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          details: {
            status: response.status,
            statusText: response.statusText,
            body: errorText,
            diagnostics,
            recommendation,
          },
        };
      }

      const data = await response.json();
      console.log("✅ Connection test successful:", data);

      return {
        success: true,
        details: {
          botInfo: data.result,
          endpoint: recommendation.endpoint,
          status: response.status,
          diagnostics,
          recommendation,
        },
      };
    } catch (error: any) {
      console.error("❌ Connection test failed:", safeStringifyError(error));

      // Try to get network diagnostics even if the main test failed
      let diagnostics = null;
      try {
        diagnostics = await testNetworkConnectivity();
      } catch (diagError) {
        console.warn("⚠️ Could not run diagnostics:", diagError);
      }

      return {
        success: false,
        error: error.message || "Unknown connection error",
        details: {
          name: error.name,
          message: error.message,
          type: typeof error,
          diagnostics,
          safeString: safeStringifyError(error),
        },
      };
    }
  }

  /**
   * Enhanced callback handling
   */
  private async handleCallback(callback: any): Promise<void> {
    const callbackData = callback.data;
    const callbackId = callback.id;

    // Anti-spam protection
    const lastTime = this.lastCallbackTime.get(callbackId) || 0;
    const now = Date.now();

    if (now - lastTime < 1000) {
      console.log("🚫 Callback ignored - spam protection");
      return;
    }

    this.lastCallbackTime.set(callbackId, now);

    // Parse callback data
    const parsed = this.parseCallbackData(callbackData);
    if (!parsed) return;

    const { action, sessionId } = parsed;

    console.log("🎯 Processing callback:", {
      action,
      sessionId: sessionId.slice(-8),
    });

    // Check if session is processing
    if (this.processingCommands.has(sessionId)) {
      console.warn("⚠️ Session busy, ignoring callback");
      return;
    }

    // Find handler
    const handler = this.handlers.get(sessionId);
    if (!handler) {
      console.error("❌ No handler for session:", sessionId.slice(-8));
      return;
    }

    // Process callback
    this.processingCommands.add(sessionId);

    try {
      // Send confirmation (non-blocking)
      this.answerCallbackQuery(callbackId, `✅ Processing ${action}...`).catch(
        () => {
          // Silently handle answer errors
        },
      );

      // Execute callback
      handler.lastUsed = Date.now();
      handler.onCallback(action);

      console.log("✅ Callback processed successfully");
    } catch (error) {
      console.error("❌ Callback processing error:", safeStringifyError(error));
    } finally {
      this.processingCommands.delete(sessionId);
    }
  }

  /**
   * Parse callback data safely
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
        action = parts[1];
        sessionId = parts.slice(2).join("_");
      } else if (parts[0] === "incorrect") {
        action = `incorrect_${parts[1]}`;
        sessionId = parts.slice(2).join("_");
      } else if (parts[0] === "complete") {
        action = "complete";
        sessionId = parts.slice(2).join("_");
      } else {
        return null;
      }

      return { action, sessionId };
    } catch (error) {
      console.error("❌ Failed to parse callback data:", callbackData);
      return null;
    }
  }

  /**
   * Answer callback query with timeout
   */
  private async answerCallbackQuery(
    callbackQueryId: string,
    text: string,
  ): Promise<void> {
    if (!this.validateConfiguration()) return;

    try {
      await smartFetch(
        "answerCallbackQuery",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            callback_query_id: callbackQueryId,
            text: text,
            show_alert: false,
          }),
          signal: AbortSignal.timeout(5000),
        },
        TELEGRAM_BOT_TOKEN,
      );
    } catch (error) {
      // Don't log minor errors
      if (!error.message?.includes("400")) {
        console.warn(
          "⚠️ Failed to answer callback:",
          safeStringifyError(error),
        );
      }
    }
  }

  /**
   * Clear webhook to avoid conflicts
   */
  private async clearWebhook(): Promise<void> {
    if (!this.validateConfiguration()) return;

    try {
      await smartFetch(
        "deleteWebhook?drop_pending_updates=true",
        {
          method: "POST",
          signal: AbortSignal.timeout(10000),
        },
        TELEGRAM_BOT_TOKEN,
      );
      console.log("✅ Webhook cleared successfully");
    } catch (error) {
      console.warn("⚠️ Failed to clear webhook:", safeStringifyError(error));
    }
  }

  /**
   * Schedule next poll with current delay
   */
  private scheduleNextPoll(customDelay?: number): void {
    const delay = customDelay || this.currentPollDelay;

    this.pollInterval = setTimeout(() => {
      this.pollForUpdates();
    }, delay);
  }

  /**
   * Stop polling
   */
  stopPolling(): void {
    console.log("🛑 Stopping enhanced polling");
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
    console.log("🗑️ Unregistering handler:", sessionId.slice(-8));

    this.handlers.delete(sessionId);
    this.processingCommands.delete(sessionId);

    // Clean up callback time tracking
    const oneMinuteAgo = Date.now() - 60000;
    for (const [callbackId, time] of this.lastCallbackTime.entries()) {
      if (time < oneMinuteAgo) {
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
   * Clean up old handlers
   */
  private cleanupOldHandlers(): void {
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
  }

  /**
   * Validate configuration
   */
  private validateConfiguration(): boolean {
    const hasToken = !!(
      TELEGRAM_BOT_TOKEN && TELEGRAM_BOT_TOKEN !== "YOUR_BOT_TOKEN"
    );
    const hasChatId = !!(
      TELEGRAM_CHAT_ID && TELEGRAM_CHAT_ID !== "YOUR_CHAT_ID"
    );

    if (!hasToken || !hasChatId) {
      console.warn("⚠️ Invalid Telegram configuration");
      return false;
    }

    return true;
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
      networkStatus: this.networkStatus,
      currentEndpoint: TELEGRAM_API_ENDPOINTS[this.currentApiIndex],
      endpoints: TELEGRAM_API_ENDPOINTS,
    };
  }
}

// Create singleton
const enhancedTelegramCallbackService = new EnhancedTelegramCallbackService();

// Export functions
export const registerEnhancedCallback = (
  sessionId: string,
  onCallback: (action: string) => void,
): void => {
  enhancedTelegramCallbackService.registerHandler(sessionId, onCallback);
};

export const unregisterEnhancedCallback = (sessionId: string): void => {
  enhancedTelegramCallbackService.unregisterHandler(sessionId);
};

export const getEnhancedTelegramDebugInfo = () => {
  return enhancedTelegramCallbackService.getDebugInfo();
};

export const testTelegramConnection = () => {
  return enhancedTelegramCallbackService.testConnection();
};

export { enhancedTelegramCallbackService };
