// Simple debug component to show presence state
import React from "react";
import { useRealtimePresenceContext } from "@/components/RealtimePresenceProvider";

export const PresenceDebug: React.FC = () => {
  const { presenceState, typingState, statusText, statusEmoji, isOnline, currentPage } = useRealtimePresenceContext();

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

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
        fontFamily: "monospace",
        zIndex: 9999,
        direction: "ltr",
        textAlign: "left",
        minWidth: "200px",
      }}
    >
      <div><strong>Presence Debug</strong></div>
      <div>Page: {currentPage}</div>
      <div>Status: {statusText} {statusEmoji}</div>
      <div>Online: {isOnline ? "✅" : "❌"}</div>
      {presenceState && (
        <>
          <div>Visible: {presenceState.isVisible ? "✅" : "❌"}</div>
          <div>Session: {presenceState.sessionId?.slice(-8)}</div>
          <div>Last Activity: {new Date(presenceState.lastActivity).toLocaleTimeString()}</div>
        </>
      )}
      {typingState.isTyping && (
        <div>Typing: {typingState.field} in {typingState.form}</div>
      )}
    </div>
  );
};

export default PresenceDebug;
