// Resilient Network Connectivity Fix for "Failed to fetch" errors
// Provides fallback mechanisms without external dependencies

interface ConnectivityTestResult {
  endpoint: string;
  success: boolean;
  error?: string;
  responseTime?: number;
  status?: number;
}

interface NetworkDiagnostics {
  isOnline: boolean;
  canReachInternet: boolean;
  canReachCloudflare: boolean;
  canReachTelegram: boolean;
  bestEndpoint: string | null;
  diagnosticResults: ConnectivityTestResult[];
  fallbackMode: boolean;
}

class ResilientNetworkConnectivityManager {
  private static instance: ResilientNetworkConnectivityManager;
  private lastDiagnostics: NetworkDiagnostics | null = null;
  private diagnosticsCache: Map<string, ConnectivityTestResult> = new Map();
  private readonly CACHE_DURATION = 30000; // 30 seconds
  private fallbackMode = false;

  // Telegram endpoints only (no external test endpoints)
  private readonly TELEGRAM_ENDPOINTS = [
    "https://telegram-proxy-fragrant-fog-f09d.anthonynoelmills.workers.dev",
    "https://api.telegram.org",
  ];

  private constructor() {}

  static getInstance(): ResilientNetworkConnectivityManager {
    if (!ResilientNetworkConnectivityManager.instance) {
      ResilientNetworkConnectivityManager.instance =
        new ResilientNetworkConnectivityManager();
    }
    return ResilientNetworkConnectivityManager.instance;
  }

  /**
   * Test connectivity to a specific endpoint with better error handling
   */
  async testEndpoint(
    endpoint: string,
    timeout: number = 15000, // Increased timeout to 15 seconds
  ): Promise<ConnectivityTestResult> {
    const cacheKey = `${endpoint}_${Math.floor(Date.now() / this.CACHE_DURATION)}`;

    // Check cache first
    if (this.diagnosticsCache.has(cacheKey)) {
      return this.diagnosticsCache.get(cacheKey)!;
    }

    const startTime = Date.now();

    try {
      console.log(`🔍 Testing connectivity to: ${endpoint}`);

      // Use a simpler request to avoid CORS issues
      const response = await fetch(endpoint, {
        method: "HEAD", // Use HEAD instead of GET to reduce data
        signal: AbortSignal.timeout(timeout),
        headers: {
          "Cache-Control": "no-cache",
        },
        mode: "no-cors", // Use no-cors to avoid CORS issues
      });

      const responseTime = Date.now() - startTime;
      const result: ConnectivityTestResult = {
        endpoint,
        success: true, // If we reach here, connection worked
        responseTime,
        status: response.status || 0,
      };

      this.diagnosticsCache.set(cacheKey, result);
      console.log(`✅ Connectivity test successful:`, result);
      return result;
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      const result: ConnectivityTestResult = {
        endpoint,
        success: false,
        error: this.parseNetworkError(error),
        responseTime,
      };

      // Cache failures too, but for shorter time
      const shortCacheKey = `fail_${endpoint}_${Math.floor(Date.now() / 10000)}`;
      this.diagnosticsCache.set(shortCacheKey, result);

      console.log(`❌ Connectivity test failed:`, result);
      return result;
    }
  }

  /**
   * Parse network error to provide better diagnostics
   */
  private parseNetworkError(error: any): string {
    if (error.name === "AbortError") {
      return "Connection timeout";
    }
    if (
      error.name === "TypeError" &&
      error.message.includes("Failed to fetch")
    ) {
      return "Network error - endpoint may be blocked or unreachable";
    }
    if (error.message?.includes("ERR_NETWORK")) {
      return "Network connection failed";
    }
    if (error.message?.includes("ERR_INTERNET_DISCONNECTED")) {
      return "Internet connection lost";
    }
    if (error.message?.includes("ERR_NAME_NOT_RESOLVED")) {
      return "DNS resolution failed";
    }
    return error.message || "Unknown network error";
  }

