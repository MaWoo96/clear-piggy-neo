import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, AlertCircle, Tag, TrendingDown, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useWorkspace } from '../../hooks/useWorkspace';
import { useTheme } from '../../contexts/ThemeContext';
import { formatCurrency } from '../../lib/supabase';
import type { Database } from '../../types/database.types';

interface Transaction {
  id: string;
  merchant_name: string;
  amount_cents: number;
  date: string;
  category_primary: string;
  has_override?: boolean;
  override_category?: string;
}

interface BudgetLine {
  id: string;
  name: string;
  category_primary: string;
  allocated_amount_cents: number;
  spent_cents?: number;
  remaining_cents?: number;
}

interface TransactionBudgetAssignmentProps {
  transaction?: Transaction;
  transactions?: Transaction[];
  budgetId: string;
  onAssignmentComplete?: () => void;
}

export const TransactionBudgetAssignment: React.FC<TransactionBudgetAssignmentProps> = ({
  transaction,
  transactions,
  budgetId,
  onAssignmentComplete
}) => {
  const { workspace } = useWorkspace();
  const { isDark } = useTheme();
  const [budgetLines, setBudgetLines] = useState<BudgetLine[]>([]);
  const [selectedLineId, setSelectedLineId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showImpactPreview, setShowImpactPreview] = useState(false);
  const [impactPreview, setImpactPreview] = useState<any>(null);
  const [currentOverride, setCurrentOverride] = useState<any>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());

  const isBulk = transactions && transactions.length > 0;
  const workingTransactions = isBulk ? transactions : (transaction ? [transaction] : []);

  useEffect(() => {
    if (budgetId && workspace) {
      fetchBudgetLines();
      if (transaction) {
        checkExistingOverride(transaction.id);
      }
    }
  }, [budgetId, workspace, transaction]);

  const fetchBudgetLines = async () => {
    if (!workspace) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('budget_lines')
        .select(`
          id, name, category_primary, allocated_amount_cents, spent_cents,
          budgets!inner(workspace_id)
        `)
        .eq('budget_id', budgetId)
        .eq('budgets.workspace_id', workspace.id)
        .order('name');

      if (error) throw error;
      setBudgetLines(data || []);
    } catch (error) {
      console.error('Error fetching budget lines:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkExistingOverride = async (transactionId: string) => {
    if (!workspace) return;
    try {
      const { data, error } = await supabase
        .from('budget_transaction_overrides')
        .select(`
          id, budget_line_id, workspace_id, transaction_id,
          budget_lines(name, category_primary)
        `)
        .eq('transaction_id', transactionId)
        .eq('workspace_id', workspace.id)
        .single();

      if (!error && data) {
        setCurrentOverride(data);
        setSelectedLineId(data.budget_line_id);
      }
    } catch (error) {
      // No override exists
    }
  };

  const calculateImpact = async (lineId: string, transactionIds: string[]) => {
    if (!lineId || transactionIds.length === 0 || !workspace) return;

    try {
      // Get current budget line performance
      const { data: performance } = await supabase.rpc('calculate_budget_performance_with_overrides', {
        p_workspace_id: workspace.id,
        p_budget_id: budgetId
      });

      const line = budgetLines.find(l => l.id === lineId);
      const currentLine = performance ? (performance as any[]).find((p: any) => p.line_id === lineId) : null;
      
      // Calculate total amount being assigned
      const totalAmount = workingTransactions
        .filter(t => transactionIds.includes(t.id))
        .reduce((sum, t) => sum + Math.abs(t.amount_cents), 0);

      setImpactPreview({
        lineName: line?.name,
        currentSpent: currentLine?.spent_cents || 0,
        newSpent: (currentLine?.spent_cents || 0) + totalAmount,
        allocated: line?.allocated_amount_cents || 0,
        remainingBefore: currentLine?.remaining_cents || line?.allocated_amount_cents || 0,
        remainingAfter: (currentLine?.remaining_cents || line?.allocated_amount_cents || 0) - totalAmount,
        transactionCount: transactionIds.length,
        totalAmount
      });
      setShowImpactPreview(true);
    } catch (error) {
      console.error('Error calculating impact:', error);
    }
  };

  const handleAssignment = async () => {
    if (!selectedLineId || !workspace) return;

    setSaving(true);
    try {
      const transactionsToAssign = bulkMode 
        ? Array.from(selectedTransactions)
        : (transaction ? [transaction.id] : []);

      if (transactionsToAssign.length === 0) {
        alert('Please select transactions to assign');
        return;
      }

      // Get user profile
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('auth_user_id', user?.id || '')
        .single();

      // Create overrides for each transaction
      const overrides = transactionsToAssign.map(txId => {
        const tx = workingTransactions.find(t => t.id === txId);
        return {
          workspace_id: workspace.id,
          transaction_id: txId,
          budget_line_id: selectedLineId,
          original_category: tx?.category_primary,
          created_by: profile?.id || user?.id
        };
      });

      const { error } = await supabase
        .from('budget_transaction_overrides')
        .upsert(overrides, {
          onConflict: 'transaction_id,budget_line_id'
        });

      if (error) throw error;

      // Success feedback
      const line = budgetLines.find(l => l.id === selectedLineId);
      alert(`Successfully assigned ${transactionsToAssign.length} transaction(s) to ${line?.name}`);
      
      if (onAssignmentComplete) {
        onAssignmentComplete();
      }

      // Reset state
      setSelectedTransactions(new Set());
      setSelectedLineId('');
      setShowImpactPreview(false);
    } catch (error) {
      console.error('Error assigning transaction:', error);
      alert('Failed to assign transaction. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveOverride = async () => {
    if (!currentOverride) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('budget_transaction_overrides')
        .delete()
        .eq('id', currentOverride.id);

      if (error) throw error;

      alert('Budget assignment removed successfully');
      setCurrentOverride(null);
      setSelectedLineId('');
      
      if (onAssignmentComplete) {
        onAssignmentComplete();
      }
    } catch (error) {
      console.error('Error removing override:', error);
      alert('Failed to remove assignment. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const toggleTransactionSelection = (txId: string) => {
    const newSelection = new Set(selectedTransactions);
    if (newSelection.has(txId)) {
      newSelection.delete(txId);
    } else {
      newSelection.add(txId);
    }
    setSelectedTransactions(newSelection);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className={`rounded-lg p-6 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Tag className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            {isBulk ? 'Bulk Budget Assignment' : 'Assign to Budget'}
          </h3>
        </div>
        {isBulk && (
          <button
            onClick={() => setBulkMode(!bulkMode)}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              bulkMode
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}
          >
            {bulkMode ? 'Selection Mode' : 'Enable Selection'}
          </button>
        )}
      </div>

      {/* Transaction(s) Display */}
      {workingTransactions.length > 0 && (
        <div className="mb-4 space-y-2">
          {workingTransactions.map(tx => (
            <div
              key={tx.id}
              className={`p-3 rounded-lg border transition-colors ${
                isDark
                  ? 'bg-gray-700/50 border-gray-600'
                  : 'bg-gray-50 border-gray-200'
              } ${bulkMode ? 'cursor-pointer' : ''}`}
              onClick={() => bulkMode && toggleTransactionSelection(tx.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {bulkMode && (
                    <input
                      type="checkbox"
                      checked={selectedTransactions.has(tx.id)}
                      onChange={() => toggleTransactionSelection(tx.id)}
                      className="rounded border-gray-300 dark:border-gray-600"
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {tx.merchant_name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {tx.date} • Current: {tx.category_primary || 'Uncategorized'}
                      {tx.has_override && (
                        <span className="ml-2 text-blue-600 dark:text-blue-400">
                          (Manually Assigned)
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <p className="font-semibold text-red-600 dark:text-red-400">
                  {formatCurrency(Math.abs(tx.amount_cents))}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Current Override Display */}
      {currentOverride && (
        <div className={`mb-4 p-3 rounded-lg ${
          isDark ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'
        } border`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Currently assigned to: <strong>{(currentOverride as any)?.budget_lines?.name}</strong>
              </p>
            </div>
            <button
              onClick={handleRemoveOverride}
              disabled={saving}
              className="text-sm text-red-600 dark:text-red-400 hover:underline"
            >
              Remove Assignment
            </button>
          </div>
        </div>
      )}

      {/* Budget Line Selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Select Budget Category
        </label>
        <select
          value={selectedLineId}
          onChange={(e) => {
            setSelectedLineId(e.target.value);
            if (e.target.value) {
              const txIds = bulkMode 
                ? Array.from(selectedTransactions)
                : (transaction ? [transaction.id] : []);
              calculateImpact(e.target.value, txIds);
            }
          }}
          className={`w-full px-3 py-2 rounded-lg border ${
            isDark
              ? 'bg-gray-700 border-gray-600 text-gray-100'
              : 'bg-white border-gray-300 text-gray-900'
          }`}
        >
          <option value="">Choose a budget category...</option>
          {budgetLines.map(line => (
            <option key={line.id} value={line.id}>
              {line.name} - {formatCurrency(line.allocated_amount_cents)} allocated
            </option>
          ))}
        </select>
      </div>

      {/* Impact Preview */}
      <AnimatePresence>
        {showImpactPreview && impactPreview && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`mb-4 p-4 rounded-lg ${
              isDark ? 'bg-gray-700' : 'bg-gray-100'
            }`}
          >
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
              Budget Impact Preview
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Category:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {impactPreview.lineName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Transactions:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {impactPreview.transactionCount} ({formatCurrency(impactPreview.totalAmount)})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Current Spent:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {formatCurrency(impactPreview.currentSpent)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">After Assignment:</span>
                <span className="font-medium text-orange-600 dark:text-orange-400">
                  {formatCurrency(impactPreview.newSpent)}
                </span>
              </div>
              <div className="pt-2 border-t border-gray-300 dark:border-gray-600">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Remaining Budget:</span>
                  <span className={`font-medium ${
                    impactPreview.remainingAfter < 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-green-600 dark:text-green-400'
                  }`}>
                    {formatCurrency(Math.abs(impactPreview.remainingAfter))}
                    {impactPreview.remainingAfter < 0 && ' over'}
                  </span>
                </div>
              </div>
            </div>
            {impactPreview.remainingAfter < 0 && (
              <div className="mt-3 p-2 bg-red-100 dark:bg-red-900/20 rounded text-sm text-red-700 dark:text-red-300">
                <TrendingDown className="h-4 w-4 inline mr-1" />
                This will exceed the budget for this category
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleAssignment}
          disabled={!selectedLineId || saving || (bulkMode && selectedTransactions.size === 0)}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedLineId && !saving
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
          }`}
        >
          {saving ? (
            <RefreshCw className="h-4 w-4 animate-spin mx-auto" />
          ) : (
            <>
              <Check className="h-4 w-4 inline mr-1" />
              {currentOverride ? 'Update Assignment' : 'Assign to Budget'}
            </>
          )}
        </button>
        {onAssignmentComplete && (
          <button
            onClick={onAssignmentComplete}
            className="px-4 py-2 rounded-lg font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            <X className="h-4 w-4 inline mr-1" />
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};