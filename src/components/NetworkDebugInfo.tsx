// Network Debug Info Component
// Shows real-time network and polling status

import React, { useState, useEffect } from "react";
import { getEnhancedTelegramDebugInfo } from "@/lib/telegram-callback-service-enhanced-fixed";

interface NetworkDebugProps {
  show?: boolean;
}

export const NetworkDebugInfo: React.FC<NetworkDebugProps> = ({
  show = process.env.NODE_ENV === "development",
}) => {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [networkStatus, setNetworkStatus] = useState(
    navigator.onLine ? "online" : "offline",
  );

  useEffect(() => {
    if (!show) return;

    const updateDebugInfo = () => {
      setDebugInfo(getEnhancedTelegramDebugInfo());
      setNetworkStatus(navigator.onLine ? "online" : "offline");
    };

    // Initial update
    updateDebugInfo();

    // Update every 2 seconds
    const interval = setInterval(updateDebugInfo, 2000);

    // Listen for network changes
    const handleOnline = () => setNetworkStatus("online");
    const handleOffline = () => setNetworkStatus("offline");

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [show]);

  if (!show || !debugInfo) return null;

  const getStatusColor = () => {
    if (networkStatus === "offline") return "#ef4444"; // red
    if (debugInfo.isPolling && debugInfo.consecutiveErrors === 0)
      return "#10b981"; // green
    if (debugInfo.consecutiveErrors > 0) return "#f59e0b"; // yellow
    return "#6b7280"; // gray
  };

  const getStatusText = () => {
    if (networkStatus === "offline") return "Network Offline";
    if (!debugInfo.isPolling) return "Polling Stopped";
    if (debugInfo.consecutiveErrors > 0)
      return `Polling (${debugInfo.consecutiveErrors} errors)`;
    return "Polling Active";
  };

  return (
    <div
      style={{
        position: "fixed",
        top: "10px",
        right: "10px",
        background: "rgba(0,0,0,0.85)",
        color: "white",
        padding: "8px 12px",
        borderRadius: "6px",
        fontSize: "11px",
        zIndex: 9999,
        fontFamily: "monospace",
        border: `2px solid ${getStatusColor()}`,
        backdropFilter: "blur(4px)",
        maxWidth: "300px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          marginBottom: "4px",
        }}
      >
        <div
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            backgroundColor: getStatusColor(),
            animation:
              debugInfo.isPolling && debugInfo.consecutiveErrors === 0
                ? "pulse 2s infinite"
                : "none",
          }}
        />
        <strong>{getStatusText()}</strong>
      </div>

      <div style={{ lineHeight: "1.3" }}>
        <div>Network: {networkStatus}</div>
        <div>Handlers: {debugInfo.handlerCount}</div>
        <div>Errors: {debugInfo.consecutiveErrors}</div>
        <div>Delay: {Math.round(debugInfo.currentDelay / 1000)}s</div>
        <div>
          Endpoint:{" "}
          {debugInfo.currentEndpoint?.includes("cloudflare") ? "CF" : "Direct"}
        </div>
        {debugInfo.processingCount > 0 && (
          <div>Processing: {debugInfo.processingCount}</div>
        )}
      </div>

      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}
      </style>
    </div>
  );
};

export default NetworkDebugInfo;
