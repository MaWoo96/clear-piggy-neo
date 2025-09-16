// Enhanced Categorization System Types

export interface MerchantIntelligence {
  id: string;
  workspace_id: string;
  merchant_name: string;
  merchant_normalized: string;
  merchant_patterns: string[];
  business_type: string | null;
  primary_category_id: string | null;
  secondary_categories: string[];
  amount_thresholds: Record<string, [number, number]>;
  typical_amounts: Record<string, number>;
  time_based_rules: Record<string, any>;
  frequency_patterns: Record<string, any>;
  transaction_count: number;
  user_corrections: number;
  last_seen_at: string;
  confidence_score: number;
  created_at: string;
  updated_at: string;
}

export interface AiCategorizationRule {
  id: string;
  workspace_id: string;
  rule_name: string;
  merchant_pattern: string | null;
  amount_min_cents: number | null;
  amount_max_cents: number | null;
  time_of_day_start: string | null;
  time_of_day_end: string | null;
  day_of_week: number[] | null;
  transaction_frequency: string | null;
  target_category_id: string;
  confidence_bonus: number;
  rule_priority: number;
  is_active: boolean;
  auto_generated: boolean;
  user_created: boolean;
  match_count: number;
  accuracy_rate: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

// Enhanced category interface
export interface EnhancedCategory {
  id: string;
  workspace_id: string;
  name: string;
  description?: string | null;
  category_type: 'expense' | 'income' | 'transfer';
  parent_category_id: string | null;
  default_account_id?: string | null;
  color: string | null;
  icon: string | null;
  is_active: boolean;
  is_system: boolean;
  sort_order: number;
  metadata: Record<string, any>;
  // New enhanced fields
  merchant_keywords: string[];
  amount_thresholds: Record<string, any>;
  category_rules: Record<string, any>;
  plaid_mapping: string[];
  priority_score: number;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

// Enhanced transaction with categorization context
export interface EnhancedTransaction {
  id: string;
  workspace_id: string;
  bank_account_id: string;
  plaid_transaction_id?: string | null;
  provider_unique_id: string;
  content_hash: string;
  amount_cents: number;
  currency_code: string;
  direction: 'inflow' | 'outflow';
  status: 'posted' | 'pending';
  transaction_date: string;
  authorized_date?: string | null;
  merchant_name?: string | null;
  merchant_normalized?: string | null;
  description?: string | null;
  reference_number?: string | null;
  category_primary?: string | null;
  category_detailed?: string | null;
  
  // AI categorization fields
  ai_category_primary?: string | null;
  ai_category_confidence?: number | null;
  ai_category_reasoning?: string | null;
  ai_categorized_at?: string | null;
  ai_model_version?: string | null;
  
  // New enhanced fields
  categorization_context?: Record<string, any>;
  matched_rules?: Array<{rule_id: string, rule_name: string}>;
  merchant_intelligence_id?: string | null;
  category_override_reason?: string | null;
  
  // Plaid categorization
  personal_finance_category_primary?: string | null;
  personal_finance_category_detailed?: string | null;
  personal_finance_category_confidence?: number | null;
  
  // Location data
  location_address?: string | null;
  location_city?: string | null;
  location_region?: string | null;
  location_postal_code?: string | null;
  location_country?: string | null;
  location_lat?: number | null;
  location_lon?: number | null;
  location_store_number?: string | null;
  
  // Payment metadata
  payment_method?: string | null;
  payment_processor?: string | null;
  payment_reference_number?: string | null;
  payment_reason?: string | null;
  
  // Metadata
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

// Categorization result from intelligent function
export interface CategorizationResult {
  suggested_category_id: string | null;
  confidence_score: number;
  reasoning: string;
  matched_rules: Array<{rule_id: string, rule_name: string}>;
}

// Function to call intelligent categorization
export interface CategorizationRequest {
  transaction_id: string;
  workspace_id: string;
  merchant_name: string;
  amount_cents: number;
  transaction_time: string;
  plaid_category_primary?: string | null;
  plaid_category_detailed?: string | null;
}

// Default category structure for initialization
export interface DefaultCategoryStructure {
  parent: {
    name: string;
    category_type: 'expense' | 'income' | 'transfer';
    color: string;
    icon: string;
    plaid_mapping: string[];
    priority_score: number;
  };
  children?: Array<{
    name: string;
    category_type: 'expense' | 'income' | 'transfer';
    color: string;
    icon: string;
    merchant_keywords: string[];
    amount_thresholds: Record<string, any>;
    priority_score: number;
  }>;
}

// Helper type for category hierarchy
export interface CategoryWithChildren extends EnhancedCategory {
  children?: CategoryWithChildren[];
}

// Type for merchant pattern learning
export interface MerchantPattern {
  merchant_normalized: string;
  typical_amount: number;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'irregular';
  suggested_category: string;
  confidence: number;
  transaction_count: number;
  last_seen: string;
}

// Type for spending insights
export interface SpendingInsight {
  category_id: string;
  category_name: string;
  total_spent: number;
  transaction_count: number;
  average_transaction: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  anomalies: Array<{
    transaction_id: string;
    reason: string;
    severity: 'low' | 'medium' | 'high';
  }>;
}

// Export all types as a namespace for convenience
export type CategorizationTypes = {
  MerchantIntelligence: MerchantIntelligence;
  AiCategorizationRule: AiCategorizationRule;
  EnhancedCategory: EnhancedCategory;
  EnhancedTransaction: EnhancedTransaction;
  CategorizationResult: CategorizationResult;
  CategorizationRequest: CategorizationRequest;
  DefaultCategoryStructure: DefaultCategoryStructure;
  CategoryWithChildren: CategoryWithChildren;
  MerchantPattern: MerchantPattern;
  SpendingInsight: SpendingInsight;
};