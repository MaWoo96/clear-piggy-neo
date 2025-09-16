import React from 'react';
import { motion } from 'framer-motion';

interface BudgetProgressRingProps {
  percentage: number;
  onTrack: boolean;
  size?: number;
}

export const BudgetProgressRing: React.FC<BudgetProgressRingProps> = ({ 
  percentage, 
  onTrack, 
  size = 120 
}) => {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  const getColor = () => {
    if (percentage > 100) return '#ef4444'; // red
    if (percentage > 80) return '#f59e0b'; // yellow
    if (onTrack) return '#10b981'; // green
    return '#3b82f6'; // blue
  };

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-gray-200 dark:text-gray-700"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getColor()}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {Math.min(percentage, 100).toFixed(0)}%
        </span>
        <span className="text-xs text-gray-600 dark:text-gray-400">
          {onTrack ? 'On Track' : percentage > 100 ? 'Over Budget' : 'Off Pace'}
        </span>
      </div>
    </div>
  );
};