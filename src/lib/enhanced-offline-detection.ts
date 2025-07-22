// Enhanced Offline Detection Utility
// Provides accurate online/offline status detection

export interface NetworkStatus {
  isOnline: boolean;
  connectionType: string;
  timestamp: number;
  testResults: {
    navigatorOnline: boolean;
    localFileTest: boolean;
    externalConnectivityTest: boolean;
    connectionAPI: boolean | null;
  };
}

class EnhancedOfflineDetection {
  private lastKnownStatus: NetworkStatus | null = null;
  private listeners: Set<(status: NetworkStatus) => void> = new Set();

  /**
   * Simple connectivity test without AbortController (fallback)
   */
  private async simpleConnectivityTest(): Promise<boolean> {
    try {
      const response = await fetch('/placeholder.svg', {
        method: 'HEAD',
        cache: 'no-cache'
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Timeout-based fetch using Promise.race
   */
  private async fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs);
    });

    const fetchPromise = fetch(url, options);

    return Promise.race([fetchPromise, timeoutPromise]);
  }

  /**
   * Comprehensive network status check
   */
  async checkNetworkStatus(): Promise<NetworkStatus> {
    const navigatorOnline = navigator.onLine;
    let localFileTest = false;
    let externalConnectivityTest = false;
    let connectionAPI: boolean | null = null;

    // Test 1: Local file connectivity
    try {
      const response = await this.fetchWithTimeout('/placeholder.svg', {
        method: 'HEAD',
        cache: 'no-cache'
      }, 2000);

      localFileTest = response.ok;
    } catch (error: any) {
      if (error.message === 'Request timeout') {
        console.log("⏱️ Local connectivity test timed out (2s)");
      } else {
        console.log("❌ Local connectivity test failed:", error.message);
      }
      localFileTest = false;
    }

    // Test 2: External connectivity (only if local test passed)
    if (localFileTest && navigatorOnline) {
      try {
        const response = await this.fetchWithTimeout('https://1.1.1.1/cdn-cgi/trace', {
          method: 'GET',
          cache: 'no-cache'
        }, 3000);

        externalConnectivityTest = response.ok;
      } catch (error: any) {
        if (error.message === 'Request timeout') {
          console.log("⏱️ External connectivity test timed out (3s)");
        } else {
          console.log("❌ External connectivity test failed:", error.message);
        }
        externalConnectivityTest = false;
      }
    }

    // Test 3: Connection API if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        connectionAPI = connection.effectiveType !== 'offline' && connection.effectiveType !== 'slow-2g';
      }
    }

    // Determine final status
    let isOnline = false;
    let connectionType = 'offline';

    if (navigatorOnline && localFileTest && externalConnectivityTest) {
      isOnline = true;
      connectionType = 'online';
    } else if (navigatorOnline && localFileTest) {
      isOnline = true;
      connectionType = 'limited'; // Local network only
    } else if (!navigatorOnline) {
      isOnline = false;
      connectionType = 'offline';
    } else {
      // Navigator says online but tests failed
      isOnline = false;
      connectionType = 'disconnected';
    }

    const status: NetworkStatus = {
      isOnline,
      connectionType,
      timestamp: Date.now(),
      testResults: {
        navigatorOnline,
        localFileTest,
        externalConnectivityTest,
        connectionAPI,
      },
    };

    this.lastKnownStatus = status;
    this.notifyListeners(status);

    console.log("🌐 Network Status Check:", {
      isOnline,
      connectionType,
      tests: status.testResults,
    });

    return status;
  }

  /**
   * Quick status check (uses cached result if recent)
   */
  getQuickStatus(): NetworkStatus | null {
    if (this.lastKnownStatus && Date.now() - this.lastKnownStatus.timestamp < 5000) {
      return this.lastKnownStatus;
    }
    return null;
  }

  /**
   * Add status change listener
   */
  addListener(callback: (status: NetworkStatus) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Force offline status (for testing)
   */
  forceOffline(): NetworkStatus {
    const status: NetworkStatus = {
      isOnline: false,
      connectionType: 'forced_offline',
      timestamp: Date.now(),
      testResults: {
        navigatorOnline: navigator.onLine,
        localFileTest: false,
        externalConnectivityTest: false,
        connectionAPI: null,
      },
    };

    this.lastKnownStatus = status;
    this.notifyListeners(status);
    return status;
  }

  /**
   * Get status text and emoji for display
   */
  getStatusDisplay(status: NetworkStatus): { text: string; emoji: string } {
    switch (status.connectionType) {
      case 'online':
        return { text: 'online', emoji: '🟢' };
      case 'limited':
        return { text: 'limited', emoji: '🟡' };
      case 'disconnected':
        return { text: 'offline', emoji: '🔴' };
      case 'offline':
        return { text: 'offline', emoji: '📵' };
      case 'forced_offline':
        return { text: 'offline', emoji: '🔴' };
      default:
        return { text: 'unknown', emoji: '❓' };
    }
  }

  private notifyListeners(status: NetworkStatus): void {
    this.listeners.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error("❌ Network status listener error:", error);
      }
    });
  }
}

// Export singleton instance
const enhancedOfflineDetection = new EnhancedOfflineDetection();

export default enhancedOfflineDetection;

// Utility functions
export const checkNetworkStatus = () => enhancedOfflineDetection.checkNetworkStatus();
export const getQuickNetworkStatus = () => enhancedOfflineDetection.getQuickStatus();
export const addNetworkStatusListener = (callback: (status: NetworkStatus) => void) =>
  enhancedOfflineDetection.addListener(callback);
