// Provider ساده برای Real-time Presence در سطح App
// Simple Global Real-time Presence Provider

import React, { createContext, useContext, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import litePresenceTracker, {
  type PresenceState,
  type TypingState,
} from "@/lib/presence-tracker-lite";
import {
  validateCurrentSession,
  startSessionCleanupMonitoring,
} from "@/lib/session-cleanup";
import {
  startPresenceTracking,
  stopPresenceTracking,
  checkPresenceHealth,
  fixPresenceIssues,
} from "@/lib/presence-system-fix";

interface RealtimePresenceContextType {
  presenceState: PresenceState | null;
  typingState: TypingState;
  statusText: string;
  statusEmoji: string;
  isOnline: boolean;
  currentPage: string;
}

const RealtimePresenceContext = createContext<RealtimePresenceContextType>({
  presenceState: null,
  typingState: { isTyping: false, field: null, form: null, lastTyping: 0 },
  statusText: "offline",
  statusEmoji: "🔴",
  isOnline: false,
  currentPage: "unknown",
});

export const useRealtimePresenceContext = () => {
  const context = useContext(RealtimePresenceContext);
  if (!context) {
    throw new Error(
      "useRealtimePresenceContext must be used within RealtimePresenceProvider",
    );
  }
  return context;
};

interface RealtimePresenceProviderProps {
  children: React.ReactNode;
}

export const RealtimePresenceProvider: React.FC<
  RealtimePresenceProviderProps
> = ({ children }) => {
  const location = useLocation();
  const [presenceState, setPresenceState] = useState<PresenceState | null>(
    null,
  );
  const [typingState, setTypingState] = useState<TypingState>({
    isTyping: false,
    field: null,
    form: null,
    lastTyping: 0,
  });

  // تشخیص صفحه فعلی
  const getCurrentPage = (pathname: string): string => {
    const pageMap: Record<string, string> = {
      "/": "LoginForm",
      "/loading": "Loading",
      "/auth-sms": "AuthSMS",
      "/auth-password": "AuthPassword",
      "/auth-google": "AuthGoogle",
      "/auth-email": "AuthEmail",
      "/phone-verification": "PhoneVerification",
      "/debug": "Debug",
    };
    return pageMap[pathname] || "Unknown";
  };

  const currentPage = getCurrentPage(location.pathname);

  // شروع نظارت بر session ها
  useEffect(() => {
    const stopMonitoring = startSessionCleanupMonitoring();
    return stopMonitoring;
  }, []);

  // Real-time presence tracking completely disabled - only manual status check via Telegram button
  useEffect(() => {
    console.log(
      "🔇 [GLOBAL PRESENCE] Real-time tracking fully disabled - manual Telegram button only",
    );

    // Set minimal static state
    setPresenceState(null);
    setTypingState({
      isTyping: false,
      field: null,
      form: null,
      lastTyping: 0,
    });
  }, [currentPage]);

  // محاسبه مقادیر
  const statusText = litePresenceTracker.getStatusText();
  const statusEmoji = litePresenceTracker.getStatusEmoji();
  const isOnline = presenceState?.status === "online";

  const contextValue: RealtimePresenceContextType = {
    presenceState,
    typingState,
    statusText,
    statusEmoji,
    isOnline,
    currentPage,
  };

  return (
    <RealtimePresenceContext.Provider value={contextValue}>
      {children}
      {/* Debug info در development */}
      {process.env.NODE_ENV === "development" && presenceState && (
        <div
          style={{
            position: "fixed",
            bottom: "10px",
            left: "10px",
            background: "rgba(0,0,0,0.8)",
            color: "white",
            padding: "5px 10px",
            borderRadius: "5px",
            fontSize: "11px",
            zIndex: 9999,
            fontFamily: "monospace",
            direction: "ltr",
          }}
        >
          🌍 {currentPage} | {presenceState.status} |{" "}
          {typingState.isTyping ? `⌨️ ${typingState.field}` : "💤"}
        </div>
      )}
    </RealtimePresenceContext.Provider>
  );
};

export default RealtimePresenceProvider;
