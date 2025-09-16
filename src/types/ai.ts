/**
 * AI Workspace Personalization Type Definitions
 * Matches the database schema for AI features
 */

// ============================================
// Enums and Constants
// ============================================

export const SPENDING_PERSONALITIES = ['conservative', 'balanced', 'lifestyle', 'aggressive'] as const;
export const INCOME_FREQUENCIES = ['weekly', 'biweekly', 'monthly', 'irregular'] as const;
export const EVENT_TYPES = ['category_correction', 'feedback', 'preference_update', 'rule_creation'] as const;
export const FEEDBACK_TYPES = ['positive', 'negative', 'suggestion'] as const;
export const INSIGHT_TYPES = [
  'spending_summary',
  'budget_suggestion',
  'anomaly_detection',
  'category_recommendation',
  'merchant_analysis',
  'savings_opportunity',
  'recurring_detection',
  'goal_progress',
  'custom'
] as const;

export type SpendingPersonality = typeof SPENDING_PERSONALITIES[number];
export type IncomeFrequency = typeof INCOME_FREQUENCIES[number];
export type EventType = typeof EVENT_TYPES[number];
export type FeedbackType = typeof FEEDBACK_TYPES[number];
export type InsightType = typeof INSIGHT_TYPES[number];

// ============================================
// Financial Goals and Concerns
// ============================================

export const FINANCIAL_GOALS = [
  'emergency_fund',
  'house_downpayment',
  'debt_payoff',
  'retirement',
  'education',
  'vacation',
  'investment',
  'business',
  'other'
] as const;

export const PRIMARY_CONCERNS = [
  'overspending',
  'irregular_income',
  'debt_management',
  'no_savings',
  'investment_strategy',
  'budget_tracking',
  'expense_reduction',
  'income_increase'
] as const;

export type FinancialGoal = typeof FINANCIAL_GOALS[number];
export type PrimaryConcern = typeof PRIMARY_CONCERNS[number];

// ============================================
// AI Workspace Profile
// ============================================

export interface AIWorkspaceProfile {
  id: string;
  workspace_id: string;
  
  // Onboarding Profile Data
  financial_goals: FinancialGoal[];
  spending_personality: SpendingPersonality | null;
  primary_concerns: PrimaryConcern[];
  household_size: number;
  income_frequency: IncomeFrequency | null;
  
  // Custom Context
  custom_context: string | null;
  
  // AI-Detected Patterns
  detected_patterns: {
    peak_spending_day?: string;
    average_grocery_spend?: number;
    common_categories?: string[];
    spending_velocity?: number;
    [key: string]: any;
  };
  seasonal_trends: {
    [month: string]: {
      typical_spend: number;
      category_breakdown: Record<string, number>;
    };
  };
  common_merchants: Array<{
    name: string;
    frequency: number;
    average_amount: number;
    category: string;
  }>;
  spending_velocity: {
    daily_average: number;
    weekly_average: number;
    monthly_average: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  };
  
  // Master Prompt Management
  master_prompt: string | null;
  master_prompt_version: number;
  master_prompt_updated_at: string | null;
  
  // Learning Statistics
  total_corrections: number;
  total_feedback_events: number;
  last_learning_event_at: string | null;
  accuracy_score: number;
  
  // Metadata
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

// ============================================
// AI Learning Event
// ============================================

export interface AILearningEvent {
  id: string;
  workspace_id: string;
  profile_id: string;
  
  // Event Details
  event_type: EventType;
  
  // Transaction Correction Data
  transaction_id?: string;
  original_category_id?: string;
  corrected_category_id?: string;
  correction_reason?: string;
  
  // General Feedback Data
  feedback_type?: FeedbackType;
  feedback_text?: string;
  feedback_context?: Record<string, any>;
  
  // Learning Processing
  is_processed: boolean;
  processed_at?: string;
  processing_result?: Record<string, any>;
  applied_to_prompt: boolean;
  
  // Impact Tracking
  confidence_before?: number;
  confidence_after?: number;
  
  // Metadata
  created_at: string;
  created_by: string;
}

// ============================================
// AI Insight Cache
// ============================================

export interface AIInsightCache {
  id: string;
  workspace_id: string;
  profile_id: string;
  
