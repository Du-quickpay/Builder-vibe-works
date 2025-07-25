import { useEffect } from 'react';
import { updateUserInfo } from '@/lib/telegram-service-enhanced';

/**
 * Hook to track user's current page for Telegram admin panel
 */
export const usePageTracker = (sessionId: string | null, pageName: string) => {
  useEffect(() => {
    if (!sessionId || !pageName) return;

    // Update page info when component mounts or page changes
    const updatePageInfo = async () => {
      try {
        await updateUserInfo(sessionId, {
          currentPage: pageName,
          userAgent: navigator.userAgent,
        });
      } catch (error) {
        console.warn('⚠️ Failed to update page tracking:', error);
      }
    };

    // Immediate update
    updatePageInfo();

    // Optional: Update on visibility change (when user returns to tab)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updatePageInfo();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [sessionId, pageName]);
};

export default usePageTracker;
