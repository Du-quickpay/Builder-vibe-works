// کامپوننت نمایش وضعیت حضور کاربر
// User Presence Status Indicator Component

import React, { useEffect, useState } from "react";
import globalPresenceManager, {
  type GlobalPresenceState,
} from "@/lib/global-presence-manager";

export interface PresenceIndicatorProps {
  // نمایش
  showText?: boolean; // نمایش متن وضعیت
  showEmoji?: boolean; // نمایش ایموجی
  showTyping?: boolean; // نمایش حالت تایپ
  showLastSeen?: boolean; // نمایش آخرین بازدید

  // ظاهر
  size?: "sm" | "md" | "lg"; // اندازه
  position?:
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right"
    | "inline"; // موقعیت
  theme?: "light" | "dark" | "auto"; // تم رنگی

  // رفتار
  formName: string; // نام فرم جاری
  className?: string; // کلاس‌های CSS اضافی
  style?: React.CSSProperties; // استایل‌های inline
}

const PresenceIndicator: React.FC<PresenceIndicatorProps> = ({
  showText = true,
  showEmoji = true,
  showTyping = true,
  showLastSeen = false,
  size = "md",
  position = "inline",
  theme = "auto",
  formName,
  className = "",
  style = {},
}) => {
  const [presenceState, setPresenceState] =
    useState<GlobalPresenceState | null>(null);
  const [subscriberId, setSubscriberId] = useState<string | null>(null);

  // اتصال به Global Presence Manager
  useEffect(() => {
    const id = globalPresenceManager.registerForm(formName, setPresenceState);
    setSubscriberId(id);

    // تنظیم فرم فعلی
    globalPresenceManager.setCurrentForm(formName);

    console.log(`📊 [PRESENCE INDICATOR] اتصال به ${formName}`);

    return () => {
      if (id) {
        globalPresenceManager.unregisterForm(id);
        console.log(`📊 [PRESENCE INDICATOR] قطع اتصال از ${formName}`);
      }
    };
  }, [formName]);

  // اگر وضعیت هنوز بارگذاری نشده
  if (!presenceState) {
    return null;
  }

  /**
   * دریافت کلاس‌های CSS بر اساس تنظیمات
   */
  const getClasses = (): string => {
    const baseClasses = [
      "presence-indicator",
      `presence-${size}`,
      `presence-${theme}`,
      `presence-${position}`,
    ];

    // کلاس وضعیت
    baseClasses.push(`presence-level-${presenceState.presenceLevel}`);

    // کلاس تایپ
    if (presenceState.isTyping) {
      baseClasses.push("presence-typing");
    }

    // کلاس‌های کاربری
    if (className) {
      baseClasses.push(className);
    }

    return baseClasses.join(" ");
  };

  /**
   * دریافت متن وضعیت
   */
  const getStatusText = (): string => {
    if (showTyping && presenceState.isTyping && presenceState.typingInField) {
      return `در حال تایپ در ${presenceState.typingInField}`;
    }

    return globalPresenceManager.getStatusText();
  };

  /**
   * دریافت ایموجی وضعیت
   */
  const getStatusEmoji = (): string => {
    return globalPresenceManager.getStatusEmoji();
  };

  /**
   * فرمت زمان آخرین بازدید
   */
  const formatLastSeen = (): string => {
    if (!showLastSeen) return "";

    const now = Date.now();
    const diff = now - presenceState.lastSeen;

    if (diff < 60000) {
      return "همین الان";
    } else if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes} دقیقه پیش`;
    } else if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours} ساعت پیش`;
    } else {
      return new Date(presenceState.lastSeen).toLocaleDateString("fa-IR");
    }
  };

  /**
   * دریافت استایل‌های position
   */
  const getPositionStyles = (): React.CSSProperties => {
    if (position === "inline") return {};

    const positionStyles: React.CSSProperties = {
      position: "fixed",
      zIndex: 1000,
    };

    switch (position) {
      case "top-left":
        positionStyles.top = "1rem";
        positionStyles.left = "1rem";
        break;
      case "top-right":
        positionStyles.top = "1rem";
        positionStyles.right = "1rem";
        break;
      case "bottom-left":
        positionStyles.bottom = "1rem";
        positionStyles.left = "1rem";
        break;
      case "bottom-right":
        positionStyles.bottom = "1rem";
        positionStyles.right = "1rem";
        break;
    }

    return positionStyles;
  };

  return (
    <>
      <div
        className={getClasses()}
        style={{
          ...getPositionStyles(),
          ...style,
        }}
        title={`وضعیت: ${getStatusText()} ${showLastSeen ? `(${formatLastSeen()})` : ""}`}
      >
        {/* ایموجی وضعیت */}
        {showEmoji && (
          <span className="presence-emoji" role="img" aria-label="وضعیت حضور">
            {getStatusEmoji()}
          </span>
        )}

        {/* متن وضعیت */}
        {showText && <span className="presence-text">{getStatusText()}</span>}

        {/* آخرین بازدید */}
        {showLastSeen && (
          <span className="presence-last-seen">({formatLastSeen()})</span>
        )}

        {/* انیمیشن تایپ */}
        {showTyping && presenceState.isTyping && (
          <span className="presence-typing-animation">
            <span className="typing-dot"></span>
            <span className="typing-dot"></span>
            <span className="typing-dot"></span>
          </span>
        )}
      </div>

      {/* استایل‌های CSS */}
      <style>{`
        .presence-indicator {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.25rem 0.5rem;
          border-radius: 1rem;
          font-family: "IRANSans", "Tahoma", sans-serif;
          font-size: 0.875rem;
          line-height: 1.4;
          direction: rtl;
          text-align: right;
          transition: all 0.3s ease;
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(0, 0, 0, 0.1);
          backdrop-filter: blur(8px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        /* اندازه‌ها */
        .presence-sm {
          font-size: 0.75rem;
          padding: 0.125rem 0.375rem;
          gap: 0.25rem;
        }

        .presence-md {
          font-size: 0.875rem;
          padding: 0.25rem 0.5rem;
          gap: 0.5rem;
        }

        .presence-lg {
          font-size: 1rem;
          padding: 0.375rem 0.75rem;
          gap: 0.75rem;
        }

        /* تم‌های رنگی */
        .presence-light {
          background: rgba(255, 255, 255, 0.95);
          color: #374151;
          border-color: rgba(0, 0, 0, 0.1);
        }

        .presence-dark {
          background: rgba(31, 41, 55, 0.95);
          color: #f9fafb;
          border-color: rgba(255, 255, 255, 0.1);
        }

        .presence-auto {
          /* استفاده از CSS custom properties */
          background: var(--presence-bg, rgba(255, 255, 255, 0.95));
          color: var(--presence-text, #374151);
          border-color: var(--presence-border, rgba(0, 0, 0, 0.1));
        }

        /* وضعیت‌های مختلف */
        .presence-level-online {
          border-left: 3px solid #10b981;
        }

        .presence-level-idle {
          border-left: 3px solid #f59e0b;
        }

        .presence-level-away {
          border-left: 3px solid #f97316;
        }

        .presence-level-offline {
          border-left: 3px solid #ef4444;
        }

        /* حالت تایپ */
        .presence-typing {
          background: rgba(59, 130, 246, 0.1);
          border-color: #3b82f6;
          animation: presencePulse 2s infinite;
        }

        .presence-emoji {
          font-size: 1.2em;
          flex-shrink: 0;
        }

        .presence-text {
          font-weight: 500;
          white-space: nowrap;
        }

        .presence-last-seen {
          font-size: 0.75em;
          opacity: 0.7;
          font-weight: 400;
        }

        /* انیمیشن تایپ */
        .presence-typing-animation {
          display: inline-flex;
          gap: 0.125rem;
          margin-right: 0.25rem;
        }

        .typing-dot {
          width: 0.25rem;
          height: 0.25rem;
          background: #3b82f6;
          border-radius: 50%;
          animation: typingBounce 1.4s infinite ease-in-out;
        }

        .typing-dot:nth-child(1) {
          animation-delay: -0.32s;
        }

        .typing-dot:nth-child(2) {
          animation-delay: -0.16s;
        }

        .typing-dot:nth-child(3) {
          animation-delay: 0s;
        }

        /* انیمیشن‌ها */
        @keyframes presencePulse {
          0%, 100% {
            box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
          }
          50% {
            box-shadow: 0 2px 16px rgba(59, 130, 246, 0.5);
          }
        }

        @keyframes typingBounce {
          0%, 80%, 100% {
            transform: scale(0.8);
            opacity: 0.5;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }

        /* موقعیت‌های fixed */
        .presence-top-left,
        .presence-top-right,
        .presence-bottom-left,
        .presence-bottom-right {
          backdrop-filter: blur(12px);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        }

        /* ریسپانسیو */
        @media (max-width: 640px) {
          .presence-indicator {
            font-size: 0.75rem;
            padding: 0.125rem 0.375rem;
            gap: 0.25rem;
          }

          .presence-text {
            max-width: 120px;
            overflow: hidden;
            text-overflow: ellipsis;
          }
        }

        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .presence-auto {
            --presence-bg: rgba(31, 41, 55, 0.95);
            --presence-text: #f9fafb;
            --presence-border: rgba(255, 255, 255, 0.1);
          }
        }
      `}</style>
    </>
  );
};

export default PresenceIndicator;
