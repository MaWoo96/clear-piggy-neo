import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import clsx from 'clsx';

interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  position?: 'bottom' | 'right';
  size?: 'sm' | 'md' | 'lg' | 'full';
}

export const Sheet: React.FC<SheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className,
  position = 'bottom',
  size = 'md',
}) => {
  const sizeClasses = {
    sm: position === 'bottom' ? 'max-h-[40vh]' : 'max-w-sm',
    md: position === 'bottom' ? 'max-h-[60vh]' : 'max-w-md',
    lg: position === 'bottom' ? 'max-h-[80vh]' : 'max-w-lg',
    full: position === 'bottom' ? 'h-full' : 'w-full',
  };

  const variants = {
    hidden: position === 'bottom' ? { y: '100%' } : { x: '100%' },
    visible: position === 'bottom' ? { y: 0 } : { x: 0 },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-[60]"
          />
          <motion.div
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={variants}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={clsx(
              'fixed bg-white dark:bg-gray-900 z-[70]',
              'rounded-t-2xl shadow-xl',
              position === 'bottom'
                ? 'bottom-0 left-0 right-0 pb-safe'
                : 'top-0 right-0 bottom-0',
              sizeClasses[size],
              className
            )}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {title}
              </h2>
              <button
                onClick={onClose}
                className="p-2 -mr-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto h-full">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};