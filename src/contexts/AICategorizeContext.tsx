import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useWorkspace } from '../hooks/useWorkspace';

interface RecentCategorization {
  id: string;
  merchantName: string;
  category: string;
  confidence: number;
  timestamp: Date;
}

interface AICategorizeState {
  isProcessing: boolean;
  total: number;
  processed: number;
  currentTransaction: string | null;
  recentlyCategorized: RecentCategorization[];
  errors: Array<{ id: string; message: string }>;
  startTime: Date | null;
  estimatedTimeRemaining: number | null;
  mode: 'uncategorized' | 'recategorize' | 'all' | null;
}

interface AICategorizeContextType extends AICategorizeState {
  startCategorization: (mode: 'uncategorized' | 'recategorize' | 'all', transactionIds?: string[]) => Promise<void>;
  pauseCategorization: () => void;
  resumeCategorization: () => void;
  clearProgress: () => void;
  isPaused: boolean;
}

const AICategorizeContext = createContext<AICategorizeContextType | undefined>(undefined);

export const useAICategorize = () => {
  const context = useContext(AICategorizeContext);
  if (!context) {
    throw new Error('useAICategorize must be used within AICategorizeProvider');
  }
  return context;
};

export const AICategorizeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { workspace } = useWorkspace();
  const [state, setState] = useState<AICategorizeState>({
    isProcessing: false,
    total: 0,
    processed: 0,
    currentTransaction: null,
    recentlyCategorized: [],
    errors: [],
    startTime: null,
    estimatedTimeRemaining: null,
    mode: null,
  });
  const [isPaused, setIsPaused] = useState(false);
  const [transactionQueue, setTransactionQueue] = useState<string[]>([]);
  const [channel, setChannel] = useState<any>(null);

  // Calculate estimated time remaining
  useEffect(() => {
    if (state.isProcessing && state.processed > 0 && state.startTime) {
      const elapsed = Date.now() - state.startTime.getTime();
      const avgTimePerTransaction = elapsed / state.processed;
      const remaining = state.total - state.processed;
      const estimate = Math.round((avgTimePerTransaction * remaining) / 1000); // in seconds
      
      setState(prev => ({ ...prev, estimatedTimeRemaining: estimate }));
    }
  }, [state.processed, state.total, state.startTime, state.isProcessing]);

  // Set up Supabase realtime subscription
  useEffect(() => {
    if (!workspace?.id || !state.isProcessing) return;

    const subscription = supabase
      .channel(`ai-categorization-${workspace.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'feed_transactions',
          filter: `workspace_id=eq.${workspace.id}`,
        },
        (payload: any) => {
          // Check if this update is a new categorization
          if (
            payload.new.ai_category_primary && 
            !payload.old.ai_category_primary &&
            transactionQueue.includes(payload.new.id)
          ) {
            handleTransactionCategorized(payload.new);
          }
        }
      )
      .subscribe();

    setChannel(subscription);

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [workspace?.id, state.isProcessing, transactionQueue]);

  const handleTransactionCategorized = useCallback((transaction: any) => {
    setState(prev => {
      const newRecent: RecentCategorization = {
        id: transaction.id,
        merchantName: transaction.merchant_name || 'Unknown',
        category: transaction.ai_category_primary,
        confidence: transaction.ai_category_confidence || 0,
        timestamp: new Date(),
      };

      // Keep only last 10 recent categorizations
      const recentList = [newRecent, ...prev.recentlyCategorized].slice(0, 10);

      return {
        ...prev,
        processed: prev.processed + 1,
        currentTransaction: transaction.merchant_name,
        recentlyCategorized: recentList,
      };
    });

    // Remove from queue
    setTransactionQueue(prev => prev.filter(id => id !== transaction.id));

    // Check if complete
    if (state.processed + 1 >= state.total) {
      handleCategorizationComplete();
    }
  }, [state.processed, state.total]);

  const handleCategorizationComplete = useCallback(() => {
    setState(prev => ({
      ...prev,
      isProcessing: false,
      currentTransaction: null,
    }));
    
    // Show success notification
    const successRate = ((state.processed / state.total) * 100).toFixed(0);
    console.log(`🎉 Categorization complete! ${state.processed}/${state.total} (${successRate}%)`);
  }, [state.processed, state.total]);

  const startCategorization = async (
    mode: 'uncategorized' | 'recategorize' | 'all',
    transactionIds?: string[]
  ) => {
    if (!workspace?.id) return;

    try {
      let transactions: any[] = [];
      
      // Fetch transactions based on mode
      if (transactionIds && transactionIds.length > 0) {
        // Specific transactions provided
        const { data } = await supabase
          .from('feed_transactions')
          .select('*')
          .in('id', transactionIds);
        transactions = data || [];
      } else {
        // Fetch based on mode
        let query = supabase
          .from('feed_transactions')
          .select('*')
          .eq('workspace_id', workspace.id)
          .eq('direction', 'outflow')
          .order('transaction_date', { ascending: false });

        if (mode === 'uncategorized') {
          query = query.is('ai_category_primary', null).is('user_category_primary', null);
        } else if (mode === 'recategorize') {
          query = query.is('user_category_primary', null).not('ai_category_primary', 'is', null);
        }
        // mode === 'all' gets everything

        const { data } = await query.limit(500); // Process max 500 at a time
        transactions = data || [];
      }

      if (transactions.length === 0) {
        console.log('No transactions to categorize');
        return;
      }

      // Initialize state
      setState({
        isProcessing: true,
        total: transactions.length,
        processed: 0,
        currentTransaction: null,
        recentlyCategorized: [],
        errors: [],
        startTime: new Date(),
        estimatedTimeRemaining: null,
        mode,
      });

      setTransactionQueue(transactions.map(t => t.id));
      setIsPaused(false);

      // Send to webhook for categorization
      const batchSize = 10;
      for (let i = 0; i < transactions.length; i += batchSize) {
        if (isPaused) {
          await new Promise(resolve => {
            const checkPause = setInterval(() => {
              if (!isPaused) {
                clearInterval(checkPause);
                resolve(true);
              }
            }, 100);
          });
        }

        const batch = transactions.slice(i, i + batchSize);
        
        try {
          const response = await fetch('https://primary-ijlh-production.up.railway.app/webhook/categorize-transactions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              workspace_id: workspace.id,
              transactions: batch.map(tx => ({
                id: tx.id,
                merchant_name: tx.merchant_name || 'Unknown',
                amount_cents: tx.amount_cents,
                transaction_date: tx.transaction_date,
                description: tx.description || '',
                direction: tx.direction,
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

          if (!response.ok) {
            console.error('Batch failed:', response.status);
            setState(prev => ({
              ...prev,
              errors: [...prev.errors, ...batch.map(t => ({ 
                id: t.id, 
                message: `Failed: ${response.status}` 
              }))]
            }));
          }
        } catch (error) {
          console.error('Error sending batch:', error);
          setState(prev => ({
            ...prev,
            errors: [...prev.errors, ...batch.map(t => ({ 
              id: t.id, 
              message: 'Network error' 
            }))]
          }));
        }

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error('Failed to start categorization:', error);
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const pauseCategorization = () => {
    setIsPaused(true);
  };

  const resumeCategorization = () => {
    setIsPaused(false);
  };

  const clearProgress = () => {
    setState({
      isProcessing: false,
      total: 0,
      processed: 0,
      currentTransaction: null,
      recentlyCategorized: [],
      errors: [],
      startTime: null,
      estimatedTimeRemaining: null,
      mode: null,
    });
    setTransactionQueue([]);
    setIsPaused(false);
  };

  return (
    <AICategorizeContext.Provider
      value={{
        ...state,
        isPaused,
        startCategorization,
        pauseCategorization,
        resumeCategorization,
        clearProgress,
      }}
    >
      {children}
    </AICategorizeContext.Provider>
  );
};