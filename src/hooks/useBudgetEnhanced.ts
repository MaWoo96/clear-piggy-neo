import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useWorkspace } from '../hooks/useWorkspace';
import { convertBudgetStrategy as convertStrategy } from '../lib/budgetStrategyConverter';
import type { Database } from '../types/database.types';

interface BudgetPerformance {
  line_id: string;
  category_name: string;
  budgeted_cents: number;
  spent_cents: number;
  remaining_cents: number;
  transaction_count: number;
  override_count: number;
}

interface TransactionOverride {
  id: string;
  transaction_id: string;
  budget_line_id: string;
  original_category: string;
  override_reason?: string;
  created_at: string;
}

interface BudgetData {
  id: string;
  name: string;
  period_type: string;
  start_date: string;
  end_date: string;
  custom_start_date?: string;
  custom_end_date?: string;
  period_length_days?: number;
  strategy: string;
  is_active: boolean;
  total_amount_cents: number;
  workspace_id: string;
}

export const useBudgetEnhanced = (budgetId?: string) => {
  const { workspace } = useWorkspace();
  const [budget, setBudget] = useState<BudgetData | null>(null);
  const [budgetPerformance, setBudgetPerformance] = useState<BudgetPerformance[]>([]);
  const [transactionOverrides, setTransactionOverrides] = useState<TransactionOverride[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch budget data
  const fetchBudget = useCallback(async () => {
    if (!budgetId || !workspace) return;

    try {
      const { data, error } = await supabase
        .from('budgets')
        .select('id, name, period_type, start_date, end_date, custom_start_date, custom_end_date, period_length_days, strategy, is_active, total_amount_cents, workspace_id')
        .eq('id', budgetId)
        .eq('workspace_id', workspace.id)
        .single();

      if (error) throw error;
      setBudget(data);
    } catch (err: any) {
      console.error('Error fetching budget:', err);
      setError(err.message);
    }
  }, [budgetId, workspace]);

  // Fetch budget performance with overrides
  const refreshBudgetPerformance = useCallback(async () => {
    if (!budgetId || !workspace) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('calculate_budget_performance_with_overrides', {
        p_workspace_id: workspace.id,
        p_budget_id: budgetId
      });

      if (error) throw error;
      setBudgetPerformance(data || []);
    } catch (err: any) {
      console.error('Error fetching budget performance:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [budgetId, workspace]);

  // Fetch transaction overrides
  const fetchTransactionOverrides = useCallback(async () => {
    if (!budgetId || !workspace) return;

    try {
      const { data, error } = await supabase
        .from('budget_transaction_overrides')
        .select(`
          id, transaction_id, budget_line_id, original_category, override_reason, created_at,
          budget_lines!inner(budget_id)
        `)
        .eq('workspace_id', workspace.id)
        .eq('budget_lines.budget_id', budgetId);

      if (error) throw error;
      setTransactionOverrides(data || []);
    } catch (err: any) {
      console.error('Error fetching overrides:', err);
    }
  }, [budgetId, workspace]);

  // Assign transaction to budget category
  const assignTransactionToBudget = useCallback(async (
    transactionId: string, 
    budgetLineId: string,
    originalCategory?: string
  ) => {
    if (!workspace) return;

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('auth_user_id', user?.id)
        .single();

      if (!profile?.id) throw new Error('User profile not found');

      const { data, error } = await supabase
        .from('budget_transaction_overrides')
        .upsert({
          workspace_id: workspace.id,
          transaction_id: transactionId,
          budget_line_id: budgetLineId,
          original_category: originalCategory,
          created_by: profile.id
        }, {
          onConflict: 'transaction_id,budget_line_id'
        });

      if (error) throw error;
      
      // Refresh performance data
      await refreshBudgetPerformance();
      await fetchTransactionOverrides();
      
      return data;
    } catch (err: any) {
      console.error('Error assigning transaction:', err);
      throw err;
    }
  }, [workspace, refreshBudgetPerformance, fetchTransactionOverrides]);

  // Remove transaction override
  const removeTransactionOverride = useCallback(async (overrideId: string) => {
    if (!workspace) return;

    try {
      const { error } = await supabase
        .from('budget_transaction_overrides')
        .delete()
        .eq('id', overrideId)
        .eq('workspace_id', workspace.id);

      if (error) throw error;
      
      // Refresh performance data
      await refreshBudgetPerformance();
      await fetchTransactionOverrides();
    } catch (err: any) {
      console.error('Error removing override:', err);
      throw err;
    }
  }, [workspace, refreshBudgetPerformance, fetchTransactionOverrides]);

  // Create flexible budget
  const createFlexibleBudget = useCallback(async (
    name: string,
    startDate: string,
    endDate: string,
    strategy: string = 'envelope'
  ) => {
    if (!workspace) return;

    try {
      const { data, error } = await supabase.rpc('create_flexible_budget', {
        p_workspace_id: workspace.id,
        p_name: name,
        p_start_date: startDate,
        p_end_date: endDate,
        p_strategy: strategy
      });

      if (error) throw error;
      return data;
    } catch (err: any) {
      console.error('Error creating flexible budget:', err);
      throw err;
    }
  }, [workspace]);

  // Convert budget strategy
  const convertBudgetStrategy = useCallback(async (newStrategy: string) => {
    console.log('🆕 useBudgetEnhanced.convertBudgetStrategy called');
    console.log('  budgetId:', budgetId);
    console.log('  workspace:', workspace);
    console.log('  newStrategy:', newStrategy);
    
    if (!budgetId || !workspace) {
      console.error('❌ Missing budgetId or workspace');
      return;
    }

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('auth_user_id', user?.id)
        .single();

      if (!profile?.id) throw new Error('User profile not found');

      console.log('📦 Calling convertStrategy with:');
      console.log('  budgetId:', budgetId);
      console.log('  workspaceId:', workspace.id);
      console.log('  newStrategy:', newStrategy);
      console.log('  userId:', profile.id);
      
      // Use the enhanced converter function
      const result = await convertStrategy(
        budgetId,
        workspace.id,
        newStrategy as '50_30_20' | 'envelope' | 'zero_based' | 'custom',
        profile.id
      );
      
      console.log('📊 Converter result:', result);

      if (!result.success) {
        console.error('❌ Conversion failed:', result.message);
        throw new Error(result.message || 'Failed to convert strategy');
      }
      
      console.log('🔄 Refreshing budget data...');
      // Refresh budget data
      await fetchBudget();
      await refreshBudgetPerformance();
      
      console.log('✅ Strategy conversion complete in hook');
      return result;
    } catch (err: any) {
      console.error('Error converting strategy:', err);
      throw err;
    }
  }, [budgetId, workspace, fetchBudget, refreshBudgetPerformance]);

  // Bulk assign transactions
  const bulkAssignTransactions = useCallback(async (
    transactionIds: string[],
    budgetLineId: string
  ) => {
    if (!workspace) return;

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('auth_user_id', user?.id)
        .single();

      if (!profile?.id) throw new Error('User profile not found');

      // Create override records for each transaction
      const overrides = transactionIds.map(txId => ({
        workspace_id: workspace.id,
        transaction_id: txId,
        budget_line_id: budgetLineId,
        created_by: profile.id
      }));

      const { data, error } = await supabase
        .from('budget_transaction_overrides')
        .upsert(overrides, {
          onConflict: 'transaction_id,budget_line_id'
        });

      if (error) throw error;
      
      // Refresh performance data
      await refreshBudgetPerformance();
      await fetchTransactionOverrides();
      
      return data;
    } catch (err: any) {
      console.error('Error bulk assigning transactions:', err);
      throw err;
    }
  }, [workspace, refreshBudgetPerformance, fetchTransactionOverrides]);

  // Get budget strategy history
  const getStrategyHistory = useCallback(async () => {
    if (!budgetId || !workspace) return [];

    try {
      const { data, error } = await supabase
        .from('budget_strategy_changes')
        .select(`
          id, budget_id, old_strategy, new_strategy, conversion_notes, created_by, created_at,
          user_profiles!created_by(display_name)
        `)
        .eq('budget_id', budgetId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err: any) {
      console.error('Error fetching strategy history:', err);
      return [];
    }
  }, [budgetId, workspace]);

  // Calculate budget health metrics
  const getBudgetHealth = useCallback(() => {
    if (!budgetPerformance.length) return null;

    const totalBudgeted = budgetPerformance.reduce((sum, line) => sum + line.budgeted_cents, 0);
    const totalSpent = budgetPerformance.reduce((sum, line) => sum + line.spent_cents, 0);
    const totalRemaining = budgetPerformance.reduce((sum, line) => sum + line.remaining_cents, 0);
    const overBudgetCount = budgetPerformance.filter(line => line.remaining_cents < 0).length;
    const utilizationRate = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;

    return {
      totalBudgeted,
      totalSpent,
      totalRemaining,
      overBudgetCount,
      utilizationRate,
      healthScore: Math.max(0, 100 - (overBudgetCount * 10) - Math.max(0, utilizationRate - 100))
    };
  }, [budgetPerformance]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!workspace?.id || !budgetId) return;

    // Initial fetch
    fetchBudget();
    refreshBudgetPerformance();
    fetchTransactionOverrides();

    // Subscribe to budget changes
    const budgetChannel = supabase
      .channel(`budget-${budgetId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'budgets',
        filter: `id=eq.${budgetId}`
      }, fetchBudget)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'budget_lines',
        filter: `budget_id=eq.${budgetId}`
      }, refreshBudgetPerformance)
      .subscribe();

    // Subscribe to override changes
    const overrideChannel = supabase
      .channel(`budget-overrides-${workspace.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'budget_transaction_overrides',
        filter: `workspace_id=eq.${workspace.id}`
      }, () => {
        refreshBudgetPerformance();
        fetchTransactionOverrides();
      })
      .subscribe();

    return () => {
      budgetChannel.unsubscribe();
      overrideChannel.unsubscribe();
    };
  }, [workspace?.id, budgetId, fetchBudget, refreshBudgetPerformance, fetchTransactionOverrides]);

  return {
    // Data
    budget,
    budgetPerformance,
    transactionOverrides,
    budgetHealth: getBudgetHealth(),
    loading,
    error,
    
    // Actions
    refreshBudgetPerformance,
    assignTransactionToBudget,
    removeTransactionOverride,
    createFlexibleBudget,
    convertBudgetStrategy,
    bulkAssignTransactions,
    getStrategyHistory,
    
    // Utility
    hasOverrides: transactionOverrides.length > 0,
    isFlexiblePeriod: budget?.period_type === 'custom',
    currentStrategy: budget?.strategy || 'envelope'
  };
};