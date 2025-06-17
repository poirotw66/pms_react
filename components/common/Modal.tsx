
import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;

  let sizeClasses = 'max-w-md'; // default md
  if (size === 'sm') sizeClasses = 'max-w-sm';
  if (size === 'lg') sizeClasses = 'max-w-lg';
  if (size === 'xl') sizeClasses = 'max-w-xl';
  if (size === '2xl') sizeClasses = 'max-w-2xl';


  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-500 bg-opacity-75 transition-opacity" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* This element is to trick the browser into centering the modal contents. */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        
        <div className={`inline-block align-bottom bg-surface rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle w-full ${sizeClasses} sm:w-full`}>
          <div className="bg-surface px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 className="text-lg font-medium leading-6 text-textPrimary" id="modal-title">
                  {title}
                </h3>
                <div className="mt-4 text-textSecondary">
                  {children}
                </div>
              </div>
            </div>
          </div>
          <div className="bg-slate-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-borderLight">
            <button
              type="button"
              onClick={onClose}
              className="mt-3 inline-flex w-full justify-center rounded-md border border-borderDefault bg-surface px-4 py-2 text-base font-medium text-textPrimary shadow-sm hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-dark focus:ring-offset-2 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              關閉
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};