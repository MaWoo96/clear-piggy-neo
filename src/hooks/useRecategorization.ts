import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export type RecategorizeMode = 'all' | 'ai_only' | 'uncategorized';

interface RecategorizeOptions {
  batchSize?: number;
  mode?: RecategorizeMode;
  force?: boolean;
}

interface RecategorizeResult {
  success: boolean;
  processed: number;
  recategorized: number;
  skipped: number;
  learned_patterns_used: number;
  ai_categorized: number;
  results: Array<{
    id: string;
    merchant: string;
    status: string;
    category?: string;
    confidence?: number;
    source?: string;
    reason?: string;
  }>;
}

export function useRecategorization() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
    status: string;
  }>({ current: 0, total: 0, status: '' });
  const [lastResult, setLastResult] = useState<RecategorizeResult | null>(null);

  const recategorizeTransactions = useCallback(async (
    workspaceId: string,
    options: RecategorizeOptions = {}
  ): Promise<RecategorizeResult> => {
    const {
      batchSize = 10,
      mode = 'ai_only',
      force = false
    } = options;

    setIsProcessing(true);
    setProgress({ current: 0, total: 0, status: 'Starting recategorization...' });

    try {
      // First, get total count of transactions to process
      let countQuery = supabase
        .from('feed_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId);

      // Apply mode filters to count
      if (mode === 'ai_only' && !force) {
        countQuery = countQuery
          .not('ai_category_primary', 'is', null)
          .is('user_category_primary', null);
      } else if (mode === 'uncategorized') {
        countQuery = countQuery
          .is('ai_category_primary', null)
          .is('user_category_primary', null);
      }

      const { count } = await countQuery;
      const totalTransactions = count || 0;
      
      if (totalTransactions === 0) {
        setProgress({ current: 0, total: 0, status: 'No transactions to recategorize' });
        setIsProcessing(false);
        return {
          success: true,
          processed: 0,
          recategorized: 0,
          skipped: 0,
          learned_patterns_used: 0,
          ai_categorized: 0,
          results: []
        };
      }

      setProgress({ 
        current: 0, 
        total: totalTransactions, 
        status: `Processing ${totalTransactions} transactions...` 
      });

      // Process in batches
      const allResults: RecategorizeResult['results'] = [];
      let processedCount = 0;
      let recategorizedCount = 0;
      let skippedCount = 0;
      let learnedPatternsCount = 0;
      let aiCategorizedCount = 0;

      const totalBatches = Math.ceil(totalTransactions / batchSize);
      
      for (let batch = 0; batch < totalBatches; batch++) {
        setProgress({
          current: batch * batchSize,
          total: totalTransactions,
          status: `Processing batch ${batch + 1} of ${totalBatches}...`
        });

        // Get transactions for this batch
        let batchQuery = supabase
          .from('feed_transactions')
          .select('*')
          .eq('workspace_id', workspaceId)
          .limit(batchSize)
          .order('transaction_date', { ascending: false });

        // Apply mode filters
        if (mode === 'ai_only' && !force) {
          batchQuery = batchQuery
            .not('ai_category_primary', 'is', null)
            .is('user_category_primary', null);
        } else if (mode === 'uncategorized') {
          batchQuery = batchQuery
            .is('ai_category_primary', null)
            .is('user_category_primary', null);
        }

        const { data: batchTransactions, error: fetchError } = await batchQuery;
        
        if (fetchError || !batchTransactions || batchTransactions.length === 0) {
          console.error('Batch fetch error:', fetchError);
          continue;
        }

        // Call the webhook for this batch
        const response = await fetch('https://primary-ijlh-production.up.railway.app/webhook/categorize-transactions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            workspace_id: workspaceId,
            transactions: batchTransactions.map((tx: any) => ({
              id: tx.id,
              merchant_name: tx.merchant_name || 'Unknown',
              amount_cents: tx.amount_cents,
              transaction_date: tx.transaction_date,
              description: tx.description || '',
              direction: tx.direction,
              // Include Plaid enrichment data
              personal_finance_category_primary: tx.personal_finance_category_primary,
              personal_finance_category_detailed: tx.personal_finance_category_detailed,
              personal_finance_category_confidence: tx.personal_finance_category_confidence,
              plaid_enriched: tx.plaid_enriched,
              payment_method: tx.payment_method,
              location_city: tx.location_city,
              location_region: tx.location_region,
              merchant_logo_url: tx.merchant_logo_url,
              merchant_website: tx.merchant_website
            }))
          })
        });

        let data;
        const responseText = await response.text();
        
        try {
          data = JSON.parse(responseText);
        } catch (e) {
          // If response is "allEntries", treat as success
          if (responseText === 'allEntries') {
            data = { success: true };
          } else {
            console.error('Invalid response:', responseText);
            continue;
          }
        }

        if (!response.ok) {
          console.error('Batch processing error:', response.status, data);
          continue;
        }

        if (data || responseText === 'allEntries') {
          processedCount += batchTransactions.length;
          recategorizedCount += batchTransactions.length;
          aiCategorizedCount += batchTransactions.length;
          
          if (data?.results) {
            allResults.push(...data.results);
          }
        }

        // Small delay between batches to avoid overwhelming the system
        if (batch < totalBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      const finalResult: RecategorizeResult = {
        success: true,
        processed: processedCount,
        recategorized: recategorizedCount,
        skipped: skippedCount,
        learned_patterns_used: learnedPatternsCount,
        ai_categorized: aiCategorizedCount,
        results: allResults
      };

      setLastResult(finalResult);
      setProgress({
        current: totalTransactions,
        total: totalTransactions,
        status: `Complete! Recategorized ${recategorizedCount} of ${processedCount} transactions.`
      });

      return finalResult;

    } catch (error) {
      console.error('Recategorization error:', error);
      setProgress({
        current: 0,
        total: 0,
        status: 'Error during recategorization'
      });
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const recategorizeSingleTransaction = useCallback(async (
    transactionId: string,
    workspaceId: string
  ) => {
    setIsProcessing(true);
    
    try {
      // Get the transaction
      const { data: transaction, error } = await supabase
        .from('feed_transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (error || !transaction) {
        throw new Error('Transaction not found');
      }

      // Call webhook for just this transaction
      const response = await fetch('https://primary-ijlh-production.up.railway.app/webhook/categorize-transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspace_id: workspaceId,
          transactions: [{
            id: transaction.id,
            merchant_name: transaction.merchant_name || 'Unknown',
            amount_cents: transaction.amount_cents,
            transaction_date: transaction.transaction_date,
            description: transaction.description || '',
            direction: transaction.direction,
            // Include Plaid enrichment data
            personal_finance_category_primary: transaction.personal_finance_category_primary,
            personal_finance_category_detailed: transaction.personal_finance_category_detailed,
            personal_finance_category_confidence: transaction.personal_finance_category_confidence,
            plaid_enriched: transaction.plaid_enriched,
            payment_method: transaction.payment_method,
            location_city: transaction.location_city,
            location_region: transaction.location_region,
            merchant_logo_url: transaction.merchant_logo_url,
            merchant_website: transaction.merchant_website
          }]
        })
      });

      let data;
      const responseText = await response.text();
      
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        // If response is "allEntries", treat as success
        if (responseText === 'allEntries') {
          data = { success: true, message: responseText };
        } else {
          throw new Error(`Invalid response: ${responseText}`);
        }
      }

      if (!response.ok) {
        throw new Error(`Webhook error: ${response.status}`);
      }

      return data;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const clearProgress = useCallback(() => {
    setProgress({ current: 0, total: 0, status: '' });
    setLastResult(null);
  }, []);

  return {
    recategorizeTransactions,
    recategorizeSingleTransaction,
    isProcessing,
    progress,
    lastResult,
    clearProgress
  };
}