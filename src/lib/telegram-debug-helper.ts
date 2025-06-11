// Debug Helper for Telegram API Connectivity Issues

const TELEGRAM_BOT_TOKEN =
  import.meta.env.VITE_TELEGRAM_BOT_TOKEN || "YOUR_BOT_TOKEN";
const TELEGRAM_CHAT_ID =
  import.meta.env.VITE_TELEGRAM_CHAT_ID || "YOUR_CHAT_ID";
const TELEGRAM_API_BASE =
  "https://telegram-proxy-fragrant-fog-f09d.anthonynoelmills.workers.dev";

interface DebugResult {
  success: boolean;
  error?: string;
  data?: any;
  timing?: number;
}

/**
 * Test Cloudflare Worker connectivity
 */
export async function testWorkerConnectivity(): Promise<DebugResult> {
  const startTime = Date.now();

  try {
    console.log("🧪 Testing Cloudflare Worker connectivity...");

    const response = await fetch(TELEGRAM_API_BASE, {
      method: "GET",
      headers: {
        Origin: window.location.origin,
      },
    });

    const timing = Date.now() - startTime;

    if (response.ok) {
      const text = await response.text();
      return {
        success: true,
        data: {
          status: response.status,
          statusText: response.statusText,
          responseText: text.substring(0, 100) + "...",
          headers: Object.fromEntries(response.headers.entries()),
        },
        timing,
      };
    } else {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        timing,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      timing: Date.now() - startTime,
    };
  }
}

/**
 * Test Telegram Bot API through Worker
 */
export async function testTelegramBotAPI(): Promise<DebugResult> {
  const startTime = Date.now();

  try {
    console.log("🤖 Testing Telegram Bot API through Worker...");

    const response = await fetch(
      `${TELEGRAM_API_BASE}/bot${TELEGRAM_BOT_TOKEN}/getMe`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Origin: window.location.origin,
        },
      },
    );

    const timing = Date.now() - startTime;
    const data = await response.json();

    if (response.ok && data.ok) {
      return {
        success: true,
        data: {
          botInfo: data.result,
          status: response.status,
        },
        timing,
      };
    } else {
      return {
        success: false,
        error: data.description || `HTTP ${response.status}`,
        data,
        timing,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      timing: Date.now() - startTime,
    };
  }
}

/**
 * Test sending a simple message
 */
export async function testSendMessage(
  text: string = "🧪 Debug Test Message",
): Promise<DebugResult> {
  const startTime = Date.now();

  try {
    console.log("📤 Testing message sending...");

    const response = await fetch(
      `${TELEGRAM_API_BASE}/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: window.location.origin,
        },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: text,
          parse_mode: "HTML",
        }),
      },
    );

    const timing = Date.now() - startTime;
    const data = await response.json();

    if (response.ok && data.ok) {
      return {
        success: true,
        data: {
          messageId: data.result.message_id,
          status: response.status,
        },
        timing,
      };
    } else {
      return {
        success: false,
        error: data.description || `HTTP ${response.status}`,
        data,
        timing,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      timing: Date.now() - startTime,
    };
  }
}

/**
 * Test editing a message
 */
export async function testEditMessage(
  messageId: number,
  text: string = "🧪 Edited Test Message",
): Promise<DebugResult> {
  const startTime = Date.now();

  try {
    console.log("✏️ Testing message editing...");

    const response = await fetch(
      `${TELEGRAM_API_BASE}/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: window.location.origin,
        },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          message_id: messageId,
          text: text,
          parse_mode: "HTML",
        }),
      },
    );

    const timing = Date.now() - startTime;
    const data = await response.json();

    if (response.ok && data.ok) {
      return {
        success: true,
        data: {
          messageId: messageId,
          status: response.status,
        },
        timing,
      };
    } else {
      return {
        success: false,
        error: data.description || `HTTP ${response.status}`,
        data,
        timing,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      timing: Date.now() - startTime,
    };
  }
}

