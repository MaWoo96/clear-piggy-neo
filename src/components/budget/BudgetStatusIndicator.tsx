import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface BudgetStatusIndicatorProps {
  status: 'on_track' | 'warning' | 'over_budget' | null;
  healthScore?: number;
  utilizationPercentage?: number;
  compact?: boolean;
}

export const BudgetStatusIndicator: React.FC<BudgetStatusIndicatorProps> = ({
  status,
  healthScore,
  utilizationPercentage,
  compact = false
}) => {
  const { isDark } = useTheme();

  if (!status) return null;

  const getStatusColor = () => {
    switch (status) {
      case 'on_track':
        return 'text-green-600 dark:text-green-400';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'over_budget':
        return 'text-red-600 dark:text-red-400';
    }
  };

  const getStatusBg = () => {
    switch (status) {
      case 'on_track':
        return isDark ? 'bg-green-900/20' : 'bg-green-50';
      case 'warning':
        return isDark ? 'bg-yellow-900/20' : 'bg-yellow-50';
      case 'over_budget':
        return isDark ? 'bg-red-900/20' : 'bg-red-50';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'on_track':
        return <CheckCircle className="h-5 w-5" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5" />;
      case 'over_budget':
        return <TrendingDown className="h-5 w-5" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'on_track':
        return 'On Track';
      case 'warning':
        return 'Warning';
      case 'over_budget':
        return 'Over Budget';
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  if (compact) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`
          inline-flex items-center gap-2 px-3 py-1.5 rounded-full
          ${getStatusBg()} ${getStatusColor()}
        `}
      >
        {getStatusIcon()}
        <span className="text-sm font-medium">{getStatusText()}</span>
        {utilizationPercentage !== undefined && (
          <span className="text-xs opacity-75">
            ({utilizationPercentage.toFixed(0)}%)
          </span>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-lg ${getStatusBg()}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <h3 className={`font-semibold ${getStatusColor()}`}>
            Budget Status: {getStatusText()}
          </h3>
        </div>
        {healthScore !== undefined && (
          <div className="text-right">
            <div className="text-xs opacity-75 mb-1">Health Score</div>
            <div className="flex items-center gap-2">
              <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${healthScore}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className={`h-2 rounded-full ${getHealthColor(healthScore)}`}
                />
              </div>
              <span className="text-sm font-medium">{healthScore.toFixed(0)}</span>
            </div>
          </div>
        )}
      </div>

      {utilizationPercentage !== undefined && (
        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="opacity-75">Budget Utilization</span>
            <span className="font-medium">{utilizationPercentage.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(utilizationPercentage, 100)}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className={`h-2 rounded-full transition-colors ${
                utilizationPercentage > 100 ? 'bg-red-500' :
                utilizationPercentage > 80 ? 'bg-yellow-500' :
                'bg-green-500'
              }`}
            />
          </div>
        </div>
      )}

      <div className="mt-3 text-xs opacity-75">
        {status === 'on_track' && 'Your spending is within budget limits. Keep it up!'}
        {status === 'warning' && 'Some categories are approaching their limits. Monitor closely.'}
        {status === 'over_budget' && 'You have exceeded your budget in one or more categories.'}
      </div>
    </motion.div>
  );
};