/**
 * Test utility for IP address fetching
 * این فایل فقط برای تست است و در production نیاز نیست
 */

export const testIpFetching = async (): Promise<void> => {
  console.log('🧪 Testing IP address fetching...');

  const fetchWithTimeout = async (url: string, timeoutMs: number = 5000) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      const response = await fetch(url, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  };

  // Test services one by one
  const services = [
    { name: 'api.ipify.org', url: 'https://api.ipify.org?format=json', field: 'ip' },
    { name: 'httpbin.org', url: 'https://httpbin.org/ip', field: 'origin' },
    { name: 'api.seeip.org', url: 'https://api.seeip.org/jsonip', field: 'ip' },
  ];

  for (const service of services) {
    try {
      console.log(`🔍 Testing ${service.name}...`);
      const response = await fetchWithTimeout(service.url, 3000);
      
      if (response.ok) {
        const data = await response.json();
        const ip = service.field === 'origin' ? data[service.field]?.split(',')[0] : data[service.field];
        console.log(`✅ ${service.name}: ${ip}`);
      } else {
        console.log(`❌ ${service.name}: HTTP ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ ${service.name}: ${error.message}`);
    }
  }

  console.log('🧪 IP fetching test completed');
};

// Auto-run در development
if (import.meta.env.DEV) {
  // Run test after a delay to not block app startup
  setTimeout(testIpFetching, 5000);
}
