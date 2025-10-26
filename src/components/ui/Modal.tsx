import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl dark:shadow-slate-900/50 w-full max-w-2xl md:max-w-3xl max-h-[90vh] overflow-y-auto transition-colors duration-300">
        {title && (
          <div className="flex justify-between items-center p-4 md:p-6 border-b border-gray-200 dark:border-slate-600">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors duration-300"
              aria-label="Close modal"
            >
              &times;
            </button>
          </div>
        )}
        <div className="p-4 md:p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;