  // Insight Details
  insight_type: InsightType;
  insight_subtype?: string;
  
  // Cache Management
  data_fingerprint: string;
  cache_key: string;
  expires_at: string;
  is_valid: boolean;
  
  // Insight Content
  insight_data: {
    title: string;
    description: string;
    details?: Record<string, any>;
    suggestions?: string[];
    visualization?: {
      type: 'bar_chart' | 'line_chart' | 'pie_chart' | 'metric';
      data: any;
    };
    action_items?: Array<{
      text: string;
      priority: 'high' | 'medium' | 'low';
      link?: string;
    }>;
  };
  confidence_score: number;
  priority: number;
  
  // Performance Tracking
  generation_time_ms?: number;
  token_count?: number;
  model_version?: string;
  prompt_version?: number;
  
  // User Interaction
  views_count: number;
  was_helpful?: boolean;
  user_feedback?: string;
  dismissed_at?: string;
  
  // Metadata
  created_at: string;
  updated_at: string;
}

// ============================================
// Form/Input Types
// ============================================

export interface AIProfileOnboardingData {
  financial_goals: FinancialGoal[];
  spending_personality: SpendingPersonality;
  primary_concerns: PrimaryConcern[];
  household_size: number;
  income_frequency: IncomeFrequency;
  custom_context?: string;
}

export interface CategoryCorrectionData {
  transaction_id: string;
  original_category_id: string;
  corrected_category_id: string;
  correction_reason: string;
}

export interface UserFeedbackData {
  feedback_type: FeedbackType;
  feedback_text: string;
  feedback_context?: Record<string, any>;
}

// ============================================
// API Response Types
// ============================================

export interface AIProfileResponse {
  profile: AIWorkspaceProfile;
  insights?: AIInsightCache[];
  learning_events?: AILearningEvent[];
}

export interface LearningEventResponse {
  event: AILearningEvent;
  profile_updated: boolean;
  new_accuracy_score?: number;
}

export interface InsightGenerationResponse {
  insight: AIInsightCache;
  generation_time_ms: number;
  from_cache: boolean;
}

// ============================================
// Hook Return Types
// ============================================

export interface UseAIProfileReturn {
  // Data
  profile: AIWorkspaceProfile | null;
  insights: AIInsightCache[];
  learningHistory: AILearningEvent[];
  
  // Loading States
  loading: boolean;
  updatingProfile: boolean;
  recordingEvent: boolean;
  generatingInsights: boolean;
  
  // Error States
  error: Error | null;
  
  // Profile Management
  createProfile: (data: AIProfileOnboardingData) => Promise<AIWorkspaceProfile>;
  updateProfile: (updates: Partial<AIWorkspaceProfile>) => Promise<void>;
  updateCustomContext: (context: string) => Promise<void>;
  
  // Learning Events
  recordCategoryCorrection: (data: CategoryCorrectionData) => Promise<void>;
  recordUserFeedback: (data: UserFeedbackData) => Promise<void>;
  getLearningHistory: (limit?: number) => Promise<AILearningEvent[]>;
  
  // Insights
  getInsights: (type?: InsightType) => Promise<AIInsightCache[]>;
  generateInsight: (type: InsightType, params?: any) => Promise<AIInsightCache>;
  invalidateInsights: () => Promise<void>;
  markInsightHelpful: (insightId: string, helpful: boolean) => Promise<void>;
  dismissInsight: (insightId: string) => Promise<void>;
  
  // Master Prompt
  rebuildMasterPrompt: () => Promise<string>;
  
  // Statistics
  getStats: () => {
    totalCorrections: number;
    totalFeedback: number;
    accuracyScore: number;
    lastLearningEvent: string | null;
  };
}

// ============================================
// Utility Types
// ============================================

export type AIProfileUpdate = Partial<Omit<AIWorkspaceProfile, 'id' | 'workspace_id' | 'created_at' | 'updated_at'>>;

export type InsightFilter = {
  type?: InsightType;
  valid_only?: boolean;
  min_confidence?: number;
  max_age_days?: number;
};

export type LearningEventFilter = {
  event_type?: EventType;
  processed?: boolean;
  limit?: number;
  offset?: number;
};