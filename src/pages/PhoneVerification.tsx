import { useState, useEffect } from "react";
import { ChevronLeft, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertMessage } from "@/components/AlertMessage";
import { OTPInput } from "@/components/OTPInput";

const PhoneVerification = () => {
  const [otp, setOTP] = useState("");
  const [countdown, setCountdown] = useState(54);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ otp?: string }>({});

  // Mock phone number - in real app this would come from previous step or state management
  const maskedPhoneNumber = "0910****565";

  // Countdown timer
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
      // In a real app, this would verify the OTP with the backend
      console.log("Verifying OTP:", otp);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Handle success (redirect to dashboard, etc.)
      alert("تایید موفق! ورود به داشبورد...");
    } catch (error) {
      console.error("OTP verification error:", error);
      setErrors({ otp: "کد تایید نادرست است. لطفا دوباره تلاش کنید." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditNumber = () => {
    // Navigate back to phone number entry
    window.history.back();
  };

  const handleResendCode = () => {
    if (countdown === 0) {
      // Resend code logic
      setCountdown(54);
      console.log("Resending verification code...");
    }
  };

  return (
    <div className="flex h-screen bg-[#0e2342]">
      {/* Main Content */}
      <div className="flex items-center justify-evenly w-full h-full">
        {/* Verification Form Section */}
        <div className="flex items-center justify-center">
          <div className="bg-white rounded-2xl">
            <div className="flex flex-col gap-2 p-5 w-[480px]">
              {/* Header */}
              <div className="flex justify-between items-center w-full">
                <div className="flex items-start gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleEditNumber}
                    className="rounded-full border-0 text-gray-600 hover:bg-gray-100"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                  <span className="font-bold">تائید شماره همراه</span>
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
                {/* SMS Confirmation Alert */}
                <AlertMessage>
                  <span>کد تایید به شماره </span>
                  <b dir="ltr" className="inline font-bold">
                    {maskedPhoneNumber}
                  </b>
                  <span> پیامک شد.</span>
                </AlertMessage>

                {/* OTP Input Section */}
                <div className="my-6">
                  <OTPInput
                    length={6}
                    value={otp}
                    onComplete={handleOTPComplete}
                    onChange={handleOTPChange}
                    disabled={isSubmitting}
                    className="mb-4"
                  />

                  {errors.otp && (
                    <p className="text-red-500 text-xs mt-2 text-right">
                      {errors.otp}
                    </p>
                  )}
                </div>

                {/* Countdown Timer */}
                <div className="text-center">
                  <p className="text-gray-600 text-sm py-1">
                    {countdown > 0 ? (
                      <>
                        <span>{countdown}</span>
                        <span> ثانیه تا ارسال مجدد کد</span>
                      </>
                    ) : (
                      <button
                        onClick={handleResendCode}
                        className="text-blue-500 hover:text-blue-600 underline"
                      >
                        ارسال مجدد کد
                      </button>
                    )}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="mt-4">
                  <hr className="border-gray-200 -mx-5 mb-4" />
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleEditNumber}
                      className="w-full border border-gray-300 text-gray-600 rounded-lg py-2 px-4 font-medium uppercase hover:bg-gray-50"
                    >
                      ویرایش شماره
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSubmit}
                      disabled={isSubmitting || otp.length !== 6}
                      className="w-full bg-gray-800 hover:bg-gray-900 text-white rounded-lg py-2 px-4 font-medium uppercase disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          در حال بررسی...
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
        <div className="h-full max-w-[720px] w-full overflow-hidden relative hidden lg:block">
          <img
            src="https://wallex.ir/rhino/wallex-public/banners/puv2vWcovprVkKayXiPwuM2uSeJ39mLtZXY0ZLNf.png?w=3840&q=90"
            alt="رتبه یک حجم معاملات بیت‌کوین"
            className="absolute inset-0 w-full h-full object-contain"
            loading="lazy"
            decoding="async"
          />
        </div>
      </div>

      {/* Progress Bar */}
      <div className="fixed top-0 right-0 w-full h-0.5 z-[10310]">
        <div className="bg-blue-500 h-full w-full transform translate-x-1/2 animate-pulse" />
      </div>

      {/* Support Button */}
      <Button
        className="fixed bottom-4 left-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg px-4 py-1 text-sm font-medium uppercase shadow-lg z-[1050] flex items-center transition-all duration-250"
        type="button"
      >
        <span className="flex ml-1 -mr-2">
          <MessageSquare className="h-5 w-5 mr-2" />
        </span>
        <span>پشتیبانی والکس</span>
      </Button>

      {/* Hidden Elements (matching original structure) */}
      <div className="hidden">
        <span className="sr-only h-0 w-0 border-2 border-inset border-gray-800 overflow-clip invisible" />
        <span className="sr-only border-2 border-inset border-gray-800 overflow-clip" />
        <div />
      </div>
    </div>
  );
};

export default PhoneVerification;
