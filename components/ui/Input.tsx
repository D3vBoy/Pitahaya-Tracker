import { ReactNode } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: ReactNode;
  error?: string;
}

export default function Input({ label, icon, error, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm text-pitahaya-gray-300 font-medium">{label}</label>}
      <div className="relative">
        {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-pitahaya-gray-500">{icon}</div>}
        <input
          {...props}
          className={`w-full bg-white dark:bg-pitahaya-dark/60 border ${
            error ? "border-pitahaya-coral" : "border-pitahaya-accent/20"
          } rounded-lg py-2.5 ${icon ? "pl-10" : "pl-4"} pr-4 text-gray-900 dark:text-white placeholder-pitahaya-gray-500 focus:outline-none focus:border-pitahaya-accent transition-all ${className}`}
        />
      </div>
      {error && <span className="text-pitahaya-coral text-xs">{error}</span>}
    </div>
  );
}