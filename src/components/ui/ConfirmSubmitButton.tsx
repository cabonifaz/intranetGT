"use client";

interface ConfirmSubmitButtonProps {
  mensaje: string;
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export default function ConfirmSubmitButton({ mensaje, children, className, title }: ConfirmSubmitButtonProps) {
  return (
    <button
      type="submit"
      title={title}
      onClick={(event) => {
        if (!window.confirm(mensaje)) {
          event.preventDefault();
        }
      }}
      className={className}
    >
      {children}
    </button>
  );
}
