import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface AlertMessageProps {
  children: React.ReactNode;
  className?: string;
}

export const AlertMessage = ({ children, className }: AlertMessageProps) => {
  return (
    <div
      role="alert"
      className={cn("flex w-full transition-all duration-300", className)}
      style={{
        backgroundColor: "rgba(0, 122, 255, 0.05)",
        border: "1px solid rgb(0, 122, 255)",
        borderRadius: "8px",
        color: "rgb(0, 122, 255)",
        display: "flex",
        fontSize: "12px",
        lineHeight: "20.004px",
        padding: "16px",
        transitionDuration: "0.3s",
        transitionProperty: "box-shadow",
        transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
        width: "100%",
      }}
    >
      <div
        className="flex flex-shrink-0"
        style={{
          display: "flex",
          fontSize: "22px",
          lineHeight: "36.674px",
          marginLeft: "8px",
          opacity: "0.9",
        }}
      >
        <Info
          style={{
            width: "24px",
            height: "24px",
            color: "rgb(0, 122, 255)",
          }}
        />
      </div>
      <div
        className="flex-grow overflow-auto"
        style={{
          flexGrow: "1",
          fontSize: "14px",
          lineHeight: "24.01px",
          overflowX: "auto",
          overflowY: "auto",
        }}
      >
        <div
          className="flex justify-between items-start"
          style={{
            alignItems: "flex-start",
            display: "flex",
            fontSize: "14px",
            justifyContent: "space-between",
            lineHeight: "24.01px",
          }}
        >
          <div
            className="text-right"
            style={{
              fontSize: "14px",
              lineHeight: "24.01px",
              textAlign: "right",
            }}
          >
            {children}
          </div>
        </div>
        <div
          className="flex items-center"
          style={{
            alignItems: "center",
            display: "flex",
            fontSize: "14px",
            lineHeight: "24.01px",
          }}
        />
      </div>
    </div>
  );
};
