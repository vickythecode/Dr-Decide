import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

export default function Button({
  children,
  variant = "primary",
  loading = false,
  className = "",
  disabled,
  ...rest
}: Props) {
  return (
    <button
      className={`btn ${
        variant === "primary"
          ? "btn-primary"
          : variant === "danger"
          ? "btn-danger"
          : "btn-secondary"
      } ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? "Please wait..." : children}
    </button>
  );
}
