import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Target, Calculator, Shuffle, History, AlertCircle, Check } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/supabase';
import { useWorkspace } from '../../hooks/useWorkspace';
import { convertBudgetStrategy, getStrategyDescription } from '../../lib/budgetStrategyConverter';
import type { StrategyConversionResult } from '../../lib/budgetStrategyConverter';
import type { Database } from '../../types/database.types';

interface BudgetStrategy {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  benefits: string[];
  bestFor: string;
  allocation?: {
    needs?: number;
    wants?: number;
    savings?: number;
  };
}

interface BudgetStrategySelectorProps {
  currentStrategy?: string;
  budgetId?: string;
  onStrategySelect?: (strategy: string) => void;
  onStrategyChange?: (newStrategy: string) => Promise<void>;
  showHistory?: boolean;
  mode?: 'select' | 'switch';
}

interface StrategyChange {
  id: string;
  old_strategy: string;
  new_strategy: string;
  created_at: string;
  created_by: string;
}

export const BudgetStrategySelector: React.FC<BudgetStrategySelectorProps> = ({
  currentStrategy = 'envelope',
  budgetId,
  onStrategySelect,
  onStrategyChange,
  showHistory = false,
  mode = 'select'
}) => {
  const { isDark } = useTheme();
  const { workspace } = useWorkspace();
  const [selectedStrategy, setSelectedStrategy] = useState<string>(currentStrategy);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [changing, setChanging] = useState(false);
  const [strategyHistory, setStrategyHistory] = useState<StrategyChange[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [previewData, setPreviewData] = useState<StrategyConversionResult | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [loadingPreview, setLoadingPreview] = useState(false);

  const strategies: BudgetStrategy[] = [
    {
      id: 'envelope',
      name: 'Envelope System',
      description: 'Allocate specific amounts to each spending category',
      icon: <Target className="h-6 w-6" />,
      benefits: [
        'Complete control over each category',
        'Prevents overspending',
        'Visual spending limits',
        'Great for beginners'
      ],
      bestFor: 'People who want strict spending control and clear boundaries'
    },
    {
      id: '50_30_20',
      name: '50/30/20 Rule',
      description: 'Split income into needs (50%), wants (30%), and savings (20%)',
      icon: <PieChart className="h-6 w-6" />,
      benefits: [
        'Simple percentage-based system',
        'Balanced approach to spending',
        'Built-in savings goal',
        'Easy to remember'
      ],
      bestFor: 'Those with stable income seeking balanced financial health',
      allocation: {
        needs: 50,
        wants: 30,
        savings: 20
      }
    },
    {
      id: 'zero_based',
      name: 'Zero-Based Budget',
      description: 'Every dollar has a purpose - income minus expenses equals zero',
      icon: <Calculator className="h-6 w-6" />,
      benefits: [
        'Maximum financial awareness',
        'No money left unallocated',
        'Eliminates wasteful spending',
        'Complete accountability'
      ],
      bestFor: 'Detail-oriented people who want to optimize every dollar'
    },
    {
      id: 'custom',
      name: 'Custom Strategy',
      description: 'Create your own budgeting rules and allocations',
      icon: <Shuffle className="h-6 w-6" />,
      benefits: [
        'Complete flexibility',
        'Adapt to unique situations',
        'Mix different strategies',
        'Evolve over time'
      ],
      bestFor: 'Experienced budgeters with specific needs'
    }
  ];

  useEffect(() => {
    // Get current user ID
    const fetchUserId = async () => {
      console.log('🔍 Fetching user ID...');
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        console.log('  Auth user found:', user.id);
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('auth_user_id', user.id)
          .single();

        if (error) {
          console.error('  Error fetching profile:', error);
        } else if (profile?.id) {
          console.log('  Profile found, userId:', profile.id);
          setUserId(profile.id);
        }
      } else {
        console.error('  No auth user found');
      }
    };
    fetchUserId();
  }, []);

  useEffect(() => {
    if (showHistory && budgetId) {
      fetchStrategyHistory();
    }
  }, [budgetId, showHistory]);

  useEffect(() => {
    if (mode === 'switch' && selectedStrategy !== currentStrategy && budgetId && workspace && userId) {
      generatePreview();
    }
  }, [selectedStrategy, budgetId, workspace, userId]);

  const fetchStrategyHistory = async () => {
    if (!budgetId || !workspace) return;

    try {
      const { data, error } = await supabase
        .from('budget_strategy_changes')
        .select('id, old_strategy, new_strategy, created_at, created_by')
        .eq('budget_id', budgetId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStrategyHistory(data || []);
    } catch (error) {
      console.error('Error fetching strategy history:', error);
    }
  };

  const generatePreview = async () => {
    if (!budgetId || !workspace || !userId) return;

    setLoadingPreview(true);
    try {
      // Use a simulation mode of the converter (we'll add this flag)
      // For now, just get the current data and calculate what would change
      const { data: budget } = await supabase
        .from('budgets')
        .select('id, name, total_budgeted_cents, strategy')
        .eq('id', budgetId)
        .single();

      const { data: lines } = await supabase
        .from('budget_lines')
        .select('id, name, category_primary, line_name, budgeted_amount_cents')
        .eq('budget_id', budgetId);

      if (!budget || !lines) return;

      // Get spending history to calculate allocations
      const { data: incomeTransactions } = await supabase
        .from('feed_transactions')
        .select('amount_cents')
        .eq('workspace_id', workspace.id)
        .gt('amount_cents', 0)
        .gte('transaction_date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .lte('transaction_date', new Date().toISOString().split('T')[0]);

      let monthlyIncome = 500000;
      if (incomeTransactions && incomeTransactions.length > 0) {
        const totalIncome = incomeTransactions.reduce((sum: number, t: any) => sum + t.amount_cents, 0);
        monthlyIncome = Math.round(totalIncome / 3);
      }

      // Calculate preview changes based on strategy
      const changes: any[] = [];
      let totalNewBudget = 0;

      if (selectedStrategy === '50_30_20') {
        const needsAllocation = Math.round(monthlyIncome * 0.50);
        const wantsAllocation = Math.round(monthlyIncome * 0.30);
        const savingsAllocation = Math.round(monthlyIncome * 0.20);

        lines.forEach((line) => {
          if (!line) return;
          const name = (line.name || line.category_primary || '').toLowerCase();
          let newAmount = line.budgeted_amount_cents || 0;
          
          if (name.includes('rent') || name.includes('utilities') || name.includes('loan')) {
            newAmount = Math.round(needsAllocation / 3);
          } else if (name.includes('entertainment') || name.includes('dining')) {
            newAmount = Math.round(wantsAllocation / 2);
          } else if (name.includes('savings')) {
            newAmount = savingsAllocation;
          } else {
            newAmount = Math.round(needsAllocation / 6);
          }

          changes.push({
            category: line.name || line.category_primary || 'Unknown',
            oldAmount: line.budgeted_amount_cents || 0,
            newAmount,
            change: newAmount - (line.budgeted_amount_cents || 0)
          });
          totalNewBudget += newAmount;
        });
      } else if (selectedStrategy === 'zero_based') {
        lines.forEach((line) => {
          if (!line) return;
          changes.push({
            category: line.name || line.category_primary || 'Unknown',
            oldAmount: line.budgeted_amount_cents || 0,
            newAmount: 0,
            change: -(line.budgeted_amount_cents || 0)
          });
        });
      } else if (selectedStrategy === 'envelope') {
        lines.forEach((line) => {
          if (!line) return;
          const newAmount = line.budgeted_amount_cents || 50000;
          changes.push({
            category: line.name || line.category_primary || 'Unknown',
            oldAmount: line.budgeted_amount_cents || 0,
            newAmount,
            change: newAmount - (line.budgeted_amount_cents || 0)
          });
          totalNewBudget += newAmount;
        });
      }

      setPreviewData({
        success: true,
        changes,
        totalBudget: totalNewBudget,
        message: `Preview of ${selectedStrategy.replace(/_/g, ' ')} strategy`
      });
    } catch (error) {
      console.error('Error generating preview:', error);
      setPreviewData({
        success: false,
        changes: [],
        totalBudget: 0,
        message: 'Failed to generate preview'
      });
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleStrategySelect = (strategyId: string) => {
    setSelectedStrategy(strategyId);
    if (mode === 'select' && onStrategySelect) {
      onStrategySelect(strategyId);
    } else if (mode === 'switch' && strategyId !== currentStrategy) {
      setShowConfirmation(true);
    }
  };

  const confirmStrategyChange = async () => {
    console.log('🔄 confirmStrategyChange called');
    console.log('  budgetId:', budgetId);
    console.log('  workspace:', workspace);
    console.log('  userId:', userId);
    console.log('  selectedStrategy:', selectedStrategy);
    
    if (!budgetId || !workspace || !userId) {
      console.error('❌ Missing required data for strategy change:');
      console.error('  budgetId missing?', !budgetId);
      console.error('  workspace missing?', !workspace);
      console.error('  userId missing?', !userId);
      return;
    }

    setChanging(true);
    try {
      console.log('📞 Calling convertBudgetStrategy...');
      // Apply the actual strategy conversion
      const result = await convertBudgetStrategy(
        budgetId,
        workspace.id,
        selectedStrategy as '50_30_20' | 'envelope' | 'zero_based' | 'custom',
        userId
      );
      
      console.log('📊 Conversion result:', result);

      if (result.success) {
        console.log('✅ Strategy change successful!');
        if (onStrategyChange) {
          console.log('📞 Calling onStrategyChange callback...');
          await onStrategyChange(selectedStrategy);
        }
        setShowConfirmation(false);
        setPreviewData(null);
        if (showHistory) {
          fetchStrategyHistory();
        }
      } else {
        console.error('❌ Strategy change failed:', result.message);
        throw new Error(result.message || 'Failed to apply strategy');
      }
    } catch (error) {
      console.error('Error changing strategy:', error);
      alert('Failed to change strategy. Please try again.');
    } finally {
      setChanging(false);
    }
  };

  const selectedStrategyData = strategies.find(s => s.id === selectedStrategy);

  return (
    <div className={`rounded-lg p-6 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <PieChart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            {mode === 'select' ? 'Choose Budget Strategy' : 'Budget Strategy'}
          </h3>
        </div>
        {showHistory && strategyHistory.length > 0 && (
          <button
            onClick={() => setShowHistoryModal(true)}
            className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            <History className="h-4 w-4" />
            History
          </button>
        )}
      </div>

      {/* Current Strategy Display (for switch mode) */}
      {mode === 'switch' && (
        <div className={`mb-4 p-3 rounded-lg ${
          isDark ? 'bg-gray-700' : 'bg-gray-100'
        }`}>
          <p className="text-sm text-gray-600 dark:text-gray-400">Current Strategy:</p>
          <p className="font-medium text-gray-900 dark:text-gray-100">
            {strategies.find(s => s.id === currentStrategy)?.name || 'Unknown'}
          </p>
        </div>
      )}

      {/* Strategy Cards */}
      <div className="grid gap-3 mb-4">
        {strategies.map((strategy) => (
          <motion.div
            key={strategy.id}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => handleStrategySelect(strategy.id)}
            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
              selectedStrategy === strategy.id
                ? isDark
                  ? 'border-blue-500 bg-blue-900/20'
                  : 'border-blue-500 bg-blue-50'
                : isDark
                  ? 'border-gray-600 hover:border-gray-500 bg-gray-700/50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`mt-1 ${
                selectedStrategy === strategy.id
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400'
              }`}>
                {strategy.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h4 className={`font-medium ${
                    selectedStrategy === strategy.id
                      ? 'text-blue-700 dark:text-blue-300'
                      : 'text-gray-900 dark:text-gray-100'
                  }`}>
                    {strategy.name}
                  </h4>
                  {selectedStrategy === strategy.id && (
                    <Check className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {strategy.description}
                </p>
                
                {/* Allocation Display for 50/30/20 */}
                {strategy.allocation && (
                  <div className="flex gap-2 mb-2">
                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-xs rounded">
                      Needs: {strategy.allocation.needs}%
                    </span>
                    <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 text-xs rounded">
                      Wants: {strategy.allocation.wants}%
                    </span>
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs rounded">
                      Savings: {strategy.allocation.savings}%
                    </span>
                  </div>
                )}
                
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  <span className="font-medium">Best for:</span> {strategy.bestFor}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Selected Strategy Benefits */}
      {selectedStrategyData && (
        <div className={`p-4 rounded-lg ${
          isDark ? 'bg-gray-700' : 'bg-gray-100'
        } mb-4`}>
          <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
            Benefits of {selectedStrategyData.name}:
          </h5>
          <ul className="space-y-1">
            {selectedStrategyData.benefits.map((benefit, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Preview for Strategy Switch */}
      {mode === 'switch' && selectedStrategy !== currentStrategy && (
        <div className={`p-4 rounded-lg border ${
          isDark ? 'bg-gray-700/50 border-gray-600' : 'bg-yellow-50 border-yellow-200'
        } mb-4`}>
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            <h5 className="font-medium text-gray-900 dark:text-gray-100">
              Preview of Changes
            </h5>
          </div>
          
          {loadingPreview ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-gray-100"></div>
            </div>
          ) : previewData && previewData.success ? (
            <>
              <div className="mb-3 text-sm text-gray-600 dark:text-gray-400">
                <p className="mb-1">{getStrategyDescription(selectedStrategy)}</p>
                <p className="font-medium">New Total Budget: {formatCurrency(previewData.totalBudget)}</p>
              </div>
              
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {previewData.changes.slice(0, 5).map((change, index) => {
                  const changePercent = change.oldAmount > 0 
                    ? ((change.newAmount - change.oldAmount) / change.oldAmount * 100)
                    : 100;
                  const isIncrease = change.change > 0;
                  
                  return (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        {change.category.replace(/_/g, ' ').toLowerCase()}:
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">{formatCurrency(change.oldAmount)}</span>
                        <span>→</span>
                        <span className={isIncrease ? 'text-green-600' : change.change < 0 ? 'text-red-600' : 'text-gray-600'}>
                          {formatCurrency(change.newAmount)}
                        </span>
                        <span className={`text-xs ${isIncrease ? 'text-green-600' : 'text-red-600'}`}>
                          ({isIncrease ? '+' : ''}{changePercent.toFixed(0)}%)
                        </span>
                      </div>
                    </div>
                  );
                })}
                {previewData.changes.length > 5 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    ... and {previewData.changes.length - 5} more categories
                  </p>
                )}
              </div>
            </>
          ) : previewData && !previewData.success ? (
            <div className="text-sm text-red-600 dark:text-red-400">
              {previewData.message || 'Failed to generate preview'}
            </div>
          ) : (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Select a strategy to see preview
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowConfirmation(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className={`p-6 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'} max-w-md mx-4`}
              onClick={(e) => e.stopPropagation()}
            >
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Confirm Strategy Change
              </h4>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Are you sure you want to switch from <strong>{strategies.find(s => s.id === currentStrategy)?.name}</strong> to{' '}
                <strong>{strategies.find(s => s.id === selectedStrategy)?.name}</strong>?
              </p>
              <p className="text-sm text-yellow-600 dark:text-yellow-400 mb-4">
                This will recalculate your budget allocations based on the new strategy.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={confirmStrategyChange}
                  disabled={changing}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {changing ? 'Changing...' : 'Confirm Change'}
                </button>
                <button
                  onClick={() => {
                    setShowConfirmation(false);
                    setSelectedStrategy(currentStrategy);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History Modal */}
      <AnimatePresence>
        {showHistoryModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowHistoryModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className={`p-6 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'} max-w-lg mx-4 max-h-96 overflow-y-auto`}
              onClick={(e) => e.stopPropagation()}
            >
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Strategy Change History
              </h4>
              <div className="space-y-3">
                {strategyHistory.map((change) => (
                  <div key={change.id} className={`p-3 rounded-lg ${
                    isDark ? 'bg-gray-700' : 'bg-gray-100'
                  }`}>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        {new Date(change.created_at).toLocaleDateString()}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400">
                        {new Date(change.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="mt-1">
                      <span className="text-gray-600 dark:text-gray-400">
                        {strategies.find(s => s.id === change.old_strategy)?.name || change.old_strategy}
                      </span>
                      <span className="mx-2">→</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {strategies.find(s => s.id === change.new_strategy)?.name || change.new_strategy}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="mt-4 w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};