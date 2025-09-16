import { supabase } from './supabase';
import type { 
  RecurringSeries, 
  RecurringSeriesTransaction, 
  BudgetPrediction,
  BudgetAlert,
  FeedTransaction 
} from '../types/database.types';

export class BudgetAIService {
  private workspaceId: string;

  constructor(workspaceId: string) {
    this.workspaceId = workspaceId;
  }

  async detectRecurringTransactions(lookbackDays: number = 90) {
    const { data, error } = await (supabase as any).rpc('detect_recurring_transactions', {
      p_workspace_id: this.workspaceId,
      p_lookback_days: lookbackDays
    });

    if (error) throw error;
    return data;
  }

  async createRecurringSeries(series: Omit<RecurringSeries, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await (supabase as any)
      .from('recurring_series')
      .insert({
        ...series,
        workspace_id: this.workspaceId
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateRecurringSeries(id: string, updates: Partial<RecurringSeries>) {
    const { data, error } = await (supabase as any)
      .from('recurring_series')
      .update(updates)
      .eq('id', id)
      .eq('workspace_id', this.workspaceId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getActiveRecurringSeries() {
    const { data, error } = await (supabase as any)
      .from('recurring_series')
      .select(`
        *,
        categories (
          id,
          name,
          color,
          icon
        )
      `)
      .eq('workspace_id', this.workspaceId)
      .eq('is_active', true)
      .order('next_expected_date', { ascending: true });

    if (error) throw error;
    return data;
  }

  async linkTransactionToSeries(seriesId: string, transactionId: string) {
    const { data, error } = await (supabase as any)
      .from('recurring_series_transactions')
      .insert({
        recurring_series_id: seriesId,
        transaction_id: transactionId,
        workspace_id: this.workspaceId
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getUpcomingRecurring(daysAhead: number = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const { data, error } = await (supabase as any)
      .from('recurring_series')
      .select(`
        *,
        categories (
          id,
          name,
          color,
          icon
        )
      `)
      .eq('workspace_id', this.workspaceId)
      .eq('is_active', true)
      .lte('next_expected_date', futureDate.toISOString().split('T')[0])
      .gte('next_expected_date', new Date().toISOString().split('T')[0])
      .order('next_expected_date', { ascending: true });

    if (error) throw error;
    return data;
  }

  async createBudgetPrediction(prediction: Omit<BudgetPrediction, 'id' | 'created_at'>) {
    const { data, error } = await (supabase as any)
      .from('budget_predictions')
      .insert({
        ...prediction,
        workspace_id: this.workspaceId
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getBudgetPredictions(budgetId: string) {
    const { data, error } = await (supabase as any)
      .from('budget_predictions')
      .select(`
        *,
        categories (
          id,
          name,
          color,
          icon
        )
      `)
      .eq('workspace_id', this.workspaceId)
      .eq('budget_id', budgetId)
      .order('prediction_date', { ascending: true });

    if (error) throw error;
    return data;
  }

  async createBudgetAlert(alert: Omit<BudgetAlert, 'id' | 'created_at'>) {
    const { data, error } = await (supabase as any)
      .from('budget_alerts')
      .insert({
        ...alert,
        workspace_id: this.workspaceId
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getActiveAlerts() {
    const { data, error } = await (supabase as any)
      .from('budget_alerts')
      .select(`
        *,
        budgets (
          id,
          name,
          period_type
        ),
        categories (
          id,
          name,
          color,
          icon
        )
      `)
      .eq('workspace_id', this.workspaceId)
      .eq('is_dismissed', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async dismissAlert(alertId: string) {
    const { data, error } = await (supabase as any)
      .from('budget_alerts')
      .update({
        is_dismissed: true,
        dismissed_at: new Date().toISOString()
      })
      .eq('id', alertId)
      .eq('workspace_id', this.workspaceId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async analyzeBudgetPerformance(budgetId: string) {
    const { data: budget, error: budgetError } = await (supabase as any)
      .from('budgets')
      .select(`
        *,
        budget_lines (
          *,
          categories (
            id,
            name
          )
        )
      `)
      .eq('id', budgetId)
      .eq('workspace_id', this.workspaceId)
      .single();

    if (budgetError) throw budgetError;

    const { data: transactions, error: txError } = await (supabase as any)
      .from('feed_transactions')
      .select('*')
      .eq('workspace_id', this.workspaceId)
      .gte('transaction_date', budget.start_date)
      .lte('transaction_date', budget.end_date)
      .eq('status', 'posted');

    if (txError) throw txError;

    const categorySpending = new Map<string, number>();
    transactions?.forEach((tx: any) => {
      if (tx.category_id) {
        const current = categorySpending.get(tx.category_id) || 0;
        categorySpending.set(tx.category_id, current + tx.amount_cents);
      }
    });

    const performance = (budget as any).budget_lines?.map((line: any) => {
      const actual = categorySpending.get(line.category_id || '') || 0;
      const variance = line.budgeted_amount_cents - actual;
      const percentUsed = (actual / line.budgeted_amount_cents) * 100;

      return {
        category_id: line.category_id,
        category_name: line.categories?.name,
        budgeted: line.budgeted_amount_cents,
        actual,
        variance,
        percentUsed,
        status: percentUsed > 100 ? 'over' : percentUsed > 80 ? 'warning' : 'good'
      };
    });

    return {
      budget,
      performance,
      totalBudgeted: budget.total_budgeted_cents,
      totalSpent: Array.from(categorySpending.values()).reduce((a, b) => a + b, 0),
      totalVariance: budget.total_budgeted_cents - Array.from(categorySpending.values()).reduce((a, b) => a + b, 0)
    };
  }

  async generateBudgetRecommendations(budgetId: string) {
    const performance = await this.analyzeBudgetPerformance(budgetId);
    const recurringTransactions = await this.getActiveRecurringSeries();
    
    const recommendations: Array<{
      type: 'increase' | 'decrease' | 'add_category' | 'remove_category';
      category_id?: string;
      category_name?: string;
      current_amount?: number;
      suggested_amount?: number;
      reason: string;
      confidence: number;
    }> = [];

    performance.performance?.forEach((item: any) => {
      if (item.percentUsed > 120) {
        recommendations.push({
          type: 'increase',
          category_id: item.category_id || undefined,
          category_name: item.category_name,
          current_amount: item.budgeted,
          suggested_amount: Math.ceil(item.actual * 1.1),
          reason: `Consistently overspending by ${(item.percentUsed - 100).toFixed(0)}%`,
          confidence: 0.85
        });
      } else if (item.percentUsed < 50 && item.budgeted > 10000) {
        recommendations.push({
          type: 'decrease',
          category_id: item.category_id || undefined,
          category_name: item.category_name,
          current_amount: item.budgeted,
          suggested_amount: Math.ceil(item.actual * 1.2),
          reason: `Only using ${item.percentUsed.toFixed(0)}% of allocated budget`,
          confidence: 0.75
        });
      }
    });

    const budgetedCategories = new Set(performance.performance?.map((p: any) => p.category_id));
    recurringTransactions?.forEach((series: any) => {
      if (series.category_id && !budgetedCategories.has(series.category_id)) {
        const monthlyAmount = this.calculateMonthlyAmount(
          series.amount_cents_max,
          series.frequency_type
        );
        
        recommendations.push({
          type: 'add_category',
          category_id: series.category_id,
          category_name: series.categories?.name,
          suggested_amount: monthlyAmount,
          reason: `Recurring ${series.frequency_type} expense detected`,
          confidence: series.confidence_score
        });
      }
    });

    return recommendations;
  }

  private calculateMonthlyAmount(amount: number, frequency: string): number {
    switch (frequency) {
      case 'weekly': return amount * 4.33;
      case 'biweekly': return amount * 2.17;
      case 'monthly': return amount;
      case 'quarterly': return amount / 3;
      case 'yearly': return amount / 12;
      default: return amount;
    }
  }

  async autoDetectAndCreateRecurringSeries(minConfidence: number = 0.7) {
    const detected = await this.detectRecurringTransactions();
    
    const created: RecurringSeries[] = [];
    for (const item of detected || []) {
      if (item.suggested_frequency && item.transaction_count >= 3) {
        const confidence = Math.min(
          0.5 + (item.transaction_count * 0.1),
          0.95
        );

        if (confidence >= minConfidence) {
          const series = await this.createRecurringSeries({
            workspace_id: this.workspaceId,
            merchant_pattern: item.merchant_pattern,
            amount_cents_min: item.min_amount_cents,
            amount_cents_max: item.max_amount_cents,
            frequency_type: item.suggested_frequency as any,
            confidence_score: confidence,
            is_bill: item.suggested_frequency === 'monthly' || item.suggested_frequency === 'quarterly',
            is_active: true,
            occurrence_count: item.transaction_count,
            next_expected_date: this.calculateNextExpectedDate(
              item.suggested_frequency,
              item.frequency_days
            ),
            category_id: null,
            last_seen_date: null
          });
          created.push(series);
        }
      }
    }

    return created;
  }

  private calculateNextExpectedDate(frequency: string, avgDays: number): string {
    const today = new Date();
    let daysToAdd = 30;

    switch (frequency) {
      case 'weekly': daysToAdd = 7; break;
      case 'biweekly': daysToAdd = 14; break;
      case 'monthly': daysToAdd = 30; break;
      case 'quarterly': daysToAdd = 90; break;
      case 'yearly': daysToAdd = 365; break;
      default: daysToAdd = Math.round(avgDays);
    }

    today.setDate(today.getDate() + daysToAdd);
    return today.toISOString().split('T')[0];
  }
}

export async function initializeBudgetAI(workspaceId: string) {
  return new BudgetAIService(workspaceId);
}