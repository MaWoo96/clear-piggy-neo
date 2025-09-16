import React from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import clsx from 'clsx';

interface FABProps {
  onClick: () => void;
  icon?: React.FC<{ className?: string }>;
  label?: string;
  className?: string;
  position?: 'bottom-right' | 'bottom-center' | 'bottom-left';
  offset?: { bottom?: string; right?: string; left?: string };
}

export const FAB: React.FC<FABProps> = ({
  onClick,
  icon: Icon = Plus,
  label,
  className,
  position = 'bottom-right',
  offset = { bottom: '80px', right: '16px' },
}) => {
  const positionClasses = {
    'bottom-right': 'bottom-20 right-4',
    'bottom-center': 'bottom-20 left-1/2 -translate-x-1/2',
    'bottom-left': 'bottom-20 left-4',
  };

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: 1.05 }}
      onClick={onClick}
      className={clsx(
        'fixed z-40',
        'w-14 h-14 rounded-full',
        'bg-primary-600 dark:bg-primary-500',
        'text-white shadow-lg',
        'flex items-center justify-center',
        'hover:bg-primary-700 dark:hover:bg-primary-600',
        'focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-300',
        'transition-colors duration-200',
        positionClasses[position],
        className
      )}
      style={{
        bottom: offset.bottom,
        right: position === 'bottom-right' ? offset.right : undefined,
        left: position === 'bottom-left' ? offset.left : undefined,
      }}
      aria-label={label || 'Add'}
    >
      <Icon className="w-6 h-6" />
    </motion.button>
  );
};