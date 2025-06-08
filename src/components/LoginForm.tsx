import { useState } from "react";
import { ChevronLeft, ChevronDown, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertMessage } from "./AlertMessage";
import { cn } from "@/lib/utils";

export const LoginForm = () => {
  const [mobileNumber, setMobileNumber] = useState("");
  const [showInviteCode, setShowInviteCode] = useState(false);
  const [inviteCode, setInviteCode] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted:", { mobileNumber, inviteCode });
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
          <AlertMessage>مطمئن شوید که در دامنه wallex.ir هستید.</AlertMessage>

          <AlertMessage>
            در صورتی که تنظیمات ورود را بر روی ایمیل قرار داده‌اید، کد ورود به
            ایمیل ارسال خواهد شد.
          </AlertMessage>

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
                  type="text"
                  inputMode="numeric"
                  maxLength={13}
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-right"
                  autoFocus
                />
              </div>
            </div>

            {/* Invite Code Toggle Button */}
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowInviteCode(!showInviteCode)}
              className="text-blue-500 border-0 text-sm font-medium p-1 mb-1 justify-start"
            >
              <ChevronDown
                className={cn(
                  "h-6 w-6 mr-1 transition-transform",
                  showInviteCode ? "rotate-180" : "",
                )}
              />
              <span>کد دعوت دارید؟</span>
            </Button>

            {/* Invite Code Section (Collapsible) */}
            <div
              className={cn(
                "overflow-hidden transition-all duration-300",
                showInviteCode ? "h-auto visible" : "h-0 invisible",
              )}
            >
              <div className="flex w-full">
                <div className="w-full">
                  <div className="w-full">
                    <Input
                      type="text"
                      placeholder="کد معرف (اختیاری)"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-right"
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
            </div>

            {/* Submit Section */}
            <div className="mt-4">
              <hr className="border-gray-200 -mx-5 mb-4" />
              <Button
                type="submit"
                className="w-full bg-gray-800 hover:bg-gray-900 text-white rounded-lg py-2 px-4 font-medium uppercase"
              >
                ثبت و ادامه
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