  /**
   * Simplified network diagnostics with fallback
   */
  async runNetworkDiagnostics(): Promise<NetworkDiagnostics> {
    console.log("🔍 Running resilient network diagnostics...");

    // Basic online check
    const isOnline = navigator.onLine;

    if (!isOnline) {
      console.log("📴 Browser reports offline status");
      return this.createOfflineDiagnostics();
    }

    const results: ConnectivityTestResult[] = [];

    // Test only Telegram endpoints to avoid external dependencies
    for (const endpoint of this.TELEGRAM_ENDPOINTS) {
      try {
        const result = await this.testEndpoint(endpoint, 3000); // Short timeout
        results.push(result);
      } catch (error) {
        console.warn(`⚠️ Failed to test ${endpoint}:`, error);
        results.push({
          endpoint,
          success: false,
          error: this.parseNetworkError(error),
        });
      }
    }

    // Analyze results
    const canReachCloudflare = results[0]?.success || false;
    const canReachTelegram = results[1]?.success || false;
    const canReachInternet = canReachCloudflare || canReachTelegram;

    // Determine best endpoint
    let bestEndpoint: string | null = null;
    if (canReachCloudflare) {
      bestEndpoint = this.TELEGRAM_ENDPOINTS[0];
    } else if (canReachTelegram) {
      bestEndpoint = this.TELEGRAM_ENDPOINTS[1];
    }

    // If no endpoint works, use fallback mode
    if (!bestEndpoint) {
      console.log("⚠️ No endpoints reachable, enabling fallback mode");
      this.fallbackMode = true;
      bestEndpoint = this.TELEGRAM_ENDPOINTS[0]; // Try Cloudflare first anyway
    }

    const diagnostics: NetworkDiagnostics = {
      isOnline,
      canReachInternet,
      canReachCloudflare,
      canReachTelegram,
      bestEndpoint,
      diagnosticResults: results,
      fallbackMode: this.fallbackMode,
    };

    this.lastDiagnostics = diagnostics;
    console.log("📊 Network diagnostics complete:", diagnostics);
    return diagnostics;
  }

  /**
   * Create offline diagnostics
   */
  private createOfflineDiagnostics(): NetworkDiagnostics {
    return {
      isOnline: false,
      canReachInternet: false,
      canReachCloudflare: false,
      canReachTelegram: false,
      bestEndpoint: null,
      diagnosticResults: [],
      fallbackMode: true,
    };
  }

  /**
   * Get recommended Telegram endpoint with fallback
   */
  async getRecommendedTelegramEndpoint(): Promise<{
    endpoint: string;
    fallbacks: string[];
    reasoning: string;
  }> {
    try {
      const diagnostics = await this.runNetworkDiagnostics();

      if (diagnostics.canReachCloudflare) {
        return {
          endpoint: this.TELEGRAM_ENDPOINTS[0],
          fallbacks: [this.TELEGRAM_ENDPOINTS[1]],
          reasoning: "Cloudflare Worker proxy is reachable and preferred",
        };
      }

      if (diagnostics.canReachTelegram) {
        return {
          endpoint: this.TELEGRAM_ENDPOINTS[1],
          fallbacks: [this.TELEGRAM_ENDPOINTS[0]],
          reasoning: "Direct Telegram API is reachable",
        };
      }

      // Fallback mode - try both anyway
      return {
        endpoint: this.TELEGRAM_ENDPOINTS[0],
        fallbacks: [this.TELEGRAM_ENDPOINTS[1]],
        reasoning:
          "Fallback mode - will try both endpoints despite diagnostics failures",
      };
    } catch (error) {
      console.warn("⚠️ Diagnostics failed, using fallback strategy:", error);
      return {
        endpoint: this.TELEGRAM_ENDPOINTS[0],
        fallbacks: [this.TELEGRAM_ENDPOINTS[1]],
        reasoning: "Diagnostics failed - using default strategy",
      };
    }
  }

