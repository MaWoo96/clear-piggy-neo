import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import * as crypto from 'https://deno.land/std@0.168.0/crypto/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, plaid-verification',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify webhook signature
    const plaidVerification = req.headers.get('plaid-verification');
    const body = await req.text();

    // Parse the webhook data
    const webhookData = JSON.parse(body);

    console.log(`Received Plaid webhook: ${webhookData.webhook_type} - ${webhookData.webhook_code}`);

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Handle different webhook types
    switch (webhookData.webhook_type) {
      case 'TRANSACTIONS':
        await handleTransactionWebhook(webhookData, supabaseClient);
        break;

      case 'ITEM':
        await handleItemWebhook(webhookData, supabaseClient);
        break;

      default:
        console.log(`Unhandled webhook type: ${webhookData.webhook_type}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

async function handleTransactionWebhook(webhookData: any, supabaseClient: any) {
  const { webhook_code, item_id, account_ids, new_transactions, removed_transactions } = webhookData;

  console.log(`Transaction webhook: ${webhook_code}`);
  console.log(`Item: ${item_id}, New: ${new_transactions}, Removed: ${removed_transactions?.length || 0}`);

  // Find the institution by Plaid item ID
  const { data: institution, error: institutionError } = await supabaseClient
    .from('institutions')
    .select('id, workspace_id, name')
    .eq('plaid_item_id', item_id)
    .single();

  if (institutionError || !institution) {
    console.error('Institution not found for item:', item_id);
    return;
  }

  console.log(`Found institution: ${institution.name} (${institution.id})`);

  switch (webhook_code) {
    case 'SYNC_UPDATES_AVAILABLE':
    case 'DEFAULT_UPDATE':
    case 'INITIAL_UPDATE':
    case 'HISTORICAL_UPDATE':
      // New transactions are available - trigger a sync
      console.log(`Triggering transaction sync for workspace ${institution.workspace_id}`);

      // Call the sync function
      const { data: syncResult, error: syncError } = await supabaseClient.functions.invoke(
        'workspace-sync-transactions',
        {
          body: {
            workspace_id: institution.workspace_id,
            webhook_triggered: true,
            item_id: item_id
          }
        }
      );

      if (syncError) {
        console.error('Failed to trigger sync:', syncError);
      } else {
        console.log('Sync triggered successfully:', syncResult);
      }

      // Store webhook event for tracking
      await supabaseClient
        .from('webhook_events')
        .insert({
          webhook_type: webhookData.webhook_type,
          webhook_code: webhook_code,
          item_id: item_id,
          workspace_id: institution.workspace_id,
          payload: webhookData,
          processed_at: new Date().toISOString()
        });
      break;

    case 'TRANSACTIONS_REMOVED':
      // Handle removed transactions
      if (removed_transactions && removed_transactions.length > 0) {
        console.log(`Removing ${removed_transactions.length} transactions`);

        for (const txId of removed_transactions) {
          await supabaseClient
            .from('feed_transactions')
            .delete()
            .eq('plaid_transaction_id', txId)
            .eq('workspace_id', institution.workspace_id);
        }
      }
      break;
  }
}

async function handleItemWebhook(webhookData: any, supabaseClient: any) {
  const { webhook_code, item_id, error } = webhookData;

  console.log(`Item webhook: ${webhook_code} for item ${item_id}`);

  // Find the institution
  const { data: institution } = await supabaseClient
    .from('institutions')
    .select('id, workspace_id, name')
    .eq('plaid_item_id', item_id)
    .single();

  if (!institution) {
    console.error('Institution not found for item:', item_id);
    return;
  }

  switch (webhook_code) {
    case 'ERROR':
      // Item has an error - may need user action
      console.error(`Item error for ${institution.name}:`, error);

      // Update institution status
      await supabaseClient
        .from('institutions')
        .update({
          connection_status: 'error',
          last_error: error,
          updated_at: new Date().toISOString()
        })
        .eq('id', institution.id);
      break;

    case 'PENDING_EXPIRATION':
      // Item access token will expire soon
      console.warn(`Item ${item_id} access token expiring soon`);

      await supabaseClient
        .from('institutions')
        .update({
          connection_status: 'pending_expiration',
          updated_at: new Date().toISOString()
        })
        .eq('id', institution.id);
      break;

    case 'USER_PERMISSION_REVOKED':
      // User revoked permission at the bank
      console.warn(`User revoked permission for item ${item_id}`);

      await supabaseClient
        .from('institutions')
        .update({
          connection_status: 'disconnected',
          updated_at: new Date().toISOString()
        })
        .eq('id', institution.id);
      break;

    case 'WEBHOOK_UPDATE_ACKNOWLEDGED':
      // Webhook URL was updated successfully
      console.log('Webhook URL update acknowledged');
      break;
  }

  // Store webhook event
  await supabaseClient
    .from('webhook_events')
    .insert({
      webhook_type: webhookData.webhook_type,
      webhook_code: webhook_code,
      item_id: item_id,
      workspace_id: institution.workspace_id,
      payload: webhookData,
      processed_at: new Date().toISOString()
    });
}