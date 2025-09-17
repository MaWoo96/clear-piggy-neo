import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Logo sources in order of preference
const LOGO_SOURCES = {
  // Clearbit Logo API (high quality, many institutions)
  clearbit: (domain: string) => `https://logo.clearbit.com/${domain}`,
  // Google Favicon API (reliable fallback)
  google: (domain: string) => `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
  // DuckDuckGo Icon API
  duckduckgo: (domain: string) => `https://icons.duckduckgo.com/ip3/${domain}.ico`,
  // Logo.dev API
  logodev: (domain: string) => `https://img.logo.dev/${domain}?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ&format=png&size=200`
};

// Known institution domains for major banks
const INSTITUTION_DOMAINS: Record<string, string> = {
  'ins_127991': 'wellsfargo.com', // Wells Fargo
  'ins_109508': 'chase.com',
  'ins_109509': 'bankofamerica.com',
  'ins_109511': 'usbank.com',
  'ins_109512': 'pnc.com',
  'ins_109513': 'capitalone.com',
  'ins_109514': 'citibank.com',
  'ins_109515': 'huntington.com',
  'ins_109516': 'regions.com',
  'ins_109517': 'suntrust.com',
  'ins_109518': 'ally.com',
  'ins_109519': 'schwab.com',
  'ins_109520': 'fidelity.com',
  'ins_109521': 'americanexpress.com'
};

// Convert image URL to base64
async function urlToBase64(imageUrl: string): Promise<string | null> {
  try {
    console.log(`Fetching image from: ${imageUrl}`);
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Clear-Piggy-Logo-Fetcher/1.0'
      }
    });

    if (!response.ok) {
      console.log(`Failed to fetch ${imageUrl}: ${response.status}`);
      return null;
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      console.log(`Invalid content type for ${imageUrl}: ${contentType}`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    console.log(`Successfully converted image to base64, length: ${base64.length}`);
    return base64;
  } catch (error) {
    console.error(`Error fetching image ${imageUrl}:`, error);
    return null;
  }
}

// Try multiple logo sources for an institution
async function fetchInstitutionLogo(institutionId: string, domain: string, institutionName: string) {
  console.log(`🔍 Searching for logo for ${institutionName} (${institutionId})`);

  // Try each logo source
  for (const [sourceName, urlGenerator] of Object.entries(LOGO_SOURCES)) {
    try {
      console.log(`Trying ${sourceName} for ${domain}`);
      const logoUrl = urlGenerator(domain);
      const base64Logo = await urlToBase64(logoUrl);

      if (base64Logo) {
        console.log(`✅ Found logo from ${sourceName}`);
        return {
          source: sourceName,
          logoUrl: logoUrl,
          logoBase64: base64Logo,
          dataUrl: `data:image/png;base64,${base64Logo}`
        };
      }
    } catch (error) {
      console.log(`❌ ${sourceName} failed:`, error.message);
    }
  }

  // If all sources fail, try alternative domains
  const alternativeDomains = getAlternativeDomains(institutionName);
  for (const altDomain of alternativeDomains) {
    console.log(`Trying alternative domain: ${altDomain}`);
    for (const [sourceName, urlGenerator] of Object.entries(LOGO_SOURCES)) {
      try {
        const logoUrl = urlGenerator(altDomain);
        const base64Logo = await urlToBase64(logoUrl);

        if (base64Logo) {
          console.log(`✅ Found logo from ${sourceName} using alternative domain ${altDomain}`);
          return {
            source: `${sourceName}:${altDomain}`,
            logoUrl: logoUrl,
            logoBase64: base64Logo,
            dataUrl: `data:image/png;base64,${base64Logo}`
          };
        }
      } catch (error) {
        console.log(`❌ ${sourceName}:${altDomain} failed:`, error.message);
      }
    }
  }

  console.log(`❌ No logo found for ${institutionName}`);
  return null;
}

