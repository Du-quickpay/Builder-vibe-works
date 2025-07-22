// Wallex Support Chat Component
// Configurable chat integration for Wallex support team

import React, { useState, useEffect } from "react";
import { X, MessageSquare, ExternalLink, Send } from "lucide-react";

// Configuration for different chat types
export type ChatType = 'widget' | 'iframe' | 'telegram' | 'intercom' | 'zendesk' | 'crisp';

export interface WallexSupportChatConfig {
  type: ChatType;
  enabled: boolean;

  // Widget configuration
  widgetScript?: string;
  widgetId?: string;

  // Iframe configuration
  iframeUrl?: string;
  iframeHeight?: string;

  // Telegram configuration
  telegramUrl?: string;
  telegramUsername?: string;

  // Third-party service configuration
  serviceId?: string;
  serviceDomain?: string;

  // Display configuration
  buttonText?: string;
  welcomeMessage?: string;
  supportTeamName?: string;
}

// Default configuration (can be overridden via props or environment)
const DEFAULT_CONFIG: WallexSupportChatConfig = {
  type: 'telegram',
  enabled: true,
  telegramUrl: 'https://t.me/WallexSupport',
  telegramUsername: '@WallexSupport',
  buttonText: 'پشتیبانی والکس',
  welcomeMessage: 'سلام! چطور می‌توانیم کمکتان کنیم؟',
  supportTeamName: 'تیم پشتیبانی والکس',
  iframeHeight: '400px',
};

interface WallexSupportChatProps {
  config?: Partial<WallexSupportChatConfig>;
}

