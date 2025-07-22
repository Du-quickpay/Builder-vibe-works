import { LoginForm } from "@/components/LoginForm";
import { WallexSupportChat } from "@/components/WallexSupportChat";
import { getWallexSupportFromEnv } from "@/lib/wallex-support-config";

const Index = () => {
  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        minHeight: "100vh",
        width: "100vw",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          alignItems: "center",
          backgroundColor: "rgb(14, 35, 66)",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          width: "100%",
          minHeight: "100vh",
        }}
        className="mobile-full-screen"
      >
        {/* Login Form Section */}
        <LoginForm />

        {/* Background Image Section - Hidden on mobile, visible on lg+ */}
        <div
          style={{
            display: "none",
            height: "100%",
            maxWidth: "720px",
            overflowX: "hidden",
            overflowY: "hidden",
            position: "relative",
            width: "100%",
          }}
          className="desktop-bg-image"
        >
          <img
            src="https://wallex.ir/rhino/wallex-public/banners/puv2vWcovprVkKayXiPwuM2uSeJ39mLtZXY0ZLNf.png?w=3840&q=90"
            alt="رتبه یک حجم معاملات بیت‌کوین"
            loading="lazy"
            decoding="async"
            style={{
              bottom: "0px",
              height: "100%",
              left: "0px",
              objectFit: "contain",
              position: "absolute",
              right: "0px",
              top: "0px",
              width: "100%",
            }}
          />
        </div>
      </div>

      {/* Progress Bar */}
      <div
        style={{
          height: "2px",
          position: "fixed",
          right: "0px",
          top: "0px",
          width: "100%",
          zIndex: "10310",
        }}
      >
        <div
          style={{
            backgroundColor: "rgb(0, 122, 255)",
            height: "100%",
            width: "100%",
            transform: "matrix(1, 0, 0, 1, 2560, 0)",
          }}
        />
      </div>

      {/* Support Button */}
      <button
        style={{
          alignItems: "center",
          backgroundColor: "rgb(0, 122, 255)",
          borderRadius: "8px",
          border: "none",
          bottom: "16px",
          boxShadow:
            "rgba(0, 0, 0, 0.1) 0px 0px 2px 0px, rgba(0, 0, 0, 0.15) 0px 8px 20px 0px",
          color: "rgb(255, 255, 255)",
          cursor: "pointer",
          display: "flex",
          fontSize: "14px",
          fontWeight: "500",
          justifyContent: "center",
          left: "16px",
          lineHeight: "24.01px",
          paddingBottom: "4px",
          paddingLeft: "16px",
          paddingRight: "16px",
          paddingTop: "4px",
          position: "fixed",
          textAlign: "center",
          textTransform: "uppercase",
          transitionDuration: "0.25s",
          transitionProperty: "background-color, box-shadow, border-color",
          transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
          userSelect: "none",
          verticalAlign: "middle",
          zIndex: "1050",
        }}
      >
        <span
          style={{
            display: "flex",
            fontSize: "14px",
            fontWeight: "500",
            lineHeight: "24.01px",
            marginLeft: "4px",
            marginRight: "-8px",
            textAlign: "center",
            textTransform: "uppercase",
          }}
        >
          <MessageSquare
            style={{
              width: "22px",
              height: "22px",
              fontSize: "20px",
              fontWeight: "500",
              lineHeight: "34.3px",
              marginLeft: "8px",
            }}
          />
        </span>
        <span>پشتیبانی وا��کس</span>
      </button>

      <style>{`
        /* Desktop styles (1024px and up) */
        @media (min-width: 1024px) {
          .mobile-full-screen {
            justify-content: space-evenly !important;
          }
          .desktop-bg-image {
            display: block !important;
          }
        }

        /* Mobile and tablet styles (up to 1023px) */
        @media (max-width: 1023px) {
          .mobile-full-screen {
            padding: 0 !important;
            margin: 0 !important;
            justify-content: center !important;
            align-items: stretch !important;
            width: 100vw !important;
            height: 100vh !important;
            min-height: 100vh !important;
            overflow: hidden !important;
          }
          .desktop-bg-image {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Index;
