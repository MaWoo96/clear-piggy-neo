const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('Missing Supabase key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Default logos for major banks when Plaid doesn't provide them
const institutionLogos = {
  'Wells Fargo': {
    logo_url: 'https://plaid-merchant-logos.plaid.com/wells_fargo_756.png',
    primary_color: '#d11f37'
  },
  'Chase': {
    logo_url: 'https://plaid-merchant-logos.plaid.com/chase_5.png',
    primary_color: '#0047AB'
  },
  'Bank of America': {
    logo_url: 'https://plaid-merchant-logos.plaid.com/bank_of_america_1024.png',
    primary_color: '#e31837'
  },
  'Citibank': {
    logo_url: 'https://plaid-merchant-logos.plaid.com/citi_983.png',
    primary_color: '#056DAE'
  },
  'Capital One': {
    logo_url: 'https://plaid-merchant-logos.plaid.com/capital_one_360_757.png',
    primary_color: '#d03027'
  },
  'US Bank': {
    logo_url: 'https://plaid-merchant-logos.plaid.com/us_bank_875.png',
    primary_color: '#0c2074'
  },
  'PNC': {
    logo_url: 'https://plaid-merchant-logos.plaid.com/pnc_662.png',
    primary_color: '#ff8200'
  },
  'TD Bank': {
    logo_url: 'https://plaid-merchant-logos.plaid.com/td_bank_1089.png',
    primary_color: '#34a224'
  }
};

async function updateInstitutionLogos() {
  console.log('🏦 Updating institution logos...\n');

  try {
    // Get all institutions without logos
    const { data: institutions, error } = await supabase
      .from('institutions')
      .select('id, name, logo_url, primary_color')
      .or('logo_url.is.null,logo_base64.eq.No');

    if (error) {
      console.error('Error fetching institutions:', error);
      return;
    }

    console.log(`Found ${institutions?.length || 0} institutions that need logos\n`);

    for (const inst of institutions || []) {
      const logoData = institutionLogos[inst.name];

      if (logoData) {
        console.log(`Updating ${inst.name}...`);

        const { error: updateError } = await supabase
          .from('institutions')
          .update({
            logo_url: logoData.logo_url,
            primary_color: logoData.primary_color,
            logo_base64: null // Clear the "No" value
          })
          .eq('id', inst.id);

        if (updateError) {
          console.error(`  ❌ Error updating ${inst.name}:`, updateError);
        } else {
          console.log(`  ✅ Successfully updated ${inst.name}`);
          console.log(`     Logo: ${logoData.logo_url}`);
          console.log(`     Color: ${logoData.primary_color}`);
        }
      } else {
        console.log(`⚠️  No logo mapping found for: ${inst.name}`);
      }
    }

    console.log('\n✨ Logo update complete!');

    // Verify the updates
    const { data: updated } = await supabase
      .from('institutions')
      .select('name, logo_url, primary_color')
      .not('logo_url', 'is', null);

    console.log(`\n📊 Final status: ${updated?.length || 0} institutions have logos`);

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

updateInstitutionLogos();