export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      audit_events: {
        Row: {
          event_action: string
          event_type: string
          id: string
          ip_address: unknown | null
          metadata: Json
          new_values: Json | null
          occurred_at: string
          old_values: Json | null
          record_id: string
          table_name: string
          user_agent: string | null
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          event_action: string
          event_type: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json
          new_values?: Json | null
          occurred_at?: string
          old_values?: Json | null
          record_id: string
          table_name: string
          user_agent?: string | null
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          event_action?: string
          event_type?: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json
          new_values?: Json | null
          occurred_at?: string
          old_values?: Json | null
          record_id?: string
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          account_number_encrypted: string | null
          account_subtype: string | null
          account_subtype_detailed: string | null
          account_type: Database["public"]["Enums"]["account_type_enum"]
          available_balance_cents: number | null
          balance_iso_currency_code: string | null
          balance_last_updated_datetime: string | null
          balance_limit_cents: number | null
          balance_limit_type: string | null
          balance_unofficial_currency_code: string | null
          bic: string | null
          created_at: string
          created_by: string
          credit_limit_cents: number | null
          currency_code: string
          current_balance_cents: number | null
          deleted_at: string | null
          iban: string | null
          id: string
          institution_id: string
          is_active: boolean
          is_business: boolean
          last_sync_at: string | null
          mask: string | null
          metadata: Json
          name: string
          official_name: string | null
          persistent_account_id: string | null
          plaid_account_data: Json | null
          plaid_account_id: string | null
          routing_number: string | null
          sort_code: string | null
          sync_cursor: string | null
          updated_at: string
          updated_by: string
          verification_status: string | null
          wire_routing_number: string | null
          workspace_id: string
        }
        Insert: {
          account_number_encrypted?: string | null
          account_subtype?: string | null
          account_subtype_detailed?: string | null
          account_type: Database["public"]["Enums"]["account_type_enum"]
          available_balance_cents?: number | null
          balance_iso_currency_code?: string | null
          balance_last_updated_datetime?: string | null
          balance_limit_cents?: number | null
          balance_limit_type?: string | null
          balance_unofficial_currency_code?: string | null
          bic?: string | null
          created_at?: string
          created_by: string
          credit_limit_cents?: number | null
          currency_code?: string
          current_balance_cents?: number | null
          deleted_at?: string | null
          iban?: string | null
          id?: string
          institution_id: string
          is_active?: boolean
          is_business?: boolean
          last_sync_at?: string | null
          mask?: string | null
          metadata?: Json
          name: string
          official_name?: string | null
          persistent_account_id?: string | null
          plaid_account_data?: Json | null
          plaid_account_id?: string | null
          routing_number?: string | null
          sort_code?: string | null
          sync_cursor?: string | null
          updated_at?: string
          updated_by: string
          verification_status?: string | null
          wire_routing_number?: string | null
          workspace_id: string
        }
        Update: {
          account_number_encrypted?: string | null
          account_subtype?: string | null
          account_subtype_detailed?: string | null
          account_type?: Database["public"]["Enums"]["account_type_enum"]
          available_balance_cents?: number | null
          balance_iso_currency_code?: string | null
          balance_last_updated_datetime?: string | null
          balance_limit_cents?: number | null
          balance_limit_type?: string | null
          balance_unofficial_currency_code?: string | null
          bic?: string | null
          created_at?: string
          created_by?: string
          credit_limit_cents?: number | null
          currency_code?: string
          current_balance_cents?: number | null
          deleted_at?: string | null
          iban?: string | null
          id?: string
          institution_id?: string
          is_active?: boolean
          is_business?: boolean
          last_sync_at?: string | null
          mask?: string | null
          metadata?: Json
          name?: string
          official_name?: string | null
          persistent_account_id?: string | null
          plaid_account_data?: Json | null
          plaid_account_id?: string | null
          routing_number?: string | null
          sort_code?: string | null
          sync_cursor?: string | null
          updated_at?: string
          updated_by?: string
          verification_status?: string | null
          wire_routing_number?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_accounts_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_accounts_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_accounts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_alerts: {
        Row: {
          alert_type: string
          budget_id: string
          budgeted_amount_cents: number | null
          category_id: string | null
          created_at: string | null
          current_amount_cents: number | null
          dismissed_at: string | null
          id: string
          is_dismissed: boolean | null
          message: string
          severity: string
          threshold_percent: number | null
          workspace_id: string
        }
        Insert: {
          alert_type: string
          budget_id: string
          budgeted_amount_cents?: number | null
          category_id?: string | null
          created_at?: string | null
          current_amount_cents?: number | null
          dismissed_at?: string | null
          id?: string
          is_dismissed?: boolean | null
          message: string
          severity: string
          threshold_percent?: number | null
          workspace_id: string
        }
        Update: {
          alert_type?: string
          budget_id?: string
          budgeted_amount_cents?: number | null
          category_id?: string | null
          created_at?: string | null
          current_amount_cents?: number | null
          dismissed_at?: string | null
          id?: string
          is_dismissed?: boolean | null
          message?: string
          severity?: string
          threshold_percent?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_alerts_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budget_actual_summaries"
            referencedColumns: ["budget_id"]
          },
          {
            foreignKeyName: "budget_alerts_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_alerts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_alerts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_lines: {
        Row: {
          account_id: string | null
          ai_confidence: number | null
          ai_suggested: boolean | null
          budget_id: string
          budgeted_amount_cents: number
          category_id: string | null
          class_id: string | null
          created_at: string
          created_by: string
          currency_code: string
          id: string
          line_name: string
          metadata: Json
          notes: string | null
          project_id: string | null
          recurring_series_id: string | null
          remaining_cents: number | null
          spent_cents: number | null
          updated_at: string
          updated_by: string
          workspace_id: string
        }
        Insert: {
          account_id?: string | null
          ai_confidence?: number | null
          ai_suggested?: boolean | null
          budget_id: string
          budgeted_amount_cents: number
          category_id?: string | null
          class_id?: string | null
          created_at?: string
          created_by: string
          currency_code?: string
          id?: string
          line_name: string
          metadata?: Json
          notes?: string | null
          project_id?: string | null
          recurring_series_id?: string | null
          remaining_cents?: number | null
          spent_cents?: number | null
          updated_at?: string
          updated_by: string
          workspace_id: string
        }
        Update: {
          account_id?: string | null
          ai_confidence?: number | null
          ai_suggested?: boolean | null
          budget_id?: string
          budgeted_amount_cents?: number
          category_id?: string | null
          class_id?: string | null
          created_at?: string
          created_by?: string
          currency_code?: string
          id?: string
          line_name?: string
          metadata?: Json
          notes?: string | null
          project_id?: string | null
          recurring_series_id?: string | null
          remaining_cents?: number | null
          spent_cents?: number | null
          updated_at?: string
          updated_by?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budget_actual_summaries"
            referencedColumns: ["budget_id"]
          },
          {
            foreignKeyName: "budget_lines_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_recurring_series_id_fkey"
            columns: ["recurring_series_id"]
            isOneToOne: false
            referencedRelation: "recurring_series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_predictions: {
        Row: {
          actual_amount_cents: number | null
          budget_id: string
          category_id: string | null
          confidence_score: number | null
          created_at: string | null
          id: string
          predicted_amount_cents: number
          prediction_date: string
          prediction_type: string
          workspace_id: string
        }
        Insert: {
          actual_amount_cents?: number | null
          budget_id: string
          category_id?: string | null
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          predicted_amount_cents: number
          prediction_date: string
          prediction_type: string
          workspace_id: string
        }
        Update: {
          actual_amount_cents?: number | null
          budget_id?: string
          category_id?: string | null
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          predicted_amount_cents?: number
          prediction_date?: string
          prediction_type?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_predictions_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budget_actual_summaries"
            referencedColumns: ["budget_id"]
          },
          {
            foreignKeyName: "budget_predictions_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_predictions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_predictions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          created_at: string
          created_by: string
          currency_code: string
          deleted_at: string | null
          description: string | null
          end_date: string
          id: string
          is_active: boolean
          is_template: boolean
          metadata: Json
          name: string
          period_type: Database["public"]["Enums"]["period_type_enum"]
          start_date: string
          strategy: string | null
          total_budgeted_cents: number
          updated_at: string
          updated_by: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          currency_code?: string
          deleted_at?: string | null
          description?: string | null
          end_date: string
          id?: string
          is_active?: boolean
          is_template?: boolean
          metadata?: Json
          name: string
          period_type?: Database["public"]["Enums"]["period_type_enum"]
          start_date: string
          strategy?: string | null
          total_budgeted_cents?: number
          updated_at?: string
          updated_by: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          currency_code?: string
          deleted_at?: string | null
          description?: string | null
          end_date?: string
          id?: string
          is_active?: boolean
          is_template?: boolean
          metadata?: Json
          name?: string
          period_type?: Database["public"]["Enums"]["period_type_enum"]
          start_date?: string
          strategy?: string | null
          total_budgeted_cents?: number
          updated_at?: string
          updated_by?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          category_type: string
          color: string | null
          created_at: string
          created_by: string
          default_account_id: string | null
          deleted_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          is_system: boolean
          metadata: Json
          name: string
          parent_category_id: string | null
          sort_order: number
          updated_at: string
          updated_by: string
          workspace_id: string
        }
        Insert: {
          category_type?: string
          color?: string | null
          created_at?: string
          created_by: string
          default_account_id?: string | null
          deleted_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          metadata?: Json
          name: string
          parent_category_id?: string | null
          sort_order?: number
          updated_at?: string
          updated_by: string
          workspace_id: string
        }
        Update: {
          category_type?: string
          color?: string | null
          created_at?: string
          created_by?: string
          default_account_id?: string | null
          deleted_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          metadata?: Json
          name?: string
          parent_category_id?: string | null
          sort_order?: number
          updated_at?: string
          updated_by?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_default_account_id_fkey"
            columns: ["default_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      category_rules: {
        Row: {
          account_id: string | null
          action_type: Database["public"]["Enums"]["rule_action_type_enum"]
          active_from: string
          active_to: string | null
          category_id: string | null
          condition_operator: string
          condition_type: Database["public"]["Enums"]["rule_condition_type_enum"]
          condition_value: string
          confidence_score: number
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          merchant_alias_id: string | null
          metadata: Json
          name: string
          priority: number
          split_allocations: Json | null
          updated_at: string
          updated_by: string
          workspace_id: string
        }
        Insert: {
          account_id?: string | null
          action_type: Database["public"]["Enums"]["rule_action_type_enum"]
          active_from?: string
          active_to?: string | null
          category_id?: string | null
          condition_operator?: string
          condition_type: Database["public"]["Enums"]["rule_condition_type_enum"]
          condition_value: string
          confidence_score?: number
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          merchant_alias_id?: string | null
          metadata?: Json
          name: string
          priority?: number
          split_allocations?: Json | null
          updated_at?: string
          updated_by: string
          workspace_id: string
        }
        Update: {
          account_id?: string | null
          action_type?: Database["public"]["Enums"]["rule_action_type_enum"]
          active_from?: string
          active_to?: string | null
          category_id?: string | null
          condition_operator?: string
          condition_type?: Database["public"]["Enums"]["rule_condition_type_enum"]
          condition_value?: string
          confidence_score?: number
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          merchant_alias_id?: string | null
          metadata?: Json
          name?: string
          priority?: number
          split_allocations?: Json | null
          updated_at?: string
          updated_by?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_rules_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_rules_merchant_alias_id_fkey"
            columns: ["merchant_alias_id"]
            isOneToOne: false
            referencedRelation: "merchant_aliases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_rules_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_rules_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      chart_of_accounts: {
        Row: {
          account_code: string
          account_name: string
          account_subtype: string | null
          account_type: Database["public"]["Enums"]["gaap_account_type_enum"]
          created_at: string
          created_by: string
          deleted_at: string | null
          description: string | null
          id: string
          is_active: boolean
          is_system: boolean
          level: number
          metadata: Json
          normal_balance: Database["public"]["Enums"]["balance_type_enum"]
          parent_account_id: string | null
          tax_line_mapping: string | null
          updated_at: string
          updated_by: string
          workspace_id: string
        }
        Insert: {
          account_code: string
          account_name: string
          account_subtype?: string | null
          account_type: Database["public"]["Enums"]["gaap_account_type_enum"]
          created_at?: string
          created_by: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          level?: number
          metadata?: Json
          normal_balance: Database["public"]["Enums"]["balance_type_enum"]
          parent_account_id?: string | null
          tax_line_mapping?: string | null
          updated_at?: string
          updated_by: string
          workspace_id: string
        }
        Update: {
          account_code?: string
          account_name?: string
          account_subtype?: string | null
          account_type?: Database["public"]["Enums"]["gaap_account_type_enum"]
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          level?: number
          metadata?: Json
          normal_balance?: Database["public"]["Enums"]["balance_type_enum"]
          parent_account_id?: string | null
          tax_line_mapping?: string | null
          updated_at?: string
          updated_by?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chart_of_accounts_parent_account_id_fkey"
            columns: ["parent_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chart_of_accounts_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chart_of_accounts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          class_code: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          description: string | null
          id: string
          is_active: boolean
          metadata: Json
          name: string
          parent_class_id: string | null
          updated_at: string
          updated_by: string
          workspace_id: string
        }
        Insert: {
          class_code?: string | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json
          name: string
          parent_class_id?: string | null
          updated_at?: string
          updated_by: string
          workspace_id: string
        }
        Update: {
          class_code?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json
          name?: string
          parent_class_id?: string | null
          updated_at?: string
          updated_by?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_parent_class_id_fkey"
            columns: ["parent_class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      document_attachments: {
        Row: {
          attached_to_id: string
          attached_to_type: string
          attachment_type: string
          created_at: string
          created_by: string
          document_id: string
          id: string
          notes: string | null
          workspace_id: string
        }
        Insert: {
          attached_to_id: string
          attached_to_type: string
          attachment_type?: string
          created_at?: string
          created_by: string
          document_id: string
          id?: string
          notes?: string | null
          workspace_id: string
        }
        Update: {
          attached_to_id?: string
          attached_to_type?: string
          attachment_type?: string
          created_at?: string
          created_by?: string
          document_id?: string
          id?: string
          notes?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_attachments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_attachments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_attachments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          created_by: string
          deleted_at: string | null
          document_type: Database["public"]["Enums"]["document_type_enum"]
          error_message: string | null
          file_size: number
          filename: string
          id: string
          metadata: Json
          mime_type: string
          ocr_confidence: number | null
          ocr_metadata: Json | null
          ocr_text: string | null
          processed_at: string | null
          processing_status: Database["public"]["Enums"]["document_status_enum"]
          sha256_hash: string
          storage_bucket: string
          storage_path: string
          updated_at: string
          updated_by: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          deleted_at?: string | null
          document_type?: Database["public"]["Enums"]["document_type_enum"]
          error_message?: string | null
          file_size: number
          filename: string
          id?: string
          metadata?: Json
          mime_type: string
          ocr_confidence?: number | null
          ocr_metadata?: Json | null
          ocr_text?: string | null
          processed_at?: string | null
          processing_status?: Database["public"]["Enums"]["document_status_enum"]
          sha256_hash: string
          storage_bucket?: string
          storage_path: string
          updated_at?: string
          updated_by: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          document_type?: Database["public"]["Enums"]["document_type_enum"]
          error_message?: string | null
          file_size?: number
          filename?: string
          id?: string
          metadata?: Json
          mime_type?: string
          ocr_confidence?: number | null
          ocr_metadata?: Json | null
          ocr_text?: string | null
          processed_at?: string | null
          processing_status?: Database["public"]["Enums"]["document_status_enum"]
          sha256_hash?: string
          storage_bucket?: string
          storage_path?: string
          updated_at?: string
          updated_by?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_transactions: {
        Row: {
          amount_cents: number
          authorized_date: string | null
          bank_account_id: string
          categorization_confidence: number | null
          category_detailed: string | null
          category_primary: string | null
          check_number: string | null
          content_hash: string
          counterparty_entity_id: string | null
          counterparty_logo_url: string | null
          counterparty_name: string | null
          counterparty_type: string | null
          counterparty_website: string | null
          created_at: string
          created_by: string
          currency_code: string
          deleted_at: string | null
          description: string | null
          direction: Database["public"]["Enums"]["direction_enum"]
          id: string
          imported_at: string
          is_split: boolean
          location_address: string | null
          location_city: string | null
          location_country: string | null
          location_data: Json | null
          location_lat: number | null
          location_lon: number | null
          location_postal_code: string | null
          location_region: string | null
          location_store_number: string | null
          merchant_entity_id: string | null
          merchant_logo_url: string | null
          merchant_name: string | null
          merchant_normalized: string | null
          merchant_website: string | null
          parent_transaction_id: string | null
          payment_meta: Json | null
          payment_method: string | null
          payment_payee: string | null
          payment_payer: string | null
          payment_ppd_id: string | null
          payment_processor: string | null
          payment_reason: string | null
          payment_reference_number: string | null
          personal_finance_category_confidence: number | null
          personal_finance_category_detailed: string | null
          personal_finance_category_primary: string | null
          plaid_enriched: Json | null
          plaid_transaction_id: string | null
          provider_unique_id: string
          raw_data: Json | null
          reconciled_at: string | null
          reconciled_by: string | null
          reconciliation_status: Database["public"]["Enums"]["reconciliation_status_enum"]
          reference_number: string | null
          status: Database["public"]["Enums"]["transaction_status_enum"]
          transaction_code: string | null
          transaction_date: string
          updated_at: string
          updated_by: string
          website: string | null
          workspace_id: string
        }
        Insert: {
          amount_cents: number
          authorized_date?: string | null
          bank_account_id: string
          categorization_confidence?: number | null
          category_detailed?: string | null
          category_primary?: string | null
          check_number?: string | null
          content_hash: string
          counterparty_entity_id?: string | null
          counterparty_logo_url?: string | null
          counterparty_name?: string | null
          counterparty_type?: string | null
          counterparty_website?: string | null
          created_at?: string
          created_by: string
          currency_code?: string
          deleted_at?: string | null
          description?: string | null
          direction: Database["public"]["Enums"]["direction_enum"]
          id?: string
          imported_at?: string
          is_split?: boolean
          location_address?: string | null
          location_city?: string | null
          location_country?: string | null
          location_data?: Json | null
          location_lat?: number | null
          location_lon?: number | null
          location_postal_code?: string | null
          location_region?: string | null
          location_store_number?: string | null
          merchant_entity_id?: string | null
          merchant_logo_url?: string | null
          merchant_name?: string | null
          merchant_normalized?: string | null
          merchant_website?: string | null
          parent_transaction_id?: string | null
          payment_meta?: Json | null
          payment_method?: string | null
          payment_payee?: string | null
          payment_payer?: string | null
          payment_ppd_id?: string | null
          payment_processor?: string | null
          payment_reason?: string | null
          payment_reference_number?: string | null
          personal_finance_category_confidence?: number | null
          personal_finance_category_detailed?: string | null
          personal_finance_category_primary?: string | null
          plaid_enriched?: Json | null
          plaid_transaction_id?: string | null
          provider_unique_id: string
          raw_data?: Json | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          reconciliation_status?: Database["public"]["Enums"]["reconciliation_status_enum"]
          reference_number?: string | null
          status?: Database["public"]["Enums"]["transaction_status_enum"]
          transaction_code?: string | null
          transaction_date: string
          updated_at?: string
          updated_by: string
          website?: string | null
          workspace_id: string
        }
        Update: {
          amount_cents?: number
          authorized_date?: string | null
          bank_account_id?: string
          categorization_confidence?: number | null
          category_detailed?: string | null
          category_primary?: string | null
          check_number?: string | null
          content_hash?: string
          counterparty_entity_id?: string | null
          counterparty_logo_url?: string | null
          counterparty_name?: string | null
          counterparty_type?: string | null
          counterparty_website?: string | null
          created_at?: string
          created_by?: string
          currency_code?: string
          deleted_at?: string | null
          description?: string | null
          direction?: Database["public"]["Enums"]["direction_enum"]
          id?: string
          imported_at?: string
          is_split?: boolean
          location_address?: string | null
          location_city?: string | null
          location_country?: string | null
          location_data?: Json | null
          location_lat?: number | null
          location_lon?: number | null
          location_postal_code?: string | null
          location_region?: string | null
          location_store_number?: string | null
          merchant_entity_id?: string | null
          merchant_logo_url?: string | null
          merchant_name?: string | null
          merchant_normalized?: string | null
          merchant_website?: string | null
          parent_transaction_id?: string | null
          payment_meta?: Json | null
          payment_method?: string | null
          payment_payee?: string | null
          payment_payer?: string | null
          payment_ppd_id?: string | null
          payment_processor?: string | null
          payment_reason?: string | null
          payment_reference_number?: string | null
          personal_finance_category_confidence?: number | null
          personal_finance_category_detailed?: string | null
          personal_finance_category_primary?: string | null
          plaid_enriched?: Json | null
          plaid_transaction_id?: string | null
          provider_unique_id?: string
          raw_data?: Json | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          reconciliation_status?: Database["public"]["Enums"]["reconciliation_status_enum"]
          reference_number?: string | null
          status?: Database["public"]["Enums"]["transaction_status_enum"]
          transaction_code?: string | null
          transaction_date?: string
          updated_at?: string
          updated_by?: string
          website?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "account_reconciliation_view"
            referencedColumns: ["bank_account_id"]
          },
          {
            foreignKeyName: "feed_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_transactions_parent_transaction_id_fkey"
            columns: ["parent_transaction_id"]
            isOneToOne: false
            referencedRelation: "feed_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_transactions_parent_transaction_id_fkey"
            columns: ["parent_transaction_id"]
            isOneToOne: false
            referencedRelation: "plaid_data_completeness"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_transactions_reconciled_by_fkey"
            columns: ["reconciled_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_transactions_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_transactions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_goals: {
        Row: {
          created_at: string | null
          current_amount_cents: number | null
          goal_name: string
          goal_type: string
          id: string
          is_active: boolean | null
          monthly_contribution_cents: number | null
          target_amount_cents: number
          target_date: string | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          current_amount_cents?: number | null
          goal_name: string
          goal_type: string
          id?: string
          is_active?: boolean | null
          monthly_contribution_cents?: number | null
          target_amount_cents: number
          target_date?: string | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          current_amount_cents?: number | null
          goal_name?: string
          goal_type?: string
          id?: string
          is_active?: boolean | null
          monthly_contribution_cents?: number | null
          target_amount_cents?: number
          target_date?: string | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_goals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      forecasts: {
        Row: {
          confidence_score: number | null
          created_at: string
          created_by: string
          forecast_data: Json
          forecast_date: string
          forecast_name: string
          forecast_type: string
          generated_at: string
          id: string
          input_parameters: Json
          metadata: Json
          model_version: string | null
          period_months: number
          workspace_id: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          created_by: string
          forecast_data: Json
          forecast_date: string
          forecast_name: string
          forecast_type: string
          generated_at?: string
          id?: string
          input_parameters?: Json
          metadata?: Json
          model_version?: string | null
          period_months?: number
          workspace_id: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          created_by?: string
          forecast_data?: Json
          forecast_date?: string
          forecast_name?: string
          forecast_type?: string
          generated_at?: string
          id?: string
          input_parameters?: Json
          metadata?: Json
          model_version?: string | null
          period_months?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forecasts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forecasts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      institutions: {
        Row: {
          country_codes: string[] | null
          created_at: string
          created_by: string
          deleted_at: string | null
          dtc_numbers: string[] | null
          hex_color: string | null
          id: string
          institution_status: string | null
          last_sync_at: string | null
          logo_base64: string | null
          logo_url: string | null
          metadata: Json
          name: string
          name_break: string | null
          oauth: boolean | null
          plaid_access_token_encrypted: string | null
          plaid_institution_data: Json | null
          plaid_institution_id: string | null
          plaid_item_id: string | null
          primary_color: string | null
          products_available: string[] | null
          routing_numbers: string[] | null
          status: Database["public"]["Enums"]["institution_status_enum"]
          sync_error: string | null
          updated_at: string
          updated_by: string
          url: string | null
          webhook_secret: string | null
          webhook_url: string | null
          website_url: string | null
          workspace_id: string
        }
        Insert: {
          country_codes?: string[] | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          dtc_numbers?: string[] | null
          hex_color?: string | null
          id?: string
          institution_status?: string | null
          last_sync_at?: string | null
          logo_base64?: string | null
          logo_url?: string | null
          metadata?: Json
          name: string
          name_break?: string | null
          oauth?: boolean | null
          plaid_access_token_encrypted?: string | null
          plaid_institution_data?: Json | null
          plaid_institution_id?: string | null
          plaid_item_id?: string | null
          primary_color?: string | null
          products_available?: string[] | null
          routing_numbers?: string[] | null
          status?: Database["public"]["Enums"]["institution_status_enum"]
          sync_error?: string | null
          updated_at?: string
          updated_by: string
          url?: string | null
          webhook_secret?: string | null
          webhook_url?: string | null
          website_url?: string | null
          workspace_id: string
        }
        Update: {
          country_codes?: string[] | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          dtc_numbers?: string[] | null
          hex_color?: string | null
          id?: string
          institution_status?: string | null
          last_sync_at?: string | null
          logo_base64?: string | null
          logo_url?: string | null
          metadata?: Json
          name?: string
          name_break?: string | null
          oauth?: boolean | null
          plaid_access_token_encrypted?: string | null
          plaid_institution_data?: Json | null
          plaid_institution_id?: string | null
          plaid_item_id?: string | null
          primary_color?: string | null
          products_available?: string[] | null
          routing_numbers?: string[] | null
          status?: Database["public"]["Enums"]["institution_status_enum"]
          sync_error?: string | null
          updated_at?: string
          updated_by?: string
          url?: string | null
          webhook_secret?: string | null
          webhook_url?: string | null
          website_url?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "institutions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institutions_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institutions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_batches: {
        Row: {
          batch_date: string
          batch_number: string
          batch_type: Database["public"]["Enums"]["batch_type_enum"]
          created_at: string
          created_by: string
          deleted_at: string | null
          description: string | null
          entry_count: number
          id: string
          metadata: Json
          posted_at: string | null
          posted_by: string | null
          reversal_reason: string | null
          reversed_at: string | null
          reversed_by: string | null
          source_reference: string | null
          source_type: string | null
          status: Database["public"]["Enums"]["batch_status_enum"]
          total_credits_cents: number
          total_debits_cents: number
          updated_at: string
          updated_by: string
          workspace_id: string
        }
        Insert: {
          batch_date?: string
          batch_number: string
          batch_type?: Database["public"]["Enums"]["batch_type_enum"]
          created_at?: string
          created_by: string
          deleted_at?: string | null
          description?: string | null
          entry_count?: number
          id?: string
          metadata?: Json
          posted_at?: string | null
          posted_by?: string | null
          reversal_reason?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          source_reference?: string | null
          source_type?: string | null
          status?: Database["public"]["Enums"]["batch_status_enum"]
          total_credits_cents?: number
          total_debits_cents?: number
          updated_at?: string
          updated_by: string
          workspace_id: string
        }
        Update: {
          batch_date?: string
          batch_number?: string
          batch_type?: Database["public"]["Enums"]["batch_type_enum"]
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          description?: string | null
          entry_count?: number
          id?: string
          metadata?: Json
          posted_at?: string | null
          posted_by?: string | null
          reversal_reason?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          source_reference?: string | null
          source_type?: string | null
          status?: Database["public"]["Enums"]["batch_status_enum"]
          total_credits_cents?: number
          total_debits_cents?: number
          updated_at?: string
          updated_by?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_batches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_batches_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_batches_reversed_by_fkey"
            columns: ["reversed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_batches_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_batches_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_entries: {
        Row: {
          account_id: string
          amount_cents: number
          class_id: string | null
          created_at: string
          created_by: string
          currency_code: string
          description: string | null
          entry_date: string
          entry_type: Database["public"]["Enums"]["entry_type_enum"]
          id: string
          journal_batch_id: string
          location_id: string | null
          memo: string | null
          metadata: Json
          project_id: string | null
          reference: string | null
          sequence_number: number
          source_id: string | null
          source_type: string | null
          updated_at: string
          updated_by: string
          version: number
          workspace_id: string
        }
        Insert: {
          account_id: string
          amount_cents: number
          class_id?: string | null
          created_at?: string
          created_by: string
          currency_code?: string
          description?: string | null
          entry_date: string
          entry_type: Database["public"]["Enums"]["entry_type_enum"]
          id?: string
          journal_batch_id: string
          location_id?: string | null
          memo?: string | null
          metadata?: Json
          project_id?: string | null
          reference?: string | null
          sequence_number: number
          source_id?: string | null
          source_type?: string | null
          updated_at?: string
          updated_by: string
          version?: number
          workspace_id: string
        }
        Update: {
          account_id?: string
          amount_cents?: number
          class_id?: string | null
          created_at?: string
          created_by?: string
          currency_code?: string
          description?: string | null
          entry_date?: string
          entry_type?: Database["public"]["Enums"]["entry_type_enum"]
          id?: string
          journal_batch_id?: string
          location_id?: string | null
          memo?: string | null
          metadata?: Json
          project_id?: string | null
          reference?: string | null
          sequence_number?: number
          source_id?: string | null
          source_type?: string | null
          updated_at?: string
          updated_by?: string
          version?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_journal_batch_id_fkey"
            columns: ["journal_batch_id"]
            isOneToOne: false
            referencedRelation: "journal_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: Json | null
          created_at: string
          created_by: string
          deleted_at: string | null
          id: string
          is_active: boolean
          location_type: string | null
          metadata: Json
          name: string
          updated_at: string
          updated_by: string
          workspace_id: string
        }
        Insert: {
          address?: Json | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          location_type?: string | null
          metadata?: Json
          name: string
          updated_at?: string
          updated_by: string
          workspace_id: string
        }
        Update: {
          address?: Json | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          location_type?: string | null
          metadata?: Json
          name?: string
          updated_at?: string
          updated_by?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locations_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_aliases: {
        Row: {
          category_id: string | null
          confidence_score: number
          created_at: string
          created_by: string
          display_name: string
          id: string
          is_verified: boolean
          match_patterns: string[]
          metadata: Json
          normalized_name: string
          updated_at: string
          updated_by: string
          workspace_id: string
        }
        Insert: {
          category_id?: string | null
          confidence_score?: number
          created_at?: string
          created_by: string
          display_name: string
          id?: string
          is_verified?: boolean
          match_patterns: string[]
          metadata?: Json
          normalized_name: string
          updated_at?: string
          updated_by: string
          workspace_id: string
        }
        Update: {
          category_id?: string | null
          confidence_score?: number
          created_at?: string
          created_by?: string
          display_name?: string
          id?: string
          is_verified?: boolean
          match_patterns?: string[]
          metadata?: Json
          normalized_name?: string
          updated_at?: string
          updated_by?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_aliases_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_aliases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_aliases_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_aliases_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          attached_to_id: string | null
          attached_to_type: string | null
          content: string
          created_at: string
          created_by: string
          deleted_at: string | null
          id: string
          is_private: boolean
          metadata: Json
          note_type: string
          tags: string[] | null
          title: string | null
          updated_at: string
          updated_by: string
          workspace_id: string
        }
        Insert: {
          attached_to_id?: string | null
          attached_to_type?: string | null
          content: string
          created_at?: string
          created_by: string
          deleted_at?: string | null
          id?: string
          is_private?: boolean
          metadata?: Json
          note_type?: string
          tags?: string[] | null
          title?: string | null
          updated_at?: string
          updated_by: string
          workspace_id: string
        }
        Update: {
          attached_to_id?: string | null
          attached_to_type?: string | null
          content?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          id?: string
          is_private?: boolean
          metadata?: Json
          note_type?: string
          tags?: string[] | null
          title?: string | null
          updated_at?: string
          updated_by?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      plaid_enrichment_data: {
        Row: {
          confidence_score: number | null
          created_at: string
          enriched_at: string
          enrichment_data: Json
          enrichment_type: string
          id: string
          transaction_id: string
          workspace_id: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          enriched_at?: string
          enrichment_data: Json
          enrichment_type: string
          id?: string
          transaction_id: string
          workspace_id: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          enriched_at?: string
          enrichment_data?: Json
          enrichment_type?: string
          id?: string
          transaction_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plaid_enrichment_data_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "feed_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plaid_enrichment_data_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "plaid_data_completeness"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plaid_enrichment_data_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          budget_cents: number | null
          created_at: string
          created_by: string
          currency_code: string
          deleted_at: string | null
          description: string | null
          end_date: string | null
          id: string
          is_active: boolean
          metadata: Json
          name: string
          project_code: string | null
          start_date: string | null
          status: string
          updated_at: string
          updated_by: string
          workspace_id: string
        }
        Insert: {
          budget_cents?: number | null
          created_at?: string
          created_by: string
          currency_code?: string
          deleted_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json
          name: string
          project_code?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
          updated_by: string
          workspace_id: string
        }
        Update: {
          budget_cents?: number | null
          created_at?: string
          created_by?: string
          currency_code?: string
          deleted_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json
          name?: string
          project_code?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
          updated_by?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_series: {
        Row: {
          amount_cents_max: number
          amount_cents_min: number
          category_id: string | null
          confidence_score: number | null
          created_at: string | null
          frequency_type: string
          id: string
          is_active: boolean | null
          is_bill: boolean | null
          last_seen_date: string | null
          merchant_pattern: string
          next_expected_date: string | null
          occurrence_count: number | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          amount_cents_max: number
          amount_cents_min: number
          category_id?: string | null
          confidence_score?: number | null
          created_at?: string | null
          frequency_type: string
          id?: string
          is_active?: boolean | null
          is_bill?: boolean | null
          last_seen_date?: string | null
          merchant_pattern: string
          next_expected_date?: string | null
          occurrence_count?: number | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          amount_cents_max?: number
          amount_cents_min?: number
          category_id?: string | null
          confidence_score?: number | null
          created_at?: string | null
          frequency_type?: string
          id?: string
          is_active?: boolean | null
          is_bill?: boolean | null
          last_seen_date?: string | null
          merchant_pattern?: string
          next_expected_date?: string | null
          occurrence_count?: number | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_series_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_series_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_series_transactions: {
        Row: {
          detected_at: string | null
          id: string
          recurring_series_id: string
          transaction_id: string
          workspace_id: string
        }
        Insert: {
          detected_at?: string | null
          id?: string
          recurring_series_id: string
          transaction_id: string
          workspace_id: string
        }
        Update: {
          detected_at?: string | null
          id?: string
          recurring_series_id?: string
          transaction_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_series_transactions_recurring_series_id_fkey"
            columns: ["recurring_series_id"]
            isOneToOne: false
            referencedRelation: "recurring_series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_series_transactions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "feed_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_series_transactions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "plaid_data_completeness"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_series_transactions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      rule_applications: {
        Row: {
          applied_at: string
          confidence_score: number
          created_by: string
          feed_transaction_id: string
          id: string
          is_manual_override: boolean
          metadata: Json
          new_category_id: string | null
          previous_category_id: string | null
          rule_id: string
          workspace_id: string
        }
        Insert: {
          applied_at?: string
          confidence_score: number
          created_by: string
          feed_transaction_id: string
          id?: string
          is_manual_override?: boolean
          metadata?: Json
          new_category_id?: string | null
          previous_category_id?: string | null
          rule_id: string
          workspace_id: string
        }
        Update: {
          applied_at?: string
          confidence_score?: number
          created_by?: string
          feed_transaction_id?: string
          id?: string
          is_manual_override?: boolean
          metadata?: Json
          new_category_id?: string | null
          previous_category_id?: string | null
          rule_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rule_applications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rule_applications_feed_transaction_id_fkey"
            columns: ["feed_transaction_id"]
            isOneToOne: false
            referencedRelation: "feed_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rule_applications_feed_transaction_id_fkey"
            columns: ["feed_transaction_id"]
            isOneToOne: false
            referencedRelation: "plaid_data_completeness"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rule_applications_new_category_id_fkey"
            columns: ["new_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rule_applications_previous_category_id_fkey"
            columns: ["previous_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rule_applications_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "category_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rule_applications_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          attached_to_id: string | null
          attached_to_type: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          description: string | null
          due_date: string | null
          id: string
          metadata: Json
          priority: Database["public"]["Enums"]["task_priority_enum"]
          status: Database["public"]["Enums"]["task_status_enum"]
          tags: string[] | null
          task_type: string
          title: string
          updated_at: string
          updated_by: string
          workspace_id: string
        }
        Insert: {
          assigned_to?: string | null
          attached_to_id?: string | null
          attached_to_type?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          metadata?: Json
          priority?: Database["public"]["Enums"]["task_priority_enum"]
          status?: Database["public"]["Enums"]["task_status_enum"]
          tags?: string[] | null
          task_type?: string
          title: string
          updated_at?: string
          updated_by: string
          workspace_id: string
        }
        Update: {
          assigned_to?: string | null
          attached_to_id?: string | null
          attached_to_type?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          metadata?: Json
          priority?: Database["public"]["Enums"]["task_priority_enum"]
          status?: Database["public"]["Enums"]["task_status_enum"]
          tags?: string[] | null
          task_type?: string
          title?: string
          updated_at?: string
          updated_by?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_links: {
        Row: {
          allocation_percentage: number
          created_at: string
          created_by: string
          feed_transaction_id: string
          id: string
          ledger_entry_id: string
          notes: string | null
          workspace_id: string
        }
        Insert: {
          allocation_percentage?: number
          created_at?: string
          created_by: string
          feed_transaction_id: string
          id?: string
          ledger_entry_id: string
          notes?: string | null
          workspace_id: string
        }
        Update: {
          allocation_percentage?: number
          created_at?: string
          created_by?: string
          feed_transaction_id?: string
          id?: string
          ledger_entry_id?: string
          notes?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_links_feed_transaction_id_fkey"
            columns: ["feed_transaction_id"]
            isOneToOne: false
            referencedRelation: "feed_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_links_feed_transaction_id_fkey"
            columns: ["feed_transaction_id"]
            isOneToOne: false
            referencedRelation: "plaid_data_completeness"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_links_ledger_entry_id_fkey"
            columns: ["ledger_entry_id"]
            isOneToOne: false
            referencedRelation: "ledger_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_links_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          auth_user_id: string
          avatar_url: string | null
          created_at: string
          default_workspace_id: string | null
          email: string
          full_name: string | null
          id: string
          locale: string
          timezone: string
          updated_at: string
        }
        Insert: {
          auth_user_id: string
          avatar_url?: string | null
          created_at?: string
          default_workspace_id?: string | null
          email: string
          full_name?: string | null
          id?: string
          locale?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          auth_user_id?: string
          avatar_url?: string | null
          created_at?: string
          default_workspace_id?: string | null
          email?: string
          full_name?: string | null
          id?: string
          locale?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_default_workspace_id_fkey"
            columns: ["default_workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          institution_id: string | null
          item_id: string | null
          payload: Json
          processed_at: string | null
          received_at: string | null
          retry_count: number | null
          status: string | null
          updated_at: string | null
          webhook_code: string
          webhook_type: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          institution_id?: string | null
          item_id?: string | null
          payload: Json
          processed_at?: string | null
          received_at?: string | null
          retry_count?: number | null
          status?: string | null
          updated_at?: string | null
          webhook_code: string
          webhook_type: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          institution_id?: string | null
          item_id?: string | null
          payload?: Json
          processed_at?: string | null
          received_at?: string | null
          retry_count?: number | null
          status?: string | null
          updated_at?: string | null
          webhook_code?: string
          webhook_type?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_events_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_processing_log: {
        Row: {
          action: string
          completed_at: string | null
          created_at: string | null
          details: Json | null
          error_message: string | null
          id: string
          started_at: string | null
          status: string
          webhook_event_id: string | null
        }
        Insert: {
          action: string
          completed_at?: string | null
          created_at?: string | null
          details?: Json | null
          error_message?: string | null
          id?: string
          started_at?: string | null
          status: string
          webhook_event_id?: string | null
        }
        Update: {
          action?: string
          completed_at?: string | null
          created_at?: string | null
          details?: Json | null
          error_message?: string | null
          id?: string
          started_at?: string | null
          status?: string
          webhook_event_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_processing_log_webhook_event_id_fkey"
            columns: ["webhook_event_id"]
            isOneToOne: false
            referencedRelation: "webhook_events"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          accepted_at: string | null
          created_at: string
          deleted_at: string | null
          id: string
          invited_at: string
          invited_by: string | null
          permissions: Json
          role: Database["public"]["Enums"]["member_role_enum"]
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          invited_at?: string
          invited_by?: string | null
          permissions?: Json
          role?: Database["public"]["Enums"]["member_role_enum"]
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          invited_at?: string
          invited_by?: string | null
          permissions?: Json
          role?: Database["public"]["Enums"]["member_role_enum"]
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          business_address: Json | null
          business_ein: string | null
          created_at: string
          created_by: string
          default_currency: string
          deleted_at: string | null
          description: string | null
          fiscal_year_start: string
          id: string
          name: string
          onboarding_completed: boolean | null
          owner_id: string
          settings: Json
          updated_at: string
          updated_by: string
          workspace_type: Database["public"]["Enums"]["workspace_type_enum"]
        }
        Insert: {
          business_address?: Json | null
          business_ein?: string | null
          created_at?: string
          created_by: string
          default_currency?: string
          deleted_at?: string | null
          description?: string | null
          fiscal_year_start?: string
          id?: string
          name: string
          onboarding_completed?: boolean | null
          owner_id: string
          settings?: Json
          updated_at?: string
          updated_by: string
          workspace_type?: Database["public"]["Enums"]["workspace_type_enum"]
        }
        Update: {
          business_address?: Json | null
          business_ein?: string | null
          created_at?: string
          created_by?: string
          default_currency?: string
          deleted_at?: string | null
          description?: string | null
          fiscal_year_start?: string
          id?: string
          name?: string
          onboarding_completed?: boolean | null
          owner_id?: string
          settings?: Json
          updated_at?: string
          updated_by?: string
          workspace_type?: Database["public"]["Enums"]["workspace_type_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspaces_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspaces_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      account_reconciliation_view: {
        Row: {
          bank_account_id: string | null
          bank_account_name: string | null
          bank_balance_cents: number | null
          difference_cents: number | null
          last_entry_date: string | null
          last_sync_at: string | null
          ledger_account_id: string | null
          ledger_account_name: string | null
          ledger_balance_cents: number | null
          reconciliation_status: string | null
          report_generated_at: string | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_account_id_fkey"
            columns: ["ledger_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      balance_sheet_view: {
        Row: {
          account_count: number | null
          as_of_date: string | null
          balance_check_cents: number | null
          current_assets_cents: number | null
          current_liabilities_cents: number | null
          fixed_assets_cents: number | null
          long_term_liabilities_cents: number | null
          report_generated_at: string | null
          total_assets_cents: number | null
          total_equity_cents: number | null
          total_liabilities_cents: number | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_actual_summaries: {
        Row: {
          actual_amount_cents: number | null
          budget_id: string | null
          budget_name: string | null
          budget_utilization_pct: number | null
          budgeted_amount_cents: number | null
          category_id: string | null
          category_name: string | null
          category_type: string | null
          is_over_budget: boolean | null
          last_updated_at: string | null
          line_name: string | null
          period_month: string | null
          transaction_count: number | null
          variance_cents: number | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_lines_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_flow_view: {
        Row: {
          financing_cash_flow_cents: number | null
          investing_cash_flow_cents: number | null
          net_cash_change_cents: number | null
          net_income_cents: number | null
          period_month: string | null
          period_year: number | null
          report_generated_at: string | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      csv_transactions_export: {
        Row: {
          Account: string | null
          Amount: number | null
          Category: string | null
          Date: string | null
          Description: string | null
          Merchant: string | null
          Reconciled:
            | Database["public"]["Enums"]["reconciliation_status_enum"]
            | null
          Status: Database["public"]["Enums"]["transaction_status_enum"] | null
        }
        Relationships: []
      }
      dashboard_summary: {
        Row: {
          categorization_rate: number | null
          categorized_count: number | null
          first_transaction_date: string | null
          inflow_count: number | null
          last_transaction_date: string | null
          outflow_count: number | null
          summary_generated_at: string | null
          top_categories: Json | null
          total_amount_cents: number | null
          total_inflow_cents: number | null
          total_outflow_cents: number | null
          total_transactions: number | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feed_transactions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      income_statement_view: {
        Row: {
          account_count: number | null
          class_id: string | null
          class_name: string | null
          net_income_cents: number | null
          period_month: string | null
          period_year: number | null
          project_id: string | null
          project_name: string | null
          report_date: string | null
          total_expenses_cents: number | null
          total_revenue_cents: number | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_analysis_view: {
        Row: {
          avg_amount_cents: number | null
          avg_confidence_score: number | null
          avg_transactions_per_month: number | null
          category_name: string | null
          first_transaction_date: string | null
          last_transaction_date: string | null
          merchant_display_name: string | null
          merchant_normalized: string | null
          months_active: number | null
          new_category_id: string | null
          total_amount_cents: number | null
          transaction_count: number | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feed_transactions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rule_applications_new_category_id_fkey"
            columns: ["new_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      periodic_ledger_summaries: {
        Row: {
          account_code: string | null
          account_id: string | null
          account_name: string | null
          account_subtype: string | null
          account_type:
            | Database["public"]["Enums"]["gaap_account_type_enum"]
            | null
          class_id: string | null
          class_name: string | null
          entry_count: number | null
          first_entry_date: string | null
          last_entry_date: string | null
          last_updated_at: string | null
          location_id: string | null
          location_name: string | null
          net_change_cents: number | null
          normal_balance:
            | Database["public"]["Enums"]["balance_type_enum"]
            | null
          period_month: string | null
          period_month_num: number | null
          period_year: number | null
          project_id: string | null
          project_name: string | null
          total_credits_cents: number | null
          total_debits_cents: number | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      plaid_data_completeness: {
        Row: {
          amount: number | null
          counterparty_name: string | null
          has_counterparty: string | null
          has_location_data: string | null
          has_merchant_logo: string | null
          has_payment_meta: string | null
          has_plaid_category: string | null
          id: string | null
          location: string | null
          merchant_logo_url: string | null
          merchant_name: string | null
          payment_method: string | null
          plaid_category: string | null
          transaction_date: string | null
          workspace_id: string | null
        }
        Insert: {
          amount?: never
          counterparty_name?: string | null
          has_counterparty?: never
          has_location_data?: never
          has_merchant_logo?: never
          has_payment_meta?: never
          has_plaid_category?: never
          id?: string | null
          location?: never
          merchant_logo_url?: string | null
          merchant_name?: string | null
          payment_method?: string | null
          plaid_category?: string | null
          transaction_date?: string | null
          workspace_id?: string | null
        }
        Update: {
          amount?: never
          counterparty_name?: string | null
          has_counterparty?: never
          has_location_data?: never
          has_merchant_logo?: never
          has_payment_meta?: never
          has_plaid_category?: never
          id?: string | null
          location?: never
          merchant_logo_url?: string | null
          merchant_name?: string | null
          payment_method?: string | null
          plaid_category?: string | null
          transaction_date?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feed_transactions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      plaid_data_summary: {
        Row: {
          category_completion_pct: number | null
          location_completion_pct: number | null
          logo_completion_pct: number | null
          total_transactions: number | null
          transactions_with_counterparties: number | null
          transactions_with_location: number | null
          transactions_with_logos: number | null
          transactions_with_plaid_categories: number | null
          workspace_name: string | null
        }
        Relationships: []
      }
      qbo_chart_of_accounts_export: {
        Row: {
          Account: string | null
          "Account Name": string | null
          "Account Type": string | null
          Description: string | null
          "Detail Type": string | null
          Status: string | null
        }
        Insert: {
          Account?: string | null
          "Account Name"?: string | null
          "Account Type"?: never
          Description?: string | null
          "Detail Type"?: string | null
          Status?: never
        }
        Update: {
          Account?: string | null
          "Account Name"?: string | null
          "Account Type"?: never
          Description?: string | null
          "Detail Type"?: string | null
          Status?: never
        }
        Relationships: []
      }
      qbo_journal_entries_export: {
        Row: {
          Account: string | null
          Class: string | null
          Credit: number | null
          "Customer:Job": string | null
          Debit: number | null
          Description: string | null
          "Journal Date": string | null
          "Journal No.": string | null
          Line: number | null
          Memo: string | null
        }
        Relationships: []
      }
      transaction_categorization_summary: {
        Row: {
          avg_confidence_score: number | null
          categorization_rate_pct: number | null
          categorized_amount_cents: number | null
          categorized_transactions: number | null
          matched_count: number | null
          period_month: string | null
          reviewed_count: number | null
          total_amount_cents: number | null
          total_transactions: number | null
          uncategorized_amount_cents: number | null
          uncategorized_transactions: number | null
          unreconciled_count: number | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feed_transactions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      calculate_budget_health: {
        Args: { p_budget_id: string; p_workspace_id: string }
        Returns: {
          categories_over_budget: number
          categories_warning: number
          health_score: number
          overall_status: string
          total_budgeted_cents: number
          total_remaining_cents: number
          total_spent_cents: number
          utilization_percentage: number
        }[]
      }
      calculate_budget_performance: {
        Args: { p_budget_id: string; p_workspace_id: string }
        Returns: {
          budgeted_cents: number
          category_name: string
          line_id: string
          percentage_used: number
          remaining_cents: number
          spent_cents: number
          status: string
        }[]
      }
      calculate_category_spending: {
        Args: {
          p_end_date: string
          p_start_date: string
          p_workspace_id: string
        }
        Returns: {
          category_id: string
          total_cents: number
        }[]
      }
      complete_sync_job: {
        Args: {
          institution_id: string
          job_id: string
          results: Json
          user_id: string
          workspace_id: string
        }
        Returns: boolean
      }
      create_sync_job: {
        Args: {
          institution_id: string
          job_type: string
          user_id: string
          workspace_id: string
        }
        Returns: string
      }
      current_user_profile_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      detect_recurring_transactions: {
        Args: { p_analysis_months?: number; p_workspace_id: string }
        Returns: {
          amount_cents_max: number
          amount_cents_min: number
          confidence_score: number
          frequency_type: string
          last_transaction_date: string
          merchant_pattern: string
          transaction_count: number
        }[]
      }
      encrypt_general_data: {
        Args: { data: string }
        Returns: string
      }
      encrypt_plaid_token: {
        Args: { token: string }
        Returns: string
      }
      generate_budget_alerts: {
        Args: { p_budget_id: string; p_workspace_id: string }
        Returns: {
          alert_type: string
          amount_over_cents: number
          category_name: string
          message: string
          percentage_used: number
          suggested_action: string
        }[]
      }
      get_bank_accounts_for_institution: {
        Args: { p_institution_id: string }
        Returns: Json
      }
      get_budget_vs_actual: {
        Args: {
          category_filter?: string
          target_period: string
          target_workspace_id: string
        }
        Returns: {
          actual_cents: number
          budgeted_cents: number
          category_name: string
          is_over_budget: boolean
          transaction_count: number
          utilization_pct: number
          variance_cents: number
        }[]
      }
      get_income_statement: {
        Args: {
          end_date: string
          start_date: string
          target_class_id?: string
          target_project_id?: string
          target_workspace_id: string
        }
        Returns: {
          account_code: string
          account_name: string
          account_type: string
          net_amount_cents: number
          period_count: number
        }[]
      }
      get_institution_bank_accounts: {
        Args: { p_institution_id: string }
        Returns: Json
      }
      get_institutions_for_sync: {
        Args: { p_workspace_id: string }
        Returns: Json
      }
      get_upcoming_bills: {
        Args: { p_days_ahead?: number; p_workspace_id: string }
        Returns: {
          category_name: string
          confidence_score: number
          estimated_amount_cents: number
          merchant_pattern: string
          next_expected_date: string
        }[]
      }
      get_user_default_workspace: {
        Args: { user_auth_id: string }
        Returns: {
          default_currency: string
          workspace_id: string
          workspace_name: string
          workspace_type: Database["public"]["Enums"]["workspace_type_enum"]
        }[]
      }
      get_user_profile_id: {
        Args: { user_auth_id: string }
        Returns: string
      }
      get_user_workspace_ids: {
        Args: { user_auth_id: string }
        Returns: string[]
      }
      has_workspace_write_access: {
        Args: { workspace_uuid: string }
        Returns: boolean
      }
      import_plaid_institution_data: {
        Args: { institution_id: string; plaid_institution_data: Json }
        Returns: boolean
      }
      import_plaid_transactions: {
        Args: {
          import_job_id?: string
          plaid_item_id: string
          target_workspace_id: string
          transactions_data: Json
        }
        Returns: {
          created_count: number
          error_count: number
          skipped_count: number
          updated_count: number
        }[]
      }
      import_plaid_transactions_enhanced: {
        Args: {
          import_job_id: string
          plaid_item_id: string
          target_workspace_id: string
          transactions_data: Json
        }
        Returns: {
          created_count: number
          error_count: number
          skipped_count: number
          updated_count: number
        }[]
      }
      is_workspace_member: {
        Args: { required_role?: string; workspace_uuid: string }
        Returns: boolean
      }
      process_plaid_webhook: {
        Args: {
          item_id: string
          payload: Json
          webhook_code: string
          webhook_type: string
        }
        Returns: boolean
      }
      refresh_financial_reports: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      refresh_workspace_reports: {
        Args: { target_workspace_id: string }
        Returns: undefined
      }
      setup_user_profile: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      store_plaid_accounts: {
        Args: {
          accounts_data: Json
          institution_id: string
          user_id: string
          workspace_id: string
        }
        Returns: number
      }
      store_plaid_institution: {
        Args: {
          access_token: string
          institution_name: string
          plaid_institution_id: string
          plaid_item_id: string
          user_id: string
          workspace_id: string
        }
        Returns: string
      }
      sync_workspace_transactions: {
        Args: { p_user_id: string; p_workspace_id: string }
        Returns: Json
      }
      test_table_visibility: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      update_bank_account_balance: {
        Args: {
          p_available_balance_cents: number
          p_current_balance_cents: number
          p_institution_id: string
          p_plaid_account_id: string
        }
        Returns: Json
      }
      update_budget_line_spending: {
        Args: { p_budget_id: string; p_workspace_id: string }
        Returns: undefined
      }
      update_institution_sync: {
        Args: { p_institution_id: string }
        Returns: Json
      }
      update_institution_sync_time: {
        Args: { p_institution_id: string }
        Returns: Json
      }
      upsert_bank_account: {
        Args: {
          p_account_subtype_detailed: string
          p_account_type: string
          p_available_balance_cents: number
          p_currency_code: string
          p_current_balance_cents: number
          p_institution_id: string
          p_mask: string
          p_name: string
          p_plaid_account_id: string
          p_user_id: string
          p_workspace_id: string
        }
        Returns: Json
      }
      upsert_feed_transaction: {
        Args: {
          p_amount_cents: number
          p_authorized_date: string
          p_bank_account_id: string
          p_content_hash: string
          p_currency_code: string
          p_description: string
          p_direction: string
          p_merchant_name: string
          p_plaid_transaction_id: string
          p_provider_unique_id: string
          p_status: string
          p_transaction_date: string
          p_user_id: string
          p_workspace_id: string
        }
        Returns: Json
      }
      upsert_institution: {
        Args: {
          p_hex_color: string
          p_logo_url: string
          p_name: string
          p_plaid_access_token_encrypted: string
          p_plaid_institution_id: string
          p_plaid_item_id: string
          p_routing_numbers: string[]
          p_user_id: string
          p_website_url: string
          p_workspace_id: string
        }
        Returns: Json
      }
      upsert_transaction: {
        Args: {
          p_amount_cents: number
          p_authorized_date: string
          p_bank_account_id: string
          p_content_hash: string
          p_created_by: string
          p_currency_code: string
          p_description: string
          p_direction: string
          p_merchant_name: string
          p_plaid_transaction_id: string
          p_provider_unique_id: string
          p_status: string
          p_transaction_date: string
          p_workspace_id: string
        }
        Returns: Json
      }
      upsert_transaction_enriched: {
        Args: {
          p_amount_cents: number
          p_authorized_date?: string
          p_bank_account_id: string
          p_category_detailed?: string
          p_category_primary?: string
          p_content_hash: string
          p_created_by: string
          p_currency_code: string
          p_description: string
          p_direction: string
          p_location_address?: string
          p_location_city?: string
          p_location_country?: string
          p_location_lat?: number
          p_location_lon?: number
          p_location_postal_code?: string
          p_location_region?: string
          p_location_store_number?: string
          p_merchant_entity_id?: string
          p_merchant_logo_url?: string
          p_merchant_name?: string
          p_merchant_website?: string
          p_payment_method?: string
          p_payment_processor?: string
          p_payment_reference_number?: string
          p_personal_finance_category_confidence?: number
          p_personal_finance_category_detailed?: string
          p_personal_finance_category_primary?: string
          p_plaid_transaction_id: string
          p_provider_unique_id: string
          p_status: string
          p_transaction_code?: string
          p_transaction_date: string
          p_workspace_id: string
        }
        Returns: Json
      }
      user_has_workspace_access: {
        Args: { user_auth_id: string; workspace_id: string }
        Returns: boolean
      }
    }
    Enums: {
      account_type_enum:
        | "checking"
        | "savings"
        | "credit_card"
        | "investment"
        | "loan"
        | "mortgage"
        | "other"
      balance_type_enum: "debit" | "credit"
      batch_status_enum: "draft" | "posted" | "reversed"
      batch_type_enum: "manual" | "import" | "system" | "reconciliation"
      direction_enum: "inflow" | "outflow"
      document_status_enum: "uploaded" | "processing" | "processed" | "failed"
      document_type_enum:
        | "receipt"
        | "invoice"
        | "statement"
        | "contract"
        | "other"
      entry_type_enum: "debit" | "credit"
      gaap_account_type_enum:
        | "asset"
        | "liability"
        | "equity"
        | "revenue"
        | "expense"
      institution_status_enum: "active" | "disconnected" | "error"
      member_role_enum: "owner" | "member" | "bookkeeper" | "viewer"
      period_type_enum: "monthly" | "quarterly" | "annually"
      reconciliation_status_enum: "unreconciled" | "matched" | "reviewed"
      rule_action_type_enum: "categorize" | "split" | "flag"
      rule_condition_type_enum:
        | "merchant_name"
        | "description"
        | "amount"
        | "account"
      task_priority_enum: "low" | "medium" | "high" | "urgent"
      task_status_enum: "pending" | "in_progress" | "completed" | "cancelled"
      transaction_status_enum: "pending" | "posted" | "cancelled"
      workspace_type_enum: "personal" | "business" | "family"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_type_enum: [
        "checking",
        "savings",
        "credit_card",
        "investment",
        "loan",
        "mortgage",
        "other",
      ],
      balance_type_enum: ["debit", "credit"],
      batch_status_enum: ["draft", "posted", "reversed"],
      batch_type_enum: ["manual", "import", "system", "reconciliation"],
      direction_enum: ["inflow", "outflow"],
      document_status_enum: ["uploaded", "processing", "processed", "failed"],
      document_type_enum: [
        "receipt",
        "invoice",
        "statement",
        "contract",
        "other",
      ],
      entry_type_enum: ["debit", "credit"],
      gaap_account_type_enum: [
        "asset",
        "liability",
        "equity",
        "revenue",
        "expense",
      ],
      institution_status_enum: ["active", "disconnected", "error"],
      member_role_enum: ["owner", "member", "bookkeeper", "viewer"],
      period_type_enum: ["monthly", "quarterly", "annually"],
      reconciliation_status_enum: ["unreconciled", "matched", "reviewed"],
      rule_action_type_enum: ["categorize", "split", "flag"],
      rule_condition_type_enum: [
        "merchant_name",
        "description",
        "amount",
        "account",
      ],
      task_priority_enum: ["low", "medium", "high", "urgent"],
      task_status_enum: ["pending", "in_progress", "completed", "cancelled"],
      transaction_status_enum: ["pending", "posted", "cancelled"],
      workspace_type_enum: ["personal", "business", "family"],
    },
  },
} as const
