import { supabase } from '../lib/supabase';

export async function syncAllTransactions(workspaceId: string) {
  try {
    console.log('Starting full transaction sync for workspace:', workspaceId);
    
    // Call the workspace-sync-transactions edge function
    // This will fetch transactions from the last 30 days by default
    const { data, error } = await supabase.functions.invoke(
      'workspace-sync-transactions',
      {
        body: { 
          workspace_id: workspaceId,
          // Force sync from beginning of last month to ensure we get all recent transactions
          force_full_sync: true,
          days_to_sync: 30
        }
      }
    );

    if (error) {
      console.error('Sync error:', error);
      throw error;
    }

    console.log('Sync result:', data);
    return data;
  } catch (error) {
    console.error('Failed to sync transactions:', error);
    throw error;
  }
}

export async function getTransactionStats(workspaceId: string) {
  const { data, error } = await supabase
    .from('feed_transactions')
    .select('transaction_date, status')
    .eq('workspace_id', workspaceId)
    .order('transaction_date', { ascending: false })
    .limit(10);
  
  if (error) {
    console.error('Error getting transaction stats:', error);
    return null;
  }
  
  console.log('Latest transactions:', data);
  return data;
}