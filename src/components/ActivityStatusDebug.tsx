import { useState, useEffect } from "react";
import userActivityService from "@/lib/user-activity-service";

export const ActivityStatusDebug = () => {
  const [status, setStatus] = useState(userActivityService.getCurrentStatus());

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(userActivityService.getCurrentStatus());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!status) {
    return (
      <div
        style={{
          position: "fixed",
          top: "10px",
          right: "10px",
          background: "rgba(0, 0, 0, 0.8)",
          color: "white",
          padding: "8px 12px",
          borderRadius: "8px",
          fontSize: "12px",
          zIndex: 9999,
        }}
      >
        📊 Activity: Not tracking
      </div>
    );
  }

  const statusText = userActivityService.getStatusText();
  const statusEmoji = userActivityService.getStatusEmoji();
  const inactiveTime = Date.now() - status.lastActivity;

  return (
    <div
      style={{
        position: "fixed",
        top: "10px",
        right: "10px",
        background: "rgba(0, 0, 0, 0.8)",
        color: "white",
        padding: "8px 12px",
        borderRadius: "8px",
        fontSize: "11px",
        zIndex: 9999,
        minWidth: "180px",
      }}
    >
      <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
        {statusEmoji} Activity Status
      </div>
      <div>Status: {statusText}</div>
      <div>Online: {status.isOnline ? "✅" : "❌"}</div>
      <div>Visible: {status.isVisible ? "✅" : "❌"}</div>
      <div>Inactive: {Math.floor(inactiveTime / 1000)}s</div>
      <div style={{ fontSize: "10px", marginTop: "4px", opacity: 0.7 }}>
        Session: {status.sessionId.substring(0, 8)}...
      </div>
    </div>
  );
};
