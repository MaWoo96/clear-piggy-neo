import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to decrypt tokens (inverse of encrypt from exchange-token)
async function decryptToken(encryptedToken: string): Promise<string> {
  const encryptionKey = Deno.env.get('PLAID_ENCRYPTION_KEY') || Deno.env.get('ENCRYPTION_KEY');
  if (!encryptionKey) {
    // In development, just base64 decode
    return atob(encryptedToken);
  }

  try {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // Decode from base64
    const combined = Uint8Array.from(atob(encryptedToken), c => c.charCodeAt(0));

    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    // Create key
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

    return decoder.decode(decrypted);
  } catch (err) {
    console.error('Decryption failed:', err);
    // Fallback to base64
    return atob(encryptedToken);
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request body
    let body;
    const contentType = req.headers.get('content-type');

    if (contentType && contentType.includes('application/json')) {
      try {
        body = await req.json();
      } catch (e) {
        console.error('Failed to parse JSON body:', e);
        throw new Error('Invalid JSON in request body');
      }
    } else {
      // Try to read as text and parse
      const text = await req.text();
      if (!text) {
        throw new Error('Request body is empty');
      }
      try {
        body = JSON.parse(text);
      } catch (e) {
        console.error('Failed to parse text body as JSON:', e);
        throw new Error('Invalid request body format');
      }
    }

    console.log('Parsed request body:', body);
    const { workspace_id, institution_id } = body;

    if (!workspace_id) {
      throw new Error('workspace_id is required');
    }

    if (!institution_id) {
      throw new Error('institution_id is required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Supabase configuration missing');
    }

    const dbClient = createClient(supabaseUrl, serviceRoleKey);

    // Get institution with encrypted token
    const { data: institution, error: instError } = await dbClient
      .from('institutions')
      .select('*')
      .eq('id', institution_id)
      .eq('workspace_id', workspace_id)
      .single();

    if (instError || !institution) {
      throw new Error('Institution not found');
    }

    if (!institution.plaid_access_token_encrypted) {
      throw new Error('No Plaid access token found for this institution');
    }

    // Decrypt the access token
    const accessToken = await decryptToken(institution.plaid_access_token_encrypted);

    // Get Plaid configuration
    const plaidEnv = Deno.env.get('PLAID_ENV') || Deno.env.get('PLAID_ENVIRONMENT') || 'sandbox';
    const plaidClientId = Deno.env.get('PLAID_CLIENT_ID');
    const plaidSecret = Deno.env.get('PLAID_SECRET') || Deno.env.get(`PLAID_SECRET_${plaidEnv.toUpperCase()}`);

    if (!plaidClientId || !plaidSecret) {
      throw new Error('Plaid credentials not configured');
    }

    // Determine Plaid base URL
    let plaidBaseUrl = 'https://sandbox.plaid.com';
    if (plaidEnv === 'development') {
      plaidBaseUrl = 'https://development.plaid.com';
    } else if (plaidEnv === 'production') {
      plaidBaseUrl = 'https://production.plaid.com';
    }

    console.log(`Refreshing accounts for institution ${institution.name}`);

    // Fetch latest institution details from Plaid (if we have the institution ID)
    if (institution.plaid_institution_id && !institution.plaid_institution_id.startsWith('unknown_')) {
      try {
        const institutionResponse = await fetch(`${plaidBaseUrl}/institutions/get_by_id`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            client_id: plaidClientId,
            secret: plaidSecret,
            institution_id: institution.plaid_institution_id,
            country_codes: ['US'],
            options: {
              include_optional_metadata: true // Request logo and color
            }
          }),
        });

        if (institutionResponse.ok) {
          const instData = await institutionResponse.json();
          const inst = instData.institution;

          // Update institution with latest data
          await dbClient
            .from('institutions')
            .update({
              name: inst.name,
              logo_url: inst.logo || institution.logo_url,
              hex_color: inst.primary_color || institution.hex_color,
              website_url: inst.url || institution.website_url,
              updated_at: new Date().toISOString()
            })
            .eq('id', institution_id);

          console.log(`Updated institution metadata for ${inst.name}`);
        }
      } catch (err) {
        console.error('Error updating institution details:', err);
      }
    }

    // Fetch latest accounts from Plaid using /accounts/get for real-time balance data
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

    if (!accountsResponse.ok) {
      const errorData = await accountsResponse.json();
      console.error('Error fetching accounts:', errorData);
      throw new Error(`Failed to fetch accounts: ${errorData.error_message || 'Unknown error'}`);
    }

    const accountsData = await accountsResponse.json();
    const updatedAccounts = [];

    // Update each account with latest balance and info
    for (const account of accountsData.accounts) {
      const { data: updatedAccount, error: updateError } = await dbClient
        .from('bank_accounts')
        .update({
          name: account.name,
          current_balance_cents: account.balances.current ? Math.round(account.balances.current * 100) : null,
          available_balance_cents: account.balances.available ? Math.round(account.balances.available * 100) : null,
          currency_code: account.balances.iso_currency_code || 'USD',
          last_sync_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('workspace_id', workspace_id)
        .eq('institution_id', institution_id)
        .eq('plaid_account_id', account.account_id)
        .select()
        .single();

      if (updateError) {
        console.error(`Error updating account ${account.name}:`, updateError);
      } else {
        updatedAccounts.push(updatedAccount);
        console.log(`Updated account ${account.name} with balance ${account.balances.current}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        institution_id,
        accounts_updated: updatedAccounts.length,
        message: `Successfully refreshed ${updatedAccounts.length} accounts for ${institution.name}`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error refreshing accounts:', error);
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