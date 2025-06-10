import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  testTelegramConfig,
  sendTestMessageToTelegram,
  createDebugInfo,
} from "@/lib/debug-helper";

const Debug = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  const debugInfo = createDebugInfo();

  const handleTestConfig = async () => {
    setIsLoading(true);
    const result = await testTelegramConfig();
    setResults({ type: "config", data: result });
    setIsLoading(false);
  };

  const handleSendTestMessage = async () => {
    setIsLoading(true);
    const result = await sendTestMessageToTelegram(
      "🧪 <b>Test message</b>\n\nThis is a test message from the authentication system debug page.",
    );
    setResults({ type: "message", data: result });
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
            {results.type === "config" ? "🔍 Config Test" : "📨 Message Test"}{" "}
            Results
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
