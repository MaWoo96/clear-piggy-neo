import React, { useState, useEffect } from 'react';
import { Brain, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface RecategorizeButtonProps {
  workspaceId: string;
  onComplete?: () => void;
  dateRange?: string;
  uncategorizedTransactions?: number;
}

export const RecategorizeButton: React.FC<RecategorizeButtonProps> = ({
  workspaceId,
  onComplete,
  dateRange,
  uncategorizedTransactions
}) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState(dateRange || 'last_30');
  const [uncategorizedCount, setUncategorizedCount] = useState<number>(0);

  // Use prop value if provided, otherwise fetch from database
  useEffect(() => {
    if (uncategorizedTransactions !== undefined) {
      console.log('Using provided uncategorized count:', uncategorizedTransactions);
      setUncategorizedCount(uncategorizedTransactions);
      return;
    }

    const fetchUncategorizedCount = async () => {
      if (!workspaceId) return;

      // Get date range if provided
      const now = new Date();
      let startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      if (dateRange) {
        switch(dateRange) {
          case 'last_7':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'last_30':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case 'last_90':
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
        }
      }

      // Count transactions that don't have user categories (can have AI categories)
      let query = supabase
        .from('feed_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('direction', 'outflow')
        .is('user_category_primary', null);

      if (dateRange && dateRange !== 'all') {
        query = query.gte('transaction_date', startDate.toISOString().split('T')[0]);
      }

      const { count, error } = await query;

      if (error) {
        console.error('Error fetching uncategorized count:', error);
      }

      console.log(`Transactions available for AI categorization (${dateRange || 'last_30'}):`, count);
      setUncategorizedCount(count || 0);
    };

    fetchUncategorizedCount();

    // Set up subscription to changes
    const channel = supabase
      .channel('uncategorized-transactions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'feed_transactions',
          filter: `workspace_id=eq.${workspaceId}`
        },
        () => {
          fetchUncategorizedCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId, uncategorizedTransactions, dateRange]);

  const handleCategorizeAll = async () => {
    try {
      console.log(`🚀 Starting AI categorization for ${selectedDateRange} transactions`);
      console.log(`📅 Selected date range:`, selectedDateRange);

      // Close modal immediately
      setShowModal(false);

      // Calculate date filter based on range
      let startDate = null;
      const now = new Date();

      if (selectedDateRange !== 'all') {
        switch(selectedDateRange) {
          case 'last_7':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'last_30':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case 'last_90':
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
          default:
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }
      }

      console.log(`🔍 Fetching transactions from:`, startDate ? startDate.toISOString() : 'all time');

      // Build query for transactions to get
      // Remove the category null checks to allow re-categorization of all transactions
      let query = supabase
        .from('feed_transactions')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('direction', 'outflow')
        .order('transaction_date', { ascending: false })
        .limit(100); // Limit to 100 transactions at once

      if (startDate) {
        query = query.gte('transaction_date', startDate.toISOString().split('T')[0]);
      }

      console.log(`⏳ Executing query...`);
      const { data: transactions, error: fetchError } = await query;

      console.log(`📊 Query result:`, {
        transactionCount: transactions?.length || 0,
        hasError: !!fetchError,
        error: fetchError
      });

      if (fetchError) {
        console.error('❌ Error fetching transactions:', fetchError);
        return;
      }

      if (!transactions || transactions.length === 0) {
        console.log('❌ No transactions found for the selected date range');
        console.log(`🔍 Query details:`, {
          workspace_id: workspaceId,
          date_from: startDate ? startDate.toISOString() : 'all time',
          filters: 'direction=outflow'
        });
        onComplete?.();
        return;
      }

      console.log(`✅ Successfully fetched ${transactions.length} transactions`);

      console.log(`✅ Found ${transactions.length} transactions to send to n8n`);

      // Format transactions for n8n workflow
      console.log(`🔄 Formatting ${transactions.length} transactions for webhook...`);

      try {
        const formattedTransactions = transactions.map(tx => ({
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
        }));

        console.log(`✅ Successfully formatted ${formattedTransactions.length} transactions`);

        console.log(`📦 Prepared payload with ${formattedTransactions.length} transactions`);
        console.log(`🎯 Webhook URL: https://primary-ijlh-production.up.railway.app/webhook/categorize-transactions`);

        // Log transaction order and details
        console.log(`📅 Transaction ordering (latest to earliest):`);
        formattedTransactions.slice(0, 5).forEach((tx, index) => {
          console.log(`  ${index + 1}. ${tx.transaction_date} - ${tx.merchant_name} - $${(tx.amount_cents / 100).toFixed(2)}`);
        });
        if (formattedTransactions.length > 5) {
          console.log(`  ... and ${formattedTransactions.length - 5} more transactions`);
        }

        // Send to n8n workflow with transaction data
        const webhookUrl = 'https://primary-ijlh-production.up.railway.app/webhook/categorize-transactions';
        const payload = {
          workspace_id: workspaceId,
          transactions: formattedTransactions
        };

        console.log(`📤 Sending webhook request...`);
        console.log(`📊 Payload preview:`, {
          workspace_id: workspaceId,
          transaction_count: formattedTransactions.length,
          sample_transaction: formattedTransactions[0],
          date_range: `${formattedTransactions[formattedTransactions.length - 1]?.transaction_date} to ${formattedTransactions[0]?.transaction_date}`
        });

        console.log(`📋 Full payload being sent:`, JSON.stringify(payload, null, 2));

        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });

        console.log(`📨 Webhook response status:`, response.status, response.statusText);

        if (!response.ok) {
          console.error('❌ n8n webhook call failed:', response.status, response.statusText);
          try {
            const errorText = await response.text();
            console.error('❌ Error response:', errorText);
          } catch (e) {
            console.error('❌ Could not read error response');
          }
        } else {
          console.log('✅ n8n workflow triggered successfully with', formattedTransactions.length, 'transactions');
          try {
            const responseData = await response.text();
            console.log('📝 Webhook response:', responseData);
          } catch (e) {
            console.log('📝 No response body');
          }
        }

        // Call completion callback
        onComplete?.();

      } catch (formatError) {
        console.error('❌ Error formatting transactions or calling webhook:', formatError);
        if (formatError instanceof Error) {
          console.error('❌ Format error details:', formatError.message, formatError.stack);
        }
      }
    } catch (error) {
      console.error('Failed to trigger n8n workflow:', error);
    }
  };

  const dateRangeOptions = [
    { value: 'last_7', label: 'Last 7 Days' },
    { value: 'last_30', label: 'Last 30 Days' },
    { value: 'last_90', label: 'Last 90 Days' },
    { value: 'all', label: 'All Time' }
  ];

  return (
    <>
      <div className="relative inline-block">
        {/* Count Badge */}
        {uncategorizedCount > 0 && (
          <div className="absolute -top-2 -right-2 z-10">
            <div className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[24px] h-6 flex items-center justify-center px-1.5 shadow-lg animate-pulse">
              {uncategorizedCount > 999 ? '999+' : uncategorizedCount}
            </div>
          </div>
        )}

        {/* Main Button */}
        <button
          onClick={() => setShowModal(true)}
          className="group relative flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
          title="Categorize transactions using AI"
        >
          <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 rounded-xl transition-opacity" />
          <Brain className="w-4 h-4" />
          <span className="font-medium">AI Categorize</span>
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full shadow-2xl">
            {/* Header */}
            <div className="relative bg-gradient-to-r from-purple-600 to-indigo-600 p-6">
              <div className="absolute inset-0 bg-black opacity-10" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">AI Categorization</h2>
                </div>
                <p className="text-white/90 text-sm">
                  Automatically categorize your transactions
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Date Range Selection */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  <Calendar className="inline w-4 h-4 mr-2" />
                  Select Time Period
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {dateRangeOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSelectedDateRange(option.value)}
                      className={`p-3 rounded-xl border-2 transition-all duration-300 ${
                        selectedDateRange === option.value
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-500/10'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className={`text-sm font-semibold ${
                        selectedDateRange === option.value
                          ? 'text-purple-600 dark:text-purple-400'
                          : 'text-gray-700 dark:text-white'
                      }`}>
                        {option.label}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Info Box */}
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-xl">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  This will categorize all transactions in the selected period using AI.
                  The process runs in the background and you can continue using the app.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCategorizeAll}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  Categorize All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};