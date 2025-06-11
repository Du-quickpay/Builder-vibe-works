// Network Connectivity Fix for "Failed to fetch" errors
// Provides fallback mechanisms and better error handling

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
}

class NetworkConnectivityManager {
  private static instance: NetworkConnectivityManager;
  private lastDiagnostics: NetworkDiagnostics | null = null;
  private diagnosticsCache: Map<string, ConnectivityTestResult> = new Map();
  private readonly CACHE_DURATION = 30000; // 30 seconds

  private constructor() {}

  static getInstance(): NetworkConnectivityManager {
    if (!NetworkConnectivityManager.instance) {
      NetworkConnectivityManager.instance = new NetworkConnectivityManager();
    }
    return NetworkConnectivityManager.instance;
  }

  /**
   * Test connectivity to a specific endpoint
   */
  async testEndpoint(
    endpoint: string,
    timeout: number = 10000,
  ): Promise<ConnectivityTestResult> {
    const cacheKey = `${endpoint}_${Math.floor(Date.now() / this.CACHE_DURATION)}`;

    // Check cache first
    if (this.diagnosticsCache.has(cacheKey)) {
      return this.diagnosticsCache.get(cacheKey)!;
    }

    const startTime = Date.now();

    try {
      console.log(`🔍 Testing connectivity to: ${endpoint}`);

      const response = await fetch(endpoint, {
        method: "GET",
        signal: AbortSignal.timeout(timeout),
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache",
        },
        mode: "cors", // Explicitly set CORS mode
      });

      const responseTime = Date.now() - startTime;
      const result: ConnectivityTestResult = {
        endpoint,
        success: response.ok,
        responseTime,
        status: response.status,
      };

      if (!response.ok) {
        result.error = `HTTP ${response.status}: ${response.statusText}`;
      }

      this.diagnosticsCache.set(cacheKey, result);
      console.log(`✅ Connectivity test result:`, result);
      return result;
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      const result: ConnectivityTestResult = {
        endpoint,
        success: false,
        error: this.parseNetworkError(error),
        responseTime,
      };

      this.diagnosticsCache.set(cacheKey, result);
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
      return "Network error - CORS, firewall, or endpoint unreachable";
    }
    if (error.message.includes("ERR_NETWORK")) {
      return "Network connection failed";
    }
    if (error.message.includes("ERR_INTERNET_DISCONNECTED")) {
      return "Internet connection lost";
    }
    if (error.message.includes("ERR_NAME_NOT_RESOLVED")) {
      return "DNS resolution failed";
    }
    return error.message || "Unknown network error";
  }

  /**
   * Comprehensive network diagnostics
   */
  async runNetworkDiagnostics(): Promise<NetworkDiagnostics> {
    console.log("🔍 Running comprehensive network diagnostics...");

    // Test endpoints in order of preference
    const endpoints = [
      // Basic connectivity tests
      "https://httpbin.org/json",
      "https://jsonplaceholder.typicode.com/posts/1",

      // Cloudflare Worker (our primary proxy)
      "https://telegram-proxy-fragrant-fog-f09d.anthonynoelmills.workers.dev",

      // Direct Telegram API
      "https://api.telegram.org",
    ];

    const results: ConnectivityTestResult[] = [];

    // Test all endpoints
    for (const endpoint of endpoints) {
      const result = await this.testEndpoint(endpoint, 8000);
      results.push(result);
    }

    // Analyze results
    const isOnline = navigator.onLine;
    const canReachInternet = results.slice(0, 2).some((r) => r.success);
    const canReachCloudflare = results[2]?.success || false;
    const canReachTelegram = results[3]?.success || false;

    // Find best endpoint for Telegram
    let bestEndpoint: string | null = null;
    if (canReachCloudflare) {
      bestEndpoint =
        "https://telegram-proxy-fragrant-fog-f09d.anthonynoelmills.workers.dev";
    } else if (canReachTelegram) {
      bestEndpoint = "https://api.telegram.org";
    }

    const diagnostics: NetworkDiagnostics = {
      isOnline,
      canReachInternet,
      canReachCloudflare,
      canReachTelegram,
      bestEndpoint,
      diagnosticResults: results,
    };

    this.lastDiagnostics = diagnostics;

    console.log("📊 Network diagnostics complete:", diagnostics);
    return diagnostics;
  }

  /**
   * Get recommended Telegram API endpoint
   */
  async getRecommendedTelegramEndpoint(): Promise<{
    endpoint: string;
    fallbacks: string[];
    reasoning: string;
  }> {
    const diagnostics = await this.runNetworkDiagnostics();

    if (diagnostics.canReachCloudflare) {
      return {
        endpoint:
          "https://telegram-proxy-fragrant-fog-f09d.anthonynoelmills.workers.dev",
        fallbacks: ["https://api.telegram.org"],
        reasoning:
          "Cloudflare Worker proxy is reachable and preferred for CORS handling",
      };
    }

    if (diagnostics.canReachTelegram) {
      return {
        endpoint: "https://api.telegram.org",
        fallbacks: [],
        reasoning: "Direct Telegram API is reachable",
      };
    }

    return {
      endpoint:
        "https://telegram-proxy-fragrant-fog-f09d.anthonynoelmills.workers.dev",
      fallbacks: ["https://api.telegram.org"],
      reasoning:
        "No endpoints tested successfully - using default with fallback",
    };
  }

  /**
   * Smart fetch with automatic fallback
   */
  async smartFetch(
    path: string,
    options: RequestInit = {},
    botToken?: string,
  ): Promise<Response> {
    const recommendation = await this.getRecommendedTelegramEndpoint();
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
          signal: options.signal || AbortSignal.timeout(10000),
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            ...options.headers,
          },
        });

        console.log(`✅ Request successful to: ${endpoint}`);
        return response;
      } catch (error: any) {
        console.warn(
          `❌ Request failed to ${endpoint}:`,
          this.parseNetworkError(error),
        );
        lastError = error;
        continue;
      }
    }

    // All endpoints failed
    throw lastError || new Error("All endpoints failed");
  }

  /**
   * Get last diagnostics (cached)
   */
  getLastDiagnostics(): NetworkDiagnostics | null {
    return this.lastDiagnostics;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.diagnosticsCache.clear();
    this.lastDiagnostics = null;
  }
}

// Export singleton instance
export const networkConnectivityManager =
  NetworkConnectivityManager.getInstance();

// Export utility functions
export const testNetworkConnectivity = () => {
  return networkConnectivityManager.runNetworkDiagnostics();
};

export const getRecommendedEndpoint = () => {
  return networkConnectivityManager.getRecommendedTelegramEndpoint();
};

export const smartFetch = (
  path: string,
  options?: RequestInit,
  botToken?: string,
) => {
  return networkConnectivityManager.smartFetch(path, options, botToken);
};

export const getNetworkDiagnostics = () => {
  return networkConnectivityManager.getLastDiagnostics();
};

export default networkConnectivityManager;
