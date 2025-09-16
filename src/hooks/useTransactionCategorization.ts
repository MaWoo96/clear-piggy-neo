import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useWorkspace } from './useWorkspace';

interface CategorizationResult {
  transaction_id: string;
  suggested_category_id: string;
  category_name: string;
  confidence_score: number;
  reasoning: string;
  matched_rules?: Array<{
    rule_id: string;
    rule_type: string;
    confidence_contribution: number;
  }>;
}

interface UseTransactionCategorizationReturn {
  categorizeTransaction: (transactionId: string, categoryId: string) => Promise<void>;
  bulkCategorizeTransactions: (transactionIds: string[], categoryId: string) => Promise<void>;
  runAICategorization: (transactionId: string) => Promise<CategorizationResult | null>;
  runBulkAICategorization: (transactionIds: string[]) => Promise<CategorizationResult[]>;
  loading: boolean;
  error: string | null;
}

export function useTransactionCategorization(): UseTransactionCategorizationReturn {
  const { workspace } = useWorkspace();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categorizeTransaction = useCallback(async (transactionId: string, categoryId: string) => {
    if (!workspace?.id) {
      setError('No workspace selected');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get original category for learning event
      const { data: originalTransaction } = await supabase
        .from('feed_transactions')
        .select('ai_category_primary')
        .eq('id', transactionId)
        .single();

      // Update transaction category
      const { error: updateError } = await supabase
        .from('feed_transactions')
        .update({
          ai_category_primary: categoryId,
          ai_category_confidence: 1.0, // User override = high confidence
          ai_category_reasoning: 'User manual categorization',
          category_override_reason: 'Manual user assignment',
          ai_categorized_at: new Date().toISOString()
        })
        .eq('id', transactionId);

      if (updateError) throw updateError;

      // Record learning event if this was a correction
      if (originalTransaction?.ai_category_primary && 
          originalTransaction.ai_category_primary !== categoryId) {
        await recordLearningEvent(
          transactionId,
          originalTransaction.ai_category_primary,
          categoryId,
          'User correction'
        );
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [workspace]);

  const bulkCategorizeTransactions = useCallback(async (transactionIds: string[], categoryId: string) => {
    if (!workspace?.id) {
      setError('No workspace selected');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Update all transactions
      const { error: updateError } = await supabase
        .from('feed_transactions')
        .update({
          ai_category_primary: categoryId,
          ai_category_confidence: 1.0,
          ai_category_reasoning: 'User bulk categorization',
          category_override_reason: 'Bulk user assignment',
          ai_categorized_at: new Date().toISOString()
        })
        .in('id', transactionIds);

      if (updateError) throw updateError;

      // Record bulk learning event
      const { data: profile } = await supabase
        .from('ai_workspace_profiles')
        .select('id')
        .eq('workspace_id', workspace.id)
        .maybeSingle();

      if (profile) {
        await supabase.from('ai_learning_events').insert({
          profile_id: profile.id,
          event_type: 'bulk_categorization',
          event_data: {
            transaction_count: transactionIds.length,
            category_id: categoryId,
            transaction_ids: transactionIds,
            timestamp: new Date().toISOString()
          },
          confidence_impact: 0.05 * transactionIds.length,
          user_initiated: true
        });
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [workspace]);

  const runAICategorization = useCallback(async (transactionId: string): Promise<CategorizationResult | null> => {
    if (!workspace?.id) {
      setError('No workspace selected');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: funcError } = await supabase.functions.invoke('enhanced-transaction-categorizer', {
        body: {
          workspace_id: workspace.id,
          transaction_id: transactionId,
          options: {
            force_recategorize: true,
            use_ai_fallback: true,
            create_rules: true
          }
        }
      });

      if (funcError) throw funcError;

      if (data?.success && data.results?.length > 0) {
        return data.results[0];
      }

      throw new Error(data?.error || 'AI categorization failed');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('AI categorization error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [workspace]);

  const runBulkAICategorization = useCallback(async (transactionIds: string[]): Promise<CategorizationResult[]> => {
    if (!workspace?.id || transactionIds.length === 0) {
      setError('No workspace selected or no transactions provided');
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      // Get transaction details
      const { data: transactions, error: fetchError } = await supabase
        .from('feed_transactions')
        .select('*')
        .in('id', transactionIds);

      if (fetchError) throw fetchError;
      if (!transactions) throw new Error('Transactions not found');

      const { data, error: funcError } = await supabase.functions.invoke('enhanced-transaction-categorizer', {
        body: {
          workspace_id: workspace.id,
          transactions: transactions.map((t: any) => ({
            id: t.id,
            merchant_name: t.merchant_name || t.counterparty_name || t.description || 'Unknown',
            amount_cents: t.amount_cents,
            transaction_date: t.transaction_date,
            personal_finance_category_primary: t.personal_finance_category_primary,
            personal_finance_category_detailed: t.personal_finance_category_detailed,
            description: t.description
          })),
          options: {
            force_recategorize: true,
            use_ai_fallback: true,
            create_rules: true
          }
        }
      });

      if (funcError) throw funcError;

      if (data?.success && data.results) {
        return data.results;
      }

      throw new Error(data?.error || 'Bulk AI categorization failed');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Bulk AI categorization error:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [workspace]);

  const recordLearningEvent = async (
    transactionId: string,
    originalCategoryId: string,
    correctedCategoryId: string,
    reason: string
  ) => {
    try {
      // Get or create AI profile
      const { data: profile } = await supabase
        .from('ai_workspace_profiles')
        .select('id')
        .eq('workspace_id', workspace?.id)
        .maybeSingle();

      let profileId = profile?.id;

      if (!profileId && workspace) {
        // Create profile if it doesn't exist
        const { data: newProfile } = await supabase
          .from('ai_workspace_profiles')
          .insert({ 
            workspace_id: workspace.id,
            created_by: workspace.owner_id
          })
          .select('id')
          .single();
        
        profileId = newProfile?.id;
      }

      if (profileId) {
        await supabase.from('ai_learning_events').insert({
          profile_id: profileId,
          transaction_id: transactionId,
          event_type: 'category_correction',
          event_data: {
            original_category_id: originalCategoryId,
            corrected_category_id: correctedCategoryId,
            reason: reason,
            timestamp: new Date().toISOString()
          },
          confidence_impact: 0.1,
          user_initiated: true
        });
      }
    } catch (error) {
      console.error('Error recording learning event:', error);
    }
  };

  return {
    categorizeTransaction,
    bulkCategorizeTransactions,
    runAICategorization,
    runBulkAICategorization,
    loading,
    error
  };
}