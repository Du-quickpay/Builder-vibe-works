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
        // Silent fail for page tracking to avoid console spam
        if (error?.message?.includes('Failed to fetch')) {
          console.debug('🔇 Page tracking skipped due to network issues');
        } else {
          console.warn('⚠️ Failed to update page tracking:', error?.message || error);
        }
      }
    };

    // Immediate update with delay to avoid blocking component render
    setTimeout(updatePageInfo, 100);

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
