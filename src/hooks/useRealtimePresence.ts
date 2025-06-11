// React Hook برای Real-time Presence Tracking
// Simplified hook for form presence tracking

import { useEffect, useState } from "react";
import optimizedRealtimePresenceTracker, {
  type PresenceState,
  type TypingState,
} from "@/lib/realtime-presence-tracker-optimized";
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
      setPresenceState(optimizedRealtimePresenceTracker.getState());
      setTypingState(optimizedRealtimePresenceTracker.getTypingState());

      // Check if actually tracking
      const status = getPresenceStatus();
      setIsTracking(status.isActive && status.currentSessionId === sessionId);
    };

    // listener برای تغییرات
    const unsubscribe =
      optimizedRealtimePresenceTracker.addListener(updateState);

    // شروع ردیابی managed (will handle conflicts automatically)
    const started = startPresenceTracking(sessionId);
    if (started) {
      setIsTracking(true);
    } else {
      console.warn(`⚠️ [${formName}] نتوانست شروع کند`);
    }

    updateState();

    return () => {
      console.log(`🔗 [${formName}] پایان ردیابی حضور`);
      unsubscribe();
      setIsTracking(false);
      // Note: Not calling stopPresenceTracking here as global provider should handle it
    };
  }, [sessionId, formName, enabled]);

  // محاسبه مقادیر
  const statusText = optimizedRealtimePresenceTracker.getStatusText();
  const statusEmoji = optimizedRealtimePresenceTracker.getStatusEmoji();
  const isOnline = presenceState?.status === "online";

  // ایجاد handler برای تایپ
  const createTypingHandler = (fieldName: string) => ({
    onKeyDown: () =>
      optimizedRealtimePresenceTracker.startTyping(formName, fieldName),
    onFocus: () =>
      optimizedRealtimePresenceTracker.startTyping(formName, fieldName),
    onBlur: () => optimizedRealtimePresenceTracker.stopTyping(),
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
 * Hook ساده برای دریافت وضعیت فعلی
 */
export const usePresenceStatus = () => {
  const [statusText, setStatusText] = useState("offline");
  const [statusEmoji, setStatusEmoji] = useState("🔴");
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    const updateStatus = () => {
      setStatusText(optimizedRealtimePresenceTracker.getStatusText());
      setStatusEmoji(optimizedRealtimePresenceTracker.getStatusEmoji());

      const state = optimizedRealtimePresenceTracker.getState();
      setIsOnline(state?.status === "online");
    };

    // به‌روزرسانی اولیه
    updateStatus();

    // listener برای تغییرات
    const unsubscribe =
      optimizedRealtimePresenceTracker.addListener(updateStatus);

    return unsubscribe;
  }, []);

  return {
    statusText,
    statusEmoji,
    isOnline,
  };
};

export default useRealtimePresence;
