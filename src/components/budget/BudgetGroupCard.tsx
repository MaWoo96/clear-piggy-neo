import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, AlertCircle, TrendingUp, Sparkles } from 'lucide-react';
import { formatCurrency } from '../../lib/supabase';
import { BudgetGroup, calculateGroupTotals } from '../../utils/budgetGroups';
import type { BudgetLine } from '../../types/budget.types';

interface BudgetGroupCardProps {
  group: BudgetGroup;
  budgetLines: (BudgetLine & {
    categories?: { name?: string; icon?: string };
    budget?: { start_date: string; end_date: string; workspace_id: string };
  })[];
}

export const BudgetGroupCard: React.FC<BudgetGroupCardProps> = ({ group, budgetLines }) => {
  const [expanded, setExpanded] = useState(false);

  if (budgetLines.length === 0) return null;

  const totals = calculateGroupTotals(budgetLines);
  const isOverBudget = totals.spent > totals.budgeted;
  const isNearLimit = totals.percentage > 80 && !isOverBudget;

  const getStatusColor = () => {
    if (isOverBudget) return 'text-red-600 dark:text-red-400';
    if (isNearLimit) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  const getProgressBarColor = () => {
    if (isOverBudget) return 'bg-red-500';
    if (isNearLimit) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getGroupColorClasses = () => {
    const colors = {
      blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
      green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
      purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
      pink: 'bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800',
      orange: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
      red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
      indigo: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800',
      teal: 'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800',
      gray: 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800'
    };
    return colors[group.color as keyof typeof colors] || colors.gray;
  };

  return (
    <motion.div
      layout
      className={`card p-5 hover:shadow-lg transition-all border-2 ${getGroupColorClasses()}`}
    >
      <div
        className="cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{group.icon}</span>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {group.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {budgetLines.length} {budgetLines.length === 1 ? 'category' : 'categories'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isOverBudget && (
              <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/30">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
            )}
            <motion.div
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <ChevronDown className="h-5 w-5" />
            </motion.div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Budgeted</p>
            <p className="font-semibold text-gray-900 dark:text-gray-100">
              {formatCurrency(totals.budgeted)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Spent</p>
            <p className={`font-semibold ${getStatusColor()}`}>
              {formatCurrency(totals.spent)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Remaining</p>
            <p className={`font-semibold ${totals.remaining < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
              {formatCurrency(Math.abs(totals.remaining))}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(totals.percentage, 100)}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className={`h-3 rounded-full ${getProgressBarColor()}`}
            />
            {totals.percentage > 100 && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            )}
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {totals.percentage.toFixed(0)}% used
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {isOverBudget && 'Over by '}{isOverBudget && formatCurrency(Math.abs(totals.remaining))}
            </span>
          </div>
        </div>
      </div>

      {/* Expanded Categories */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-4 pt-4 border-t border-gray-300 dark:border-gray-600"
          >
            <div className="space-y-3">
              {budgetLines.map((line) => {
                const linePercentage = line.budgeted_amount_cents > 0
                  ? (line.spent_cents / line.budgeted_amount_cents) * 100
                  : 0;
                const lineOverBudget = line.spent_cents > line.budgeted_amount_cents;

                return (
                  <div
                    key={line.id}
                    className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900 dark:text-gray-100">
                          {line.categories?.name || line.line_name}
                        </h4>
                        {line.ai_suggested && (
                          <div className="flex items-center gap-1">
                            <Sparkles className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                            <span className="text-xs text-blue-600 dark:text-blue-400">
                              AI
                            </span>
                          </div>
                        )}
                      </div>
                      {lineOverBudget && (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <div className="flex gap-4">
                        <span className="text-gray-600 dark:text-gray-400">
                          Budget: {formatCurrency(line.budgeted_amount_cents)}
                        </span>
                        <span className={lineOverBudget ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}>
                          Spent: {formatCurrency(line.spent_cents)}
                        </span>
                      </div>
                      <span className={`font-medium ${lineOverBudget ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                        {lineOverBudget ? '-' : ''}{formatCurrency(Math.abs(line.remaining_cents))}
                      </span>
                    </div>

                    {/* Mini Progress Bar */}
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${lineOverBudget ? 'bg-red-500' : linePercentage > 80 ? 'bg-yellow-500' : 'bg-green-500'}`}
                          style={{ width: `${Math.min(linePercentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};