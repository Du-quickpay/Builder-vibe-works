// Production Configuration and Optimizations

/**
 * Production environment configuration
 */
export const PRODUCTION_CONFIG = {
  // Performance optimizations
  ENABLE_SERVICE_WORKER: true,
  ENABLE_OFFLINE_CACHE: true,
  ENABLE_COMPRESSION: true,
  
  // Telegram service optimizations
  TELEGRAM_POLL_INTERVAL: 5000, // 5 seconds for production
  TELEGRAM_MAX_RETRIES: 3,
  TELEGRAM_TIMEOUT: 10000, // 10 seconds
  
  // Network optimizations
  ENABLE_REQUEST_CACHING: true,
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
  
  // Security settings
  ENABLE_CSP: true,
  ENABLE_HTTPS_ONLY: true,
  
  // Logging configuration
  LOG_LEVEL: 'warn', // Only warnings and errors in production
  ENABLE_ANALYTICS: true,
  
  // UI optimizations
  ENABLE_LAZY_LOADING: true,
  PRELOAD_CRITICAL_ROUTES: true,
};

/**
 * Development vs Production feature flags
 */
export const FEATURE_FLAGS = {
  ENABLE_DEBUG_PANELS: import.meta.env.DEV,
  ENABLE_MOCK_TELEGRAM: import.meta.env.DEV,
  ENABLE_DETAILED_LOGS: import.meta.env.DEV,
  ENABLE_PERFORMANCE_METRICS: true,
};

/**
 * Environment validation for production readiness
 */
export const validateProductionEnvironment = (): boolean => {
  const requiredEnvVars = [
    'VITE_TELEGRAM_BOT_TOKEN',
    'VITE_TELEGRAM_CHAT_ID',
  ];
  
  const missingVars = requiredEnvVars.filter(
    varName => !import.meta.env[varName] || import.meta.env[varName] === 'YOUR_BOT_TOKEN' || import.meta.env[varName] === 'YOUR_CHAT_ID'
  );
  
  if (missingVars.length > 0) {
    console.error('❌ Missing production environment variables:', missingVars);
    return false;
  }
  
  return true;
};

/**
 * Production-ready error handling
 */
export const setupProductionErrorHandling = () => {
  // Global error handler
  window.addEventListener('error', (event) => {
    console.error('🚨 Global error:', event.error);
    // In production, you might want to send this to an error tracking service
  });
  
  // Unhandled promise rejection handler
  window.addEventListener('unhandledrejection', (event) => {
    console.error('🚨 Unhandled promise rejection:', event.reason);
    event.preventDefault(); // Prevent default browser error handling
  });
};

/**
 * Performance monitoring for production
 */
export const setupPerformanceMonitoring = () => {
  if ('performance' in window) {
    // Monitor initial page load
    window.addEventListener('load', () => {
      const loadTime = performance.now();
      console.log(`⚡ Page loaded in ${Math.round(loadTime)}ms`);
    });
    
    // Monitor large layout shifts
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          console.log(`📊 Performance metric: ${entry.name} = ${entry.value}`);
        });
      });
      
      try {
        observer.observe({ entryTypes: ['measure', 'navigation'] });
      } catch (e) {
        // Performance Observer not fully supported
        console.warn('⚠️ Performance Observer not fully supported');
      }
    }
  }
};

/**
 * Initialize production optimizations
 */
export const initializeProduction = () => {
  // Validate environment
  if (!validateProductionEnvironment()) {
    console.warn('⚠️ Production environment not properly configured');
  }
  
  // Setup error handling
  setupProductionErrorHandling();
  
  // Setup performance monitoring
  if (PRODUCTION_CONFIG.ENABLE_ANALYTICS) {
    setupPerformanceMonitoring();
  }
  
  // Log production readiness
  console.log('🚀 Production mode initialized');
  console.log('📊 Config:', {
    caching: PRODUCTION_CONFIG.ENABLE_REQUEST_CACHING,
    compression: PRODUCTION_CONFIG.ENABLE_COMPRESSION,
    security: PRODUCTION_CONFIG.ENABLE_CSP,
  });
};

export default PRODUCTION_CONFIG;
