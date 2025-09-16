import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useWorkspace } from './useWorkspace';
import type { Budget, BudgetLine, BudgetPerformance, BudgetAnalysisResponse } from '../types/budget.types';

interface BudgetCreationRequest {
  name: string;
  period_type: 'monthly' | 'quarterly' | 'annually';
  start_date: string;
  end_date: string;
  strategy: 'envelope' | '50_30_20' | 'zero_based';
  use_ai_suggestions?: boolean;
}

export function useBudget() {
  const { workspace } = useWorkspace();
  const [currentBudget, setCurrentBudget] = useState<Budget | null>(null);
  const [budgetLines, setBudgetLines] = useState<BudgetLine[]>([]);
  const [performance, setPerformance] = useState<BudgetPerformance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const fetchActiveBudget = useCallback(async () => {
    console.log('🔄 fetchActiveBudget called');
    if (!workspace?.id) {
      console.log('❌ No workspace ID, skipping fetch');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('📊 Fetching active budget for workspace:', workspace.id);
      const { data: budget, error: budgetError } = await supabase
        .from('budgets')
        .select('*')
        .eq('workspace_id', workspace.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (budgetError && budgetError.code !== 'PGRST116') {
        console.error('❌ Error fetching budget:', budgetError);
        throw budgetError;
      }

      if (budget) {
        console.log('✅ Found budget:', (budget as any).name, 'Strategy:', (budget as any).strategy, 'Total:', (budget as any).total_budgeted_cents);
        setCurrentBudget(budget as Budget);

        console.log('📋 Fetching budget lines for budget ID:', (budget as any).id);
        const { data: lines, error: linesError } = await supabase
          .from('budget_lines')
          .select(`
            *,
            categories (
              id,
              name,
              color,
              icon
            )
          `)
          .eq('budget_id', (budget as any).id)
          .order('budgeted_amount_cents', { ascending: false });

        if (linesError) throw linesError;
        console.log('✅ Found', lines?.length || 0, 'budget lines');
        
        // First, update the spending from transactions
        console.log('💰 Updating budget spending from transactions...');
        const { error: updateError } = await (supabase as any)
          .rpc('update_budget_line_spending', {
            p_workspace_id: workspace.id,
            p_budget_id: (budget as any).id
          });
          
        if (updateError) {
          console.error('Failed to update spending:', updateError);
        }
        
        // Re-fetch the lines with updated spending
        console.log('🔄 Re-fetching budget lines with updated spending...');
        const { data: updatedLines, error: refreshError } = await supabase
          .from('budget_lines')
          .select(`
            *,
            categories (
              id,
              name,
              color,
              icon
            )
          `)
          .eq('budget_id', (budget as any).id)
          .order('budgeted_amount_cents', { ascending: false });
          
        const linesWithData = (updatedLines || lines || []) as BudgetLine[];
        console.log('📊 Budget lines data:', linesWithData.map((l: any) => ({
          name: l.line_name,
          budgeted: l.budgeted_amount_cents,
          spent: l.spent_cents
        })));
        setBudgetLines(linesWithData);

        // Calculate performance based on database values
        const totalSpent = linesWithData.reduce((sum, line) => sum + ((line as any).spent_cents || 0), 0);
        const totalBudgeted = linesWithData.reduce((sum, line) => sum + ((line as any).budgeted_amount_cents || 0), 0);
        const categoriesOverBudget = linesWithData.filter(line => ((line as any).spent_cents || 0) > (line as any).budgeted_amount_cents).length;
        const utilizationPercentage = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;
        
        console.log('💵 Performance calculated:');
        console.log('  Total Budgeted:', totalBudgeted, `($${(totalBudgeted / 100).toFixed(2)})`);
        console.log('  Total Spent:', totalSpent, `($${(totalSpent / 100).toFixed(2)})`);
        console.log('  Categories Over Budget:', categoriesOverBudget);
        console.log('  Utilization:', utilizationPercentage.toFixed(2) + '%');
        
        setPerformance({
          total_budgeted_cents: totalBudgeted,
          total_spent_cents: totalSpent,
          total_remaining_cents: totalBudgeted - totalSpent,
          categories_over_budget: categoriesOverBudget,
          utilization_percentage: utilizationPercentage,
          on_track_for_month: utilizationPercentage <= 100
        });
      }
    } catch (err: any) {
      console.error('Error fetching budget:', err);
      setError(err.message || 'Failed to load budget');
    } finally {
      setLoading(false);
    }
  }, [workspace?.id]);

  const calculatePerformance = async (budget: Budget, lines: BudgetLine[]) => {
    if (!workspace?.id) return;

    try {
      const { data: transactions, error: txError } = await supabase
        .from('feed_transactions')
        .select('amount_cents, personal_finance_category_primary')
        .eq('workspace_id', workspace.id)
        .eq('direction', 'outflow')
        .eq('status', 'posted')
        .gte('transaction_date', budget.start_date)
        .lte('transaction_date', budget.end_date);

      if (txError) throw txError;

      const categorySpending = new Map<string, number>();
      transactions?.forEach((tx: any) => {
        const category = tx.personal_finance_category_primary || 'UNCATEGORIZED';
        categorySpending.set(category, (categorySpending.get(category) || 0) + tx.amount_cents);
      });

      let totalSpent = 0;
      let categoriesOverBudget = 0;

      const updatedLines = lines.map(line => {
        // Match by line_name (which contains the category like "LOAN_PAYMENTS")
        const spent = categorySpending.get((line as any).line_name || (line as any).category_id || '') || 0;
        const remaining = (line as any).budgeted_amount_cents - spent;
        totalSpent += spent;

        if (spent > (line as any).budgeted_amount_cents) {
          categoriesOverBudget++;
        }

        return {
          ...line,
          spent_cents: spent,
          remaining_cents: remaining
        };
      });

      setBudgetLines(updatedLines);

      const totalBudgeted = lines.reduce((sum, line) => sum + (line as any).budgeted_amount_cents, 0);
      const utilizationPercentage = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;

      const today = new Date();
      const startDate = new Date(budget.start_date);
      const endDate = new Date(budget.end_date);
      const totalDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      const daysElapsed = (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      const expectedUtilization = (daysElapsed / totalDays) * 100;
      const onTrack = utilizationPercentage <= expectedUtilization + 5;

      setPerformance({
        total_budgeted_cents: totalBudgeted,
        total_spent_cents: totalSpent,
        total_remaining_cents: totalBudgeted - totalSpent,
        categories_over_budget: categoriesOverBudget,
        utilization_percentage: utilizationPercentage,
        on_track_for_month: onTrack
      });
    } catch (err: any) {
      console.error('Error calculating performance:', err);
    }
  };

  const analyzeWithAI = async (analysisMonths: number = 3, strategy: 'envelope' | '50_30_20' | 'zero_based' = 'envelope'): Promise<BudgetAnalysisResponse | null> => {
    if (!workspace?.id) return null;

    setAnalyzing(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/budget-analyzer`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          workspace_id: workspace.id,
          analysis_months: analysisMonths,
          budget_strategy: strategy,
          include_recurring: true
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Analysis failed');
      }

      const data: BudgetAnalysisResponse = await response.json();
      return data;
    } catch (err: any) {
      console.error('AI analysis error:', err);
      setError(err.message || 'Failed to analyze budget');
      return null;
    } finally {
      setAnalyzing(false);
    }
  };

  const createBudget = async (request: BudgetCreationRequest) => {
    if (!workspace?.id) return;

    setLoading(true);
    setError(null);

    try {
      let aiSuggestions = null;
      
      if (request.use_ai_suggestions) {
        aiSuggestions = await analyzeWithAI(3, request.strategy);
      }

      // Get the current user profile ID
      const { data: { user } } = await supabase.auth.getUser();
      let userProfileId = workspace.owner_id; // Default to workspace owner
      
      if (user) {
        // Try to get the user profile ID for the auth user
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('auth_user_id', user.id)
          .single();
          
        if (profile) {
          userProfileId = (profile as any).id;
        }
      }
      
      // Build the budget object with only defined fields
      const budgetData: any = {
        workspace_id: workspace.id,
        name: request.name,
        start_date: request.start_date,
        end_date: request.end_date,
        total_budgeted_cents: 0,
        is_active: true,
        created_by: userProfileId,
        updated_by: userProfileId
      };

      // Only add optional fields if they're defined
      if (request.period_type) budgetData.period_type = request.period_type;
      if (request.strategy) budgetData.strategy = request.strategy;

      const { data: budget, error: budgetError } = await supabase
        .from('budgets')
        .insert(budgetData)
        .select()
        .single();

      if (budgetError) {
        console.error('Error creating budget:', budgetError);
        throw new Error(budgetError.message || 'Failed to create budget');
      }

      if (aiSuggestions && aiSuggestions.suggested_budget) {
        console.log('Creating budget lines from AI suggestions:', aiSuggestions.suggested_budget.length);
        
        const lines = aiSuggestions.suggested_budget.map(suggestion => ({
          budget_id: (budget as any).id,
          workspace_id: workspace.id,
          line_name: suggestion.category_primary,
          budgeted_amount_cents: suggestion.suggested_amount_cents,
          spent_cents: 0,
          remaining_cents: suggestion.suggested_amount_cents,
          ai_suggested: true,
          ai_confidence: suggestion.confidence_score,
          created_by: userProfileId,
          updated_by: userProfileId
        }));

        const { data: insertedLines, error: linesError } = await (supabase as any)
          .from('budget_lines')
          .insert(lines)
          .select();

        if (linesError) {
          console.error('Failed to create budget lines:', linesError);
          throw linesError;
        }
        
        console.log('Budget lines created successfully:', insertedLines?.length);

        const totalBudgeted = lines.reduce((sum, line) => sum + line.budgeted_amount_cents, 0);
        
        const { error: updateError } = await (supabase as any)
          .from('budgets')
          .update({ total_budgeted_cents: totalBudgeted })
          .eq('id', (budget as any).id);

        if (updateError) throw updateError;
        
        // Update spending for the new budget
        console.log('Updating spending for new budget...');
        await (supabase as any).rpc('update_budget_line_spending', {
          p_workspace_id: workspace.id,
          p_budget_id: (budget as any).id
        });
      }

      await fetchActiveBudget();
    } catch (err: any) {
      console.error('Error creating budget:', err);
      setError(err.message || 'Failed to create budget');
    } finally {
      setLoading(false);
    }
  };

  const updateBudgetLine = async (lineId: string, updates: Partial<BudgetLine>) => {
    setError(null);

    try {
      const { error } = await (supabase as any)
        .from('budget_lines')
        .update(updates)
        .eq('id', lineId);

      if (error) throw error;

      await fetchActiveBudget();
    } catch (err: any) {
      console.error('Error updating budget line:', err);
      setError(err.message || 'Failed to update budget line');
    }
  };

  const refreshBudget = async () => {
    console.log('🔃 refreshBudget called - triggering fetchActiveBudget');
    await fetchActiveBudget();
    console.log('✅ refreshBudget complete');
  };

  useEffect(() => {
    if (workspace?.id) {
      fetchActiveBudget();
    }
  }, [workspace?.id, fetchActiveBudget]);

  useEffect(() => {
    if (!workspace?.id || !currentBudget) return;

    const channel = supabase
      .channel(`budget-${currentBudget.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'feed_transactions',
          filter: `workspace_id=eq.${workspace.id}`
        },
        () => {
          if (currentBudget && budgetLines.length > 0) {
            calculatePerformance(currentBudget, budgetLines);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspace?.id, currentBudget, budgetLines]);

  return {
    currentBudget,
    budgetLines,
    performance,
    loading,
    error,
    analyzing,
    createBudget,
    updateBudgetLine,
    refreshBudget,
    analyzeWithAI
  };
}