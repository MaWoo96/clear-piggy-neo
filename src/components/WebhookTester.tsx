import React, { useState, useEffect } from 'react';
import { Send, Loader2, CheckCircle, XCircle, RefreshCw, CheckSquare, Square } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Transaction {
  id: string;
  merchant_name: string | null;
  amount_cents: number;
  transaction_date: string;
  description: string | null;
  direction: 'inflow' | 'outflow';
  ai_category_primary?: string | null;
  user_category_primary?: string | null;
  // Plaid enrichment fields
  personal_finance_category_primary?: string | null;
  personal_finance_category_detailed?: string | null;
  personal_finance_category_confidence?: number | null;
  plaid_enriched?: boolean | null;
  payment_method?: string | null;
  location_city?: string | null;
  location_region?: string | null;
  merchant_logo_url?: string | null;
  merchant_website?: string | null;
}

export const WebhookTester: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [workspaceId, setWorkspaceId] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('https://primary-ijlh-production.up.railway.app/webhook/categorize-transactions');
  const [realTransactions, setRealTransactions] = useState<Transaction[]>([]);
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);

  // Load workspace and transactions on mount
  useEffect(() => {
    loadWorkspaceAndTransactions();
  }, []);

  const loadWorkspaceAndTransactions = async () => {
    setLoadingTransactions(true);
    try {
      // Get workspace
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('id')
        .limit(1)
        .single();
      
      if (workspace) {
        setWorkspaceId((workspace as any).id);
      }

      // Get recent transactions with Plaid enrichment data
      const { data: transactions } = await supabase
        .from('feed_transactions')
        .select(`
          id,
          merchant_name,
          amount_cents,
          transaction_date,
          description,
          direction,
          ai_category_primary,
          user_category_primary,
          personal_finance_category_primary,
          personal_finance_category_detailed,
          personal_finance_category_confidence,
          plaid_enriched,
          payment_method,
          location_city,
          location_region,
          merchant_logo_url,
          merchant_website
        `)
        .order('transaction_date', { ascending: false })
        .limit(50);

      if (transactions) {
        console.log('Loaded transactions:', transactions.slice(0, 5).map((t: Transaction) => ({
          merchant: t.merchant_name,
          ai_category: t.ai_category_primary,
          user_category: t.user_category_primary
        })));
        setRealTransactions(transactions);
        // Auto-select first 10
        setSelectedTransactions(transactions.slice(0, 10).map((t: Transaction) => t.id));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const toggleTransaction = (id: string) => {
    setSelectedTransactions(prev => 
      prev.includes(id) 
        ? prev.filter(tid => tid !== id)
        : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedTransactions(realTransactions.map((t: Transaction) => t.id));
  };

  const selectNone = () => {
    setSelectedTransactions([]);
  };

  const selectFirst10 = () => {
    setSelectedTransactions(realTransactions.slice(0, 10).map((t: Transaction) => t.id));
  };

  const sendTestTransactions = async () => {
    if (selectedTransactions.length === 0) {
      setResult({
        success: false,
        message: 'Please select at least one transaction'
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // Get selected transaction data with Plaid enrichment
      const transactionsToSend = realTransactions
        .filter(t => selectedTransactions.includes(t.id))
        .map(t => ({
          id: t.id,
          merchant_name: t.merchant_name || 'Unknown',
          amount_cents: t.amount_cents,
          transaction_date: t.transaction_date,
          description: t.description || '',
          direction: t.direction,
          // Include Plaid enrichment data
          personal_finance_category_primary: t.personal_finance_category_primary,
          personal_finance_category_detailed: t.personal_finance_category_detailed,
          personal_finance_category_confidence: t.personal_finance_category_confidence,
          plaid_enriched: t.plaid_enriched,
          payment_method: t.payment_method,
          location_city: t.location_city,
          location_region: t.location_region,
          merchant_logo_url: t.merchant_logo_url,
          merchant_website: t.merchant_website
        }));

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspace_id: workspaceId,
          transactions: transactionsToSend
        })
      });

      const responseText = await response.text();
      
      if (response.ok) {
        console.log('Webhook response:', responseText);
        setResult({
          success: true,
          message: `Successfully sent ${transactionsToSend.length} transactions. Response: ${responseText}`
        });
        // Reload transactions after successful send
        setTimeout(() => {
          loadWorkspaceAndTransactions();
        }, 2000);
      } else {
        setResult({
          success: false,
          message: `Failed with status ${response.status}: ${responseText}`
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
        Webhook Transaction Tester (Recent Transactions)
      </h2>
      
      <div className="space-y-4">
        {/* Webhook URL Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Webhook URL
          </label>
          <input
            type="text"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter webhook URL"
          />
        </div>

        {/* Workspace ID Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Workspace ID
          </label>
          <input
            type="text"
            value={workspaceId}
            onChange={(e) => setWorkspaceId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter workspace ID"
          />
        </div>

        {/* Transaction Selection */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Select Recent Transactions ({selectedTransactions.length} selected)
            </label>
            <div className="flex gap-2">
              <button
                onClick={selectFirst10}
                className="text-xs px-2 py-1 text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                First 10
              </button>
              <button
                onClick={selectAll}
                className="text-xs px-2 py-1 text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                All
              </button>
              <button
                onClick={selectNone}
                className="text-xs px-2 py-1 text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                None
              </button>
              <button
                onClick={loadWorkspaceAndTransactions}
                disabled={loadingTransactions}
                className="text-xs px-2 py-1 text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                <RefreshCw className={`h-3 w-3 ${loadingTransactions ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
          
          {loadingTransactions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="max-h-60 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-gray-50 dark:bg-gray-900">
              {realTransactions.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  No transactions found
                </p>
              ) : (
                <div className="space-y-1">
                  {realTransactions.map((tx) => (
                    <label
                      key={tx.id}
                      className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer"
                    >
                      <button
                        type="button"
                        onClick={() => toggleTransaction(tx.id)}
                        className="flex-shrink-0"
                      >
                        {selectedTransactions.includes(tx.id) ? (
                          <CheckSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        ) : (
                          <Square className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                      <div className="flex-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {tx.merchant_name || 'Unknown'}
                          </span>
                          <span className={tx.direction === 'outflow' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
                            {tx.direction === 'outflow' ? '-' : '+'}${Math.abs(tx.amount_cents / 100).toFixed(2)}
                          </span>
                        </div>
                        <div className="text-gray-500 dark:text-gray-400">
                          {tx.transaction_date} • {tx.id.slice(0, 8)}...
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Send Button */}
        <button
          onClick={sendTestTransactions}
          disabled={loading || !workspaceId || !webhookUrl || selectedTransactions.length === 0}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Send {selectedTransactions.length} Transaction{selectedTransactions.length !== 1 ? 's' : ''} to Webhook
            </>
          )}
        </button>

        {/* Result Display */}
        {result && (
          <div
            className={`p-4 rounded-lg flex items-start gap-3 ${
              result.success
                ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300'
            }`}
          >
            {result.success ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            )}
            <div className="text-sm">
              <p className="font-medium">{result.success ? 'Success!' : 'Failed'}</p>
              <p className="mt-1 opacity-90">{result.message}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WebhookTester;