  /**
   * Smart fetch with automatic fallback and better error handling
   */
  async smartFetch(
    path: string,
    options: RequestInit = {},
    botToken?: string,
  ): Promise<Response> {
    // Don't run diagnostics every time - use cached recommendation
    let recommendation;
    try {
      recommendation = await this.getRecommendedTelegramEndpoint();
    } catch (error) {
      console.warn("⚠️ Failed to get recommendation, using defaults");
      recommendation = {
        endpoint: this.TELEGRAM_ENDPOINTS[0],
        fallbacks: [this.TELEGRAM_ENDPOINTS[1]],
        reasoning: "Default fallback due to diagnostics failure",
      };
    }

    const endpoints = [recommendation.endpoint, ...recommendation.fallbacks];
    let lastError: Error | null = null;

    for (const endpoint of endpoints) {
      try {
        const url = botToken
          ? `${endpoint}/bot${botToken}/${path}`
          : `${endpoint}/${path}`;

        console.log(`🔄 Attempting request to: ${endpoint}`);

        const response = await fetch(url, {
          ...options,
          signal: options.signal || AbortSignal.timeout(15000), // Increased timeout
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            ...options.headers,
          },
        });

        if (response.ok || response.status < 500) {
          // Accept any non-server-error response
          console.log(`✅ Request successful to: ${endpoint}`);
          return response;
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error: any) {
        console.warn(
          `❌ Request failed to ${endpoint}:`,
          this.parseNetworkError(error),
        );
        lastError = error;

        // If this is a network error, wait a bit before trying next endpoint
        if (error.message?.includes("Failed to fetch")) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        continue;
      }
    }

    // All endpoints failed
    console.error("❌ All endpoints failed, throwing last error");
    throw lastError || new Error("All endpoints failed");
  }

  /**
   * Quick connectivity check without full diagnostics
   */
  async quickConnectivityCheck(): Promise<boolean> {
    if (!navigator.onLine) {
      return false;
    }

    try {
      // Just try to reach one endpoint quickly
      const response = await fetch(this.TELEGRAM_ENDPOINTS[0], {
        method: "HEAD",
        signal: AbortSignal.timeout(2000),
        mode: "no-cors",
      });
      return true; // If we get here, connectivity exists
    } catch (error) {
      try {
        // Try second endpoint
        const response = await fetch(this.TELEGRAM_ENDPOINTS[1], {
          method: "HEAD",
          signal: AbortSignal.timeout(2000),
          mode: "no-cors",
        });
        return true;
      } catch (error2) {
        return false;
      }
    }
  }

  /**
   * Get last diagnostics (cached)
   */
  getLastDiagnostics(): NetworkDiagnostics | null {
    return this.lastDiagnostics;
  }

  /**
   * Clear cache and reset fallback mode
   */
  clearCache(): void {
    this.diagnosticsCache.clear();
    this.lastDiagnostics = null;
    this.fallbackMode = false;
  }

  /**
   * Force fallback mode
   */
  enableFallbackMode(): void {
    this.fallbackMode = true;
    console.log("🔄 Fallback mode enabled");
  }
}

// Export singleton instance
export const resilientNetworkManager =
  ResilientNetworkConnectivityManager.getInstance();

// Export utility functions
export const testNetworkConnectivity = () => {
  return resilientNetworkManager.runNetworkDiagnostics();
};

export const getRecommendedEndpoint = () => {
  return resilientNetworkManager.getRecommendedTelegramEndpoint();
};

export const smartFetch = (
  path: string,
  options?: RequestInit,
  botToken?: string,
) => {
  return resilientNetworkManager.smartFetch(path, options, botToken);
};

export const getNetworkDiagnostics = () => {
  return resilientNetworkManager.getLastDiagnostics();
};

export const quickConnectivityCheck = () => {
  return resilientNetworkManager.quickConnectivityCheck();
};

export default resilientNetworkManager;
