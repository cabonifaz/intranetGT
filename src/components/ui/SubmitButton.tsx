"use client";

import { useFormStatus } from "react-dom";

interface SubmitButtonProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  pendingText?: string;
}

// Equivalente a ConfirmSubmitButton pero sin dialogo de confirmacion --
// mismo criterio: useFormStatus() ya sabe si el <form> ancestro esta
// enviando el Server Action, asi que el boton se deshabilita y avisa
// "Procesando..." solo, sin necesidad de estado manual en cada form.
export default function SubmitButton({ children, className, title, pendingText = "Procesando..." }: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" title={title} disabled={pending} className={`${className ?? ""} ${pending ? "cursor-wait opacity-60" : ""}`}>
      {pending ? pendingText : children}
    </button>
  );
}
