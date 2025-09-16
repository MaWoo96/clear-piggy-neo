import React from 'react';
import { ChevronRight } from 'lucide-react';
import clsx from 'clsx';

interface ListItemProps {
  title: string;
  subtitle?: string;
  icon?: React.FC<{ className?: string }>;
  rightContent?: React.ReactNode;
  onClick?: () => void;
  showChevron?: boolean;
  className?: string;
}

export const ListItem: React.FC<ListItemProps> = ({
  title,
  subtitle,
  icon: Icon,
  rightContent,
  onClick,
  showChevron = false,
  className,
}) => {
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      onClick={onClick}
      className={clsx(
        'flex items-center justify-between',
        'px-4 py-3 min-h-[56px]',
        'bg-white dark:bg-gray-800',
        'border-b border-gray-100 dark:border-gray-700',
        onClick && 'hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors',
        onClick && 'cursor-pointer w-full text-left',
        className
      )}
    >
      <div className="flex items-center gap-3 flex-1">
        {Icon && (
          <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {title}
          </div>
          {subtitle && (
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {subtitle}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {rightContent}
        {showChevron && onClick && (
          <ChevronRight className="w-4 h-4 text-gray-400" />
        )}
      </div>
    </Component>
  );
};