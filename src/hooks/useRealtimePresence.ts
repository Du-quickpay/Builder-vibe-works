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

  // شروع/توقف ردیابی managed
  useEffect(() => {
    if (!enabled) {
      return;
    }

    // به‌روزرسانی state
    const updateState = () => {
      setPresenceState(litePresenceTracker.getState());
      setTypingState(litePresenceTracker.getTypingState());
      setIsTracking(!!litePresenceTracker.getState());
    };

    // listener برای تغییرات
    const unsubscribe = litePresenceTracker.addListener(updateState);

    // Start tracking with current sessionId or create temporary one
    let effectiveSessionId = sessionId;

    if (!sessionId) {
      effectiveSessionId = createTemporarySession();
      setTempSessionId(effectiveSessionId);
      console.log(`🔗 [${formName}] Created temp session:`, effectiveSessionId.slice(-8));
    } else {
      setTempSessionId(null); // Clear temp session when real session is available
    }

    console.log(`🔗 [${formName}] شروع ردیابی:`, effectiveSessionId!.slice(-8),
                sessionId ? '(real)' : '(temp)');

    // شروع ردیابی lite
    litePresenceTracker.start(effectiveSessionId!);
    setIsTracking(true);

    updateState();

    return () => {
      console.log(`🔗 [${formName}] پایان ردیابی حضور`);
      unsubscribe();
      setIsTracking(false);
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

    // listener برای تغییر��ت
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
