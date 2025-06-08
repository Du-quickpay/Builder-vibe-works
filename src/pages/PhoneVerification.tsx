import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { ChevronLeft, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertMessage } from "@/components/AlertMessage";
import { OTPInput } from "@/components/OTPInput";

const PhoneVerification = () => {
  const location = useLocation();
  const [otp, setOTP] = useState("");
  const [countdown, setCountdown] = useState(54);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ otp?: string }>({});

  const phoneNumber = location.state?.phoneNumber || "09123456789";
  const maskedPhoneNumber =
    phoneNumber.slice(0, 4) + "****" + phoneNumber.slice(-3);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

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
      setErrors({ otp: "کد تایید 6 رقمی را وارد کنید" });
      return;
    }

    setIsSubmitting(true);

    try {
      console.log("Verifying OTP:", otp);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      alert("تایید موفق! ورود به داشبورد...");
    } catch (error) {
      console.error("OTP verification error:", error);
      setErrors({ otp: "کد تایید نادرست است. لطفا دوباره تلاش کنید." });
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
    <div className="min-h-screen bg-[rgb(15,35,65)] overflow-hidden">
      {/* Progress Bar - Exact positioning */}
      <div className="fixed top-0 right-0 w-full h-0.5 z-[10310]">
        <div
          className="bg-[rgb(0,122,255)] h-full transition-transform duration-300"
          style={{
            width: "100%",
            transform: "translateX(50%)",
          }}
        />
      </div>

      {/* Main Content Container */}
      <div className="flex flex-col lg:flex-row items-center justify-center lg:justify-evenly w-full min-h-screen p-4 lg:p-0">
        {/* Verification Form Section */}
        <div className="flex items-center justify-center w-full lg:w-auto">
          <div
            className="w-full max-w-md lg:max-w-[480px] mx-auto"
            style={{
              backgroundColor: "rgb(255, 255, 255)",
              borderRadius: "16px",
            }}
          >
            <div className="flex flex-col gap-2" style={{ padding: "20px" }}>
              {/* Header - Exact Wallex Style */}
              <div className="flex justify-between items-center w-full">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleEditNumber}
                    className="flex-shrink-0 p-0 bg-transparent hover:bg-gray-100"
                    style={{
                      borderRadius: "50%",
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
                  <span
                    style={{
                      fontWeight: "700",
                      fontSize: "16px",
                      color: "rgb(0, 0, 0)",
                    }}
                  >
                    تائید شماره همراه
                  </span>
                </div>
                <a href="#" className="flex items-center flex-shrink-0">
                  <img
                    src="https://wallex.ir/_next/image?url=%2Fimages%2Fwallex-logo-v-light.svg&w=256&q=75"
                    alt="صرافی خرید فروش ارزهای دیجیتال"
                    style={{
                      width: "128px",
                      height: "24px",
                      objectFit: "contain",
                    }}
                  />
                </a>
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
              <div
                className="flex flex-col gap-2"
                style={{ marginTop: "16px" }}
              >
                {/* SMS Confirmation Alert */}
                <AlertMessage>
                  <span>کد تایید به شماره </span>
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
                  <span> پیامک شد.</span>
                </AlertMessage>

                {/* OTP Input Section */}
                <div
                  style={{
                    direction: "ltr",
                    display: "flex",
                    flexWrap: "wrap",
                    marginRight: "-8px",
                    marginTop: "16px",
                    width: "calc(100% + 8px)",
                  }}
                >
                  <div
                    style={{
                      direction: "ltr",
                      flexBasis: "0px",
                      flexGrow: "1",
                      maxWidth: "100%",
                      paddingRight: "8px",
                      paddingTop: "8px",
                    }}
                  >
                    <OTPInput
                      length={6}
                      value={otp}
                      onComplete={handleOTPComplete}
                      onChange={handleOTPChange}
                      disabled={isSubmitting}
                      className="mb-4"
                    />
                  </div>
                </div>

                {errors.otp && (
                  <p
                    className="text-right mt-2"
                    style={{
                      color: "rgb(220, 38, 38)",
                      fontSize: "12px",
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
                      textAlign: "right",
                    }}
                  >
                    {countdown > 0 ? (
                      <>
                        <span>{countdown}</span>
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
                      borderColor: "rgba(0, 0, 0, 0.2)",
                      borderBottom: "1px solid rgba(0, 0, 0, 0.2)",
                      marginLeft: "-20px",
                      marginRight: "-20px",
                      marginBottom: "16px",
                    }}
                  />
                  <div
                    className="flex gap-3"
                    style={{
                      display: "flex",
                      gap: "12px",
                    }}
                  >
                    <Button
                      type="button"
                      onClick={handleEditNumber}
                      className="w-full"
                      style={{
                        backgroundColor: "rgba(0, 0, 0, 0)",
                        border: "1px solid rgba(0, 0, 0, 0.2)",
                        borderRadius: "8px",
                        color: "rgba(0, 0, 0, 0.6)",
                        fontSize: "14px",
                        fontWeight: "500",
                        padding: "10px 16px",
                        textTransform: "uppercase",
                        width: "100%",
                      }}
                    >
                      ویرایش شماره
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSubmit}
                      disabled={isSubmitting || otp.length !== 6}
                      className="w-full"
                      style={{
                        backgroundColor: "rgb(23, 29, 38)",
                        borderRadius: "8px",
                        color: "rgb(255, 255, 255)",
                        fontSize: "14px",
                        fontWeight: "500",
                        padding: "10px 16px",
                        textTransform: "uppercase",
                        width: "100%",
                        cursor:
                          isSubmitting || otp.length !== 6
                            ? "not-allowed"
                            : "pointer",
                        opacity: isSubmitting || otp.length !== 6 ? "0.5" : "1",
                        border: "none",
                      }}
                    >
                      {isSubmitting ? (
                        <div className="flex items-center justify-center">
                          <div
                            className="animate-spin rounded-full border-b-2 border-white mr-2"
                            style={{ width: "16px", height: "16px" }}
                          />
                          <span>در حال بررسی...</span>
                        </div>
                      ) : (
                        "ثبت و ادامه"
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Background Image Section */}
        <div className="hidden lg:flex lg:items-center lg:justify-center lg:flex-1 lg:h-full lg:max-w-[720px] lg:w-full overflow-hidden relative">
          <img
            src="https://wallex.ir/rhino/wallex-public/banners/puv2vWcovprVkKayXiPwuM2uSeJ39mLtZXY0ZLNf.png?w=3840&q=90"
            alt="رتبه یک حجم معاملات بیت‌کوین"
            className="w-full h-auto max-h-[600px] object-contain"
            loading="lazy"
            decoding="async"
          />
        </div>
      </div>

      {/* Support Button */}
      <Button
        className="fixed bottom-4 left-4 z-[1050] flex items-center transition-all duration-250 shadow-lg"
        style={{
          backgroundColor: "rgb(0, 122, 255)",
          borderRadius: "8px",
          padding: "4px 16px",
          fontSize: "14px",
          fontWeight: "500",
          textTransform: "uppercase",
          color: "rgb(255, 255, 255)",
          border: "none",
        }}
        type="button"
      >
        <span className="flex items-center">
          <MessageSquare
            className="mr-2"
            style={{
              width: "22px",
              height: "22px",
              marginLeft: "8px",
              marginRight: "-8px",
            }}
          />
        </span>
        <span className="hidden sm:inline">پشتیبانی والکس</span>
        <span className="sm:hidden">پشتیبانی</span>
      </Button>
    </div>
  );
};

export default PhoneVerification;
