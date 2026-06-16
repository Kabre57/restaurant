import { X } from "lucide-react";
import { useEffect } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export default function Modal({ isOpen, onClose, title, children, maxWidth = "max-w-md" }: ModalProps) {
  
  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />
      
      <div className={`barab-card relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-[1.5rem] ${maxWidth}`}>
        <div className="flex items-center justify-between border-b border-[var(--parabellum-border)] px-5 py-4">
          <h2 className="text-lg font-bold uppercase tracking-tight text-[var(--parabellum-text)]" style={{ fontFamily: 'var(--title-font)' }}>{title}</h2>
          <button 
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--parabellum-border)] bg-[var(--parabellum-card)] text-[var(--parabellum-muted)] transition-colors hover:bg-[#fff6ef] hover:text-[var(--parabellum-text)]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto p-5">
          {children}
        </div>
      </div>
    </div>
  );
}
