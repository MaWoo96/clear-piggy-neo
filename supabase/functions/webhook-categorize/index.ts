import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Plaid category mapping to simplified categories
const CATEGORY_MAPPING: Record<string, string> = {
  // Food & Drink
  'FOOD_AND_DRINK': 'Food & Dining',
  'FOOD_AND_DRINK_RESTAURANTS': 'Food & Dining',
  'FOOD_AND_DRINK_COFFEE_SHOPS': 'Food & Dining',
  'FOOD_AND_DRINK_FAST_FOOD': 'Food & Dining',
  'FOOD_AND_DRINK_GROCERIES': 'Groceries',
  'FOOD_AND_DRINK_BEER_WINE_AND_LIQUOR': 'Food & Dining',

  // Transportation
  'TRANSPORTATION': 'Transportation',
  'TRANSPORTATION_CARS_AND_TRUCKS': 'Transportation',
  'TRANSPORTATION_GAS': 'Transportation',
  'TRANSPORTATION_PARKING': 'Transportation',
  'TRANSPORTATION_PUBLIC_TRANSIT': 'Transportation',
  'TRANSPORTATION_TAXIS_AND_RIDE_SHARES': 'Transportation',

  // Shopping
  'SHOPS': 'Shopping',
  'SHOPS_CLOTHING_AND_ACCESSORIES': 'Shopping',
  'SHOPS_DEPARTMENT_STORES': 'Shopping',
  'SHOPS_ELECTRONICS': 'Shopping',
  'SHOPS_SPORTING_GOODS': 'Shopping',

  // Entertainment
  'ENTERTAINMENT': 'Entertainment',
  'ENTERTAINMENT_MOVIES_AND_DVDS': 'Entertainment',
  'ENTERTAINMENT_MUSIC_AND_AUDIO': 'Entertainment',
  'ENTERTAINMENT_NEWSPAPERS_AND_MAGAZINES': 'Entertainment',

  // Bills & Utilities
  'BILLS_AND_UTILITIES': 'Bills & Utilities',
  'BILLS_AND_UTILITIES_INTERNET_AND_CABLE': 'Bills & Utilities',
  'BILLS_AND_UTILITIES_TELEPHONE': 'Bills & Utilities',
  'BILLS_AND_UTILITIES_UTILITIES': 'Bills & Utilities',

  // Healthcare
  'MEDICAL': 'Healthcare',
  'MEDICAL_DENTAL_CARE': 'Healthcare',
  'MEDICAL_PHARMACIES_AND_SUPPLEMENTS': 'Healthcare',

  // Rent & Housing
  'RENT_AND_UTILITIES': 'Housing',
  'LOAN_PAYMENTS': 'Loans',
  'LOAN_PAYMENTS_MORTGAGE': 'Housing',

  // Personal
  'PERSONAL_CARE': 'Personal',
  'PERSONAL_CARE_GYMS_AND_FITNESS_CENTERS': 'Personal',

  // Transfer
  'TRANSFER': 'Transfer',
  'TRANSFER_IN': 'Transfer',
  'TRANSFER_OUT': 'Transfer',
  'BANK_FEES': 'Bank Fees',

  // General
  'GENERAL_MERCHANDISE': 'Shopping',
  'GENERAL_SERVICES': 'Services',

  // Others
  'TRAVEL': 'Travel',
  'EDUCATION': 'Education',
  'GOVERNMENT_AND_NON_PROFIT': 'Services'
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Initialize Supabase client with user's auth token
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    })

    // Get request data
    const { workspace_id, date_range = 'last_30', mode = 'all' } = await req.json()

    if (!workspace_id) {
      return new Response(
        JSON.stringify({ error: 'workspace_id is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log(`Starting AI categorization for workspace ${workspace_id}, range: ${date_range}, mode: ${mode}`)

    // Calculate date filter based on range
    let startDate = null
    const now = new Date()

    if (date_range !== 'all') {
      switch(date_range) {
        case 'last_7':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'last_30':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        case 'last_90':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
          break
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      }
    }

    // Build query for transactions to categorize
    let query = supabase
      .from('feed_transactions')
      .select('*')
      .eq('workspace_id', workspace_id)
      .eq('direction', 'outflow')
      .is('ai_category_primary', null)
      .is('user_category_primary', null)
      .order('transaction_date', { ascending: false })

    if (startDate) {
      query = query.gte('transaction_date', startDate.toISOString().split('T')[0])
    }

    const { data: transactions, error: fetchError } = await query

    if (fetchError) {
      console.error('Error fetching transactions:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch transactions' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    if (!transactions || transactions.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No uncategorized transactions found',
          processed: 0,
          total: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${transactions.length} transactions to categorize`)

    // Process transactions in batches
    const batchSize = 50
    let processed = 0
    const results = []

    for (let i = 0; i < transactions.length; i += batchSize) {
      const batch = transactions.slice(i, i + batchSize)

      // Use Plaid categories directly if available
      const updates = batch.map(tx => {
        // Use existing Plaid category if available
        let aiCategory = tx.personal_finance_category_primary
        let aiCategoryDetailed = tx.personal_finance_category_detailed

        // Map to simplified category for display
        const simplifiedCategory = CATEGORY_MAPPING[aiCategory] || aiCategory || 'Other'

        return {
          id: tx.id,
          ai_category_primary: aiCategory || 'GENERAL_MERCHANDISE',
          ai_category_detailed: aiCategoryDetailed,
          ai_category_confidence: aiCategory ? 0.95 : 0.5,
          ai_categorized_at: new Date().toISOString(),
          // Store the simplified category for UI display
          ai_category_display: simplifiedCategory
        }
      })

      // Update transactions with AI categories
      for (const update of updates) {
        const { error: updateError } = await supabase
          .from('feed_transactions')
          .update({
            ai_category_primary: update.ai_category_primary,
            ai_category_detailed: update.ai_category_detailed,
            ai_category_confidence: update.ai_category_confidence,
            ai_categorized_at: update.ai_categorized_at
          })
          .eq('id', update.id)

        if (updateError) {
          console.error(`Failed to update transaction ${update.id}:`, updateError)
        } else {
          processed++
          results.push(update)
        }
      }

      console.log(`Processed ${processed} of ${transactions.length} transactions`)
    }

    // If we have Claude API access, we could enhance categorization here
    // For now, using Plaid's categories directly

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully categorized ${processed} transactions`,
        processed,
        total: transactions.length,
        results: results.slice(0, 10) // Return sample of results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in webhook-categorize function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})