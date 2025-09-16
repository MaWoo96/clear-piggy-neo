import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useWorkspace } from './useWorkspace';
import { EnhancedTransaction, CategorizationResult } from '../types/enhanced-categorization.types';

interface UseEnhancedCategorizationReturn {
  categorizeTransaction: (transactionId: string) => Promise<CategorizationResult | null>;
  categorizeBatch: (transactions: Partial<EnhancedTransaction>[]) => Promise<CategorizationResult[]>;
  recordCorrection: (transactionId: string, originalCategoryId: string | null, correctedCategoryId: string, reason: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export function useEnhancedCategorization(): UseEnhancedCategorizationReturn {
  const { workspace } = useWorkspace();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categorizeTransaction = useCallback(async (transactionId: string): Promise<CategorizationResult | null> => {
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
            use_ai_fallback: true,
            create_rules: true
          }
        }
      });

      if (funcError) throw funcError;

      if (data?.success && data.results?.length > 0) {
        return data.results[0];
      }

      throw new Error(data?.error || 'Categorization failed');
    } catch (err) {
      console.error('Categorization error:', err);
      setError(err instanceof Error ? err.message : 'Categorization failed');
      return null;
    } finally {
      setLoading(false);
    }
  }, [workspace]);

  const categorizeBatch = useCallback(async (transactions: Partial<EnhancedTransaction>[]): Promise<CategorizationResult[]> => {
    if (!workspace?.id) {
      setError('No workspace selected');
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const transactionData = transactions.map(tx => ({
        id: tx.id,
        merchant_name: tx.merchant_name || tx.description || 'Unknown',
        amount_cents: tx.amount_cents || 0,
        transaction_date: tx.transaction_date || new Date().toISOString(),
        personal_finance_category_primary: tx.personal_finance_category_primary,
        personal_finance_category_detailed: tx.personal_finance_category_detailed,
        description: tx.description
      }));

      const { data, error: funcError } = await supabase.functions.invoke('enhanced-transaction-categorizer', {
        body: {
          workspace_id: workspace.id,
          transactions: transactionData,
          options: {
            use_ai_fallback: true,
            create_rules: true
          }
        }
      });

      if (funcError) throw funcError;

      if (data?.success && data.results) {
        return data.results;
      }

      throw new Error(data?.error || 'Batch categorization failed');
    } catch (err) {
      console.error('Batch categorization error:', err);
      setError(err instanceof Error ? err.message : 'Batch categorization failed');
      return [];
    } finally {
      setLoading(false);
    }
  }, [workspace]);

  const recordCorrection = useCallback(async (
    transactionId: string,
    originalCategoryId: string | null,
    correctedCategoryId: string,
    reason: string
  ): Promise<void> => {
    if (!workspace?.id) {
      setError('No workspace selected');
      return;
    }

    try {
      // Get AI profile
      const { data: profile } = await supabase
        .from('ai_workspace_profiles')
        .select('id')
        .eq('workspace_id', workspace.id)
        .maybeSingle();

      let profileId = profile?.id;

      if (!profileId) {
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

      if (!profileId) {
        throw new Error('Could not create or find AI profile');
      }

      // Record learning event
      await supabase
        .from('ai_learning_events')
        .insert({
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

      // Update the transaction
      await supabase
        .from('feed_transactions')
        .update({
          ai_category_primary: correctedCategoryId,
          ai_category_confidence: 1.0, // User correction = 100% confidence
          ai_category_reasoning: `User correction: ${reason}`,
          category_override_reason: reason,
          ai_categorized_at: new Date().toISOString()
        })
        .eq('id', transactionId);

    } catch (err) {
      console.error('Error recording correction:', err);
      setError(err instanceof Error ? err.message : 'Failed to record correction');
    }
  }, [workspace]);

  return {
    categorizeTransaction,
    categorizeBatch,
    recordCorrection,
    loading,
    error
  };
}