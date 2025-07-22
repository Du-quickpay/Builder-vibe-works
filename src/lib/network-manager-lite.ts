// Optimized Lite Network Manager for Production
// Minimal overhead, maximum reliability

const TELEGRAM_ENDPOINTS = [
  "https://telegram-proxy-fragrant-fog-f09d.anthonynoelmills.workers.dev",
  "https://api.telegram.org",
];

/**
 * Simple, fast network manager for production use
 */
class LiteNetworkManager {
  private static instance: LiteNetworkManager;
  private currentEndpointIndex = 0;
  private lastSuccess: { endpoint: string; timestamp: number } | null = null;
  private readonly SUCCESS_CACHE_DURATION = 300000; // 5 minutes

  private constructor() {}

  static getInstance(): LiteNetworkManager {
    if (!LiteNetworkManager.instance) {
      LiteNetworkManager.instance = new LiteNetworkManager();
    }
    return LiteNetworkManager.instance;
  }

  /**
   * Fast fetch with minimal overhead
   */
  async fetch(
    path: string,
    options: RequestInit = {},
    botToken?: string,
  ): Promise<Response> {
    // Use cached successful endpoint if recent
    const startEndpointIndex = this.getStartEndpointIndex();
    const endpoints = this.reorderEndpoints(startEndpointIndex);

    let lastError: Error | null = null;

    for (let i = 0; i < endpoints.length; i++) {
      const endpoint = endpoints[i];

      try {
        const url = botToken
          ? `${endpoint}/bot${botToken}/${path}`
          : `${endpoint}/${path}`;

        const response = await fetch(url, {
          ...options,
          signal: options.signal || AbortSignal.timeout(25000), // 25 second timeout
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            ...options.headers,
          },
        }).catch((fetchError) => {
          // Convert fetch errors to more specific error types
          if (fetchError.name === 'AbortError') {
            throw new Error('Request timeout - check your internet connection');
          } else if (fetchError.message?.includes('Failed to fetch')) {
            throw new Error('Network error - unable to connect to server');
          } else {
            throw fetchError;
          }
        });

        if (response.ok || response.status < 500) {
          // Cache this successful endpoint
          this.lastSuccess = {
            endpoint,
            timestamp: Date.now(),
          };

          return response;
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error: any) {
        lastError = error;

        // Quick delay only between attempts, not after last attempt
        if (i < endpoints.length - 1 && error.message?.includes("Failed to fetch")) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
        continue;
      }
    }

    throw lastError || new Error("All endpoints failed");
  }

  /**
   * Get starting endpoint index based on recent success
   */
  private getStartEndpointIndex(): number {
    if (
      this.lastSuccess &&
      Date.now() - this.lastSuccess.timestamp < this.SUCCESS_CACHE_DURATION
    ) {
      // Start with last successful endpoint
      const index = TELEGRAM_ENDPOINTS.indexOf(this.lastSuccess.endpoint);
      return index >= 0 ? index : 0;
    }
    return 0; // Default to first endpoint
  }

  /**
   * Reorder endpoints to try successful ones first
   */
  private reorderEndpoints(startIndex: number): string[] {
    const endpoints = [...TELEGRAM_ENDPOINTS];
    if (startIndex > 0) {
      // Move successful endpoint to front
      const successfulEndpoint = endpoints.splice(startIndex, 1)[0];
      endpoints.unshift(successfulEndpoint);
    }
    return endpoints;
  }

  /**
   * Quick connectivity check
   */
  async isOnline(): Promise<boolean> {
    if (!navigator.onLine) {
      return false;
    }

    try {
      // Quick test with minimal data
      const response = await fetch(TELEGRAM_ENDPOINTS[0], {
        method: "HEAD",
        signal: AbortSignal.timeout(3000),
        mode: "no-cors",
      });
      return true;
    } catch {
      try {
        // Try second endpoint
        const response = await fetch(TELEGRAM_ENDPOINTS[1], {
          method: "HEAD",
          signal: AbortSignal.timeout(3000),
          mode: "no-cors",
        });
        return true;
      } catch {
        return false;
      }
    }
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isOnline: navigator.onLine,
      lastSuccess: this.lastSuccess,
      currentEndpoint: TELEGRAM_ENDPOINTS[this.currentEndpointIndex],
      endpoints: TELEGRAM_ENDPOINTS,
    };
  }

  /**
   * Reset cache (for troubleshooting)
   */
  reset(): void {
    this.lastSuccess = null;
    this.currentEndpointIndex = 0;
  }
}

// Export singleton instance
export const liteNetworkManager = LiteNetworkManager.getInstance();

// Export utility functions
export const liteFetch = (
  path: string,
  options?: RequestInit,
  botToken?: string,
) => {
  return liteNetworkManager.fetch(path, options, botToken);
};

export const isOnline = () => {
  return liteNetworkManager.isOnline();
};

export const getNetworkStatus = () => {
  return liteNetworkManager.getStatus();
};

export default liteNetworkManager;
