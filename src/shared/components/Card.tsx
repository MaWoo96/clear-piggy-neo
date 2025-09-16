import React from 'react';
import clsx from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  onClick,
  padding = 'md',
  interactive = false,
}) => {
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      onClick={onClick}
      className={clsx(
        'bg-white dark:bg-gray-800',
        'rounded-lg border border-gray-200 dark:border-gray-700',
        'shadow-sm',
        paddingClasses[padding],
        interactive && 'hover:shadow-md transition-shadow duration-200',
        onClick && 'cursor-pointer text-left w-full',
        className
      )}
    >
      {children}
    </Component>
  );
};