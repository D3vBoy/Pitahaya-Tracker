import { ReactNode } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: ReactNode;
  error?: string;
}

export default function Input({ label, icon, error, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="ml-1 text-sm font-medium text-pitahaya-gray-300">
          {label}
        </label>
      )}
      <div className="relative group">
        {icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-pitahaya-gray-500 transition-colors group-focus-within:text-pitahaya-cerise">
            {icon}
          </div>
        )}
        <input
          {...props}
          className={`w-full rounded-xl border border-pitahaya-border bg-pitahaya-surface py-3 ${
            icon ? "pl-10" : "pl-4"
          } pr-4 text-white placeholder-pitahaya-gray-500 transition-all duration-300 focus:border-pitahaya-cerise focus:outline-none focus:ring-2 focus:ring-pitahaya-cerise/20 ${className}`}
        />
      </div>
      {error && <span className="ml-1 text-xs text-red-300">{error}</span>}
    </div>
  );
}