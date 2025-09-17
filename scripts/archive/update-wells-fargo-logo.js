const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateWellsFargoLogo() {
  console.log('🏦 Updating Wells Fargo logo...\n');

  try {
    // First, let's check what we have
    const { data: institutions, error: fetchError } = await supabase
      .from('institutions')
      .select('id, name, logo_url, primary_color')
      .eq('name', 'Wells Fargo');

    if (fetchError) {
      console.error('Error fetching institutions:', fetchError);
      return;
    }

    console.log('Found institutions:', institutions);

    if (!institutions || institutions.length === 0) {
      console.log('No Wells Fargo institutions found');
      return;
    }

    // Update each Wells Fargo institution
    for (const inst of institutions) {
      console.log(`\nUpdating institution ${inst.id}...`);

      const { data, error } = await supabase
        .from('institutions')
        .update({
          logo_url: 'https://plaid-merchant-logos.plaid.com/wells_fargo_756.png',
          primary_color: '#d11f37',
          logo_base64: null
        })
        .eq('id', inst.id)
        .select();

      if (error) {
        console.error('Update error:', error);
      } else {
        console.log('✅ Successfully updated!');
        console.log('Updated data:', data);
      }
    }

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

updateWellsFargoLogo();