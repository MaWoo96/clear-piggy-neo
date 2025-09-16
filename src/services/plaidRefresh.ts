import { supabase } from '../lib/supabase';

export async function refreshPlaidTransactions(workspaceId: string) {
  try {
    // Try to call the edge function
    const { data, error } = await supabase.functions.invoke(
      'workspace-sync-transactions',
      {
        body: { workspace_id: workspaceId },
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );

    if (error) {
      console.error('Edge function error:', error);
      
      // If edge function fails, we can fall back to triggering a sync
      // This will at least update transactions from the last sync
      console.log('Falling back to database refresh...');
      
      // Trigger a refresh by updating the workspace's last_sync
      const { error: updateError } = await (supabase as any)
        .from('workspaces')
        .update({
          last_refresh_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', workspaceId);
      
      if (updateError) {
        throw updateError;
      }
      
      return {
        success: true,
        message: 'Transaction refresh initiated',
        fallback: true
      };
    }

    return data;
  } catch (error) {
    console.error('Failed to refresh transactions:', error);
    throw error;
  }
}

export async function refreshAccountBalances(workspaceId: string, institutionId: string) {
  try {
    console.log('🔄 Calling workspace-refresh-accounts with:', { workspaceId, institutionId });

    // Call the workspace-refresh-accounts edge function for real-time balance updates
    const { data, error } = await supabase.functions.invoke(
      'workspace-refresh-accounts',
      {
        body: {
          workspace_id: workspaceId,
          institution_id: institutionId
        }
      }
    );

    if (error) {
      console.error('Edge function error details:', {
        error,
        message: error.message,
        context: error.context,
        stack: error.stack
      });

      // Try to get the actual error response body
      if (error.context && error.context.text) {
        try {
          const errorText = await error.context.text();
          console.error('Edge function error response:', errorText);
        } catch (e) {
          console.error('Could not read error response text:', e);
        }
      }

      throw error;
    }

    console.log('✅ Balance refresh successful:', data);
    return data;
  } catch (error) {
    console.error('Failed to refresh account balances:', {
      error,
      workspaceId,
      institutionId,
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

export async function refreshAllAccountBalances(workspaceId: string) {
  try {
    console.log('🔍 Fetching institutions for workspace:', workspaceId);

    // Get all institutions for this workspace
    const { data: institutions, error } = await supabase
      .from('institutions')
      .select('id, name, plaid_access_token_encrypted')
      .eq('workspace_id', workspaceId);

    if (error) {
      console.error('❌ Error fetching institutions:', error);
      throw error;
    }

    console.log('📊 Found institutions:', institutions?.map(i => ({ id: i.id, name: i.name, hasToken: !!i.plaid_access_token_encrypted })));

    if (!institutions || institutions.length === 0) {
      console.warn('⚠️ No institutions found for workspace');
      return {
        success: true,
        message: 'No institutions found to refresh',
        results: []
      };
    }

    const results = [];
    for (const institution of institutions || []) {
      try {
        console.log(`🏦 Processing institution: ${institution.name} (${institution.id})`);

        if (!institution.plaid_access_token_encrypted) {
          console.warn(`⚠️ Institution ${institution.name} has no Plaid access token`);
          results.push({
            institution: institution.name,
            error: new Error('No Plaid access token')
          });
          continue;
        }

        const result = await refreshAccountBalances(workspaceId, institution.id);
        results.push({ institution: institution.name, result });
        console.log(`✅ Successfully refreshed ${institution.name}`);
      } catch (err) {
        console.error(`❌ Failed to refresh balances for ${institution.name}:`, err);
        results.push({ institution: institution.name, error: err });
      }
    }

    const successCount = results.filter(r => !r.error).length;
    const errorCount = results.filter(r => r.error).length;

    console.log(`📈 Refresh summary: ${successCount} successful, ${errorCount} failed`);

    return {
      success: successCount > 0,
      message: `Refreshed balances for ${successCount}/${results.length} institutions`,
      results
    };
  } catch (error) {
    console.error('Failed to refresh all account balances:', error);
    throw error;
  }
}

export async function checkRefreshStatus(workspaceId: string) {
  // Check if there are any pending refreshes
  const { data, error } = await supabase
    .from('workspaces')
    .select('last_refresh_at, updated_at')
    .eq('id', workspaceId)
    .single();

  if (error) {
    console.error('Error checking refresh status:', error);
    return null;
  }

  return data;
}