import { useState, useRef, KeyboardEvent, ChangeEvent, useEffect } from "react";
import { cn } from "@/lib/utils";

interface OTPInputProps {
  length?: number;
  onComplete?: (otp: string) => void;
  onChange?: (otp: string) => void;
  value?: string;
  disabled?: boolean;
  className?: string;
}

export const OTPInput = ({
  length = 6,
  onComplete,
  onChange,
  value = "",
  disabled = false,
  className,
}: OTPInputProps) => {
  const [otp, setOTP] = useState<string[]>(
    value.split("").concat(Array(length - value.length).fill("")),
  );
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const newOTP = value
      .split("")
      .concat(Array(length - value.length).fill(""));
    setOTP(newOTP);
  }, [value, length]);

  const focusInput = (index: number) => {
    if (inputRefs.current[index]) {
      inputRefs.current[index]?.focus();
      inputRefs.current[index]?.select();
    }
  };

  const handleChange = (index: number, val: string) => {
    if (val.length > 1) {
      const pastedData = val.replace(/[^0-9]/g, "").slice(0, length);
      const newOTP = [...otp];

      for (let i = 0; i < pastedData.length && index + i < length; i++) {
        newOTP[index + i] = pastedData[i];
      }

      for (let i = index + pastedData.length; i < length; i++) {
        newOTP[i] = "";
      }

      setOTP(newOTP);
      const otpString = newOTP.join("");
      onChange?.(otpString);

      const nextIndex = Math.min(index + pastedData.length, length - 1);
      setTimeout(() => focusInput(nextIndex), 0);

      if (otpString.replace(/[^0-9]/g, "").length === length) {
        onComplete?.(otpString);
      }
      return;
    }

    if (val && !/^\d$/.test(val)) {
      return;
    }

    const newOTP = [...otp];
    newOTP[index] = val;
    setOTP(newOTP);

    const otpString = newOTP.join("");
    onChange?.(otpString);

    if (val && index < length - 1) {
      setTimeout(() => focusInput(index + 1), 0);
    }

    if (val && otpString.replace(/[^0-9]/g, "").length === length) {
      onComplete?.(otpString);
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      const newOTP = [...otp];

      if (otp[index]) {
        newOTP[index] = "";
        setOTP(newOTP);
        onChange?.(newOTP.join(""));
      } else if (index > 0) {
        newOTP[index - 1] = "";
        setOTP(newOTP);
        onChange?.(newOTP.join(""));
        setTimeout(() => focusInput(index - 1), 0);
      }
      e.preventDefault();
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      focusInput(index - 1);
    } else if (e.key === "ArrowRight" && index < length - 1) {
      e.preventDefault();
      focusInput(index + 1);
    }
  };

  const handleFocus = (index: number) => {
    setTimeout(() => {
      inputRefs.current[index]?.select();
    }, 0);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text");
    const digits = pastedData.replace(/[^0-9]/g, "").slice(0, length);

    if (digits) {
      const newOTP = digits
        .split("")
        .concat(Array(length - digits.length).fill(""));
      setOTP(newOTP);
      onChange?.(newOTP.join(""));

      const lastIndex = Math.min(digits.length - 1, length - 1);
      setTimeout(() => focusInput(lastIndex), 0);

      if (digits.length === length) {
        onComplete?.(digits);
      }
    }
  };

  return (
    <div
      className={cn("", className)}
      style={{
        direction: "ltr",
        display: "flex",
        flexWrap: "wrap",
        marginRight: "-8px",
        marginTop: "-8px",
        width: "calc(100% + 8px)",
      }}
    >
      {Array.from({ length }, (_, index) => (
        <div
          key={index}
          style={{
            direction: "ltr",
            flexBasis: "0px",
            flexGrow: "1",
            maxWidth: "100%",
            paddingRight: "8px",
            paddingTop: "8px",
          }}
        >
          <div
            style={{
              direction: "ltr",
              display: "inline-flex",
              flexDirection: "column",
              marginBottom: "8px",
              marginTop: "16px",
              position: "relative",
              verticalAlign: "top",
              width: "100%",
            }}
          >
            <div
              style={{
                alignItems: "center",
                borderRadius: "8px",
                cursor: "text",
                direction: "ltr",
                display: "flex",
                position: "relative",
                textAlign: "center",
                width: "100%",
              }}
            >
              <input
                ref={(ref) => (inputRefs.current[index] = ref)}
                type="tel"
                inputMode="numeric"
                maxLength={1}
                value={otp[index] || ""}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  handleChange(index, e.target.value)
                }
                onKeyDown={(e) => handleKeyDown(index, e)}
                onFocus={() => handleFocus(index)}
                onPaste={handlePaste}
                disabled={disabled}
                style={{
                  animation:
                    "0.01s ease 0s 1 normal none running mui-auto-fill-cancel",
                  animationDuration: "0.01s",
                  animationName: "mui-auto-fill-cancel",
                  appearance: "auto",
                  boxSizing: "content-box",
                  cursor: "text",
                  direction: "ltr",
                  overflowX: "clip",
                  overflowY: "clip",
                  paddingBottom: "10px",
                  paddingLeft: "12px",
                  paddingRight: "12px",
                  paddingTop: "10px",
                  textAlign: "center",
                  width: "100%",
                  border: "1px solid rgba(0, 0, 0, 0.2)",
                  borderRadius: "8px",
                  fontSize: "16px",
                  fontWeight: "500",
                  backgroundColor: "rgb(255, 255, 255)",
                }}
                autoComplete={index === 0 ? "one-time-code" : "off"}
              />
              <fieldset
                aria-hidden="true"
                style={{
                  borderBottom: "1px solid rgba(0, 0, 0, 0.2)",
                  borderBottomLeftRadius: "8px",
                  borderBottomRightRadius: "8px",
                  borderBottomStyle: "solid",
                  borderBottomWidth: "1px",
                  borderColor: "rgba(0, 0, 0, 0.2)",
                  borderLeft: "1px solid rgba(0, 0, 0, 0.2)",
                  borderLeftStyle: "solid",
                  borderLeftWidth: "1px",
                  borderRadius: "8px",
                  borderRight: "1px solid rgba(0, 0, 0, 0.2)",
                  borderRightStyle: "solid",
                  borderRightWidth: "1px",
                  borderStyle: "solid",
                  borderTop: "1px solid rgba(0, 0, 0, 0.2)",
                  borderTopLeftRadius: "8px",
                  borderTopRightRadius: "8px",
                  borderTopStyle: "solid",
                  borderTopWidth: "1px",
                  borderWidth: "1px",
                  bottom: "0px",
                  cursor: "text",
                  direction: "ltr",
                  left: "0px",
                  minWidth: "0%",
                  overflowX: "hidden",
                  overflowY: "hidden",
                  paddingLeft: "8px",
                  paddingRight: "8px",
                  pointerEvents: "none",
                  position: "absolute",
                  right: "0px",
                  textAlign: "right",
                  top: "-5px",
                }}
              >
                <legend
                  style={{
                    cursor: "text",
                    direction: "ltr",
                    lineHeight: "11px",
                    overflowX: "hidden",
                    overflowY: "hidden",
                    pointerEvents: "none",
                    textAlign: "right",
                    transitionDuration: "0.15s",
                    transitionProperty: "width",
                    transitionTimingFunction: "cubic-bezier(0, 0, 0.2, 1)",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      cursor: "text",
                      direction: "ltr",
                      display: "inline",
                      lineHeight: "11px",
                      pointerEvents: "none",
                      textAlign: "right",
                    }}
                  >
                    ​
                  </span>
                </legend>
              </fieldset>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
