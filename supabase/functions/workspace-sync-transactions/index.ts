import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to decrypt tokens encrypted with AES-GCM
async function decryptToken(encryptedToken: string): Promise<string> {
  const encryptionKey = Deno.env.get('PLAID_ENCRYPTION_KEY') || Deno.env.get('ENCRYPTION_KEY');
  
  if (!encryptionKey) {
    console.warn('No encryption key found, attempting base64 decode');
    // Try simple base64 decode
    try {
      const decoded = atob(encryptedToken);
      // Check if it looks like a valid Plaid token
      if (decoded.startsWith('access-')) {
        console.log('Base64 decode successful, token is valid');
        return decoded;
      }
    } catch (e) {
      console.error('Failed to decode as base64:', e);
    }
    // Return as-is and hope for the best
    console.warn('Returning encrypted token as-is (this will likely fail)');
    return encryptedToken;
  }
  
  try {
    // Decode from base64
    const combined = Uint8Array.from(atob(encryptedToken), c => c.charCodeAt(0));
    
    // Extract IV (first 12 bytes) and encrypted data
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);
    
    // Import the key
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(encryptionKey.padEnd(32, '0').slice(0, 32)),
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );
    
    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      keyMaterial,
      encrypted
    );
    
    // Convert to string
    const decoder = new TextDecoder();
    const token = decoder.decode(decrypted);
    
    console.log('Successfully decrypted token using AES-GCM');
    console.log('Token format check:', token.startsWith('access-') ? '✅ Valid' : '⚠️ Unexpected format');
    console.log('Token preview:', token.substring(0, 30) + '...');
    
    return token;
  } catch (err) {
    console.error('AES-GCM decryption failed:', err);
    // Try fallback to simple base64
    try {
      const decoded = atob(encryptedToken);
      if (decoded.startsWith('access-')) {
        console.log('Fallback to base64 decode successful');
        return decoded;
      }
    } catch (e) {
      console.error('Base64 fallback also failed');
    }
    // Last resort - return as is
    console.error('All decryption attempts failed, returning encrypted token (this will fail with Plaid)');
    return encryptedToken;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { workspace_id, start_date, end_date } = await req.json();

    if (!workspace_id) {
      throw new Error('workspace_id is required');
    }

    console.log(`Starting sync for workspace: ${workspace_id}`);

    // Initialize Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Get workspace owner for fallback created_by
    const { data: workspace, error: wsError } = await supabaseClient
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspace_id)
      .single();

    const workspaceOwnerId = workspace?.owner_id || null;
    console.log('Workspace owner ID for fallback:', workspaceOwnerId);

    // Get all active institutions with access tokens for this workspace using RPC
    const { data: institutions, error: instError } = await supabaseClient
      .rpc('get_institutions_for_sync', {
        p_workspace_id: workspace_id
      });

    if (instError) {
      console.error('Error fetching institutions:', instError);
      throw new Error(`Failed to fetch institutions: ${instError.message}`);
    }

    if (!institutions || institutions.length === 0) {
      console.log('No active institutions found for workspace');
      return new Response(
        JSON.stringify({ 
          success: false,
          message: 'No connected institutions found. Please connect a bank account first.',
          workspace_id,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    console.log(`Found ${institutions.length} institution(s) to sync`);

    // Get Plaid configuration
    const plaidEnv = Deno.env.get('PLAID_ENV') || Deno.env.get('PLAID_ENVIRONMENT') || 'sandbox';
    const plaidClientId = Deno.env.get('PLAID_CLIENT_ID');
    const plaidSecret = Deno.env.get('PLAID_SECRET') || Deno.env.get(`PLAID_SECRET_${plaidEnv.toUpperCase()}`);
    
    if (!plaidClientId || !plaidSecret) {
      throw new Error('Plaid credentials not configured');
    }

    // Determine Plaid base URL
    let plaidBaseUrl = 'https://sandbox.plaid.com';
    if (plaidEnv === 'development' || plaidSecret.includes('development')) {
      plaidBaseUrl = 'https://development.plaid.com';
    } else if (plaidEnv === 'production' || (!plaidSecret.includes('sandbox') && !plaidSecret.includes('development'))) {
      plaidBaseUrl = 'https://production.plaid.com';
    }

    console.log(`Using Plaid environment: ${plaidBaseUrl}`);

    // Determine date range
    const now = new Date();
    // Add one day to end date to ensure we get today's transactions
    const tomorrow = new Date(now.getTime() + (24 * 60 * 60 * 1000));
    const syncStartDate = start_date ? new Date(start_date) : new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000)); // Extended to 90 days
    const syncEndDate = end_date ? new Date(end_date) : tomorrow;

    let totalNewTransactions = 0;
    let totalUpdatedTransactions = 0;
    let totalErrors = 0;
    let totalAccountsUpdated = 0;

    // Process each institution
    for (const institution of institutions) {
      try {
        console.log(`Processing institution: ${institution.name} (${institution.id})`);
        console.log('Encrypted token preview:', institution.plaid_access_token_encrypted?.substring(0, 30) + '...');
        
        // Decrypt the access token
        console.log('Decrypting access token...');
        const accessToken = await decryptToken(institution.plaid_access_token_encrypted);
        
        // Validate the token format
        if (!accessToken.startsWith('access-')) {
          console.error(`Invalid token format for ${institution.name}. Token should start with 'access-'`);
          console.error('Token preview:', accessToken.substring(0, 40) + '...');
          console.error('This usually means the token was not properly exchanged or decryption failed');
          totalErrors++;
          continue;
        }
        
        console.log('Token decrypted and validated successfully');

        console.log(`Fetching transactions from ${syncStartDate.toISOString()} to ${syncEndDate.toISOString()}`);

        // First, trigger a refresh to get the latest transactions
        console.log('Triggering on-demand transaction refresh...');
        try {
          const refreshResponse = await fetch(`${plaidBaseUrl}/transactions/refresh`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              client_id: plaidClientId,
              secret: plaidSecret,
              access_token: accessToken,
            }),
          });

          if (!refreshResponse.ok) {
            const refreshError = await refreshResponse.text();
            console.warn('Transaction refresh endpoint returned error:', refreshError);
            // Parse error to check if it's because refresh isn't available
            try {
              const errorData = JSON.parse(refreshError);
              if (errorData.error_code === 'PRODUCT_NOT_READY' || errorData.error_code === 'INVALID_REQUEST') {
                console.log('Refresh endpoint not available for this account, using standard sync');
              }
            } catch (e) {
              console.warn('Could not parse refresh error response');
            }
          } else {
            const refreshData = await refreshResponse.json();
            console.log('Transaction refresh triggered successfully:', refreshData);

            // Wait longer for the refresh to process (5 seconds instead of 2)
            console.log('Waiting 5 seconds for refresh to complete...');
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        } catch (refreshErr) {
          console.warn('Error calling refresh endpoint:', refreshErr);
          console.log('Continuing with standard transaction sync...');
        }

        // Now fetch the transactions (including any newly refreshed ones)
        const transactionsResponse = await fetch(`${plaidBaseUrl}/transactions/get`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            client_id: plaidClientId,
            secret: plaidSecret,
            access_token: accessToken,
            start_date: syncStartDate.toISOString().split('T')[0],
            end_date: syncEndDate.toISOString().split('T')[0],
          }),
        });

        if (!transactionsResponse.ok) {
          const errorData = await transactionsResponse.text();
          console.error(`Plaid API error for ${institution.name}:`);
          console.error(`Status: ${transactionsResponse.status}`);
          console.error(`Response: ${errorData}`);
          
          // Try to parse error details
          try {
            const errorJson = JSON.parse(errorData);
            console.error('Error code:', errorJson.error_code);
            console.error('Error type:', errorJson.error_type);
            console.error('Error message:', errorJson.error_message);
            
            // Log specific helpful info based on error
            if (errorJson.error_code === 'INVALID_ACCESS_TOKEN') {
              console.error('Token issue: The access token is invalid or expired');
              console.error('Token format:', accessToken.startsWith('access-') ? 'Correct format' : 'Wrong format');
              console.error('Token environment:', accessToken.split('-')[1] || 'unknown');
            } else if (errorJson.error_code === 'ITEM_LOGIN_REQUIRED') {
              console.error('User needs to re-authenticate with their bank');
            }
          } catch (e) {
            // Not JSON, already logged as text
          }
          
          totalErrors++;
          continue;
        }

        const txData = await transactionsResponse.json();
        console.log(`Received ${txData.transactions?.length || 0} transactions from Plaid`);

        // Log the first few transactions for debugging
        if (txData.transactions?.length > 0) {
          console.log('Sample transactions from Plaid:');
          txData.transactions.slice(0, 3).forEach((tx: any) => {
            console.log(`- ${tx.date}: ${tx.name} - $${tx.amount} (${tx.transaction_id})`);
          });
        }

        // Also update account balances
        console.log('Fetching account balances...');
        const accountsResponse = await fetch(`${plaidBaseUrl}/accounts/get`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            client_id: plaidClientId,
            secret: plaidSecret,
            access_token: accessToken,
          }),
        });

        if (accountsResponse.ok) {
          const accountsData = await accountsResponse.json();
          console.log(`Updating balances for ${accountsData.accounts?.length || 0} accounts`);
          
          // Update account balances
          for (const account of accountsData.accounts || []) {
            const { data: balanceResult, error: balanceError } = await supabaseClient
              .rpc('update_bank_account_balance', {
                p_institution_id: institution.id,
                p_plaid_account_id: account.account_id,
                p_current_balance_cents: account.balances.current ? Math.round(account.balances.current * 100) : null,
                p_available_balance_cents: account.balances.available ? Math.round(account.balances.available * 100) : null
              });

            if (!balanceError && balanceResult?.updated) {
              totalAccountsUpdated++;
              console.log(`Updated balance for account ${account.mask || account.account_id}`);
            } else if (balanceError) {
              console.error(`Failed to update balance for account ${account.account_id}:`, balanceError);
            }
          }
        } else {
          console.error('Failed to fetch account balances');
        }

        // Get bank accounts for this institution to map plaid_account_id to bank_account_id
        const { data: bankAccounts, error: bankError } = await supabaseClient
          .rpc('get_bank_accounts_for_institution', {
            p_institution_id: institution.id
          });

        if (bankError || !bankAccounts) {
          console.error('Error fetching bank accounts:', bankError);
          totalErrors++;
          continue;
        }

        console.log(`Found ${bankAccounts?.length || 0} bank accounts for institution`);

        // Create a map for quick lookup
        const accountMap = new Map(
          bankAccounts.map(acc => [acc.plaid_account_id, acc.id])
        );

        // Store transactions
        let newTransactions = 0;
        let updatedTransactions = 0;

        for (const tx of txData.transactions || []) {
          // Get the bank_account_id from our map
          const bankAccountId = accountMap.get(tx.account_id);
          
          if (!bankAccountId) {
            console.log(`No bank account found for Plaid account ${tx.account_id}, skipping transaction`);
            continue;
          }

          // Upsert transaction using ENRICHED RPC with all Plaid data
          const { data: txResult, error: txError } = await supabaseClient
            .rpc('upsert_transaction_enriched', {
              // Core required fields
              p_workspace_id: workspace_id,
              p_bank_account_id: bankAccountId,
              p_plaid_transaction_id: tx.transaction_id,
              p_provider_unique_id: tx.transaction_id,
              p_content_hash: btoa(`${tx.transaction_id}_${workspace_id}_${tx.date}`),
              p_amount_cents: Math.round(Math.abs(tx.amount * 100)),
              p_direction: tx.amount > 0 ? 'outflow' : 'inflow',
              p_currency_code: tx.iso_currency_code || 'USD',
              p_transaction_date: tx.date,
              p_description: tx.name,
              p_status: tx.pending ? 'pending' : 'posted',
              p_created_by: institution.created_by || institution.updated_by || workspaceOwnerId,
              
              // Optional enrichment fields
              p_authorized_date: tx.authorized_date || null,
              
              // Merchant enrichment
              p_merchant_name: tx.merchant_name || null,
              p_merchant_logo_url: tx.logo_url || null,
              p_merchant_website: tx.website || null,
              p_merchant_entity_id: tx.merchant_entity_id || null,
              
              // Location enrichment
              p_location_address: tx.location?.address || null,
              p_location_city: tx.location?.city || null,
              p_location_region: tx.location?.region || null,
              p_location_postal_code: tx.location?.postal_code || null,
              p_location_country: tx.location?.country || null,
              p_location_lat: tx.location?.lat ? parseFloat(tx.location.lat) : null,
              p_location_lon: tx.location?.lon ? parseFloat(tx.location.lon) : null,
              p_location_store_number: tx.location?.store_number || null,
              
              // Personal Finance Category enrichment (Plaid's enhanced categories)
              p_personal_finance_category_primary: tx.personal_finance_category?.primary || null,
              p_personal_finance_category_detailed: tx.personal_finance_category?.detailed || null,
              p_personal_finance_category_confidence: tx.personal_finance_category?.confidence_level ? 
                parseFloat(tx.personal_finance_category.confidence_level) : null,
              
              // Legacy category enrichment (Plaid's old categories)
              p_category_primary: tx.category ? tx.category[0] : null,
              p_category_detailed: tx.category && tx.category.length > 1 ? tx.category[1] : null,
              
              // Payment details
              p_payment_method: tx.payment_meta?.payment_method || tx.payment_channel || null,
              p_payment_processor: tx.payment_meta?.payment_processor || null,
              p_payment_reference_number: tx.payment_meta?.reference_number || null,
              p_transaction_code: tx.transaction_code || null
            });

          if (txError) {
            console.error('Error saving transaction:', {
              error: txError,
              message: txError.message,
              details: txError.details,
              hint: txError.hint,
              code: txError.code
            });
            console.error('Transaction data that failed:', {
              plaid_id: tx.transaction_id,
              amount: tx.amount,
              direction: tx.amount > 0 ? 'outflow' : 'inflow',
              bank_account_id: bankAccountId
            });
            totalErrors++;
          } else {
            if (txResult?.is_new) {
              newTransactions++;
            } else {
              updatedTransactions++;
            }
          }
        }

        // Update institution's last sync time using RPC
        const { error: syncError } = await supabaseClient
          .rpc('update_institution_sync', {
            p_institution_id: institution.id
          });
        
        if (syncError) {
          console.error('Failed to update institution sync time:', syncError);
        }

        totalNewTransactions += newTransactions;
        totalUpdatedTransactions += updatedTransactions;

        console.log(`✅ Synced ${newTransactions} new and ${updatedTransactions} updated transactions for ${institution.name}`);

      } catch (institutionError) {
        console.error(`❌ Error processing institution ${institution.name}:`, institutionError);
        totalErrors++;
      }
    }

    const message = totalNewTransactions > 0 || totalUpdatedTransactions > 0
      ? `Successfully synced ${totalNewTransactions} new and ${totalUpdatedTransactions} updated transactions`
      : 'No new transactions found';

    console.log('=== SYNC COMPLETE ===');
    console.log(`Institutions processed: ${institutions.length}`);
    console.log(`New transactions: ${totalNewTransactions}`);
    console.log(`Updated transactions: ${totalUpdatedTransactions}`);
    console.log(`Accounts updated: ${totalAccountsUpdated}`);
    console.log(`Errors: ${totalErrors}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        workspace_id,
        institutions_processed: institutions.length,
        total_transactions: totalNewTransactions + totalUpdatedTransactions,
        new_transactions: totalNewTransactions,
        updated_transactions: totalUpdatedTransactions,
        accounts_updated: totalAccountsUpdated,
        errors: totalErrors,
        sync_period: {
          start: syncStartDate.toISOString(),
          end: syncEndDate.toISOString()
        },
        message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in workspace-sync-transactions:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});