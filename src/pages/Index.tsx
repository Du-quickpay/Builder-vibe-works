import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoginForm } from "@/components/LoginForm";

const Index = () => {
  return (
    <div className="min-h-screen bg-[rgb(15,35,65)] overflow-hidden">
      {/* Progress Bar - Exact positioning */}
      <div className="fixed top-0 right-0 w-full h-0.5 z-[10310]">
        <div
          className="bg-[rgb(0,122,255)] h-full transition-transform duration-300"
          style={{
            width: "100%",
            transform: "translateX(100%)",
          }}
        />
      </div>

      {/* Main Content Container */}
      <div className="flex flex-col lg:flex-row items-center justify-center lg:justify-evenly w-full min-h-screen p-4 lg:p-0">
        {/* Login Form Section */}
        <div className="flex items-center justify-center w-full lg:w-auto z-10">
          <LoginForm />
        </div>

        {/* Background Image Section - Exact Wallex Style */}
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

      {/* Support Button - Exact Wallex Style */}
      <Button
        className="fixed bottom-4 left-4 z-[1050] flex items-center transition-all duration-250 shadow-lg"
        style={{
          backgroundColor: "rgb(0, 122, 255)",
          borderRadius: "8px",
          padding: "4px 16px",
          fontSize: "14px",
          fontWeight: "500",
          textTransform: "uppercase",
          color: "rgb(255, 255, 255)",
          border: "none",
        }}
        type="button"
      >
        <span className="flex items-center">
          <MessageSquare
            className="mr-2"
            style={{
              width: "22px",
              height: "22px",
              marginLeft: "8px",
              marginRight: "-8px",
            }}
          />
        </span>
        <span className="hidden sm:inline">پشتیبانی والکس</span>
        <span className="sm:hidden">پشتیبانی</span>
      </Button>

      {/* Hidden announcement elements to match original structure */}
      <div
        className="sr-only"
        role="alert"
        aria-live="assertive"
        style={{
          position: "absolute",
          width: "1px",
          height: "1px",
          padding: "0",
          margin: "-1px",
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          whiteSpace: "nowrap",
        }}
      />
    </div>
  );
};

export default Index;
