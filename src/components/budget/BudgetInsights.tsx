import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, TrendingUp, AlertCircle, ChevronDown, 
  ChevronUp, Lightbulb, Target, DollarSign 
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useWorkspace } from '../../hooks/useWorkspace';

interface BudgetInsightsProps {
  budgetId: string;
}

interface Insight {
  id: string;
  type: 'tip' | 'warning' | 'success' | 'info';
  title: string;
  description: string;
  icon: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const BudgetInsights: React.FC<BudgetInsightsProps> = ({ budgetId }) => {
  const { workspace } = useWorkspace();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [expanded, setExpanded] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspace?.id || !budgetId) return;
    
    loadInsights();
  }, [workspace?.id, budgetId]);

  const loadInsights = async () => {
    if (!workspace?.id) return;
    
    setLoading(true);
    
    try {
      // Get budget performance data
      const { data: budget } = await (supabase as any)
        .from('budgets')
        .select(`
          *,
          budget_lines (
            *,
            categories (name, icon)
          )
        `)
        .eq('id', budgetId)
        .single();

      if (!budget) return;

      // Get recent transactions
      const { data: transactions } = await (supabase as any)
        .from('feed_transactions')
        .select('*')
        .eq('workspace_id', workspace.id)
        .eq('direction', 'outflow')
        .gte('transaction_date', (budget as any).start_date)
        .lte('transaction_date', (budget as any).end_date)
        .order('amount_cents', { ascending: false })
        .limit(10);

      // Get recurring patterns
      const { data: recurringPatterns } = await (supabase as any)
        .from('recurring_series')
        .select('*')
        .eq('workspace_id', workspace.id)
        .eq('is_active', true);

      // Generate insights based on data
      const generatedInsights: Insight[] = [];

      // Check for overspending
      const overBudgetLines = (budget as any).budget_lines?.filter(
        (line: any) => line.spent_cents > line.budgeted_amount_cents
      );
      
      if (overBudgetLines?.length > 0) {
        // The line_name already contains the human-readable category name
        const categoryName = overBudgetLines[0].line_name || 'this category';

        generatedInsights.push({
          id: 'overspending',
          type: 'warning',
          title: `${overBudgetLines.length} categories over budget`,
          description: `Consider reducing spending in ${categoryName} which is ${
            ((overBudgetLines[0].spent_cents / overBudgetLines[0].budgeted_amount_cents - 1) * 100).toFixed(0)
          }% over budget.`,
          icon: <AlertCircle className="h-5 w-5" />
        });
      }

      // Check for underutilized categories
      const underutilized = (budget as any).budget_lines?.filter(
        (line: any) => line.spent_cents < line.budgeted_amount_cents * 0.5
      );
      
      if (underutilized?.length > 0) {
        generatedInsights.push({
          id: 'underutilized',
          type: 'success',
          title: 'Great job on savings!',
          description: `You're under 50% in ${underutilized.length} categories. Consider reallocating unused funds to savings or debt payoff.`,
          icon: <TrendingUp className="h-5 w-5" />
        });
      }

      // Check for upcoming recurring expenses
      if (recurringPatterns && recurringPatterns.length > 0) {
        const upcomingCount = recurringPatterns.filter((p: any) => {
          const nextDate = new Date((p as any).next_expected_date);
          const daysUntil = (nextDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
          return daysUntil <= 7 && daysUntil >= 0;
        }).length;

        if (upcomingCount > 0) {
          generatedInsights.push({
            id: 'upcoming',
            type: 'info',
            title: `${upcomingCount} recurring expenses this week`,
            description: 'Make sure you have funds allocated for your upcoming subscriptions and bills.',
            icon: <Target className="h-5 w-5" />
          });
        }
      }

      // Add optimization tip
      if (transactions && transactions.length > 0) {
        const largestExpense = transactions[0];
        generatedInsights.push({
          id: 'optimization',
          type: 'tip',
          title: 'Spending optimization tip',
          description: `Your largest expense was ${(largestExpense as any).merchant_name || 'Unknown'} at $${
            ((largestExpense as any).amount_cents / 100).toFixed(2)
          }. Review if this aligns with your priorities.`,
          icon: <Lightbulb className="h-5 w-5" />
        });
      }

      // Add budget strategy tip
      if ((budget as any).strategy) {
        const strategyTips: Record<string, string> = {
          'envelope': 'Track each envelope closely to avoid overspending.',
          '50_30_20': 'Ensure your needs stay under 50% of income.',
          'zero_based': 'Every dollar should have a designated purpose.'
        };
        
        generatedInsights.push({
          id: 'strategy',
          type: 'info',
          title: `${(budget as any).strategy.replace(/_/g, '/')} Strategy`,
          description: strategyTips[(budget as any).strategy] || 'Stay consistent with your budgeting approach.',
          icon: <DollarSign className="h-5 w-5" />
        });
      }

      setInsights(generatedInsights);
    } catch (error) {
      console.error('Error loading insights:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-pulse" />
          <h3 className="font-medium text-gray-900 dark:text-gray-100">Loading insights...</h3>
        </div>
      </div>
    );
  }

  if (insights.length === 0) {
    return null;
  }

  const getInsightStyles = (type: Insight['type']) => {
    switch (type) {
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200';
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200';
      case 'info':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200';
      case 'tip':
        return 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-200';
    }
  };

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h3 className="font-medium text-gray-900 dark:text-gray-100">
            AI Budget Insights
          </h3>
          <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">
            {insights.length} insights
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-gray-200 dark:border-gray-700"
          >
            <div className="p-6 pt-0 space-y-3">
              {insights.map((insight, index) => (
                <motion.div
                  key={insight.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-4 rounded-lg border ${getInsightStyles(insight.type)}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{insight.icon}</div>
                    <div className="flex-1">
                      <h4 className="font-medium mb-1">{insight.title}</h4>
                      <p className="text-sm opacity-90">{insight.description}</p>
                      {insight.action && (
                        <button
                          onClick={insight.action.onClick}
                          className="mt-2 text-sm font-medium hover:underline"
                        >
                          {insight.action.label} →
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};