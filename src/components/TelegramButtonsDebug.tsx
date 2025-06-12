// Telegram Buttons Debug Component
// Comprehensive debugging tool for Telegram button functionality

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  validateTelegramConfig,
  showAdminButtons,
  getSession,
} from "@/lib/telegram-service-enhanced";
import {
  getEnhancedTelegramDebugInfo,
  testTelegramConnection,
} from "@/lib/telegram-callback-service-enhanced";
import { getSessionDebugInfo } from "@/lib/callback-session-fix";

const TelegramButtonsDebug: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [sessionDebugInfo, setSessionDebugInfo] = useState<any>(null);
  const [telegramConfig, setTelegramConfig] = useState<boolean>(false);
  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const [testResults, setTestResults] = useState<string[]>([]);

  useEffect(() => {
    // Update debug info every 2 seconds
    const updateInfo = () => {
      setDebugInfo(getEnhancedTelegramDebugInfo());
      setSessionDebugInfo(getSessionDebugInfo());
      setTelegramConfig(validateTelegramConfig());

      // Get current session ID from sessionStorage
      const sessionId = sessionStorage.getItem("sessionId");
      setCurrentSessionId(sessionId || "No session");
    };

    updateInfo();
    const interval = setInterval(updateInfo, 2000);
    return () => clearInterval(interval);
  }, []);

  const addTestResult = (message: string) => {
    setTestResults((prev) => [
      ...prev.slice(-4),
      `${new Date().toLocaleTimeString()}: ${message}`,
    ]);
  };

  const testShowButtons = async () => {
    if (!currentSessionId || currentSessionId === "No session") {
      addTestResult("❌ No active session found");
      return;
    }

    try {
      addTestResult("🔄 Testing showAdminButtons...");
      const result = await showAdminButtons(currentSessionId);
      addTestResult(
        result
          ? "✅ showAdminButtons successful"
          : "❌ showAdminButtons failed",
      );
    } catch (error) {
      addTestResult(`❌ showAdminButtons error: ${error.message}`);
    }
  };

  const testSessionData = () => {
    if (!currentSessionId || currentSessionId === "No session") {
      addTestResult("❌ No active session found");
      return;
    }

    try {
      const session = getSession(currentSessionId);
      if (session) {
        addTestResult(`✅ Session found: Step ${session.currentStep}`);
        addTestResult(
          `📊 Completed steps: ${session.completedSteps.join(", ")}`,
        );
      } else {
        addTestResult("❌ Session not found in service");
      }
    } catch (error) {
      addTestResult(`❌ Session test error: ${error.message}`);
    }
  };

  const testConnection = async () => {
    addTestResult("🔍 Testing Telegram connection...");
    try {
      const result = await testTelegramConnection();
      if (result.success) {
        addTestResult("✅ Connection test successful");
        addTestResult(
          `🤖 Bot: ${result.details?.botInfo?.first_name || "Unknown"}`,
        );
      } else {
        addTestResult(`❌ Connection failed: ${result.error}`);
        if (result.details) {
          addTestResult(
            `📋 Details: ${JSON.stringify(result.details).substring(0, 100)}...`,
          );
        }
      }
    } catch (error) {
      addTestResult(`❌ Connection test error: ${error.message}`);
    }
  };

  const testNetworkBasics = async () => {
    addTestResult("🌐 Testing basic network connectivity...");

    try {
      // Test 1: Basic fetch to a reliable endpoint
      const response1 = await fetch("https://httpbin.org/json", {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });
      addTestResult(`✅ Basic HTTP test: ${response1.status}`);
    } catch (error) {
      addTestResult(`❌ Basic HTTP test failed: ${error.message}`);
    }

    try {
      // Test 2: Test Cloudflare Worker endpoint specifically
      const response2 = await fetch(
        "https://telegram-proxy-fragrant-fog-f09d.anthonynoelmills.workers.dev/",
        {
          method: "GET",
          signal: AbortSignal.timeout(5000),
        },
      );
      addTestResult(`✅ Cloudflare Worker reachable: ${response2.status}`);
    } catch (error) {
      addTestResult(`❌ Cloudflare Worker failed: ${error.message}`);
    }

    try {
      // Test 3: Direct Telegram API test
      const response3 = await fetch("https://api.telegram.org/", {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });
      addTestResult(`✅ Direct Telegram API reachable: ${response3.status}`);
    } catch (error) {
      addTestResult(`❌ Direct Telegram API failed: ${error.message}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "working":
        return "bg-green-500";
      case "warning":
        return "bg-yellow-500";
      case "error":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getOverallStatus = () => {
    if (!telegramConfig)
      return { status: "error", text: "Telegram Not Configured" };
    if (!debugInfo?.isPolling)
      return { status: "error", text: "Polling Stopped" };
    if (debugInfo?.consecutiveErrors > 0)
      return { status: "warning", text: "Has Errors" };
    if (debugInfo?.handlerCount === 0)
      return { status: "warning", text: "No Handlers" };
    return { status: "working", text: "All Good" };
  };

  const overall = getOverallStatus();

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔍 Telegram Buttons Debug
            <Badge className={getStatusColor(overall.status)}>
              {overall.text}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Configuration Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">Configuration</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Telegram Config:</span>
                  <Badge variant={telegramConfig ? "default" : "destructive"}>
                    {telegramConfig ? "✅ Valid" : "❌ Missing"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Current Session:</span>
                  <span className="font-mono text-xs">
                    {currentSessionId === "No session"
                      ? "❌ None"
                      : `✅ ${currentSessionId.slice(-8)}`}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Polling Status</h3>
              {debugInfo && (
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <Badge
                      variant={debugInfo.isPolling ? "default" : "destructive"}
                    >
                      {debugInfo.isPolling ? "🔄 Active" : "⏹️ Stopped"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Handlers:</span>
                    <span>{debugInfo.handlerCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Errors:</span>
                    <span
                      className={
                        debugInfo.consecutiveErrors > 0 ? "text-red-500" : ""
                      }
                    >
                      {debugInfo.consecutiveErrors}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Network:</span>
                    <span>{debugInfo.networkStatus}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Session Info */}
          {sessionDebugInfo && (
            <div>
              <h3 className="font-semibold mb-2">Session Debug</h3>
              <div className="bg-gray-50 p-3 rounded text-sm">
                <div>Active Sessions: {sessionDebugInfo.totalSessions}</div>
                <div>
                  Current Window: {sessionDebugInfo.currentWindowId?.slice(-8)}
                </div>
                {sessionDebugInfo.activeSessions.length > 0 && (
                  <div className="mt-2">
                    <div className="font-medium">Sessions:</div>
                    {sessionDebugInfo.activeSessions.map(
                      ([sessionId, info]: [string, any]) => (
                        <div key={sessionId} className="ml-2 text-xs">
                          • {sessionId.slice(-8)}: {info.windowId.slice(-8)}
                        </div>
                      ),
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Test Buttons */}
          <div>
            <h3 className="font-semibold mb-2">Test Actions</h3>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={testNetworkBasics} size="sm" variant="secondary">
                Test Network
              </Button>
              <Button
                onClick={testConnection}
                size="sm"
                disabled={!telegramConfig}
              >
                Test Connection
              </Button>
              <Button
                onClick={testShowButtons}
                size="sm"
                disabled={
                  !currentSessionId || currentSessionId === "No session"
                }
              >
                Test Show Buttons
              </Button>
              <Button
                onClick={testSessionData}
                size="sm"
                variant="outline"
                disabled={
                  !currentSessionId || currentSessionId === "No session"
                }
              >
                Test Session Data
              </Button>
            </div>
          </div>

          {/* Test Results */}
          {testResults.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Test Results</h3>
              <div className="bg-black text-green-400 p-3 rounded font-mono text-xs space-y-1 max-h-32 overflow-y-auto">
                {testResults.map((result, index) => (
                  <div key={index}>{result}</div>
                ))}
              </div>
            </div>
          )}

          {/* Troubleshooting */}
          <div className="space-y-2">
            <h3 className="font-semibold">Troubleshooting</h3>

            {!telegramConfig && (
              <Alert>
                <AlertDescription>
                  ⚙️ Telegram configuration missing. Check
                  VITE_TELEGRAM_BOT_TOKEN and VITE_TELEGRAM_CHAT_ID in .env
                  file.
                </AlertDescription>
              </Alert>
            )}

            {debugInfo && !debugInfo.isPolling && (
              <Alert>
                <AlertDescription>
                  🔄 Polling is not active. This means buttons won't work. Try
                  refreshing the page.
                </AlertDescription>
              </Alert>
            )}

            {debugInfo && debugInfo.handlerCount === 0 && (
              <Alert>
                <AlertDescription>
                  📱 No callback handlers registered. Make sure you're on the
                  loading page.
                </AlertDescription>
              </Alert>
            )}

            {debugInfo && debugInfo.consecutiveErrors > 0 && (
              <Alert>
                <AlertDescription>
                  ⚠️ Network errors detected. Check your internet connection or
                  try switching endpoints.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TelegramButtonsDebug;
