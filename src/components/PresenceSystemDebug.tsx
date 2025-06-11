// Comprehensive Presence System Debug Component
// Diagnoses all presence tracking issues

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import optimizedRealtimePresenceTracker from "@/lib/realtime-presence-tracker-optimized";
import realtimePresenceTracker from "@/lib/realtime-presence-tracker";
import { validateCurrentSession } from "@/lib/session-cleanup";
import { getSession } from "@/lib/telegram-service-enhanced";

const PresenceSystemDebug: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [testResults, setTestResults] = useState<string[]>([]);

  useEffect(() => {
    const updateInfo = () => {
      // Get optimized tracker state
      const optimizedState = optimizedRealtimePresenceTracker.getState();
      const optimizedTyping = optimizedRealtimePresenceTracker.getTypingState();

      // Get session validation
      const sessionValidation = validateCurrentSession();

      // Get current session data
      let sessionData = null;
      if (sessionValidation.sessionId) {
        sessionData = getSession(sessionValidation.sessionId);
      }

      // Browser states
      const browserState = {
        isVisible: !document.hidden,
        hasFocus: document.hasFocus(),
        isOnline: navigator.onLine,
        windowId: sessionStorage.getItem("windowId"),
        sessionId: sessionStorage.getItem("sessionId"),
      };

      setDebugInfo({
        optimizedTracker: {
          state: optimizedState,
          typing: optimizedTyping,
          statusText: optimizedRealtimePresenceTracker.getStatusText(),
          statusEmoji: optimizedRealtimePresenceTracker.getStatusEmoji(),
        },
        sessionValidation,
        sessionData,
        browserState,
      });

      // System status assessment
      const issues = [];

      if (!sessionValidation.isValid) {
        issues.push("No valid session");
      }

      if (!optimizedState) {
        issues.push("Optimized tracker not running");
      }

      if (!navigator.onLine) {
        issues.push("Browser offline");
      }

      if (document.hidden) {
        issues.push("Page not visible");
      }

      setSystemStatus({
        overall: issues.length === 0 ? "healthy" : "issues",
        issues,
        trackersActive: !!optimizedState,
      });
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

  const testStartTracking = () => {
    const sessionId = sessionStorage.getItem("sessionId");
    if (!sessionId) {
      addTestResult("❌ No session ID found");
      return;
    }

    try {
      optimizedRealtimePresenceTracker.start(sessionId);
      addTestResult("✅ Started optimized tracker");
    } catch (error) {
      addTestResult(`❌ Start tracker error: ${error.message}`);
    }
  };

  const testStopTracking = () => {
    try {
      optimizedRealtimePresenceTracker.stop();
      addTestResult("🛑 Stopped optimized tracker");
    } catch (error) {
      addTestResult(`❌ Stop tracker error: ${error.message}`);
    }
  };

  const testStartTyping = () => {
    try {
      optimizedRealtimePresenceTracker.startTyping("TestForm", "testField");
      addTestResult("⌨️ Started typing test");
    } catch (error) {
      addTestResult(`❌ Start typing error: ${error.message}`);
    }
  };

  const testStopTyping = () => {
    try {
      optimizedRealtimePresenceTracker.stopTyping();
      addTestResult("💤 Stopped typing test");
    } catch (error) {
      addTestResult(`❌ Stop typing error: ${error.message}`);
    }
  };

  const testForceOffline = () => {
    try {
      // Simulate going offline
      Object.defineProperty(navigator, "onLine", {
        writable: true,
        value: false,
      });
      window.dispatchEvent(new Event("offline"));
      addTestResult("📴 Simulated offline state");

      // Reset after 3 seconds
      setTimeout(() => {
        Object.defineProperty(navigator, "onLine", {
          writable: true,
          value: true,
        });
        window.dispatchEvent(new Event("online"));
        addTestResult("🌐 Restored online state");
      }, 3000);
    } catch (error) {
      addTestResult(`❌ Offline test error: ${error.message}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "bg-green-500";
      case "issues":
        return "bg-yellow-500";
      case "error":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  if (!debugInfo) {
    return <div>Loading debug info...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔍 Presence System Diagnostics
            {systemStatus && (
              <Badge className={getStatusColor(systemStatus.overall)}>
                {systemStatus.overall === "healthy"
                  ? "✅ Healthy"
                  : "⚠️ Issues"}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* System Overview */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">System Status</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Tracker Active:</span>
                  <Badge
                    variant={
                      debugInfo.optimizedTracker.state
                        ? "default"
                        : "destructive"
                    }
                  >
                    {debugInfo.optimizedTracker.state
                      ? "✅ Running"
                      : "❌ Stopped"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Current Status:</span>
                  <span>
                    {debugInfo.optimizedTracker.statusEmoji}{" "}
                    {debugInfo.optimizedTracker.statusText}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Session Valid:</span>
                  <Badge
                    variant={
                      debugInfo.sessionValidation.isValid
                        ? "default"
                        : "destructive"
                    }
                  >
                    {debugInfo.sessionValidation.isValid
                      ? "✅ Valid"
                      : "❌ Invalid"}
                  </Badge>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Browser State</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Page Visible:</span>
                  <Badge
                    variant={
                      debugInfo.browserState.isVisible ? "default" : "secondary"
                    }
                  >
                    {debugInfo.browserState.isVisible
                      ? "👁️ Visible"
                      : "🙈 Hidden"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Has Focus:</span>
                  <Badge
                    variant={
                      debugInfo.browserState.hasFocus ? "default" : "secondary"
                    }
                  >
                    {debugInfo.browserState.hasFocus
                      ? "🎯 Focused"
                      : "😴 Unfocused"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Network:</span>
                  <Badge
                    variant={
                      debugInfo.browserState.isOnline
                        ? "default"
                        : "destructive"
                    }
                  >
                    {debugInfo.browserState.isOnline
                      ? "🌐 Online"
                      : "📴 Offline"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed State Info */}
          {debugInfo.optimizedTracker.state && (
            <div>
              <h3 className="font-semibold mb-2">Tracker Details</h3>
              <div className="bg-gray-50 p-3 rounded text-xs font-mono">
                <div>Status: {debugInfo.optimizedTracker.state.status}</div>
                <div>
                  Last Activity:{" "}
                  {new Date(
                    debugInfo.optimizedTracker.state.lastActivity,
                  ).toLocaleTimeString()}
                </div>
                <div>
                  Last Update:{" "}
                  {new Date(
                    debugInfo.optimizedTracker.state.lastUpdate,
                  ).toLocaleTimeString()}
                </div>
                <div>
                  Session ID:{" "}
                  {debugInfo.optimizedTracker.state.sessionId.slice(-8)}
                </div>
                {debugInfo.optimizedTracker.typing.isTyping && (
                  <div>
                    Typing: {debugInfo.optimizedTracker.typing.form}.
                    {debugInfo.optimizedTracker.typing.field}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Issues */}
          {systemStatus && systemStatus.issues.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Current Issues</h3>
              <div className="space-y-2">
                {systemStatus.issues.map((issue: string, index: number) => (
                  <Alert key={index}>
                    <AlertDescription>⚠️ {issue}</AlertDescription>
                  </Alert>
                ))}
              </div>
            </div>
          )}

          {/* Test Controls */}
          <div>
            <h3 className="font-semibold mb-2">Test Controls</h3>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={testStartTracking} size="sm">
                Start Tracking
              </Button>
              <Button onClick={testStopTracking} size="sm" variant="outline">
                Stop Tracking
              </Button>
              <Button onClick={testStartTyping} size="sm" variant="secondary">
                Test Typing
              </Button>
              <Button onClick={testStopTyping} size="sm" variant="secondary">
                Stop Typing
              </Button>
              <Button
                onClick={testForceOffline}
                size="sm"
                variant="destructive"
              >
                Test Offline
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

          {/* Session Data */}
          {debugInfo.sessionData && (
            <div>
              <h3 className="font-semibold mb-2">Session Information</h3>
              <div className="bg-blue-50 p-3 rounded text-xs">
                <div>Phone: {debugInfo.sessionData.phoneNumber}</div>
                <div>Current Step: {debugInfo.sessionData.currentStep}</div>
                <div>
                  Completed Steps:{" "}
                  {debugInfo.sessionData.completedSteps.join(", ")}
                </div>
                {debugInfo.sessionData.onlineStatus && (
                  <div>
                    Telegram Status:{" "}
                    {debugInfo.sessionData.onlineStatus.statusText}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PresenceSystemDebug;
