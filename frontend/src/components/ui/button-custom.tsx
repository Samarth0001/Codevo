
import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ 
  className = "",
  variant = "default",
  size = "default",
  children,
  ...props
}, ref) => {
  const variantClasses = {
    default: "bg-blue-600 text-white hover:bg-blue-700",
    outline: "border border-dark-border text-white hover:border-blue-500 hover:bg-dark-accent/50",
    secondary: "bg-gray-700 text-white hover:bg-gray-800",
    ghost: "hover:bg-gray-800 hover:text-white",
    link: "text-blue-500 underline-offset-4 hover:underline",
  };

  const sizeClasses = {
    default: "h-10 px-4 py-2",
    sm: "h-9 rounded-md px-3 text-sm",
    lg: "h-11 rounded-md px-8 text-lg",
    icon: "h-10 w-10 p-2",
  };

  const buttonClasses = [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus:outline-none disabled:pointer-events-none disabled:opacity-50",
    variantClasses[variant],
    sizeClasses[size],
    className
  ].join(" ");

  return (
    <button
      className={buttonClasses}
      ref={ref}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = "Button";

export default Button;
