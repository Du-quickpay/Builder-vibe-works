import { useState, useRef, KeyboardEvent, ChangeEvent } from "react";
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

  const handleChange = (index: number, val: string) => {
    if (val.length > 1) {
      // Handle paste
      const pastedData = val.slice(0, length);
      const newOTP = pastedData
        .split("")
        .concat(Array(length - pastedData.length).fill(""));
      setOTP(newOTP);
      onChange?.(newOTP.join(""));

      if (pastedData.length === length) {
        onComplete?.(pastedData);
      }

      // Focus the last filled input or next empty one
      const nextIndex = Math.min(pastedData.length, length - 1);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    // Only allow numbers
    if (val && !/^\d$/.test(val)) {
      return;
    }

    const newOTP = [...otp];
    newOTP[index] = val;
    setOTP(newOTP);

    const otpString = newOTP.join("");
    onChange?.(otpString);

    if (val && index < length - 1) {
      // Move to next input
      inputRefs.current[index + 1]?.focus();
    }

    // Check if OTP is complete
    if (otpString.length === length && !otpString.includes("")) {
      onComplete?.(otpString);
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      // Move to previous input on backspace if current is empty
      inputRefs.current[index - 1]?.focus();
      const newOTP = [...otp];
      newOTP[index - 1] = "";
      setOTP(newOTP);
      onChange?.(newOTP.join(""));
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  return (
    <div
      className={cn(
        "flex flex-row gap-1.5 sm:gap-2 justify-center px-2 sm:px-0",
        className,
      )}
      dir="ltr"
    >
      {Array.from({ length }, (_, index) => (
        <input
          key={index}
          ref={(ref) => (inputRefs.current[index] = ref)}
          type="tel"
          inputMode="numeric"
          maxLength={1}
          value={otp[index] || ""}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            handleChange(index, e.target.value)
          }
          onKeyDown={(e) => handleKeyDown(index, e)}
          disabled={disabled}
          className={cn(
            "w-10 h-10 sm:w-12 sm:h-12 text-center text-base sm:text-lg font-medium rounded-lg border border-gray-300",
            "focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none",
            "disabled:bg-gray-100 disabled:cursor-not-allowed",
            "transition-all duration-200",
            otp[index] ? "bg-white border-blue-200" : "bg-white",
          )}
          autoComplete={index === 0 ? "one-time-code" : "off"}
        />
      ))}
    </div>
  );
};
