import { useEffect, useRef, type ReactNode } from "react";
import { X, ArrowRight } from "lucide-react";
export const Mark = () => (
  <svg viewBox="0 0 256 256" aria-hidden="true">
    <path
      transform="translate(4 0)"
      fill="currentColor"
      d="M208 48v40h-88c-22 0-40 18-40 40s18 40 40 40h64l24 24v16h-88c-44 0-80-36-80-80s36-80 80-80h88Z"
    />
  </svg>
);
export function Empty({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="empty">
      <h2>{title}</h2>
      <p>{children}</p>
    </div>
  );
}
export function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="sheet-top">
        <h2>{title}</h2>
        <button className="icon" aria-label="Fechar" onClick={onClose}>
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export const Go = () => <ArrowRight size={20} />;
export const formatDate = (date: string) =>
  new Date(date + "T12:00:00Z").toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
export function download(
  filename: string,
  data: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
