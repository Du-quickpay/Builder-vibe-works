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

  // Update OTP when value prop changes
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
    // Handle paste operation
    if (val.length > 1) {
      const pastedData = val.replace(/[^0-9]/g, "").slice(0, length);
      const newOTP = [...otp];

      // Fill from current index onwards
      for (let i = 0; i < pastedData.length && index + i < length; i++) {
        newOTP[index + i] = pastedData[i];
      }

      // Fill remaining with empty strings
      for (let i = index + pastedData.length; i < length; i++) {
        newOTP[i] = "";
      }

      setOTP(newOTP);
      const otpString = newOTP.join("");
      onChange?.(otpString);

      // Focus appropriate input
      const nextIndex = Math.min(index + pastedData.length, length - 1);
      setTimeout(() => focusInput(nextIndex), 0);

      // Check if complete
      if (otpString.replace(/[^0-9]/g, "").length === length) {
        onComplete?.(otpString);
      }
      return;
    }

    // Only allow single digits
    if (val && !/^\d$/.test(val)) {
      return;
    }

    const newOTP = [...otp];
    newOTP[index] = val;
    setOTP(newOTP);

    const otpString = newOTP.join("");
    onChange?.(otpString);

    // Auto-focus next input if digit entered
    if (val && index < length - 1) {
      setTimeout(() => focusInput(index + 1), 0);
    }

    // Check if OTP is complete
    if (val && otpString.replace(/[^0-9]/g, "").length === length) {
      onComplete?.(otpString);
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === "Backspace") {
      const newOTP = [...otp];

      if (otp[index]) {
        // Clear current field
        newOTP[index] = "";
        setOTP(newOTP);
        onChange?.(newOTP.join(""));
      } else if (index > 0) {
        // Move to previous field and clear it
        newOTP[index - 1] = "";
        setOTP(newOTP);
        onChange?.(newOTP.join(""));
        setTimeout(() => focusInput(index - 1), 0);
      }
      e.preventDefault();
    }

    // Handle arrow keys
    else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      focusInput(index - 1);
    } else if (e.key === "ArrowRight" && index < length - 1) {
      e.preventDefault();
      focusInput(index + 1);
    }

    // Handle delete
    else if (e.key === "Delete") {
      const newOTP = [...otp];
      newOTP[index] = "";
      setOTP(newOTP);
      onChange?.(newOTP.join(""));
      e.preventDefault();
    }

    // Handle home/end
    else if (e.key === "Home") {
      e.preventDefault();
      focusInput(0);
    } else if (e.key === "End") {
      e.preventDefault();
      focusInput(length - 1);
    }
  };

  const handleFocus = (index: number) => {
    // Select all text when focused for better UX
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

      // Focus last filled input
      const lastIndex = Math.min(digits.length - 1, length - 1);
      setTimeout(() => focusInput(lastIndex), 0);

      // Check if complete
      if (digits.length === length) {
        onComplete?.(digits);
      }
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
          maxLength={length} // Allow paste of full length
          value={otp[index] || ""}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            handleChange(index, e.target.value)
          }
          onKeyDown={(e) => handleKeyDown(index, e)}
          onFocus={() => handleFocus(index)}
          onPaste={handlePaste}
          disabled={disabled}
          className={cn(
            // Size and spacing
            "w-10 h-10 sm:w-12 sm:h-12",
            // Text styling - اعداد کاملاً وسط
            "text-center text-base sm:text-lg font-medium",
            // Border and background
            "rounded-lg border border-gray-300 bg-white",
            // Focus states
            "focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none",
            // Transitions
            "transition-all duration-200",
            // Disabled state
            "disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50",
            // Active state with subtle highlight
            otp[index] ? "border-blue-300 bg-blue-50" : "hover:border-gray-400",
            // RTL/LTR handling
            "direction-ltr",
          )}
          style={{
            // Force center alignment for numbers
            textAlign: "center",
            direction: "ltr",
            // Ensure proper number display
            fontFeatureSettings: "'tnum' on, 'lnum' on",
          }}
          autoComplete={index === 0 ? "one-time-code" : "off"}
          placeholder="●"
        />
      ))}
    </div>
  );
};
