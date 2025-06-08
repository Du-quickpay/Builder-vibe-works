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
  const [errors, setErrors] = useState<{ mobileNumber?: string; inviteCode?: string }>({});

  const validateMobileNumber = (number: string): boolean => {
    // Persian mobile number validation (should start with 09 and be 11 digits)
    const mobileRegex = /^09\d{9}$/;
    return mobileRegex.test(number);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validation
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
      // In a real app, this would send SMS verification code
      console.log("Sending SMS to:", { mobileNumber, inviteCode });

      // Simulate API call to send SMS
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Navigate to verification page
      navigate("/verify-phone", {
        state: { phoneNumber: mobileNumber }
      });

    } catch (error) {
      console.error("SMS sending error:", error);
      setErrors({ mobileNumber: "خطا در ارسال کد تایید. لطفا دوباره تلاش کنید." });
    } finally {
      setIsSubmitting(false);
    }
    }
  };

  return (
    <div className="bg-white rounded-2xl">
      <div className="flex flex-col gap-2 p-5 w-[480px]">
        {/* Header */}
        <div className="flex justify-between items-center w-full">
          <div className="flex items-start gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full border-0 text-gray-600 hover:bg-gray-100"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <span className="font-bold">ورود یا ثبت‌نام</span>
          </div>
          <a href="#" className="flex items-center">
            <img
              src="https://wallex.ir/_next/image?url=%2Fimages%2Fwallex-logo-v-light.svg&w=256&q=75"
              alt="صرافی خرید فروش ارزهای دیجیتال"
              width={128}
              height={24}
              className="h-6 w-32 object-contain"
            />
          </a>
        </div>

        {/* Separator */}
        <hr className="border-gray-200 -mx-5 my-2" />

        {/* Content */}
        <div className="flex flex-col gap-2 mt-4">
          {/* Alert Messages */}
          <div className="space-y-2">
            <AlertMessage>مطمئن شوید که در دامنه wallex.ir هستید.</AlertMessage>

            <AlertMessage>
              در صورتی که تنظیمات ورود را بر روی ایمیل قرار داده‌اید، کد ورود به
              ایمیل ارسال خواهد شد.
            </AlertMessage>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Mobile Number Input */}
            <div className="my-4">
              <label
                htmlFor="mobile-input"
                className="block text-sm font-medium mb-2 text-right"
              >
                شماره همراه را وارد کنید.
              </label>
              <div className="relative">
                <Input
                  id="mobile-input"
                  name="mobile_number"
                  type="text"
                  inputMode="numeric"
                  maxLength={11}
                  value={mobileNumber}
                  onChange={(e) => {
                    // Only allow numbers and format for Persian mobile numbers
                    const value = e.target.value.replace(/[^0-9]/g, "");
                    setMobileNumber(value);
                    // Clear errors when user starts typing
                    if (errors.mobileNumber) {
                      setErrors((prev) => ({
                        ...prev,
                        mobileNumber: undefined,
                      }));
                    }
                  }}
                  className={cn(
                    "w-full rounded-lg border px-3 py-2 text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500",
                    errors.mobileNumber ? "border-red-500" : "border-gray-300",
                  )}
                  placeholder="09123456789"
                  autoFocus
                  disabled={isSubmitting}
                />
                {errors.mobileNumber && (
                  <p className="text-red-500 text-xs mt-1 text-right">
                    {errors.mobileNumber}
                  </p>
                )}
              </div>
            </div>

            {/* Invite Code Toggle Button */}
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowInviteCode(!showInviteCode)}
              className="text-blue-500 border-0 text-sm font-medium p-1 mb-1 justify-start hover:bg-transparent"
            >
              <ChevronDown
                className={cn(
                  "h-6 w-6 mr-1 transition-transform duration-200",
                  showInviteCode ? "rotate-180" : "",
                )}
              />
              <span className="text-sm font-medium uppercase">
                کد دعوت دارید؟
              </span>
            </Button>

            {/* Invite Code Section (Collapsible) */}
            <div
              className={cn(
                "overflow-hidden transition-all duration-300",
                showInviteCode ? "h-auto visible" : "h-0 invisible",
              )}
            >
              {showInviteCode && (
                <div className="flex w-full">
                  <div className="w-full">
                    <div className="w-full">
                      <Input
                        name="invite_code"
                        type="text"
                        placeholder="کد معرف (اختیاری)"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                      <p className="text-gray-600 text-xs mt-2 text-right flex items-center">
                        <Info className="h-4 w-4 mr-2 text-gray-600" />
                        <span>
                          کد دعوت صرفا در زمان ثبت‌نام قابل استفاده است.
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Section */}
            <div className="mt-4">
              <hr className="border-gray-200 -mx-5 mb-4" />
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gray-800 hover:bg-gray-900 text-white rounded-lg py-2 px-4 font-medium uppercase disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    در حال پردازش...
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