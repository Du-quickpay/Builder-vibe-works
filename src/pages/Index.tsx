import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoginForm } from "@/components/LoginForm";

const Index = () => {
  return (
    <div className="flex min-h-screen bg-[#0e2342] overflow-hidden">
      {/* Main Content Container */}
      <div className="flex flex-col lg:flex-row items-center justify-center lg:justify-evenly w-full min-h-screen p-4 lg:p-0">
        {/* Login Form Section */}
        <div className="flex items-center justify-center w-full lg:w-auto z-10">
          <LoginForm />
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

      {/* Progress Bar */}
      <div className="fixed top-0 right-0 w-full h-0.5 z-[10310]">
        <div className="bg-blue-500 h-full w-full transform translate-x-full animate-pulse" />
      </div>

      {/* Support Button */}
      <Button
        className="fixed bottom-4 left-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg px-3 sm:px-4 py-1 text-xs sm:text-sm font-medium uppercase shadow-lg z-[1050] flex items-center transition-all duration-250"
        type="button"
      >
        <span className="flex ml-1 -mr-2">
          <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
        </span>
        <span className="hidden sm:inline">پشتیبانی والکس</span>
        <span className="sm:hidden">پشتیبانی</span>
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

export default Index;
