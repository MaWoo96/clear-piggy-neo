import React from 'react';
import { Home, CreditCard, Receipt, TrendingUp, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

interface NavItem {
  id: string;
  label: string;
  icon: React.FC<{ className?: string }>;
}

const navItems: NavItem[] = [
  { id: 'overview', label: 'Home', icon: Home },
  { id: 'accounts', label: 'Accounts', icon: CreditCard },
  { id: 'transactions', label: 'Activity', icon: TrendingUp },
  { id: 'receipts', label: 'Receipts', icon: Receipt },
  { id: 'settings', label: 'Settings', icon: Settings },
];

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  className?: string;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onTabChange,
  className,
}) => {
  return (
    <nav
      className={clsx(
        'fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900',
        'border-t border-gray-200 dark:border-gray-800',
        'pb-safe z-50',
        className
      )}
    >
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={clsx(
                'flex flex-col items-center justify-center',
                'w-full h-full px-2 py-1',
                'transition-colors duration-200',
                'min-h-[44px] min-w-[44px]',
                isActive
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-gray-500 dark:text-gray-400'
              )}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary-600 dark:bg-primary-400 rounded-full"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </div>
              <span className="text-[10px] mt-1">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};