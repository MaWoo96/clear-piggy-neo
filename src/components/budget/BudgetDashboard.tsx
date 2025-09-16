import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, TrendingUp, AlertCircle, Plus, RefreshCw, 
  ChevronRight, DollarSign, Activity, Eye, EyeOff,
  Sparkles, Calculator, PieChart, ChevronDown, Receipt
} from 'lucide-react';
import { useBudget } from '../../hooks/useBudget';
import { useTheme } from '../../contexts/ThemeContext';
import { formatCurrency, supabase } from '../../lib/supabase';
import { BudgetWizard } from './BudgetWizard';
import { BudgetCategoryCard } from './BudgetCategoryCard';
import { BudgetProgressRing } from './BudgetProgressRing';
import { BudgetInsights } from './BudgetInsights';
import { IncomeExpensesSummary } from './IncomeExpensesSummary';
import { format } from 'date-fns';

export const BudgetDashboard: React.FC = () => {
  const { isDark } = useTheme();
  const { 
    currentBudget, 
    budgetLines, 
    performance, 
    loading, 
    error,
    refreshBudget 
  } = useBudget();
  
  const [showWizard, setShowWizard] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [showOverBudgetOnly, setShowOverBudgetOnly] = useState(false);
  
  // Table view expanded rows and transactions
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [rowTransactions, setRowTransactions] = useState<Record<string, any[]>>({});
  const [loadingTransactions, setLoadingTransactions] = useState<Record<string, boolean>>({});

  const filteredBudgetLines = showOverBudgetOnly 
    ? budgetLines.filter(line => line.spent_cents > line.budgeted_amount_cents)
    : budgetLines;

  // Load transactions for a specific budget line
  const loadTransactionsForLine = async (lineId: string, categoryId: string) => {
    if (!currentBudget || rowTransactions[lineId]) return;
    
    setLoadingTransactions(prev => ({ ...prev, [lineId]: true }));
    try {
      // Query for transactions using new categorization hierarchy with category ID
      const { data, error } = await supabase
        .from('feed_transactions')
        .select('*')
        .eq('workspace_id', currentBudget.workspace_id)
        .eq('direction', 'outflow')
        .eq('status', 'posted')
        .gt('amount_cents', 0)
        .or(`user_category_primary.eq.${categoryId},ai_category_primary.eq.${categoryId}`)
        .gte('transaction_date', currentBudget.start_date)
        .lte('transaction_date', currentBudget.end_date)
        .order('transaction_date', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Transaction query error:', error);
        setRowTransactions(prev => ({ ...prev, [lineId]: [] }));
      } else if (data) {
        setRowTransactions(prev => ({ ...prev, [lineId]: data }));
      }
    } catch (err) {
      console.error('Error loading transactions:', err);
      setRowTransactions(prev => ({ ...prev, [lineId]: [] }));
    } finally {
      setLoadingTransactions(prev => ({ ...prev, [lineId]: false }));
    }
  };

  // Toggle row expansion
  const toggleRowExpansion = (lineId: string, categoryId: string) => {
    const newExpandedRows = new Set(expandedRows);
    
    if (expandedRows.has(lineId)) {
      newExpandedRows.delete(lineId);
    } else {
      newExpandedRows.add(lineId);
      loadTransactionsForLine(lineId, categoryId);
    }
    
    setExpandedRows(newExpandedRows);
  };

  if (loading && !currentBudget) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading budget...</p>
        </div>
      </div>
    );
  }

  if (!currentBudget && !showWizard) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center max-w-md">
          <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            No Active Budget
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Create your first budget to start tracking expenses and reaching your financial goals.
          </p>
          <button
            onClick={() => setShowWizard(true)}
            className="btn btn-primary inline-flex items-center gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Create AI-Powered Budget
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <AnimatePresence>
        {showWizard && (
          <BudgetWizard
            onCancel={() => setShowWizard(false)}
            onComplete={() => {
              setShowWizard(false);
              refreshBudget();
            }}
          />
        )}
      </AnimatePresence>

      <div className="space-y-6">
        {/* Income & Expenses Summary */}
        <IncomeExpensesSummary
          totalIncome={0}
          totalExpenses={0}
        />
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {currentBudget?.name || 'Budget Dashboard'}
            </h1>
            {currentBudget && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {format(new Date(currentBudget.start_date), 'MMM d')} - {format(new Date(currentBudget.end_date), 'MMM d, yyyy')}
                {currentBudget.strategy && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">
                    {currentBudget.strategy.replace(/_/g, ' ')}
                  </span>
                )}
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={refreshBudget}
              className="btn btn-secondary"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => setShowWizard(true)}
              className="btn btn-primary"
            >
              <Plus className="h-4 w-4" />
              New Budget
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          </div>
        )}

        {currentBudget && performance && (
          <>
            {/* Performance Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card p-6"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total Budget</span>
                  <DollarSign className="h-4 w-4 text-gray-400" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(performance.total_budgeted_cents)}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="card p-6"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Spent</span>
                  <Activity className="h-4 w-4 text-gray-400" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(performance.total_spent_cents)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {performance.utilization_percentage.toFixed(1)}% utilized
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="card p-6"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Remaining</span>
                  <TrendingUp className="h-4 w-4 text-gray-400" />
                </div>
                <p className={`text-2xl font-bold ${
                  performance.total_remaining_cents >= 0 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {formatCurrency(performance.total_remaining_cents)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {performance.on_track_for_month ? 'On track' : 'Over pace'}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="card p-6"
              >
                <BudgetProgressRing 
                  percentage={performance.utilization_percentage}
                  onTrack={performance.on_track_for_month}
                />
              </motion.div>
            </div>

            {/* AI Insights */}
            <BudgetInsights budgetId={currentBudget.id} />

            {/* View Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewMode('cards')}
                    className={`p-2 rounded-lg transition-colors ${
                      viewMode === 'cards' 
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100' 
                        : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <PieChart className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg transition-colors ${
                      viewMode === 'list' 
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100' 
                        : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Calculator className="h-4 w-4" />
                  </button>
                </div>

                <button
                  onClick={() => setShowOverBudgetOnly(!showOverBudgetOnly)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                    showOverBudgetOnly 
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {showOverBudgetOnly ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  {showOverBudgetOnly ? 'Show All' : 'Over Budget Only'}
                  {performance.categories_over_budget > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-600 text-white rounded-full">
                      {performance.categories_over_budget}
                    </span>
                  )}
                </button>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400">
                {filteredBudgetLines.length} categories
              </p>
            </div>

            {/* Budget Categories */}
            {viewMode === 'cards' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredBudgetLines.map((line, index) => (
                  <motion.div
                    key={line.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <BudgetCategoryCard 
                      budgetLine={{
                        ...line,
                        budget: {
                          start_date: currentBudget.start_date,
                          end_date: currentBudget.end_date,
                          workspace_id: currentBudget.workspace_id
                        }
                      }} 
                    />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="card overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Budgeted
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Spent
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Remaining
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredBudgetLines.map(line => {
                      const percentage = line.budgeted_amount_cents > 0 
                        ? (line.spent_cents / line.budgeted_amount_cents) * 100 
                        : 0;
                      const isOverBudget = line.spent_cents > line.budgeted_amount_cents;
                      const isExpanded = expandedRows.has(line.id);
                      const transactions = rowTransactions[line.id] || [];
                      const isLoadingTx = loadingTransactions[line.id] || false;

                      return (
                        <React.Fragment key={line.id}>
                          <tr className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                {line.categories?.icon && (
                                  <span className="text-2xl">{line.categories.icon}</span>
                                )}
                                <div>
                                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {line.categories?.name || line.line_name}
                                  </p>
                                  {line.ai_suggested && (
                                    <span className="text-xs text-blue-600 dark:text-blue-400">
                                      AI suggested
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-gray-100">
                              {formatCurrency(line.budgeted_amount_cents)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-gray-100">
                              {formatCurrency(line.spent_cents)}
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-medium ${
                              isOverBudget ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                            }`}>
                              {isOverBudget && '-'}{formatCurrency(Math.abs(line.remaining_cents))}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="flex items-center justify-center">
                                <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full transition-all ${
                                      isOverBudget ? 'bg-red-500' : percentage > 80 ? 'bg-yellow-500' : 'bg-green-500'
                                    }`}
                                    style={{ width: `${Math.min(percentage, 100)}%` }}
                                  />
                                </div>
                                <span className="ml-2 text-xs text-gray-600 dark:text-gray-400">
                                  {percentage.toFixed(0)}%
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <button
                                onClick={() => toggleRowExpansion(line.id, line.category_id || line.line_name)}
                                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                              >
                                <motion.div
                                  animate={{ rotate: isExpanded ? 180 : 0 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <ChevronDown className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                                </motion.div>
                              </button>
                            </td>
                          </tr>
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.tr
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="bg-gray-50 dark:bg-gray-800"
                              >
                                <td colSpan={6} className="px-6 py-4">
                                  <div className="flex items-center gap-2 mb-3">
                                    <Receipt className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                      Transactions ({transactions.length})
                                    </h4>
                                  </div>

                                  {isLoadingTx ? (
                                    <div className="flex justify-center py-4">
                                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-gray-100"></div>
                                    </div>
                                  ) : transactions.length > 0 ? (
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                      {transactions.map((tx: any) => (
                                        <div
                                          key={tx.id}
                                          className="flex items-center justify-between p-2 bg-white dark:bg-gray-700 rounded-lg text-sm shadow-sm"
                                        >
                                          <div className="flex-1">
                                            <div className="font-medium text-gray-900 dark:text-gray-100">
                                              {tx.merchant_name || tx.description || tx.counterparty_name || tx.payment_payee || 'Payment'}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                              {new Date(tx.transaction_date).toLocaleDateString()}
                                              {tx.payment_method && ` • ${tx.payment_method}`}
                                              {!tx.merchant_name && tx.reference_number && ` • Ref: ${tx.reference_number}`}
                                            </div>
                                          </div>
                                          <div className="font-medium text-gray-900 dark:text-gray-100 ml-2">
                                            {formatCurrency(tx.amount_cents)}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                                      No transactions in this period
                                    </p>
                                  )}
                                </td>
                              </motion.tr>
                            )}
                          </AnimatePresence>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};