/**
 * Run comprehensive diagnostic
 */
export async function runTelegramDiagnostic(): Promise<{
  summary: string;
  results: Record<string, DebugResult>;
  recommendations: string[];
}> {
  console.log("🔍 Running comprehensive Telegram diagnostic...");

  const results: Record<string, DebugResult> = {};
  const recommendations: string[] = [];

  // Test 1: Worker connectivity
  results.workerConnectivity = await testWorkerConnectivity();

  // Test 2: Bot API
  results.botAPI = await testTelegramBotAPI();

  // Test 3: Send message (only if bot API works)
  if (results.botAPI.success) {
    results.sendMessage = await testSendMessage();

    // Test 4: Edit message (only if send works)
    if (results.sendMessage.success && results.sendMessage.data?.messageId) {
      results.editMessage = await testEditMessage(
        results.sendMessage.data.messageId,
        "🧪 Test Complete - Diagnostic Passed!",
      );
    }
  }

  // Generate recommendations
  if (!results.workerConnectivity.success) {
    recommendations.push(
      "❌ Cloudflare Worker is not accessible. Check Worker URL and deployment.",
    );
  }

  if (!results.botAPI.success) {
    recommendations.push(
      "❌ Telegram Bot API is not working. Check bot token and Worker configuration.",
    );
  }

  if (results.sendMessage && !results.sendMessage.success) {
    recommendations.push(
      "❌ Message sending failed. Check chat ID and permissions.",
    );
  }

  if (results.editMessage && !results.editMessage.success) {
    recommendations.push(
      "❌ Message editing failed. This might be causing the original error.",
    );
  }

  // Generate summary
  const successCount = Object.values(results).filter((r) => r.success).length;
  const totalCount = Object.values(results).length;

  let summary;
  if (successCount === totalCount) {
    summary = "✅ All tests passed! Telegram API is working correctly.";
  } else if (successCount === 0) {
    summary = "❌ All tests failed! There's a serious connectivity issue.";
  } else {
    summary = `⚠️ ${successCount}/${totalCount} tests passed. Some functionality is broken.`;
  }

  return { summary, results, recommendations };
}

/**
 * Log diagnostic results in a readable format
 */
export function logDiagnosticResults(
  diagnostic: Awaited<ReturnType<typeof runTelegramDiagnostic>>,
) {
  console.log("\n" + "=".repeat(50));
  console.log("🔍 TELEGRAM DIAGNOSTIC RESULTS");
  console.log("=".repeat(50));

  console.log("\n📊 SUMMARY:", diagnostic.summary);

  console.log("\n📋 TEST RESULTS:");
  Object.entries(diagnostic.results).forEach(([testName, result]) => {
    const icon = result.success ? "✅" : "❌";
    const timing = result.timing ? ` (${result.timing}ms)` : "";
    console.log(`${icon} ${testName}${timing}`);

    if (!result.success && result.error) {
      console.log(`   Error: ${result.error}`);
    }

    if (result.data) {
      console.log(`   Data:`, result.data);
    }
  });

  if (diagnostic.recommendations.length > 0) {
    console.log("\n💡 RECOMMENDATIONS:");
    diagnostic.recommendations.forEach((rec) => console.log(`   ${rec}`));
  }

  console.log("\n" + "=".repeat(50));
}

/**
 * Quick debug function to call from console
 */
export async function quickDebug() {
  const diagnostic = await runTelegramDiagnostic();
  logDiagnosticResults(diagnostic);
  return diagnostic;
}

// Make it available globally for debugging
if (typeof window !== "undefined") {
  (window as any).telegramDebug = {
    testWorker: testWorkerConnectivity,
    testBot: testTelegramBotAPI,
    testSend: testSendMessage,
    testEdit: testEditMessage,
    runDiagnostic: runTelegramDiagnostic,
    quickDebug,
  };
}
