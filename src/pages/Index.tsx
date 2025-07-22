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

      {/* Wallex Support Chat */}
      <WallexSupportChat config={getWallexSupportFromEnv()} />

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
