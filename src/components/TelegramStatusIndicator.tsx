// Telegram Status Indicator
// Small status indicator for Telegram connectivity

import React, { useState, useEffect } from "react";
import { validateTelegramConfig } from "@/lib/telegram-service-enhanced";
import { getEnhancedTelegramDebugInfo } from "@/lib/telegram-callback-service-enhanced";

interface TelegramStatusProps {
  showText?: boolean;
  position?: "fixed" | "static";
}

export const TelegramStatusIndicator: React.FC<TelegramStatusProps> = ({
  showText = false,
  position = "fixed",
}) => {
  const [status, setStatus] = useState<{
    isConfigured: boolean;
    isPolling: boolean;
    hasErrors: boolean;
    handlerCount: number;
  }>({
    isConfigured: false,
    isPolling: false,
    hasErrors: false,
    handlerCount: 0,
  });

  useEffect(() => {
    const updateStatus = () => {
      const isConfigured = validateTelegramConfig();
      const debugInfo = getEnhancedTelegramDebugInfo();

      setStatus({
        isConfigured,
        isPolling: debugInfo.isPolling,
        hasErrors: debugInfo.consecutiveErrors > 0,
        handlerCount: debugInfo.handlerCount,
      });
    };

    updateStatus();
    const interval = setInterval(updateStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    if (!status.isConfigured) return "#6b7280"; // gray - not configured
    if (!status.isPolling) return "#ef4444"; // red - not polling
    if (status.hasErrors) return "#f59e0b"; // yellow - has errors
    if (status.handlerCount === 0) return "#f59e0b"; // yellow - no handlers
    return "#10b981"; // green - all good
  };

  const getStatusText = () => {
    if (!status.isConfigured) return "Not configured";
    if (!status.isPolling) return "Not polling";
    if (status.hasErrors) return "Has errors";
    if (status.handlerCount === 0) return "No handlers";
    return "Working";
  };

  const getStatusIcon = () => {
    if (!status.isConfigured) return "⚙️";
    if (!status.isPolling) return "❌";
    if (status.hasErrors) return "⚠️";
    if (status.handlerCount === 0) return "⭕";
    return "✅";
  };

  const containerStyle: React.CSSProperties = {
    ...(position === "fixed" && {
      position: "fixed",
      top: "60px", // Below NetworkDebugInfo
      right: "10px",
      zIndex: 9998,
    }),
    display: "flex",
    alignItems: "center",
    gap: "6px",
    backgroundColor: "rgba(0,0,0,0.8)",
    color: "white",
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "11px",
    fontFamily: "monospace",
    border: `1px solid ${getStatusColor()}`,
    backdropFilter: "blur(4px)",
  };

  const dotStyle: React.CSSProperties = {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    backgroundColor: getStatusColor(),
    animation:
      status.isPolling && !status.hasErrors && status.handlerCount > 0
        ? "pulse 2s infinite"
        : "none",
  };

  return (
    <div style={containerStyle} title={`Telegram: ${getStatusText()}`}>
      <div style={dotStyle} />
      <span>{getStatusIcon()}</span>
      {showText && <span>{getStatusText()}</span>}

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

export default TelegramStatusIndicator;
