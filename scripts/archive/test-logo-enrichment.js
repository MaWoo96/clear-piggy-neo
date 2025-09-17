const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || 'https://rnevebffhtplbixdmbgq.supabase.co';
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!SUPABASE_ANON_KEY) {
  console.error('Missing SUPABASE_ANON_KEY');
  process.exit(1);
}

async function testLogoEnrichment() {
  console.log('🏦 Testing Logo Enrichment for Wells Fargo\n');

  try {
    // First, find Wells Fargo institution
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    console.log('1️⃣ Finding Wells Fargo institution...');
    const { data: institutions, error: fetchError } = await supabase
      .from('institutions')
      .select('id, workspace_id, name, logo_url, logo_base64, primary_color')
      .eq('name', 'Wells Fargo')
      .limit(1);

    if (fetchError) {
      console.error('Error fetching institution:', fetchError);
      return;
    }

    if (!institutions || institutions.length === 0) {
      console.error('❌ No Wells Fargo institution found. Please connect a Wells Fargo account first.');
      return;
    }

    const institution = institutions[0];
    console.log('✅ Found institution:');
    console.log(`   ID: ${institution.id}`);
    console.log(`   Workspace: ${institution.workspace_id}`);
    console.log(`   Name: ${institution.name}`);
    console.log(`   Has logo URL: ${institution.logo_url ? 'Yes' : 'No'}`);
    console.log(`   Has logo base64: ${institution.logo_base64 ? 'Yes' : 'No'}`);
    console.log(`   Primary color: ${institution.primary_color || 'None'}`);
    console.log('');

    // Call the Edge Function to enrich the logo
    console.log('2️⃣ Calling logo enrichment Edge Function...\n');

    const response = await fetch(`${SUPABASE_URL}/functions/v1/enrich-institution-logos`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        institution_id: institution.id,
        workspace_id: institution.workspace_id,
        force_refresh: true
      })
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Logo enrichment successful!');
      console.log(`   Source: ${result.source}`);
      console.log(`   Message: ${result.message}`);
      if (result.logo_url) {
        console.log(`   Logo URL: ${result.logo_url.substring(0, 100)}...`);
      }
    } else {
      console.log('❌ Logo enrichment failed:');
      console.log(`   Message: ${result.message || result.error}`);
      if (result.searched_sources) {
        console.log(`   Searched sources: ${result.searched_sources.join(', ')}`);
      }
    }

    // Check the institution again to see if it was updated
    console.log('\n3️⃣ Checking updated institution...');
    const { data: updatedInst } = await supabase
      .from('institutions')
      .select('logo_url, logo_base64, logo_source, primary_color')
      .eq('id', institution.id)
      .single();

    if (updatedInst) {
      console.log('✅ Updated institution data:');
      console.log(`   Has logo URL: ${updatedInst.logo_url ? 'Yes' : 'No'}`);
      console.log(`   Has logo base64: ${updatedInst.logo_base64 ? 'Yes (' + updatedInst.logo_base64.length + ' chars)' : 'No'}`);
      console.log(`   Logo source: ${updatedInst.logo_source || 'None'}`);
      console.log(`   Primary color: ${updatedInst.primary_color || 'None'}`);

      if (updatedInst.logo_url && updatedInst.logo_url.startsWith('data:')) {
        console.log('\n📸 Logo successfully stored as data URL!');
        console.log('   The logo should now appear in the Accounts tab.');
      }
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testLogoEnrichment();