// Generate alternative domains for an institution
function getAlternativeDomains(institutionName: string): string[] {
  const name = institutionName.toLowerCase();
  const alternatives: string[] = [];

  // Remove common words and create domain variants
  const cleanName = name
    .replace(/bank|financial|credit union|trust|corporation|corp|inc/g, '')
    .trim()
    .replace(/\s+/g, '');

  if (cleanName) {
    alternatives.push(`${cleanName}.com`);
    alternatives.push(`${cleanName}bank.com`);
    alternatives.push(`${cleanName}.bank`);
  }

  // Institution-specific alternatives
  const specificAlternatives: Record<string, string[]> = {
    'wells fargo': ['wf.com', 'wellsfargo.bank'],
    'bank of america': ['bofa.com', 'bankofamerica.bank'],
    'jpmorgan chase': ['chase.bank', 'jpmorganchase.com'],
    'capital one': ['capitalone360.com', 'capitalone.bank'],
    'us bank': ['usbank.bank', 'usb.com']
  };

  if (specificAlternatives[name]) {
    alternatives.push(...specificAlternatives[name]);
  }

  return alternatives;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { institution_id, workspace_id, force_refresh = false } = await req.json();

    if (!institution_id || !workspace_id) {
      throw new Error('institution_id and workspace_id are required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Supabase configuration missing');
    }

    const dbClient = createClient(supabaseUrl, serviceRoleKey);

    // Get institution details
    const { data: institution, error: instError } = await dbClient
      .from('institutions')
      .select('*')
      .eq('id', institution_id)
      .eq('workspace_id', workspace_id)
      .single();

    if (instError || !institution) {
      throw new Error('Institution not found');
    }

    console.log(`🏦 Processing logo enrichment for: ${institution.name}`);

    // Skip if institution already has logo (unless force refresh)
    if (!force_refresh && (institution.logo_url || institution.logo_base64)) {
      console.log('✅ Institution already has logo, skipping');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Institution already has logo',
          institution_id,
          has_logo: true
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    // Get domain for this institution
    let domain = institution.website_url || institution.url;
    if (domain) {
      // Extract domain from URL
      try {
        const url = new URL(domain.startsWith('http') ? domain : `https://${domain}`);
        domain = url.hostname.replace('www.', '');
      } catch {
        domain = domain.replace('https://', '').replace('http://', '').replace('www.', '').split('/')[0];
      }
    } else {
      // Use known mapping
      domain = INSTITUTION_DOMAINS[institution.plaid_institution_id] || null;
    }

    if (!domain) {
      console.log('❌ No domain found for institution');
      return new Response(
        JSON.stringify({
          success: false,
          message: 'No domain found for logo search',
          institution_id
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    console.log(`🔍 Searching for logo using domain: ${domain}`);

    // Fetch logo from multiple sources
    const logoResult = await fetchInstitutionLogo(
      institution.plaid_institution_id,
      domain,
      institution.name
    );

    if (logoResult) {
      // Update institution with logo - using actual columns from schema
      const updateData = {
        logo_url: logoResult.dataUrl,
        logo_base64: logoResult.logoBase64,
        // Store source info in metadata
        metadata: {
          ...institution.metadata,
          logo_source: logoResult.source,
          logo_fetched_at: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      };

      // If Wells Fargo, also set the primary color
      if (institution.name === 'Wells Fargo' && !institution.hex_color) {
        updateData['hex_color'] = '#d11f37';
        updateData['primary_color'] = '#d11f37';
      }

      const { error: updateError } = await dbClient
        .from('institutions')
        .update(updateData)
        .eq('id', institution_id);

      if (updateError) {
        throw new Error(`Failed to update institution: ${updateError.message}`);
      }

      console.log(`✅ Successfully enriched ${institution.name} with logo from ${logoResult.source}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: `Logo found and stored from ${logoResult.source}`,
          institution_id,
          source: logoResult.source,
          logo_url: logoResult.dataUrl
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    } else {
      console.log(`❌ No logo found for ${institution.name}`);

      // Mark as searched in metadata to avoid repeated attempts
      await dbClient
        .from('institutions')
        .update({
          metadata: {
            ...institution.metadata,
            logo_search_attempted_at: new Date().toISOString(),
            logo_search_failed: true
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', institution_id);

      return new Response(
        JSON.stringify({
          success: false,
          message: 'No logo found from any source',
          institution_id,
          searched_sources: Object.keys(LOGO_SOURCES)
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404
        }
      );
    }
  } catch (error) {
    console.error('Logo enrichment error:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        stack: error.stack
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});