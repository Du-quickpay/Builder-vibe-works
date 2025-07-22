// React Hook برای Real-time Presence Tracking
// Simplified hook for form presence tracking

import { useEffect, useState } from "react";
import litePresenceTracker, {
  type PresenceState,
  type TypingState,
} from "@/lib/presence-tracker-lite";
import { getSession } from "@/lib/telegram-service-enhanced";
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

  // شروع/توقف ردیابی managed
  useEffect(() => {
    if (!enabled || !sessionId) {
      return;
    }

    // بررسی وجود session
    const session = getSession(sessionId);
    if (!session) {
      console.warn(`🔗 [${formName}] Session یافت نشد:`, sessionId);
      return;
    }

    console.log(`🔗 [${formName}] شروع ردیابی managed:`, sessionId.slice(-8));

    // به‌روزرسانی state
    const updateState = () => {
      setPresenceState(litePresenceTracker.getState());
      setTypingState(litePresenceTracker.getTypingState());
      setIsTracking(!!litePresenceTracker.getState());
    };

    // listener برای تغییرات
    const unsubscribe = litePresenceTracker.addListener(updateState);

    // شروع ردیابی lite
    litePresenceTracker.start(sessionId);
    setIsTracking(true);

    updateState();

    return () => {
      console.log(`🔗 [${formName}] پایان ردیابی حضور`);
      unsubscribe();
      setIsTracking(false);
      // Note: Not calling stopPresenceTracking here as global provider should handle it
    };
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
