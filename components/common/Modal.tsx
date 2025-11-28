
import React, { useEffect, useRef } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  showCloseButton?: boolean;
  footer?: React.ReactNode;
}

const CloseIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md',
  showCloseButton = true,
  footer
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Click outside to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === modalRef.current) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const sizeClasses: Record<string, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-4xl',
  };

  return (
    <div 
      ref={modalRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Modal Content */}
      <div 
        ref={contentRef}
        className={`
          modal-content
          w-full ${sizeClasses[size]}
          rounded-2xl
          shadow-2xl
          animate-scale-in
          max-h-[90vh]
          flex flex-col
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h3 id="modal-title" className="text-lg font-semibold text-white">
            {title}
          </h3>
          {showCloseButton && (
            <button
              onClick={onClose}
              className="p-2 -mr-2 text-surface-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              aria-label="關閉"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          )}
        </div>
        
        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
          {children}
        </div>
        
        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-white/5 bg-surface-900/50">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

// Confirmation Modal
interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = '確認',
  cancelText = '取消',
  variant = 'danger'
}) => {
  const iconColors: Record<string, string> = {
    danger: 'text-danger-400 bg-danger-500/10',
    warning: 'text-warning-400 bg-warning-500/10',
    info: 'text-info-400 bg-info-500/10',
  };

  const buttonVariants: Record<string, string> = {
    danger: 'btn-danger',
    warning: 'btn-accent',
    info: 'btn-primary',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm" showCloseButton={false}>
      <div className="text-center py-4">
        <div className={`w-16 h-16 mx-auto mb-4 rounded-full ${iconColors[variant]} flex items-center justify-center`}>
          {variant === 'danger' && (
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12.56 0c1.153 0 2.242.078 3.223.224M15 5.25V3.75a2.25 2.25 0 0 0-2.25-2.25h-1.5A2.25 2.25 0 0 0 9 3.75v1.5M12 10.5v6.75" />
            </svg>
          )}
          {variant === 'warning' && (
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.008v.008H12v-.008Z" />
            </svg>
          )}
          {variant === 'info' && (
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
            </svg>
          )}
        </div>
        <p className="text-surface-300 mb-6">{message}</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-surface-700 text-surface-200 hover:bg-surface-600 transition-colors font-medium"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-5 py-2.5 rounded-xl text-white font-medium ${buttonVariants[variant]}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// Alert/Toast Component
interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  onClose?: () => void;
}

export const Alert: React.FC<AlertProps> = ({ type, message, onClose }) => {
  const styles: Record<string, { bg: string; border: string; text: string; icon: string }> = {
    success: { 
      bg: 'bg-primary-500/10', 
      border: 'border-primary-500/30', 
      text: 'text-primary-400',
      icon: 'M4.5 12.75l6 6 9-13.5'
    },
    error: { 
      bg: 'bg-danger-500/10', 
      border: 'border-danger-500/30', 
      text: 'text-danger-400',
      icon: 'M6 18L18 6M6 6l12 12'
    },
    warning: { 
      bg: 'bg-warning-500/10', 
      border: 'border-warning-500/30', 
      text: 'text-warning-400',
      icon: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.008v.008H12v-.008Z'
    },
    info: { 
      bg: 'bg-info-500/10', 
      border: 'border-info-500/30', 
      text: 'text-info-400',
      icon: 'M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z'
    },
  };

  const s = styles[type];

  return (
    <div className={`${s.bg} ${s.border} border rounded-xl p-4 flex items-center gap-3 animate-slide-up`}>
      <svg className={`w-5 h-5 ${s.text} flex-shrink-0`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
      </svg>
      <p className={`flex-1 text-sm ${s.text}`}>{message}</p>
      {onClose && (
        <button onClick={onClose} className={`${s.text} hover:opacity-70 transition-opacity`}>
          <CloseIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
