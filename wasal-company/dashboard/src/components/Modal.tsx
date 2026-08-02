import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function Modal({ isOpen, onClose, title, subtitle, icon, children, size = 'md' }: ModalProps) {
  // Close on Escape and lock body scroll while the popup is open.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" dir="rtl">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-brand-900/40 backdrop-blur-sm animate-wasal-fade"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Popup */}
      <div
        className={`relative w-full ${sizeClasses[size]} bg-card rounded-3xl shadow-2xl overflow-hidden ring-1 ring-brand-100 animate-wasal-pop`}
      >
        {/* Header */}
        <div className="wasal-gradient flex items-center justify-between gap-3 px-5 py-4">
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-white">
                {icon}
              </span>
            )}
            <div className="min-w-0">
              <h3 className="text-lg font-extrabold text-white truncate">{title}</h3>
              {subtitle && <p className="text-xs text-white/80 truncate">{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/90 hover:bg-white/20 transition-colors"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[calc(100vh-220px)] overflow-y-auto bg-card">{children}</div>
      </div>
    </div>
  );
}