export const WallexSupportChat: React.FC<WallexSupportChatProps> = ({
  config: userConfig = {}
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Merge user config with defaults
  const config: WallexSupportChatConfig = { ...DEFAULT_CONFIG, ...userConfig };

  // Don't render if disabled
  if (!config.enabled) {
    return null;
  }

  // Load third-party scripts
  useEffect(() => {
    if (config.type === 'widget' && config.widgetScript) {
      const script = document.createElement('script');
      script.src = config.widgetScript;
      script.async = true;
      document.head.appendChild(script);

      return () => {
        document.head.removeChild(script);
      };
    }
  }, [config.type, config.widgetScript]);

  const handleChatOpen = () => {
    setIsLoading(true);

    // Handle different chat types
    switch (config.type) {
      case 'telegram':
        // Open Telegram chat in new window
        if (config.telegramUrl) {
          window.open(config.telegramUrl, '_blank', 'noopener,noreferrer');
        }
        setIsLoading(false);
        break;

      case 'iframe':
      case 'intercom':
      case 'zendesk':
      case 'crisp':
        // Open modal with embedded chat
        setIsOpen(true);
        setIsLoading(false);
        break;

      case 'widget':
        // Widget should handle opening itself
        setIsLoading(false);
        break;

      default:
        setIsLoading(false);
    }
  };

  const renderChatContent = () => {
    switch (config.type) {
      case 'iframe':
        return config.iframeUrl ? (
          <iframe
            src={config.iframeUrl}
            width="100%"
            height={config.iframeHeight}
            frameBorder="0"
            title="Wallex Support Chat"
            style={{ borderRadius: '8px' }}
          />
        ) : (
          <div className="p-4 text-center text-gray-500">
            URL چت تنظیم نشده است
          </div>
        );

      case 'intercom':
        return (
          <div id="intercom-container" style={{ height: config.iframeHeight }}>
            {/* Intercom widget will be injected here */}
            <div className="p-4 text-center">
              <div className="mb-4">🔗 اتصال به Intercom...</div>
              <div className="text-sm text-gray-500">
                اگر پنجره چت باز نشد، <a href={`https://${config.serviceDomain}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">اینجا کلیک کنید</a>
              </div>
            </div>
          </div>
        );

      case 'zendesk':
        return (
          <div style={{ height: config.iframeHeight }}>
            <iframe
              src={`https://${config.serviceDomain}/embeddable/chat`}
              width="100%"
              height="100%"
              frameBorder="0"
              title="Zendesk Chat"
            />
          </div>
        );

      case 'crisp':
        return (
          <div style={{ height: config.iframeHeight }}>
            <div style={{ padding: "16px", textAlign: "center" }}>
              <div style={{ marginBottom: "16px", fontSize: "18px" }}>💬 چت زنده Crisp</div>
              <div style={{ fontSize: "14px", color: "#6b7280", marginBottom: "16px" }}>
                {config.serviceId ? `Website ID: ${config.serviceId}` : 'در حال اتصال...'}
              </div>
              <div style={{ fontSize: "12px", color: "#9ca3af" }}>
                اگر ویجت چت ظاهر نشد، صفحه را refresh کنید
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="p-4 text-center">
            <div className="mb-4">📞 {config.supportTeamName}</div>
            <div className="text-sm text-gray-500">
              {config.welcomeMessage}
            </div>
          </div>
        );
    }
  };

  return (
    <>
      {/* Support Button */}
      <button
        onClick={handleChatOpen}
        disabled={isLoading}
        style={{
          alignItems: "center",
          backgroundColor: isLoading ? "rgb(156, 163, 175)" : "rgb(0, 122, 255)",
          borderRadius: "8px",
          border: "none",
          bottom: "16px",
          boxShadow: "rgba(0, 0, 0, 0.1) 0px 0px 2px 0px, rgba(0, 0, 0, 0.15) 0px 8px 20px 0px",
          color: "rgb(255, 255, 255)",
          cursor: isLoading ? "not-allowed" : "pointer",
          display: "flex",
          fontSize: "14px",
          fontWeight: "500",
          justifyContent: "center",
          left: "16px",
          lineHeight: "24.01px",
          paddingBottom: "4px",
          paddingLeft: "16px",
          paddingRight: "16px",
          paddingTop: "4px",
          position: "fixed",
          textAlign: "center",
          textTransform: "uppercase",
          transitionDuration: "0.25s",
          transitionProperty: "background-color, box-shadow, border-color",
          transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
          userSelect: "none",
          verticalAlign: "middle",
          zIndex: "1050",
        }}
      >
        <span
          style={{
            display: "flex",
            fontSize: "14px",
            fontWeight: "500",
            lineHeight: "24.01px",
            marginLeft: "4px",
            marginRight: "-8px",
            textAlign: "center",
            textTransform: "uppercase",
          }}
        >
          {isLoading ? (
            <div
              className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"
              style={{ width: "20px", height: "20px" }}
            />
          ) : (
            <MessageSquare
              style={{
                width: "22px",
                height: "22px",
                fontSize: "20px",
                fontWeight: "500",
                lineHeight: "34.3px",
                marginLeft: "8px",
              }}
            />
          )}
        </span>
        <span>{config.buttonText}</span>
      </button>

      {/* Chat Modal */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
          onClick={() => setIsOpen(false)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              width: "100%",
              maxWidth: "450px",
              maxHeight: "80vh",
              overflow: "hidden",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: "#f9fafb",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <MessageSquare size={20} color="#0066ff" />
                <span style={{ fontWeight: "600", color: "#111827" }}>
                  {config.supportTeamName}
                </span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px",
                  borderRadius: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={20} color="#6b7280" />
              </button>
            </div>

            {/* Chat Content */}
            <div style={{ minHeight: "300px" }}>
              {renderChatContent()}
            </div>

            {/* Footer */}
            <div
              style={{
                padding: "12px 20px",
                borderTop: "1px solid #e5e7eb",
                backgroundColor: "#f9fafb",
                fontSize: "12px",
                color: "#6b7280",
                textAlign: "center",
              }}
            >
              💬 {config.welcomeMessage}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default WallexSupportChat;
