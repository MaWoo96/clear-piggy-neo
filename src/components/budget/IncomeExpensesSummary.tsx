import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency } from '../../lib/supabase';

interface IncomeExpensesSummaryProps {
  totalIncome: number;
  totalExpenses: number;
  previousIncome?: number;
  previousExpenses?: number;
}

export const IncomeExpensesSummary: React.FC<IncomeExpensesSummaryProps> = ({
  totalIncome,
  totalExpenses,
  previousIncome,
  previousExpenses,
}) => {
  const netCashFlow = totalIncome - totalExpenses;
  const previousNetCashFlow = previousIncome && previousExpenses
    ? previousIncome - previousExpenses
    : null;

  const incomeChange = previousIncome
    ? ((totalIncome - previousIncome) / previousIncome) * 100
    : 0;

  const expensesChange = previousExpenses
    ? ((totalExpenses - previousExpenses) / previousExpenses) * 100
    : 0;

  const netChange = previousNetCashFlow
    ? ((netCashFlow - previousNetCashFlow) / Math.abs(previousNetCashFlow)) * 100
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Income */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Income</span>
          {previousIncome !== undefined && (
            <div className={`flex items-center text-xs ${incomeChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {incomeChange >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
              {Math.abs(incomeChange).toFixed(1)}%
            </div>
          )}
        </div>
        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
          {formatCurrency(totalIncome / 100)}
        </div>
      </div>

      {/* Expenses */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Expenses</span>
          {previousExpenses !== undefined && (
            <div className={`flex items-center text-xs ${expensesChange <= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {expensesChange >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
              {Math.abs(expensesChange).toFixed(1)}%
            </div>
          )}
        </div>
        <div className="text-2xl font-bold text-red-600 dark:text-red-400">
          {formatCurrency(totalExpenses / 100)}
        </div>
      </div>

      {/* Net Cash Flow */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Net Cash Flow</span>
          {previousNetCashFlow !== null && (
            <div className={`flex items-center text-xs ${netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {netChange >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
              {Math.abs(netChange).toFixed(1)}%
            </div>
          )}
        </div>
        <div className={`text-2xl font-bold ${netCashFlow >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>
          {formatCurrency(netCashFlow / 100)}
        </div>
      </div>
    </div>
  );
};