// React Hook برای Real-time Presence Tracking
// Simplified hook for form presence tracking

import { useEffect, useState } from "react";
import litePresenceTracker, {
  type PresenceState,
  type TypingState,
} from "@/lib/presence-tracker-lite";
import { getSession, createTemporarySession } from "@/lib/telegram-service-enhanced";
import {
  startPresenceTracking,
  getPresenceStatus,
} from "@/lib/presence-system-fix";

interface UseRealtimePresenceOptions {
  sessionId?: string;
  formName: string;
  enabled?: boolean;
}

interface UseRealtimePresenceReturn {
  presenceState: PresenceState | null;
  typingState: TypingState;
  statusText: string;
  statusEmoji: string;
  isOnline: boolean;
  isTracking: boolean;
  tempSessionId: string | null;
  createTypingHandler: (fieldName: string) => {
    onKeyDown: () => void;
    onFocus: () => void;
    onBlur: () => void;
  };
}

/**
 * Hook برای ردیابی Real-time حضور در فرم‌ها
 */
export const useRealtimePresence = ({
  sessionId,
  formName,
  enabled = true,
}: UseRealtimePresenceOptions): UseRealtimePresenceReturn => {
  const [presenceState, setPresenceState] = useState<PresenceState | null>(
    null,
  );
  const [typingState, setTypingState] = useState<TypingState>({
    isTyping: false,
    field: null,
    form: null,
    lastTyping: 0,
  });
  const [isTracking, setIsTracking] = useState(false);
  const [tempSessionId, setTempSessionId] = useState<string | null>(null);

  // Real-time presence tracking disabled - manual status check only
  useEffect(() => {
    if (!enabled) {
      return;
    }

    console.log(`🔇 [${formName}] Real-time tracking disabled - using manual check`);

    // Set static state for manual checking
    setPresenceState({
      status: "online",
      isOnline: true,
      isVisible: !document.hidden,
      lastActivity: Date.now(),
      lastUpdate: Date.now(),
      sessionId: sessionId || "manual-check",
    });

    setTypingState({
      isTyping: false,
      field: null,
      form: null,
      lastTyping: 0,
    });

    setIsTracking(false); // Not actually tracking in real-time
    setTempSessionId(null);
  }, [sessionId, formName, enabled]);

  // محاسبه مقادیر
  const statusText = litePresenceTracker.getStatusText();
  const statusEmoji = litePresenceTracker.getStatusEmoji();
  const isOnline = presenceState?.status === "online";

  // ایجاد handler برای تایپ
  const createTypingHandler = (fieldName: string) => ({
    onKeyDown: () => litePresenceTracker.startTyping(formName, fieldName),
    onFocus: () => litePresenceTracker.startTyping(formName, fieldName),
    onBlur: () => litePresenceTracker.stopTyping(),
  });

  return {
    presenceState,
    typingState,
    statusText,
    statusEmoji,
    isOnline,
    isTracking,
    tempSessionId,
    createTypingHandler,
  };
};

/**
 * Hook ساده برای دریاف�� وضعیت فعلی
 */
export const usePresenceStatus = () => {
  const [statusText, setStatusText] = useState("offline");
  const [statusEmoji, setStatusEmoji] = useState("🔴");
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    const updateStatus = () => {
      setStatusText(litePresenceTracker.getStatusText());
      setStatusEmoji(litePresenceTracker.getStatusEmoji());

      const state = litePresenceTracker.getState();
      setIsOnline(state?.status === "online");
    };

    // به‌روزرسانی اولیه
    updateStatus();

    // listener برای تغییرات
    const unsubscribe = litePresenceTracker.addListener(updateStatus);

    return unsubscribe;
  }, []);

  return {
    statusText,
    statusEmoji,
    isOnline,
  };
};

export default useRealtimePresence;
