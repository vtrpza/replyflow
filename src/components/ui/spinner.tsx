"use client";

import { Loader2 } from "lucide-react";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Spinner({ size = "md", className = "" }: SpinnerProps) {
  const sizes = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <Loader2
      className={`animate-spin ${sizes[size]} ${className}`}
    />
  );
}

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading: boolean;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md" | "lg";
}

export function LoadingButton({
  loading,
  children,
  variant = "primary",
  size = "md",
  className = "",
  disabled,
  ...props
}: LoadingButtonProps) {
  const variants = {
    primary: "bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50",
    secondary: "bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-700/50",
    danger: "bg-red-600 hover:bg-red-700 disabled:bg-red-600/50",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-2.5 text-base",
  };

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  );
}
