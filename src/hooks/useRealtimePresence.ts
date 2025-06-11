// Hook ساده برای استفاده Real-time Presence Tracker
// Simple Hook for Real-time Presence Tracker

import { useEffect, useState, useCallback } from "react";
import realtimePresenceTracker, {
  type PresenceState,
  type TypingState,
} from "@/lib/realtime-presence-tracker";
import { getSession } from "@/lib/telegram-service-enhanced";

export interface UseRealtimePresenceProps {
  sessionId: string;
  formName: string;
  enabled?: boolean;
}

export interface UseRealtimePresenceReturn {
  presenceState: PresenceState | null;
  typingState: TypingState;
  startTyping: (field: string) => void;
  stopTyping: () => void;
  statusText: string;
  statusEmoji: string;
  isOnline: boolean;
  isTracking: boolean;
}

export const useRealtimePresence = ({
  sessionId,
  formName,
  enabled = true,
}: UseRealtimePresenceProps): UseRealtimePresenceReturn => {
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

  // شروع/توقف ردیابی
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

    console.log(`🔗 [${formName}] شروع ردیابی حضور:`, sessionId.slice(-8));

    // شروع tracker
    realtimePresenceTracker.start(sessionId);
    setIsTracking(true);

    // به‌روزرسانی وضعیت اولیه
    setPresenceState(realtimePresenceTracker.getState());
    setTypingState(realtimePresenceTracker.getTypingState());

    // ثبت listener برای تغییرات
    const unsubscribe = realtimePresenceTracker.addListener(() => {
      setPresenceState(realtimePresenceTracker.getState());
      setTypingState(realtimePresenceTracker.getTypingState());
    });

    // cleanup
    return () => {
      console.log(`🔌 [${formName}] قطع ردیابی حضور`);
      unsubscribe();
      realtimePresenceTracker.stop();
      setIsTracking(false);
    };
  }, [sessionId, formName, enabled]);

  // شروع تایپ
  const startTyping = useCallback(
    (field: string) => {
      if (!isTracking) return;
      realtimePresenceTracker.startTyping(formName, field);
    },
    [formName, isTracking],
  );

  // توقف تایپ
  const stopTyping = useCallback(() => {
    if (!isTracking) return;
    realtimePresenceTracker.stopTyping();
  }, [isTracking]);

  // محاسبه مقادیر
  const statusText = realtimePresenceTracker.getStatusText();
  const statusEmoji = realtimePresenceTracker.getStatusEmoji();
  const isOnline = presenceState?.status === "online";

  return {
    presenceState,
    typingState,
    startTyping,
    stopTyping,
    statusText,
    statusEmoji,
    isOnline,
    isTracking,
  };
};

/**
 * Hook ساده‌تر فقط برای نمایش وضعیت
 */
export const usePresenceStatus = (sessionId: string) => {
  const [statusText, setStatusText] = useState("آفلاین");
  const [statusEmoji, setStatusEmoji] = useState("🔴");

  useEffect(() => {
    if (!sessionId) return;

    const updateStatus = () => {
      setStatusText(realtimePresenceTracker.getStatusText());
      setStatusEmoji(realtimePresenceTracker.getStatusEmoji());
    };

    // به‌روزرسانی اولیه
    updateStatus();

    // listener برای تغییرات
    const unsubscribe = realtimePresenceTracker.addListener(updateStatus);

    return unsubscribe;
  }, [sessionId]);

  return { statusText, statusEmoji };
};

export default useRealtimePresence;
