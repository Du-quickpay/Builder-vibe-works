import { useEffect, useState } from "react";
import simpleRealtimeTracker from "@/lib/simple-realtime-tracker";
import {
  validateTelegramConfig,
  checkNetworkConnectivity,
} from "@/lib/telegram-service-enhanced";
import type { SimpleActivityState } from "@/lib/simple-realtime-tracker";

interface DebugStatusProps {
  sessionId: string;
}

export const DebugStatus = ({ sessionId }: DebugStatusProps) => {
  const [status, setStatus] = useState<SimpleActivityState | null>(null);
  const [updateCount, setUpdateCount] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [networkStatus, setNetworkStatus] = useState<string>("🔍 Checking...");
  const [telegramMode, setTelegramMode] = useState<string>("🔍 Checking...");

  useEffect(() => {
    if (!sessionId) return;

    console.log("🛠️ Starting debug status tracker for session:", sessionId);

    // Check network and Telegram status
    const checkConnectivity = async () => {
      const isConfigured = validateTelegramConfig();
      setTelegramMode(isConfigured ? "📡 Real Mode" : "🎭 Demo Mode");

      const hasNetwork = await checkNetworkConnectivity();
      setNetworkStatus(hasNetwork ? "🌐 Connected" : "📴 Offline");
    };

    checkConnectivity();

    const handleStatusChange = (state: SimpleActivityState) => {
      console.log("🛠️ DEBUG: Status changed:", state);
      setStatus(state);
      setUpdateCount((count) => count + 1);
      setLastUpdate(new Date().toLocaleTimeString());
    };

    // Start tracking
    simpleRealtimeTracker.start(sessionId, handleStatusChange);

    return () => {
      console.log("🛠️ Stopping debug status tracker");
      simpleRealtimeTracker.stop();
    };
  }, [sessionId]);

  if (!status) {
    return (
      <div
        style={{
          position: "fixed",
          top: "10px",
          right: "10px",
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          color: "white",
          padding: "10px",
          borderRadius: "8px",
          fontSize: "12px",
          fontFamily: "monospace",
          zIndex: 1000,
          maxWidth: "300px",
        }}
      >
        <div>
          🛠️ <strong>DEBUG STATUS</strong>
        </div>
        <div>❌ Waiting for status...</div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        top: "10px",
        right: "10px",
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        color: "white",
        padding: "10px",
        borderRadius: "8px",
        fontSize: "12px",
        fontFamily: "monospace",
        zIndex: 1000,
        maxWidth: "300px",
      }}
    >
      <div>
        🛠️ <strong>DEBUG STATUS</strong>
      </div>
      <div>
        {simpleRealtimeTracker.getStatusEmoji()}{" "}
        <strong>{simpleRealtimeTracker.getStatusText()}</strong>
      </div>
      <div style={{ marginTop: "8px", fontSize: "11px", opacity: 0.8 }}>
        <div>🌐 Online: {status.isOnline ? "✅" : "❌"}</div>
        <div>👁️ Visible: {status.isVisible ? "✅" : "❌"}</div>
        <div>⚡ Active: {status.isActive ? "✅" : "❌"}</div>
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.2)",
            marginTop: "4px",
            paddingTop: "4px",
          }}
        >
          <div>{networkStatus}</div>
          <div>{telegramMode}</div>
        </div>
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.2)",
            marginTop: "4px",
            paddingTop: "4px",
          }}
        >
          <div>📊 Updates: {updateCount}</div>
          <div>🕐 Last: {lastUpdate}</div>
          <div>🆔 Session: {sessionId.slice(0, 8)}...</div>
        </div>
      </div>
    </div>
  );
};
