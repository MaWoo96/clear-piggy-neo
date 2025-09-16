export interface Budget {
  id: string;
  workspace_id: string;
  name: string;
  period_type: 'monthly' | 'quarterly' | 'annually';
  start_date: string;
  end_date: string;
  total_budgeted_cents: number;
  is_active: boolean;
  strategy?: 'envelope' | '50_30_20' | 'zero_based';
  created_at: string;
  updated_at: string;
}

export interface BudgetLine {
  id: string;
  budget_id: string;
  category_id?: string;
  line_name: string;
  budgeted_amount_cents: number;
  spent_cents: number;
  remaining_cents: number;
  ai_suggested: boolean;
  ai_confidence?: number;
  recurring_series_id?: string;
  created_at: string;
  updated_at: string;
  categories?: {
    id: string;
    name: string;
    color: string;
    icon?: string;
  };
}

export interface BudgetPerformance {
  total_budgeted_cents: number;
  total_spent_cents: number;
  total_remaining_cents: number;
  categories_over_budget: number;
  utilization_percentage: number;
  on_track_for_month: boolean;
}

export interface BudgetSuggestion {
  category_primary: string;
  category_detailed?: string;
  suggested_amount_cents: number;
  confidence_score: number;
  reasoning: string;
  historical_average_cents: number;
  recurring_detected: boolean;
  recurring_items?: Array<{
    merchant: string;
    amount: number;
    frequency: string;
  }>;
}

export interface BudgetAnalysisResponse {
  success: boolean;
  suggested_budget: BudgetSuggestion[];
  total_monthly_budget_cents: number;
  confidence_score: number;
  recurring_patterns_found: number;
  analysis_period: {
    start_date: string;
    end_date: string;
    months_analyzed: number;
  };
  insights: string[];
  strategy_applied: string;
}