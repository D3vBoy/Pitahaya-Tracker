import { ReactNode } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: ReactNode;
  error?: string;
}

export default function Input({ label, icon, error, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-pitahaya-secondary-text dark:text-pitahaya-gray-300">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-pitahaya-gray-500">
            {icon}
          </div>
        )}
        <input
          {...props}
          className={`input-pitahaya ${icon ? "pl-10" : "pl-4"} ${className}`}
        />
      </div>
      {error && <span className="text-red-500 text-xs mt-1">{error}</span>}
    </div>
  );
}