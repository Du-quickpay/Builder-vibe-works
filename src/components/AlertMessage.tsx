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
      className={cn(
        "flex w-full rounded-lg border border-blue-500 bg-blue-50 p-4 text-blue-600 transition-all duration-300",
        className,
      )}
    >
      <div className="flex ml-2 opacity-90">
        <Info className="h-6 w-6" />
      </div>
      <div className="flex-grow overflow-auto">
        <div className="flex justify-between items-start">
          <div className="text-sm leading-6">{children}</div>
        </div>
      </div>
    </div>
  );
};
