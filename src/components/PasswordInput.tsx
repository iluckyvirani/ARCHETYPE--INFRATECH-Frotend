import { Eye, EyeOff } from "lucide-react";
import { useState, type InputHTMLAttributes } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  wrapClassName?: string;
  inputClassName?: string;
};

export function PasswordInput({
  wrapClassName = "",
  inputClassName = "",
  className,
  ...props
}: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={`password-wrap ${wrapClassName}`.trim()}>
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={`password-input ${inputClassName || className || ""}`.trim()}
      />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        tabIndex={-1}
      >
        {visible ? (
          <EyeOff size={18} strokeWidth={2} absoluteStrokeWidth />
        ) : (
          <Eye size={18} strokeWidth={2} absoluteStrokeWidth />
        )}
      </button>
    </div>
  );
}
