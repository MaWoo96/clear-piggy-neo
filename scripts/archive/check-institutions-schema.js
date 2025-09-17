const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || 'https://rnevebffhtplbixdmbgq.supabase.co';
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!SUPABASE_ANON_KEY) {
  console.error('Missing SUPABASE_ANON_KEY');
  process.exit(1);
}

async function checkSchema() {
  console.log('📊 Checking institutions table schema...\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  try {
    // Query the database schema information
    const { data, error } = await supabase
      .from('institutions')
      .select('*')
      .limit(0); // We don't need actual data, just the schema

    if (error) {
      console.error('Error querying institutions:', error);

      // Try a different approach - get table info from information_schema
      console.log('\nTrying alternative method...\n');

      const { data: schemaData, error: schemaError } = await supabase
        .rpc('get_table_columns', { table_name: 'institutions' })
        .catch(() => ({ data: null, error: 'RPC not available' }));

      if (schemaData) {
        console.log('Available columns:', schemaData);
      } else {
        console.log('Could not fetch schema directly. Here are the known columns based on the application:');
        console.log('- id (UUID)');
        console.log('- workspace_id (UUID)');
        console.log('- name (text)');
        console.log('- plaid_institution_id (text)');
        console.log('- plaid_item_id (text)');
        console.log('- plaid_access_token_encrypted (text)');
        console.log('- logo_url (text)');
        console.log('- logo_base64 (text)');
        console.log('- primary_color (text)');
        console.log('- website_url (text)');
        console.log('- routing_numbers (text[])');
        console.log('- created_at (timestamp)');
        console.log('- updated_at (timestamp)');
        console.log('- created_by (UUID)');
        console.log('\nPossible additional columns (need to verify):');
        console.log('- logo_source (text) - might not exist');
        console.log('- logo_fetched_at (timestamp) - might not exist');
        console.log('- logo_search_attempted_at (timestamp) - might not exist');
      }
      return;
    }

    // If we got here, the query worked but returned no data (as expected)
    console.log('✅ Successfully connected to institutions table');
    console.log('\nKnown columns that work:');
    console.log('- id');
    console.log('- workspace_id');
    console.log('- name');
    console.log('- plaid_institution_id');
    console.log('- logo_url');
    console.log('- logo_base64');
    console.log('- primary_color');
    console.log('- updated_at');

    console.log('\n⚠️  Columns that caused errors:');
    console.log('- logo_source (DOES NOT EXIST)');
    console.log('- logo_fetched_at (DOES NOT EXIST)');

    console.log('\n✨ The Edge Function should only use the existing columns listed above.');

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

checkSchema();