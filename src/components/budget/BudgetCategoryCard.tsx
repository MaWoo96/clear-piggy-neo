import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, AlertCircle, Sparkles, ChevronDown, ChevronUp, Receipt } from 'lucide-react';
import { formatCurrency } from '../../lib/supabase';
import { supabase } from '../../lib/supabase';
import type { BudgetLine } from '../../types/budget.types';

interface BudgetCategoryCardProps {
  budgetLine: BudgetLine & { budget?: { start_date: string; end_date: string; workspace_id: string } };
}

interface Transaction {
  id: string;
  merchant_name: string | null;
  amount_cents: number;
  transaction_date: string;
  account_id?: string;
  description?: string | null;
  counterparty_name?: string | null;
  payment_payee?: string | null;
  payment_method?: string | null;
  reference_number?: string | null;
}

export const BudgetCategoryCard: React.FC<BudgetCategoryCardProps> = ({ budgetLine }) => {
  const [expanded, setExpanded] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  
  const percentage = budgetLine.budgeted_amount_cents > 0 
    ? (budgetLine.spent_cents / budgetLine.budgeted_amount_cents) * 100 
    : 0;
  
  const isOverBudget = budgetLine.spent_cents > budgetLine.budgeted_amount_cents;
  const isNearLimit = percentage > 80 && !isOverBudget;
  
  const getStatusColor = () => {
    if (isOverBudget) return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
    if (isNearLimit) return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
    return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
  };

  const getProgressBarColor = () => {
    if (isOverBudget) return 'bg-red-500';
    if (isNearLimit) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  useEffect(() => {
    if (expanded && transactions.length === 0 && budgetLine.budget) {
      loadTransactions();
    }
  }, [expanded]);

  const loadTransactions = async () => {
    if (!budgetLine.budget) {
      console.log('No budget info available for loading transactions');
      return;
    }
    
    setLoadingTransactions(true);
    console.log(`Loading transactions for category: ${budgetLine.line_name}`);
    
    try {
      // Query transactions matching this budget category
      const { data, error } = await supabase
        .from('feed_transactions')
        .select('*')
        .eq('workspace_id', budgetLine.budget.workspace_id)
        .eq('direction', 'outflow')  // Only expenses
        .eq('status', 'posted')  // Only posted transactions
        .or(`user_category_primary.eq.${budgetLine.category_id || budgetLine.line_name},ai_category_primary.eq.${budgetLine.category_id || budgetLine.line_name}`)  // Match category using new hierarchy
        .gte('transaction_date', budgetLine.budget.start_date)
        .lte('transaction_date', budgetLine.budget.end_date)
        .order('transaction_date', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Transaction query error:', error);
        console.error('Query params:', {
          workspace_id: budgetLine.budget.workspace_id,
          category: budgetLine.line_name,
          start: budgetLine.budget.start_date,
          end: budgetLine.budget.end_date
        });
        setTransactions([]);
      } else if (data) {
        console.log(`✅ Loaded ${data.length} transactions for ${budgetLine.line_name}`);
        // Transform amounts to positive for display
        const transformedData = data.map((tx: any) => ({
          ...tx,
          amount_cents: Math.abs(tx.amount_cents)
        }));
        setTransactions(transformedData);
      } else {
        console.log(`No transactions found for ${budgetLine.line_name}`);
        setTransactions([]);
      }
    } catch (err) {
      console.error('Error loading transactions:', err);
      setTransactions([]);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  return (
    <motion.div
      layout
      className="card p-4 hover:shadow-lg transition-shadow"
    >
      <div 
        className="cursor-pointer"
        onClick={toggleExpanded}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {budgetLine.categories?.icon && (
              <span className="text-2xl">{budgetLine.categories.icon}</span>
            )}
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100">
                {budgetLine.categories?.name || budgetLine.line_name.replace(/_/g, ' ').toLowerCase()}
              </h3>
              {budgetLine.ai_suggested && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Sparkles className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs text-blue-600 dark:text-blue-400">
                    AI suggested
                    {budgetLine.ai_confidence && (
                      <span className="ml-1">({(budgetLine.ai_confidence * 100).toFixed(0)}%)</span>
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${getStatusColor()}`}>
              {isOverBudget ? (
                <AlertCircle className="h-4 w-4" />
              ) : percentage > 50 ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
            </div>
            <motion.div
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <ChevronDown className="h-5 w-5" />
            </motion.div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Spent</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {formatCurrency(budgetLine.spent_cents)}
            </span>
          </div>

          <div className="relative">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(percentage, 100)}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className={`h-2 rounded-full ${getProgressBarColor()}`}
              />
              {percentage > 100 && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {percentage.toFixed(0)}% used
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                of {formatCurrency(budgetLine.budgeted_amount_cents)}
              </span>
            </div>
          </div>

          <div className={`flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700`}>
            <span className="text-sm text-gray-600 dark:text-gray-400">Remaining</span>
            <span className={`font-medium ${
              isOverBudget ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
            }`}>
              {isOverBudget && '-'}{formatCurrency(Math.abs(budgetLine.remaining_cents))}
            </span>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center gap-2 mb-3">
              <Receipt className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Transactions ({transactions.length})
              </h4>
            </div>

            {loadingTransactions ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-gray-100"></div>
              </div>
            ) : transactions.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {tx.merchant_name || tx.counterparty_name || tx.description || tx.payment_payee || 'Transaction'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <span>{new Date(tx.transaction_date).toLocaleDateString()}</span>
                        {tx.payment_method && (
                          <>
                            <span>•</span>
                            <span className="truncate">{tx.payment_method}</span>
                          </>
                        )}
                        {tx.account_id && (
                          <>
                            <span>•</span>
                            <span className="text-gray-400">Account</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="font-medium text-gray-900 dark:text-gray-100 ml-3 whitespace-nowrap">
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
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};