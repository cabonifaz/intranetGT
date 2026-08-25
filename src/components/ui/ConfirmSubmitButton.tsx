"use client";

import { useFormStatus } from "react-dom";

interface ConfirmSubmitButtonProps {
  mensaje: string;
  children: React.ReactNode;
  className?: string;
  title?: string;
  pendingText?: string;
}

// useFormStatus reporta el pending del <form> ancestro mas cercano --
// funciona sin cablear nada mas porque este boton ya vive dentro de ese
// form en cada uso existente. Se deshabilita y cambia de texto mientras
// el Server Action corre, para que quede claro que SI se proceso (antes
// no habia ninguna señal y parecia que el clic no hizo nada o se corto
// a medias).
export default function ConfirmSubmitButton({ mensaje, children, className, title, pendingText = "Procesando..." }: ConfirmSubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      title={title}
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(mensaje)) {
          event.preventDefault();
        }
      }}
      className={`${className ?? ""} ${pending ? "cursor-wait opacity-60" : ""}`}
    >
      {pending ? pendingText : children}
    </button>
  );
}
