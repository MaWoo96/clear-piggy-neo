import { AIWorkspaceProfile, AILearningEvent, AIInsightCache } from './ai';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Define simplified types that match actual Supabase response structure
export interface UserProfile {
  id: string;
  auth_user_id?: string;
  email: string;
  full_name: string | null;
  avatar_url?: string | null;
  default_workspace_id: string | null;
  current_workspace_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  workspace_type: 'personal' | 'business' | 'family';
  owner_id: string;
  default_currency: string;
  logo_url?: string | null;
  settings?: any;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: 'owner' | 'member' | 'bookkeeper' | 'viewer';
  invited_by?: string | null;
  invited_at?: string | null;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Institution {
  id: string;
  workspace_id: string;
  plaid_institution_id: string;
  name: string;
  logo_url: string | null;
  logo_base64?: string | null;
  hex_color: string | null;
  website_url: string | null;
  routing_numbers: string[] | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface BankAccount {
  id: string;
  workspace_id: string;
  institution_id: string;
  plaid_account_id: string;
  name: string;
  account_type: string;
  account_subtype_detailed: string | null;
  mask: string | null;
  routing_number: string | null;
  current_balance_cents: number;
  available_balance_cents: number | null;
  verification_status: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  institution?: Institution;
}

export interface FeedTransaction {
  id: string;
  workspace_id: string;
  bank_account_id: string;
  plaid_transaction_id: string | null;
  amount_cents: number;
  direction: 'inflow' | 'outflow';
  status: 'pending' | 'posted' | 'cancelled';
  transaction_date: string;
  merchant_name: string | null;
  merchant_logo_url: string | null;
  merchant_website: string | null;
  merchant_entity_id: string | null;
  location_city: string | null;
  location_region: string | null;
  location_lat: number | null;
  location_lon: number | null;
  location_store_number: string | null;
  counterparty_name: string | null;
  counterparty_logo_url: string | null;
  payment_method: string | null;
  payment_processor: string | null;
  check_number?: string | null;
  personal_finance_category_primary: string | null;
  personal_finance_category_confidence: number | null;
  content_hash: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  workspace_id: string;
  name: string;
  category_type: 'expense' | 'income' | 'transfer';
  parent_category_id: string | null;
  parent_id?: string | null; // alias for components that use parent_id
  color: string | null;
  icon: string | null;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface MerchantAlias {
  id: string;
  workspace_id: string;
  normalized_name: string;
  original_name?: string; // some components expect this
  display_name: string;
  match_patterns: string[];
  category_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CategoryRule {
  id: string;
  workspace_id: string;
  rule_name?: string;
  condition_type: 'merchant_name' | 'description' | 'amount' | 'account';
  condition_value: string;
  action_type: string;
  rule_type?: 'contains' | 'equals' | 'starts_with' | 'regex';
  pattern?: string;
  category_id: string;
  priority: number;
  confidence: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CategorizationRule extends CategoryRule {
  // Alias for components expecting CategorizationRule
}

export interface ChartOfAccount {
  id: string;
  workspace_id: string;
  account_code: string;
  account_name: string;
  account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  parent_account_id: string | null;
  parent_id?: string | null; // alias
  is_active: boolean;
  normal_balance: 'debit' | 'credit';
  created_at: string;
  updated_at: string;
}

export interface JournalEntry {
  id: string;
  workspace_id: string;
  entry_date: string;
  description: string;
  reference_number: string | null;
  status: 'draft' | 'posted' | 'void';
  created_by: string;
  posted_at: string | null;
  voided_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface JournalEntryLine {
  id: string;
  journal_entry_id: string;
  account_id: string;
  description: string | null;
  debit_cents: number | null;
  credit_cents: number | null;
  created_at: string;
}

export interface LedgerEntry {
  id: string;
  workspace_id: string;
  account_id: string;
  journal_entry_id?: string;
  journal_batch_id?: string;
  entry_type: 'debit' | 'credit';
  amount_cents: number;
  entry_date: string;
  description: string | null;
  debit_cents?: number | null;
  credit_cents?: number | null;
  balance_cents?: number;
  created_at: string;
}

export interface TransactionLink {
  id: string;
  workspace_id: string;
  feed_transaction_id: string;
  ledger_entry_id: string;
  allocation_percentage: number;
  created_at: string;
}

export interface Budget {
  id: string;
  workspace_id: string;
  name: string;
  period_type: 'monthly' | 'quarterly' | 'annually';
  start_date: string;
  end_date: string;
  total_budgeted_cents: number;
  strategy?: 'envelope' | '50_30_20' | 'zero_based' | 'custom';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BudgetPeriod extends Budget {
  // Alias for components expecting BudgetPeriod
}

export interface BudgetLine {
  id: string;
  budget_id: string;
  budget_period_id?: string;
  category_id: string | null;
  account_id?: string | null;
  budgeted_amount_cents: number;
  amount_cents?: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BudgetActual {
  id: string;
  budget_id?: string;
  budget_period_id?: string;
  category_id: string | null;
  account_id?: string | null;
  actual_amount_cents: number;
  variance_cents: number;
  percentage_used?: number;
  last_calculated_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  workspace_id: string;
  transaction_id?: string | null;
  document_type?: string;
  file_name?: string;
  file_size?: number;
  mime_type: string;
  storage_path: string;
  ocr_status: 'pending' | 'processing' | 'processed' | 'completed' | 'failed' | null;
  ocr_data?: Json | null;
  uploaded_by?: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentExtraction {
  id: string;
  document_id: string;
  extracted_text: string | null;
  extracted_data: any;
  confidence_score: number | null;
  processing_engine: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentAttachment {
  id: string;
  document_id: string;
  attached_to_type: string;
  attached_to_id: string;
  created_at: string;
}

export interface RecurringSeries {
  id: string;
  workspace_id: string;
  merchant_pattern: string;
  amount_cents_min: number;
  amount_cents_max: number;
  frequency_type: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
  next_expected_date?: string | null;
  confidence_score: number;
  is_bill: boolean;
  category_id?: string | null;
  is_active: boolean;
  last_seen_date?: string | null;
  occurrence_count: number;
  created_at: string;
  updated_at: string;
}

export interface RecurringSeriesTransaction {
  id: string;
  recurring_series_id: string;
  transaction_id: string;
  workspace_id: string;
  detected_at: string;
}

export interface BudgetPrediction {
  id: string;
  workspace_id: string;
  budget_id: string;
  category_id?: string | null;
  predicted_amount_cents: number;
  actual_amount_cents?: number | null;
  prediction_type: 'recurring' | 'seasonal' | 'trend' | 'ai_suggested';
  confidence_score: number;
  prediction_date: string;
  created_at: string;
}

export interface BudgetAlert {
  id: string;
  workspace_id: string;
  budget_id: string;
  category_id?: string | null;
  alert_type: 'overspend' | 'approaching_limit' | 'unusual_activity' | 'missing_recurring';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  threshold_percent?: number | null;
  current_amount_cents?: number | null;
  budgeted_amount_cents?: number | null;
  is_dismissed: boolean;
  dismissed_at?: string | null;
  created_at: string;
}

export interface BudgetTransactionOverride {
  id: string;
  workspace_id: string;
  transaction_id: string;
  budget_line_id: string;
  original_category?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface BudgetStrategyChange {
  id: string;
  budget_id: string;
  old_strategy: string | null;
  new_strategy: string;
  created_by: string;
  conversion_notes: any;
  created_at: string;
}

export interface MerchantIntelligence {
  id: string;
  workspace_id: string;
  merchant_name: string;
  normalized_name: string;
  category_suggestions: any;
  confidence_score: number;
  created_at: string;
  updated_at: string;
}

export interface CategoryLearningEvent {
  id: string;
  workspace_id: string;
  transaction_id: string;
  old_category: string | null;
  new_category: string;
  reason: string | null;
  created_by: string;
  created_at: string;
}

export interface Receipt {
  id: string;
  workspace_id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  ocr_status: string | null;
  ocr_data: any | null;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

// Database interface for Supabase type inference
export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: UserProfile;
        Insert: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>>;
      };
      workspaces: {
        Row: Workspace;
        Insert: Omit<Workspace, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Workspace, 'id' | 'created_at' | 'updated_at'>>;
      };
      workspace_members: {
        Row: WorkspaceMember;
        Insert: Omit<WorkspaceMember, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<WorkspaceMember, 'id' | 'created_at' | 'updated_at'>>;
      };
      institutions: {
        Row: Institution;
        Insert: Omit<Institution, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Institution, 'id' | 'created_at' | 'updated_at'>>;
      };
      bank_accounts: {
        Row: BankAccount;
        Insert: Omit<BankAccount, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<BankAccount, 'id' | 'created_at' | 'updated_at'>>;
      };
      feed_transactions: {
        Row: FeedTransaction;
        Insert: Omit<FeedTransaction, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<FeedTransaction, 'id' | 'created_at' | 'updated_at'>>;
      };
      categories: {
        Row: Category;
        Insert: Omit<Category, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Category, 'id' | 'created_at' | 'updated_at'>>;
      };
      merchant_aliases: {
        Row: MerchantAlias;
        Insert: Omit<MerchantAlias, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<MerchantAlias, 'id' | 'created_at' | 'updated_at'>>;
      };
      category_rules: {
        Row: CategoryRule;
        Insert: Omit<CategoryRule, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<CategoryRule, 'id' | 'created_at' | 'updated_at'>>;
      };
      chart_of_accounts: {
        Row: ChartOfAccount;
        Insert: Omit<ChartOfAccount, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<ChartOfAccount, 'id' | 'created_at' | 'updated_at'>>;
      };
      ledger_entries: {
        Row: LedgerEntry;
        Insert: Omit<LedgerEntry, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<LedgerEntry, 'id' | 'created_at'>>;
      };
      transaction_links: {
        Row: TransactionLink;
        Insert: Omit<TransactionLink, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<TransactionLink, 'id' | 'created_at'>>;
      };
      budgets: {
        Row: Budget;
        Insert: Omit<Budget, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Budget, 'id' | 'created_at' | 'updated_at'>>;
      };
      budget_lines: {
        Row: BudgetLine;
        Insert: Omit<BudgetLine, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<BudgetLine, 'id' | 'created_at' | 'updated_at'>>;
      };
      documents: {
        Row: Document;
        Insert: Omit<Document, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Document, 'id' | 'created_at' | 'updated_at'>>;
      };
      document_attachments: {
        Row: DocumentAttachment;
        Insert: Omit<DocumentAttachment, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<DocumentAttachment, 'id' | 'created_at'>>;
      };
      recurring_series: {
        Row: RecurringSeries;
        Insert: Omit<RecurringSeries, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<RecurringSeries, 'id' | 'created_at' | 'updated_at'>>;
      };
      recurring_series_transactions: {
        Row: RecurringSeriesTransaction;
        Insert: Omit<RecurringSeriesTransaction, 'id'> & {
          id?: string;
        };
        Update: Partial<Omit<RecurringSeriesTransaction, 'id'>>;
      };
      budget_predictions: {
        Row: BudgetPrediction;
        Insert: Omit<BudgetPrediction, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<BudgetPrediction, 'id' | 'created_at'>>;
      };
      budget_alerts: {
        Row: BudgetAlert;
        Insert: Omit<BudgetAlert, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<BudgetAlert, 'id' | 'created_at'>>;
      };
      budget_transaction_overrides: {
        Row: BudgetTransactionOverride;
        Insert: Omit<BudgetTransactionOverride, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<BudgetTransactionOverride, 'id' | 'created_at' | 'updated_at'>>;
      };
      budget_actuals: {
        Row: BudgetActual;
        Insert: Omit<BudgetActual, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<BudgetActual, 'id' | 'created_at' | 'updated_at'>>;
      };
      document_extractions: {
        Row: DocumentExtraction;
        Insert: Omit<DocumentExtraction, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<DocumentExtraction, 'id' | 'created_at' | 'updated_at'>>;
      };
      journal_entries: {
        Row: JournalEntry;
        Insert: Omit<JournalEntry, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<JournalEntry, 'id' | 'created_at' | 'updated_at'>>;
      };
      journal_entry_lines: {
        Row: JournalEntryLine;
        Insert: Omit<JournalEntryLine, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<JournalEntryLine, 'id' | 'created_at'>>;
      };
      ai_workspace_profiles: {
        Row: AIWorkspaceProfile;
        Insert: Omit<AIWorkspaceProfile, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<AIWorkspaceProfile, 'id' | 'created_at' | 'updated_at'>>;
      };
      ai_learning_events: {
        Row: AILearningEvent;
        Insert: Omit<AILearningEvent, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<AILearningEvent, 'id' | 'created_at'>>;
      };
      ai_insights_cache: {
        Row: AIInsightCache;
        Insert: Omit<AIInsightCache, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<AIInsightCache, 'id' | 'created_at' | 'updated_at'>>;
      };
      budget_strategy_changes: {
        Row: BudgetStrategyChange;
        Insert: Omit<BudgetStrategyChange, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<BudgetStrategyChange, 'id' | 'created_at'>>;
      };
      merchant_intelligence: {
        Row: MerchantIntelligence;
        Insert: Omit<MerchantIntelligence, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<MerchantIntelligence, 'id' | 'created_at' | 'updated_at'>>;
      };
      category_learning_events: {
        Row: CategoryLearningEvent;
        Insert: Omit<CategoryLearningEvent, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<CategoryLearningEvent, 'id' | 'created_at'>>;
      };
      receipts: {
        Row: Receipt;
        Insert: Omit<Receipt, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Receipt, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
    Views: {};
    Functions: {
      current_user_profile_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      is_workspace_member: {
        Args: {
          workspace_uuid: string;
          role?: string;
        };
        Returns: boolean;
      };
      has_workspace_write_access: {
        Args: {
          workspace_uuid: string;
        };
        Returns: boolean;
      };
      handle_new_user: {
        Args: Record<PropertyKey, never>;
        Returns: void;
      };
      import_plaid_transactions_enhanced: {
        Args: {
          transactions: Json[];
        };
        Returns: void;
      };
      import_plaid_institution_data: {
        Args: {
          institution_data: Json;
        };
        Returns: void;
      };
      apply_categorization_rules: {
        Args: {
          transaction_id: string;
        };
        Returns: void;
      };
      create_split_transaction: {
        Args: {
          transaction_id: string;
          splits: Json[];
        };
        Returns: void;
      };
      detect_recurring_transactions: {
        Args: {
          p_workspace_id: string;
          p_lookback_days?: number;
        };
        Returns: Array<{
          merchant_pattern: string;
          avg_amount_cents: number;
          min_amount_cents: number;
          max_amount_cents: number;
          transaction_count: number;
          frequency_days: number;
          suggested_frequency: string | null;
        }>;
      };
      calculate_budget_performance_with_overrides: {
        Args: {
          p_workspace_id: string;
          p_budget_id: string;
        };
        Returns: any[];
      };
      create_flexible_budget: {
        Args: {
          p_workspace_id: string;
          p_name: string;
          p_start_date: string;
          p_end_date: string;
          p_strategy: string;
        };
        Returns: any;
      };
      rebuild_ai_master_prompt: {
        Args: {
          p_workspace_id: string;
        };
        Returns: string;
      };
      generate_budget_actuals: {
        Args: {
          p_workspace_id: string;
          p_budget_id: string;
        };
        Returns: void;
      };
      ai_generate_insight: {
        Args: {
          workspace_id: string;
          profile_id: string;
          insight_type: string;
          params?: any;
        };
        Returns: any;
      };
      ai_reprocess_profile: {
        Args: {
          workspace_id: string;
          profile_id: string;
        };
        Returns: void;
      };
    };
    Enums: {};
    CompositeTypes: {};
  };
}