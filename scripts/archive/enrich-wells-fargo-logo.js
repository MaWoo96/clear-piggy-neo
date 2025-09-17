require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || 'https://rnevebffhtplbixdmbgq.supabase.co';
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!SUPABASE_ANON_KEY) {
  console.error('Missing SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

async function enrichWellsFargoLogo() {
  console.log('🏦 Enriching Wells Fargo Logo\n');
  console.log('Using known institution ID from your previous message...\n');

  // These are the IDs from your initial message
  const INSTITUTION_ID = '6a38c912-7727-4cf6-8672-76bf1843c40d';
  const WORKSPACE_ID = '10001e60-843e-4374-a26b-352ea4cf68f8';

  try {
    console.log('📡 Calling logo enrichment Edge Function...');
    console.log(`   Institution ID: ${INSTITUTION_ID}`);
    console.log(`   Workspace ID: ${WORKSPACE_ID}`);
    console.log(`   Force refresh: true\n`);

    const response = await fetch(`${SUPABASE_URL}/functions/v1/enrich-institution-logos`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        institution_id: INSTITUTION_ID,
        workspace_id: WORKSPACE_ID,
        force_refresh: true
      })
    });

    const result = await response.json();

    console.log('Response Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('\n✅ SUCCESS! Logo enrichment completed!');
      console.log(`   Logo source: ${result.source}`);
      console.log(`   Message: ${result.message}`);

      if (result.logo_url) {
        console.log('\n📸 Logo stored! The Wells Fargo logo should now appear in your Accounts tab.');
        console.log('   Refresh your dashboard to see the updated logo.');
      }
    } else if (response.status === 404) {
      console.log('\n⚠️  No logo found from any source');
      console.log('   Tried sources:', result.searched_sources?.join(', '));
    } else {
      console.log('\n❌ Failed to enrich logo');
      console.log(`   Error: ${result.error || result.message}`);
    }

  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
    console.error('   Make sure the Edge Function is deployed and accessible');
  }
}

enrichWellsFargoLogo();