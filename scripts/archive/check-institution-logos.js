const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://rnevebffhtplbixdmbgq.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('Error: Missing Supabase key in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkInstitutions() {
  console.log('🏦 Checking institutions for logo data...\n');

  try {
    // Get all institutions
    const { data: institutions, error } = await supabase
      .from('institutions')
      .select('id, name, plaid_institution_id, logo_url, logo_base64, primary_color')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching institutions:', error);
      return;
    }

    if (!institutions || institutions.length === 0) {
      console.log('No institutions found in database');
      return;
    }

    console.log(`Found ${institutions.length} institution(s):\n`);

    institutions.forEach((inst, index) => {
      console.log(`${index + 1}. ${inst.name || 'Unknown'}`);
      console.log(`   ID: ${inst.id}`);
      console.log(`   Plaid ID: ${inst.plaid_institution_id || 'None'}`);
      console.log(`   Logo URL: ${inst.logo_url ? '✅ Yes' : '❌ No'}`);
      if (inst.logo_url && !inst.logo_url.startsWith('data:')) {
        console.log(`     → ${inst.logo_url.substring(0, 100)}...`);
      }
      console.log(`   Logo Base64: ${inst.logo_base64 ? '✅ Yes (' + inst.logo_base64.length + ' chars)' : '❌ No'}`);
      console.log(`   Primary Color: ${inst.primary_color || 'None'}`);
      console.log('');
    });

    // Summary
    const withLogos = institutions.filter(i => i.logo_url || i.logo_base64).length;
    const withoutLogos = institutions.length - withLogos;

    console.log('📊 Summary:');
    console.log(`   Total institutions: ${institutions.length}`);
    console.log(`   With logos: ${withLogos}`);
    console.log(`   Without logos: ${withoutLogos}`);

    if (withoutLogos > 0) {
      console.log('\n⚠️  Some institutions are missing logos!');
      console.log('   This means either:');
      console.log('   1. The Edge Function is not storing logos properly');
      console.log('   2. Plaid is not returning logo data for these institutions');
      console.log('   3. The institutions need to be refreshed/reconnected');
    }

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

checkInstitutions();