import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, TrendingUp, AlertCircle, Plus, RefreshCw, 
  ChevronRight, DollarSign, Activity, Eye, EyeOff,
  Sparkles, Calculator, PieChart, ChevronDown, Receipt,
  Calendar, Shuffle, Tag, Settings
} from 'lucide-react';
import { useBudget } from '../../hooks/useBudget';
import { useBudgetEnhanced } from '../../hooks/useBudgetEnhanced';
import { useTheme } from '../../contexts/ThemeContext';
import { formatCurrency, supabase } from '../../lib/supabase';
import { BudgetWizard } from './BudgetWizard';
import { BudgetCategoryCard } from './BudgetCategoryCard';
import { BudgetProgressRing } from './BudgetProgressRing';
import { BudgetInsights } from './BudgetInsights';
import { BudgetPeriodSelector } from './BudgetPeriodSelector';
import { BudgetStrategySelector } from './BudgetStrategySelector';
import { TransactionBudgetAssignment } from './TransactionBudgetAssignment';
import { IncomeExpensesSummary } from './IncomeExpensesSummary';
import { format } from 'date-fns';

const BudgetDashboardEnhancedComponent: React.FC = () => {
  const { isDark } = useTheme();
  const { 
    currentBudget, 
    budgetLines, 
    performance, 
    loading, 
    error,
    refreshBudget 
  } = useBudget();

  // Use enhanced hook for new features
  const {
    budget: enhancedBudget,
    budgetPerformance,
    transactionOverrides,
    convertBudgetStrategy,
    assignTransactionToBudget,
    createFlexibleBudget,
    hasOverrides,
    currentStrategy
  } = useBudgetEnhanced(currentBudget?.id);
  
  const [showWizard, setShowWizard] = useState(false);
  const [showEnhancedWizard, setShowEnhancedWizard] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [showOverBudgetOnly, setShowOverBudgetOnly] = useState(false);
  const [showStrategySelector, setShowStrategySelector] = useState(false);
  const [assigningTransaction, setAssigningTransaction] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [incomeExpenseData, setIncomeExpenseData] = useState<{ income: number; expenses: number }>({ income: 0, expenses: 0 });
  
  // Table view expanded rows and transactions
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [rowTransactions, setRowTransactions] = useState<Record<string, any[]>>({});
  const [loadingTransactions, setLoadingTransactions] = useState<Record<string, boolean>>({});

  const filteredBudgetLines = showOverBudgetOnly 
    ? budgetLines.filter(line => line.spent_cents > line.budgeted_amount_cents)
    : budgetLines;

  // Monitor budget changes
  useEffect(() => {
    console.log('🔵 BudgetDashboardEnhanced: budgetLines updated');
    console.log('   Total lines:', budgetLines.length);
    if (budgetLines.length > 0) {
      console.log('   Sample data:', budgetLines.slice(0, 3).map((l: any) => ({
        name: l.line_name,
        budgeted: l.budgeted_amount_cents,
        spent: l.spent_cents
      })));
    }
  }, [budgetLines]);

  useEffect(() => {
    console.log('🔵 BudgetDashboardEnhanced: currentBudget updated');
    if (currentBudget) {
      console.log('   Budget:', currentBudget.name);
      console.log('   Strategy:', currentBudget.strategy);
      console.log('   Total:', currentBudget.total_budgeted_cents);
    }
  }, [currentBudget]);

  // Fetch actual income and expense data from transactions
  useEffect(() => {
    async function fetchIncomeExpenseData() {
      if (!currentBudget || !currentBudget.workspace_id) return;

      try {
        console.log('📊 Fetching transactions for budget period:', {
          workspace: currentBudget.workspace_id,
          startDate: currentBudget.start_date,
          endDate: currentBudget.end_date
        });

        // First, let's get ALL transactions without date filter to debug
        const { data: allTx, error: allError } = await supabase
          .from('feed_transactions')
          .select('amount_cents, direction, status, transaction_date, merchant_name')
          .eq('workspace_id', currentBudget.workspace_id)
          .order('transaction_date', { ascending: false })
          .limit(100);

        if (!allError && allTx) {
          console.log(`🔍 Total transactions in workspace: ${allTx.length}`);
          console.log('📅 Date range of transactions:', {
            earliest: allTx[allTx.length - 1]?.transaction_date,
            latest: allTx[0]?.transaction_date,
            budgetStart: currentBudget.start_date,
            budgetEnd: currentBudget.end_date
          });
        }

        // Now fetch transactions for the budget period
        const { data: transactions, error } = await supabase
          .from('feed_transactions')
          .select('amount_cents, direction, status, transaction_date, merchant_name')
          .eq('workspace_id', currentBudget.workspace_id)
          .gte('transaction_date', currentBudget.start_date)
          .lte('transaction_date', currentBudget.end_date)
          .order('transaction_date', { ascending: false });

        if (error) {
          console.error('Error fetching transactions for income/expense:', error);
          return;
        }

        console.log(`📋 Found ${transactions?.length || 0} transactions for budget period`);

        // Calculate totals - let's be more inclusive
        let totalIncome = 0;
        let totalExpenses = 0;
        let incomeCount = 0;
        let expenseCount = 0;
        let skippedCount = 0;

        transactions?.forEach(tx => {
          // Count all non-pending transactions
          if (tx.status !== 'pending') {
            if (tx.direction === 'inflow') {
              totalIncome += Math.abs(tx.amount_cents);
              incomeCount++;
            } else if (tx.direction === 'outflow') {
              totalExpenses += Math.abs(tx.amount_cents);
              expenseCount++;
            } else {
              skippedCount++;
            }
          } else {
            skippedCount++;
          }
        });

        console.log('💰 Income/Expense breakdown:', {
          incomeTransactions: incomeCount,
          totalIncomeCents: totalIncome,
          totalIncomeFormatted: `$${(totalIncome / 100).toFixed(2)}`,
          expenseTransactions: expenseCount,
          totalExpensesCents: totalExpenses,
          totalExpensesFormatted: `$${(totalExpenses / 100).toFixed(2)}`,
          netCashFlow: `$${((totalIncome - totalExpenses) / 100).toFixed(2)}`,
          skippedTransactions: skippedCount
        });

        // Log sample transactions for debugging
        if (transactions && transactions.length > 0) {
          console.log('📝 Sample transactions:', transactions.slice(0, 10).map(tx => ({
            date: tx.transaction_date,
            merchant: tx.merchant_name,
            amount: `$${Math.abs(tx.amount_cents / 100).toFixed(2)}`,
            direction: tx.direction,
            status: tx.status
          })));
        }

        setIncomeExpenseData({ income: totalIncome, expenses: totalExpenses });
      } catch (err) {
        console.error('❌ Error calculating income/expense:', err);
      }
    }

    fetchIncomeExpenseData();
  }, [currentBudget]);

  // Load transactions for a specific budget line
  const loadTransactionsForLine = async (lineId: string, categoryId: string) => {
    if (!currentBudget || rowTransactions[lineId]) return;
    
    setLoadingTransactions(prev => ({ ...prev, [lineId]: true }));
    try {
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

  // Handle strategy change
  const handleStrategyChange = async (newStrategy: string) => {
    console.log('🎯 handleStrategyChange called with:', newStrategy);
    console.log('📊 Current budget before conversion:', currentBudget);
    console.log('📋 Current budget lines before conversion:', budgetLines.map((l: any) => ({
      name: l.line_name,
      budgeted: l.budgeted_amount_cents
    })));
    
    try {
      console.log('📞 Calling convertBudgetStrategy from hook...');
      const result = await convertBudgetStrategy(newStrategy);
      console.log('📊 Hook result:', result);
      
      console.log('🔄 Refreshing budget...');
      await refreshBudget();
      console.log('✅ refreshBudget complete');
      
      // Log the state after refresh
      setTimeout(() => {
        console.log('📊 Budget after refresh (delayed check):', currentBudget);
        console.log('📋 Budget lines after refresh (delayed check):', budgetLines.map((l: any) => ({
          name: l.line_name,
          budgeted: l.budgeted_amount_cents
        })));
      }, 1000);
      
      setShowStrategySelector(false);
    } catch (error) {
      console.error('❌ Error changing strategy:', error);
    }
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

  if (!currentBudget && !showWizard && !showEnhancedWizard) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            No Budget Created Yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Create your first budget to start tracking your expenses
          </p>
          <div className="flex flex-col gap-3 max-w-sm mx-auto">
            <button
              onClick={() => setShowWizard(true)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Calculator className="h-5 w-5" />
              Create Standard Budget
            </button>
            <button
              onClick={() => setShowEnhancedWizard(true)}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles className="h-5 w-5" />
              Create Custom Period Budget
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showWizard) {
    return <BudgetWizard onComplete={() => setShowWizard(false)} onCancel={() => setShowWizard(false)} />;
  }

  if (showEnhancedWizard) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Create Custom Budget
          </h2>
          <button
            onClick={() => setShowEnhancedWizard(false)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Cancel
          </button>
        </div>
        
        {/* Period Selector */}
        <BudgetPeriodSelector
          onPeriodSelect={async (startDate, endDate, periodType) => {
            // Store period selection and move to next step
            console.log('Period selected:', { startDate, endDate, periodType });
          }}
        />
        
        {/* Strategy Selector */}
        <BudgetStrategySelector
          mode="select"
          onStrategySelect={(strategy) => {
            console.log('Strategy selected:', strategy);
          }}
        />
        
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setShowEnhancedWizard(false)}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              // Create budget with selected options
              setShowEnhancedWizard(false);
            }}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Create Budget
          </button>
        </div>
      </div>
    );
  }

  // Transaction Assignment Modal
  if (assigningTransaction) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.9 }}
          className="max-w-2xl w-full"
        >
          <TransactionBudgetAssignment
            transaction={assigningTransaction}
            budgetId={currentBudget?.id || ''}
            onAssignmentComplete={() => {
              setAssigningTransaction(null);
              refreshBudget();
            }}
          />
        </motion.div>
      </motion.div>
    );
  }

  const totalBudgeted = budgetLines.reduce((sum, line) => sum + line.budgeted_amount_cents, 0);
  const totalSpent = budgetLines.reduce((sum, line) => sum + line.spent_cents, 0);
  const totalRemaining = totalBudgeted - totalSpent;
  const utilizationRate = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Income & Expenses Summary */}
      <IncomeExpensesSummary
        totalIncome={incomeExpenseData.income}
        totalExpenses={incomeExpenseData.expenses}
      />
      
      {/* Header Section with Enhanced Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {currentBudget?.name || 'Budget'}
            </h2>
            {enhancedBudget?.period_type === 'custom' && (
              <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-xs rounded-full">
                Custom Period
              </span>
            )}
            {hasOverrides && (
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                Has Manual Assignments
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {currentBudget && format(new Date(currentBudget.start_date), 'MMM d')} - {currentBudget && format(new Date(currentBudget.end_date), 'MMM d, yyyy')}
              {enhancedBudget?.period_length_days && (
                <span className="ml-1">({enhancedBudget.period_length_days} days)</span>
              )}
            </span>
            <span className="flex items-center gap-1">
              <PieChart className="h-4 w-4" />
              Strategy: {currentStrategy.charAt(0).toUpperCase() + currentStrategy.slice(1).replace('_', ' ')}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1 rounded ${viewMode === 'cards' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''} transition-all`}
            >
              Cards
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''} transition-all`}
            >
              List
            </button>
          </div>
          
          {/* Settings Menu */}
          <div className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Settings className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
            
            {showSettings && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`absolute right-0 mt-2 w-64 rounded-lg shadow-lg ${
                  isDark ? 'bg-gray-800' : 'bg-white'
                } border border-gray-200 dark:border-gray-700 z-10`}
              >
                <div className="p-2">
                  <button
                    onClick={() => {
                      setShowStrategySelector(true);
                      setShowSettings(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-left"
                  >
                    <Shuffle className="h-4 w-4" />
                    <span>Change Strategy</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowOverBudgetOnly(!showOverBudgetOnly);
                      setShowSettings(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-left"
                  >
                    {showOverBudgetOnly ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    <span>{showOverBudgetOnly ? 'Show All' : 'Show Over Budget Only'}</span>
                  </button>
                  <button
                    onClick={() => {
                      refreshBudget();
                      setShowSettings(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-left"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Refresh</span>
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Strategy Selector Modal */}
      {showStrategySelector && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.9 }}
            className="max-w-2xl w-full"
          >
            <div className={`rounded-lg p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">Change Budget Strategy</h3>
                <button
                  onClick={() => setShowStrategySelector(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <BudgetStrategySelector
                mode="switch"
                currentStrategy={currentStrategy}
                budgetId={currentBudget?.id || ''}
                onStrategyChange={handleStrategyChange}
                showHistory={true}
              />
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-6 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Budget</p>
            <Target className="h-5 w-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {formatCurrency(totalBudgeted)}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`p-6 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">Spent</p>
            <Activity className="h-5 w-5 text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {formatCurrency(totalSpent)}
          </p>
          <div className="mt-2">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  utilizationRate > 100 ? 'bg-red-600' : 
                  utilizationRate > 80 ? 'bg-orange-600' : 'bg-green-600'
                }`}
                style={{ width: `${Math.min(utilizationRate, 100)}%` }}
              />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`p-6 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">Remaining</p>
            <DollarSign className="h-5 w-5 text-green-600" />
          </div>
          <p className={`text-2xl font-bold ${
            totalRemaining < 0 ? 'text-red-600' : 'text-green-600'
          }`}>
            {formatCurrency(Math.abs(totalRemaining))}
            {totalRemaining < 0 && ' over'}
          </p>
        </motion.div>
      </div>

      {/* Budget Categories with Transaction Assignment */}
      {viewMode === 'list' && (
        <div className={`rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm overflow-hidden`}>
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Budget
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Spent
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Remaining
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredBudgetLines.map((line, index) => {
                const isExpanded = expandedRows.has(line.id);
                const transactions = rowTransactions[line.id] || [];
                const isLoading = loadingTransactions[line.id];
                
                return (
                  <React.Fragment key={line.id}>
                    <tr 
                      className={`border-t border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                        index % 2 === 0 ? '' : 'bg-gray-50/50 dark:bg-gray-800/50'
                      }`}
                      onClick={() => toggleRowExpansion(line.id, line.line_name)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                          <span className="font-medium text-gray-900 dark:text-gray-100">{line.line_name}</span>
                          {(line as any).has_overrides && (
                            <Tag className="h-3 w-3 text-blue-500" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                        {formatCurrency(line.budgeted_amount_cents)}
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                        {formatCurrency(line.spent_cents)}
                      </td>
                      <td className={`px-4 py-3 font-medium ${
                        line.spent_cents > line.budgeted_amount_cents ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {formatCurrency(Math.abs(line.budgeted_amount_cents - line.spent_cents))}
                      </td>
                      <td className="px-4 py-3">
                        {line.spent_cents > line.budgeted_amount_cents ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300">
                            Over Budget
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                            On Track
                          </span>
                        )}
                      </td>
                    </tr>
                    
                    {/* Expanded Transactions */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={5} className="px-4 py-3 bg-gray-50 dark:bg-gray-900">
                          {isLoading ? (
                            <div className="text-center py-4">
                              <RefreshCw className="h-5 w-5 animate-spin mx-auto text-gray-400" />
                            </div>
                          ) : transactions.length > 0 ? (
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                Recent transactions in this category:
                              </p>
                              {transactions.map(tx => (
                                <div key={tx.id} className="flex items-center justify-between py-2 px-3 bg-white dark:bg-gray-800 rounded">
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                      {tx.name || tx.merchant_name}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {format(new Date(tx.transaction_date), 'MMM d, yyyy')}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-red-600">
                                      {formatCurrency(Math.abs(tx.amount_cents))}
                                    </span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setAssigningTransaction(tx);
                                      }}
                                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                      title="Assign to different budget category"
                                    >
                                      <Tag className="h-3 w-3 text-gray-400 hover:text-blue-500" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                              No transactions found in this category
                            </p>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBudgetLines.map(line => (
            <BudgetCategoryCard 
              key={line.id} 
              budgetLine={{
                ...line,
                budget: currentBudget ? {
                  start_date: currentBudget.start_date,
                  end_date: currentBudget.end_date,
                  workspace_id: currentBudget.workspace_id
                } : undefined
              }} 
            />
          ))}
        </div>
      )}

      {/* Budget Insights */}
      {currentBudget && <BudgetInsights budgetId={currentBudget.id} />}
    </div>
  );
};

// Export with React.memo for performance optimization
export const BudgetDashboardEnhanced = React.memo(BudgetDashboardEnhancedComponent);