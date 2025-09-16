import React, { useState, useEffect, useMemo } from 'react';
import { supabase, formatCurrency } from '../lib/supabase';
// import { normalizeAccountName, getShortAccountName } from '../lib/accountUtils';
import { format, startOfMonth, endOfMonth, subMonths, eachDayOfInterval } from 'date-fns';
import {
  Search,
  RefreshCw, Brain,
  ArrowUpRight, ArrowDownLeft,
  AlertCircle, CheckCircle, XCircle,
  MoreVertical
} from 'lucide-react';
import { useWorkspace } from '../hooks/useWorkspace';
import { TransactionChart } from './TransactionChart';
import { syncAllTransactions } from '../services/syncTransactions';
import { saveUserCategoryCorrection } from '../utils/categoryHelpers';
import { RecategorizeButton } from './RecategorizeButton';
import { CategoryDisplaySimple } from './CategoryDisplaySimple';
import { CategorySelectorFinal } from './CategorySelectorFinal';
import { WebhookTester } from './WebhookTester';

interface Transaction {
  id: string;
  transaction_date: string;
  merchant_name: string | null;
  merchant_logo_url: string | null;
  amount_cents: number;
  direction: 'inflow' | 'outflow';
  status?: 'posted' | 'pending';
  // Plaid categories (original, never changes)
  personal_finance_category_primary: string | null;
  personal_finance_category_detailed?: string | null;
  personal_finance_category_confidence: number | null;
  // AI categories (set once, never changes)
  ai_category_primary?: string | null;
  ai_category_secondary?: string | null;
  ai_category_confidence?: number | null;
  // User categories (manual corrections, displayed in UI)
  user_category_primary?: string | null;
  user_category_secondary?: string | null;
  user_category_updated_at?: string | null;
  bank_account_id: string;
  account_name?: string;
  account_mask?: string;
  tags?: string[];
  has_receipt?: boolean;
  selected?: boolean;
  recently_categorized?: boolean;
  description?: string;
  // Additional Plaid enrichment fields
  plaid_enriched?: boolean | null;
  payment_method?: string | null;
  location_city?: string | null;
  location_region?: string | null;
  merchant_website?: string | null;
}

// Helper functions for merchant display
const getMerchantInitials = (name: string): string => {
  if (!name || name === 'Unknown Merchant') return '?';
  
  const words = name.split(' ').filter(word => word.length > 0);
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  return words.slice(0, 2).map(word => word.charAt(0).toUpperCase()).join('');
};

const getMerchantColor = (name: string): string => {
  if (!name) return '#6b7280';
  
  // Known brand colors
  const brandColors: { [key: string]: string } = {
    'amazon': '#FF9900',
    'apple': '#000000',
    'starbucks': '#00704A',
    'mcdonalds': '#FFC72C',
    'target': '#CC0000',
    'walmart': '#004c91',
    'costco': '#00447c',
    'uber': '#000000',
    'lyft': '#FF00BF',
    'netflix': '#E50914',
    'spotify': '#1DB954',
    'google': '#4285f4',
    'microsoft': '#00bcf2'
  };
  
  const lowerName = name.toLowerCase();
  for (const [brand, color] of Object.entries(brandColors)) {
    if (lowerName.includes(brand)) {
      return color;
    }
  }
  
  // Generate consistent color from name
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const colors = [
    '#e11d48', '#dc2626', '#ea580c', '#d97706', '#ca8a04',
    '#65a30d', '#16a34a', '#059669', '#0d9488', '#0891b2',
    '#0284c7', '#2563eb', '#4f46e5', '#7c3aed', '#a21caf',
    '#be185d'
  ];
  
  return colors[Math.abs(hash) % colors.length];
};

const getCleanMerchantName = (name: string | null): string => {
  if (!name) return 'Unknown Transaction';
  
  // Remove common prefixes/suffixes that make names unclear
  let cleanName = name
    // Remove payment processor prefixes
    .replace(/^(POS|SQ \*|TST\*|PAYPAL \*|SP |SQU\*|PMT\*|APL\*|GOOGLE \*)/i, '')
    // Remove "ON" followed by date patterns
    .replace(/\s+ON\s+\d{1,2}\/\d{1,2}.*/i, '')
    // Remove reference numbers (REF#, etc.)
    .replace(/\s+REF#.*/i, '')
    // Remove store numbers (#1234, etc.)
    .replace(/#\d+\s*$/, '')
    // Remove trailing long numbers (6+ digits)
    .replace(/\s+\d{6,}$/, '')
    // Remove transaction IDs that look like "xxx-xxx-xxxx"
    .replace(/\s+\d{3}-\d{3}-\d{4}.*$/, '')
    // Remove state codes and trailing numbers
    .replace(/\s+[A-Z]{2}\s+\d{2,}$/, '')
    .replace(/\s+[A-Z]{2,3}$/, '')
    // Clean up extra spaces
    .replace(/\s+/g, ' ')
    .trim();
    
  // If we stripped too much, use original
  if (cleanName.length < 2) {
    cleanName = name;
  }
  
  // Capitalize properly (Title Case)
  cleanName = cleanName
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  return cleanName;
};

// Smart categorization function that maps Plaid + merchant data to proper parent/child categories
const getSmartCategory = (tx: any, categories: any[]) => {
  const merchantName = tx.merchant_name?.toLowerCase() || '';
  const plaidCategory = tx.personal_finance_category_primary || '';
  
  // First, try merchant-specific mapping
  const merchantMapping = getMerchantCategoryMapping(merchantName, categories);
  if (merchantMapping) {
    return merchantMapping;
  }
  
  // Then try Plaid category mapping
  const plaidMapping = getPlaidCategoryMapping(plaidCategory, categories);
  if (plaidMapping) {
    return plaidMapping;
  }
  
  // Default fallback
  return getDefaultCategory(categories);
};

const getMerchantCategoryMapping = (merchantName: string, categories: any[]) => {
  const merchantRules = [
    // Shopping
    { keywords: ['amazon', 'target', 'walmart', 'costco'], parent: 'Shopping', child: 'General Merchandise' },
    { keywords: ['apple', 'microsoft', 'google'], parent: 'Technology', child: 'Software & Apps' },
    
    // Food & Dining
    { keywords: ['starbucks', 'dunkin', 'coffee'], parent: 'Food & Dining', child: 'Coffee & Tea' },
    { keywords: ['mcdonalds', 'burger', 'pizza', 'restaurant'], parent: 'Food & Dining', child: 'Restaurants' },
    { keywords: ['grocery', 'kroger', 'safeway', 'publix'], parent: 'Food & Dining', child: 'Groceries' },
    
    // Transportation
    { keywords: ['uber', 'lyft', 'taxi'], parent: 'Transportation', child: 'Rideshare' },
    { keywords: ['shell', 'exxon', 'chevron', 'gas'], parent: 'Transportation', child: 'Gas & Fuel' },
    
    // Utilities & Bills
    { keywords: ['electric', 'power', 'utility'], parent: 'Bills & Utilities', child: 'Electricity' },
    { keywords: ['water', 'sewer'], parent: 'Bills & Utilities', child: 'Water & Sewer' },
    { keywords: ['internet', 'cable', 'phone'], parent: 'Bills & Utilities', child: 'Internet & Phone' },
    
    // Education & Loans
    { keywords: ['educational', 'student', 'loan', 'university', 'college'], parent: 'Education', child: 'Student Loans' },
    
    // Housing
    { keywords: ['rent', 'lease', 'apartment', 'housing'], parent: 'Housing', child: 'Rent' },
    { keywords: ['mortgage', 'home', 'property'], parent: 'Housing', child: 'Mortgage' }
  ];
  
  for (const rule of merchantRules) {
    if (rule.keywords.some(keyword => merchantName.includes(keyword))) {
      // Check if categories exist in database first
      const parentCat = categories.find(c => !c.parent_category_id && c.name === rule.parent);
      const childCat = categories.find(c => c.parent_category_id === parentCat?.id && c.name === rule.child);
      
      if (childCat) {
        return {
          categoryId: childCat.id,
          parent: rule.parent,
          child: rule.child,
          confidence: 0.9
        };
      } else {
        // Fallback: return simple category object even without database categories
        return {
          categoryId: `${rule.parent.toLowerCase().replace(/\s+/g, '-')}-${rule.child.toLowerCase().replace(/\s+/g, '-')}`,
          parent: rule.parent,
          child: rule.child,
          confidence: 0.8
        };
      }
    }
  }
  
  return null;
};

const getPlaidCategoryMapping = (plaidCategory: string, categories: any[]) => {
  const plaidMappings: { [key: string]: { parent: string; child: string; confidence: number } } = {
    'GENERAL_MERCHANDISE': { parent: 'Shopping', child: 'General Merchandise', confidence: 0.8 },
    'FOOD_AND_DRINK': { parent: 'Food & Dining', child: 'Restaurants', confidence: 0.8 },
    'FOOD_AND_DRINK_RESTAURANTS': { parent: 'Food & Dining', child: 'Restaurants', confidence: 0.85 },
    'FOOD_AND_DRINK_COFFEE': { parent: 'Food & Dining', child: 'Coffee & Tea', confidence: 0.9 },
    'TRANSPORTATION': { parent: 'Transportation', child: 'General Transport', confidence: 0.8 },
    'TRANSPORTATION_GAS': { parent: 'Transportation', child: 'Gas & Fuel', confidence: 0.9 },
    'TRANSPORTATION_RIDESHARE': { parent: 'Transportation', child: 'Rideshare', confidence: 0.9 },
    'RENT_AND_UTILITIES': { parent: 'Bills & Utilities', child: 'Rent & Utilities', confidence: 0.8 },
    'LOAN_PAYMENTS': { parent: 'Loans & Credit', child: 'Loan Payments', confidence: 0.9 },
    'TRANSFER_IN': { parent: 'Income', child: 'Transfers', confidence: 0.7 },
    'TRANSFER_OUT': { parent: 'Transfers', child: 'Outgoing Transfers', confidence: 0.7 }
  };
  
  const mapping = plaidMappings[plaidCategory];
  if (mapping) {
    const parentCat = categories.find(c => !c.parent_category_id && c.name === mapping.parent);
    const childCat = categories.find(c => c.parent_category_id === parentCat?.id && c.name === mapping.child);
    
    if (childCat) {
      return {
        categoryId: childCat.id,
        parent: mapping.parent,
        child: mapping.child,
        confidence: mapping.confidence
      };
    }
    
    // If exact child not found, try to find a similar one or use the parent
    if (parentCat) {
      const childCategories = categories.filter(c => c.parent_category_id === parentCat.id);
      if (childCategories.length > 0) {
        const firstChild = childCategories[0];
        return {
          categoryId: firstChild.id,
          parent: mapping.parent,
          child: firstChild.name,
          confidence: mapping.confidence * 0.8
        };
      }
    } else {
      // Fallback: return simple category object even without database categories  
      return {
        categoryId: `${mapping.parent.toLowerCase().replace(/\s+/g, '-')}-${mapping.child.toLowerCase().replace(/\s+/g, '-')}`,
        parent: mapping.parent,
        child: mapping.child,
        confidence: mapping.confidence * 0.7
      };
    }
  }
  
  return null;
};

const getDefaultCategory = (categories: any[]) => {
  // If no categories in database, return a simple fallback
  if (categories.length === 0) {
    return {
      categoryId: 'general',
      parent: 'General',
      child: 'Uncategorized',
      confidence: 0.3
    };
  }
  
  const generalParent = categories.find(c => !c.parent_category_id && (c.name === 'General' || c.name === 'Other' || c.name === 'Miscellaneous'));
  if (generalParent) {
    const generalChild = categories.find(c => c.parent_category_id === generalParent.id);
    if (generalChild) {
      return {
        categoryId: generalChild.id,
        parent: generalParent.name,
        child: generalChild.name,
        confidence: 0.5
      };
    }
  }
  
  // Fallback when categories exist but no suitable default found
  return {
    categoryId: 'general',
    parent: 'General',
    child: 'Uncategorized',
    confidence: 0.3
  };
};

interface MercuryTransactionsCleanProps {
  dateRange?: string;
}

const MercuryTransactionsCleanComponent: React.FC<MercuryTransactionsCleanProps> = ({ dateRange: externalDateRange }) => {
  const { workspace } = useWorkspace();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Map external date range format to internal format
  const mapDateRange = (range: string | undefined): string => {
    switch(range) {
      case '7d': return 'last_7';
      case '30d': return 'last_30';
      case '90d': return 'last_90';
      case 'ytd': return 'year_to_date';
      default: return 'last_30';
    }
  };

  const dateRange = mapDateRange(externalDateRange);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [categoryMap, setCategoryMap] = useState<Map<string, any>>(new Map());
  const [refreshMessage, setRefreshMessage] = useState<{ type: 'success' | 'error' | 'info' | 'warning'; text: string } | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [showWebhookTester, setShowWebhookTester] = useState(false);
  const [categorizing, setCategorizing] = useState(false);

  // Compute parent categories for filters
  const parentCategories = categories.filter(cat => !cat.parent_category_id);

  useEffect(() => {
    if (workspace?.id) {
      loadTransactions();
      loadCategories();
    }
  }, [workspace?.id, dateRange]);

  // Set up real-time subscription for transaction updates
  useEffect(() => {
    if (!workspace?.id) return;

    console.log('Setting up real-time subscription for workspace:', workspace.id);
    
    // Subscribe to transaction changes
    const transactionsChannel = supabase
      .channel(`transactions-${workspace.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'feed_transactions',
          filter: `workspace_id=eq.${workspace.id}`
        },
        async (payload: any) => {
          console.log('🔄 Real-time transaction update detected:', payload.eventType);
          console.log('Transaction data:', payload.new || payload.old);
          
          // Small delay to ensure database has committed all changes
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Reload transactions when they change
          await loadTransactions();
        }
      )
      .subscribe((status: any) => {
        console.log('Subscription status:', status);
      });

    // Cleanup subscription on unmount
    return () => {
      console.log('Cleaning up real-time subscription');
      supabase.removeChannel(transactionsChannel);
    };
  }, [workspace?.id, dateRange]); // Include dateRange to reload when date changes
  
  const loadCategories = async () => {
    if (!workspace?.id) return;
    
    // PERFORMANCE OPTIMIZATION: Cache categories in session storage
    const CACHE_KEY = `categories_${workspace.id}`;
    const CACHE_TIME_KEY = `categories_time_${workspace.id}`;
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    
    // Check for cached data
    const cachedData = sessionStorage.getItem(CACHE_KEY);
    const cacheTime = sessionStorage.getItem(CACHE_TIME_KEY);
    
    if (cachedData && cacheTime && (Date.now() - parseInt(cacheTime) < CACHE_DURATION)) {
      // Use cached data
      const data = JSON.parse(cachedData);
      console.log('Using cached categories');
      processCategoriesData(data);
      return;
    }
    
    // Fetch fresh data
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('workspace_id', workspace.id)
      .order('parent_category_id', { ascending: true, nullsFirst: true })
      .order('name');
    
    if (data) {
      // Store in cache
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
      sessionStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
      processCategoriesData(data);
    }
  };
  
  const processCategoriesData = (data: any[]) => {
    // Debug: Check category structure
    const parentIds = new Set(data.filter((c: any) => c.parent_category_id).map((c: any) => c.parent_category_id));
    const leafCategories = data.filter((c: any) => !parentIds.has(c.id));
    const billsUtils = data.find((c: any) => c.name === 'Bills & Utilities');
    const electricity = data.find((c: any) => c.name === 'Electricity' || c.name === 'Electric');
    
    console.log('Category structure:', {
      totalCategories: data.length,
      leafCategories: leafCategories.length,
      parentCategories: data.filter((c: any) => parentIds.has(c.id)).length,
      billsUtilsId: billsUtils?.id,
      electricityId: electricity?.id,
      isElectricityLeaf: electricity ? !parentIds.has(electricity.id) : 'not found'
    });
    
    // Show Bills & Utilities subcategories
    if (billsUtils) {
      const subcats = data.filter((c: any) => c.parent_category_id === billsUtils.id);
      console.log('Bills & Utilities subcategories:', subcats.map((c: any) => ({
        id: c.id,
        name: c.name,
        isLeaf: !parentIds.has(c.id)
      })));
    }
    
    const parentCategories = data.filter((cat: any) => !cat.parent_category_id);
    const childCategories = data.filter((cat: any) => cat.parent_category_id);
    
    setCategories(data);
    const catMap = new Map<string, any>();
    data.forEach((cat: any) => {
      catMap.set(cat.id, cat);
    });
    setCategoryMap(catMap);
  };

  const loadTransactions = async () => {
    if (!workspace?.id) return;
    
    console.log('Loading transactions for workspace:', workspace.id);
    setLoading(true);
    try {
      let startDate, endDate;
      const now = new Date();
      
      switch(dateRange) {
        case 'last_7':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          endDate = now;
          break;
        case 'last_30':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          endDate = now;
          break;
        case 'last_90':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          endDate = now;
          break;
        case 'year_to_date':
          startDate = new Date(now.getFullYear(), 0, 1); // January 1st
          endDate = now;
          break;
        case 'this_month':
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
          break;
        case 'last_month':
          startDate = startOfMonth(subMonths(now, 1));
          endDate = endOfMonth(subMonths(now, 1));
          break;
        default:
          // Default to last 30 days
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          endDate = now;
      }

      console.log(`Fetching transactions from ${startDate.toISOString()} to ${endDate.toISOString()}`);
      console.log('Date range:', {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      });
      
      // First, let's try a simpler query without the join to see if that works
      let query = supabase
        .from('feed_transactions')
        .select('*')
        .eq('workspace_id', workspace.id);
      
      // Add date filter
      query = query
        .gte('transaction_date', startDate.toISOString().split('T')[0])
        .lte('transaction_date', endDate.toISOString().split('T')[0]);
      
      // Add status filter - but let's check if transactions have status
      // Some transactions might not have status set
      // query = query.in('status', ['posted', 'pending']);
      
      query = query
        .order('transaction_date', { ascending: false })
        .limit(500);
      
      console.log('Executing query for workspace:', workspace.id);
      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching transactions:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      console.log(`✅ Loaded ${data?.length || 0} transactions`);
      if (data && data.length > 0) {
        console.log('Sample transaction:', data[0]);
        // Debug: Check what categories are stored
        const categorizedTx = data.filter((tx: any) => tx.ai_category_primary || tx.user_category_primary);
        if (categorizedTx.length > 0) {
          console.log('Sample categorized transactions:', categorizedTx.slice(0, 3).map((tx: any) => ({
            merchant: tx.merchant_name,
            ai_cat_id: tx.ai_category_primary,
            user_cat_id: tx.user_category_primary
          })));
        }
      } else {
        console.log('No transactions found. Checking if there are any transactions at all...');
        
        // Debug: Get any transactions for this workspace
        const { data: anyTx, error: anyError } = await supabase
          .from('feed_transactions')
          .select('id, transaction_date, merchant_name, amount_cents, status')
          .eq('workspace_id', workspace.id)
          .limit(5);
        
        if (anyTx && anyTx.length > 0) {
          console.log('Found transactions in database:', anyTx);
          console.log('These transactions are outside the date range or filtered out');
        } else {
          console.log('No transactions found for this workspace at all');
        }
      }

      const formattedData = (data || []).map((tx: any) => ({
        ...tx,
        // Handle missing bank_accounts data gracefully
        account_name: tx.bank_accounts?.name || tx.account_name || 'Bank Account',
        account_mask: tx.bank_accounts?.mask || tx.mask || '****',
        description: tx.description || tx.merchant_name || 'Transaction',
        // Ensure we have required fields for the UI
        merchant_name: tx.merchant_name || tx.description || 'Unknown',
        amount_cents: tx.amount_cents || 0,
        direction: tx.direction || 'outflow',
        transaction_date: tx.transaction_date,
        status: tx.status || 'posted',
        has_receipt: false, // Don't use random for consistency
        tags: [],
        ai_category_primary: tx.ai_category_primary,
        ai_category_confidence: tx.ai_category_confidence,
        // Add a refresh timestamp to force React to re-render
        _refreshed: Date.now()
      }));

      // Force state update
      setTransactions([]);
      setTimeout(() => {
        setTransactions(formattedData);
      }, 10);
      
    } catch (error) {
      console.error('Error loading transactions:', error);
      setRefreshMessage({ 
        type: 'error', 
        text: 'Failed to load transactions' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetCategories = async () => {
    console.log('🧹 RESETTING AI CATEGORIES TO NULL');
    setCategorizing(true);
    setRefreshMessage({ type: 'info', text: 'Resetting AI categories to clean slate...' });
    
    try {
      // Reset ALL AI categories to NULL (including 'Uncategorized' strings)
      console.log('🧹 Updating database: setting ai_category_primary to NULL...');
      
      const { data, error } = await (supabase
        .from('feed_transactions') as any)
        .update({
          ai_category_primary: null,
          ai_category_confidence: null
        })
        .eq('workspace_id', workspace?.id || '')
        .select('id, merchant_name, ai_category_primary, ai_category_confidence');
      
      if (error) throw error;
      
      console.log('📊 Reset results:', data?.length, 'transactions updated');
      console.log('📋 Sample updated transactions:', data?.slice(0, 3));
      
      console.log('✅ All AI categories reset to NULL');
      setRefreshMessage({ 
        type: 'success', 
        text: '✓ AI categories reset - ready for fresh categorization!' 
      });
      
      // Reload transactions to reflect changes
      await loadTransactions();
      
    } catch (error) {
      console.error('Error resetting categories:', error);
      setRefreshMessage({ 
        type: 'error', 
        text: 'Failed to reset categories' 
      });
    } finally {
      setCategorizing(false);
      setTimeout(() => setRefreshMessage(null), 5000);
    }
  };

  const handleAICategorize = async () => {
    console.log('🤖 AI CATEGORIZATION STARTED');
    setCategorizing(true);
    setRefreshMessage({ type: 'info', text: 'AI is analyzing your transactions...' });
    
    // REAL AI CATEGORIZATION using Anthropic service
    try {
      // Filter transactions that need categorization
      const transactionsToProcess = transactions.filter(tx => {
        // Only categorize truly uncategorized transactions
        if (!tx.ai_category_primary || 
            tx.ai_category_primary === 'Uncategorized' ||
            tx.ai_category_primary === 'uncategorized') {
          // Skip if we have good Plaid categorization
          if (tx.personal_finance_category_primary && 
              tx.personal_finance_category_confidence && 
              tx.personal_finance_category_confidence > 0.7) {
            return false;
          }
          return true;
        }
        
        // Also re-categorize low confidence AI categories
        if (tx.ai_category_confidence && tx.ai_category_confidence < 0.5) {
          return true;
        }
        
        return false;
      });

      console.log(`📊 Filtered ${transactionsToProcess.length} transactions for AI categorization:`, transactionsToProcess.map(tx => ({
        id: tx.id,
        merchant: tx.merchant_name,
        ai_category: tx.ai_category_primary,
        ai_confidence: tx.ai_category_confidence
      })));

      if (transactionsToProcess.length === 0) {
        console.log('⚠️ No transactions to process!');
        setRefreshMessage({ 
          type: 'warning', 
          text: 'No transactions need categorization' 
        });
        setCategorizing(false);
        setTimeout(() => setRefreshMessage(null), 3000);
        return;
      }

      const payload = {
        workspace_id: workspace?.id,
        transactions: transactionsToProcess.map(tx => ({
          id: tx.id,
          merchant_name: tx.merchant_name || 'Unknown',
          amount_cents: tx.amount_cents,
          transaction_date: tx.transaction_date,
          description: tx.description || '',
          direction: tx.direction,
          // Include Plaid enrichment data for better categorization
          personal_finance_category_primary: tx.personal_finance_category_primary,
          personal_finance_category_detailed: tx.personal_finance_category_detailed,
          personal_finance_category_confidence: tx.personal_finance_category_confidence,
          plaid_enriched: tx.plaid_enriched,
          payment_method: tx.payment_method,
          location_city: tx.location_city,
          location_region: tx.location_region,
          merchant_logo_url: tx.merchant_logo_url,
          merchant_website: tx.merchant_website
        }))
      };

      console.log('📤 Sending to AI categorization webhook:', payload);

      // Call the AI categorization webhook
      const response = await fetch('https://primary-ijlh-production.up.railway.app/webhook/categorize-transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      let result: any;
      const responseText = await response.text();
      
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        // If response is not JSON (like "allEntries"), treat it as success
        console.log('📥 AI categorization response (text):', responseText);
        result = { success: true, message: responseText };
      }
      
      console.log('📥 AI categorization response:', result);
      
      if (!response.ok) {
        console.error('❌ AI categorization error:', response.status, result);
        throw new Error(`Webhook error: ${response.status}`);
      }
      
      if (result?.success && result?.results?.length > 0) {
        console.log('✅ Processing AI categorization results:');
        console.log('Full result structure:', result);
        console.log('First result item structure:', result.results[0]);
        
        setRefreshMessage({ 
          type: 'success', 
          text: `✓ Categorized ${result.results.length} transactions with AI` 
        });
        
        // Update transactions with new categories
        setTransactions(prev => prev.map(tx => {
          const categorization = result.results?.find((r: any) => r.transaction_id === tx.id);
          if (categorization) {
            console.log(`🔄 Updating transaction ${tx.merchant_name}:`, {
              old_category: tx.ai_category_primary,
              new_category: categorization.suggested_category_id || categorization.category_name || categorization.category,
              confidence: categorization.confidence_score || categorization.confidence
            });
            
            // Check if the suggested category is a parent or child
            const suggestedCategoryId = categorization.suggested_category_id || categorization.category_id;
            const suggestedCategory = categories.find(c => c.id === suggestedCategoryId);
            
            let primaryCategory = null;
            let secondaryCategory = null;
            
            if (suggestedCategory) {
              if (suggestedCategory.parent_category_id) {
                // It's a child category - store both parent and child
                primaryCategory = suggestedCategory.parent_category_id;
                secondaryCategory = suggestedCategoryId;
              } else {
                // It's a parent category - only store parent
                primaryCategory = suggestedCategoryId;
                // Try to find a suitable child category (first child of this parent)
                const childCategory = categories.find(c => c.parent_category_id === suggestedCategoryId);
                if (childCategory) {
                  secondaryCategory = childCategory.id;
                }
              }
            }
            
            return {
              ...tx,
              ai_category_primary: primaryCategory || suggestedCategoryId,
              ai_category_secondary: secondaryCategory,
              ai_category_confidence: categorization.confidence_score || categorization.confidence || 0.8,
              recently_categorized: true
            };
          }
          return tx;
        }));
        
        // Remove highlight after animation
        setTimeout(() => {
          setTransactions(prev => prev.map(tx => ({ ...tx, recently_categorized: false })));
        }, 3000);
      } else if (responseText === 'allEntries') {
        // Webhook responded with "allEntries" - transactions are being processed
        console.log('✅ AI categorization webhook triggered successfully');
        setRefreshMessage({ 
          type: 'success', 
          text: `✓ Sent ${transactionsToProcess.length} transactions to AI for categorization` 
        });
        
        // Reload after 3 seconds to get the updated categories
        setTimeout(() => {
          console.log('🔄 Reloading transactions to get AI categories...');
          loadTransactions();
          loadCategories();
        }, 3000);
      } else {
        console.log('⚠️ No categorization results to process');
        setRefreshMessage({ 
          type: 'warning', 
          text: 'AI categorization completed but no updates were made' 
        });
      }
      
    } catch (error) {
      console.error('Error categorizing:', error);
      setRefreshMessage({ 
        type: 'error', 
        text: 'Failed to categorize transactions' 
      });
    } finally {
      setCategorizing(false);
      setTimeout(() => setRefreshMessage(null), 5000);
    }
  };

  const refreshTransactions = async () => {
    setRefreshing(true);
    setRefreshMessage({ type: 'info', text: 'Syncing transactions from your banks...' });
    
    try {
      // First, get all institutions for this workspace
      const { data: institutions } = await supabase
        .from('institutions')
        .select('*')
        .eq('workspace_id', workspace?.id || '')
        .not('plaid_item_id', 'is', null);
      
      if (!institutions || institutions.length === 0) {
        setRefreshMessage({ 
          type: 'warning', 
          text: 'No connected bank accounts to refresh' 
        });
        setRefreshing(false);
        return;
      }
      
      let totalNew = 0;
      let totalUpdated = 0;
      let errors = 0;
      
      // Try multiple edge functions in order of preference
      // workspace-sync-transactions actually fetches and stores transactions
      // workspace-refresh-transactions only triggers a background refresh
      const functionsToTry = [
        'workspace-sync-transactions',  // This actually fetches transactions
        'workspace-refresh-transactions' // This only triggers background refresh
      ];
      
      let syncSuccess = false;
      
      for (const functionName of functionsToTry) {
        try {
          console.log(`Trying ${functionName}...`);
          const { data: refreshResult, error: refreshError } = await supabase.functions.invoke(
            functionName,
            {
              body: { 
                workspace_id: workspace?.id,
                days_back: 180, // Sync last 180 days (6 months) to get more historical data
                force_full_sync: true // Force a full sync to get all transactions
              }
            }
          );
          
          if (!refreshError && refreshResult) {
            // Check if this was actually successful (has transaction data)
            if (refreshResult.success && (refreshResult.new_transactions !== undefined || refreshResult.total_transactions !== undefined)) {
              syncSuccess = true;
              // Get actual transaction counts
              totalNew = refreshResult.new_transactions || 0;
              totalUpdated = refreshResult.updated_transactions || 0;
              errors = refreshResult.errors || 0;
              
              console.log(`✅ ${functionName} succeeded:`, refreshResult);
              console.log(`Synced ${totalNew} new and ${totalUpdated} updated transactions`);
              break;
            } else if (refreshResult.success && functionName === 'workspace-refresh-transactions') {
              // This function only triggers background refresh, not actual sync
              console.log(`⚠️ ${functionName} only triggered background refresh, trying next function...`);
              continue;
            }
          } else {
            console.log(`⚠️ ${functionName} failed:`, refreshError);
          }
        } catch (err) {
          console.log(`❌ ${functionName} error:`, err);
          continue;
        }
      }
      
      if (syncSuccess) {
        if (totalNew > 0 || totalUpdated > 0) {
          setRefreshMessage({ 
            type: 'success', 
            text: `✓ Synced ${totalNew} new and ${totalUpdated} updated transactions` 
          });
        } else {
          setRefreshMessage({ 
            type: 'success', 
            text: '✓ Your transactions are up to date' 
          });
        }
        
        // Give a moment for the message to show before reloading
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Force reload transactions
        console.log('Sync successful, reloading transactions...');
        await loadTransactions();
      } else {
        // If edge functions fail, try using syncAllTransactions service
        console.log('Falling back to syncAllTransactions service...');
        try {
          const result = await syncAllTransactions(workspace?.id || '');
          if (result) {
            setRefreshMessage({ 
              type: 'success', 
              text: '✓ Transactions synced successfully' 
            });
            // Reload after fallback sync
            await loadTransactions();
          }
        } catch (syncError) {
          console.error('Sync service also failed:', syncError);
          setRefreshMessage({ 
            type: 'error', 
            text: 'Failed to sync transactions. Please try again.' 
          });
        }
      }
      
    } catch (error) {
      console.error('Error during refresh:', error);
      setRefreshMessage({ 
        type: 'error', 
        text: 'Failed to refresh transactions' 
      });
    } finally {
      setRefreshing(false);
      setTimeout(() => setRefreshMessage(null), 5000);
    }
  };

  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(tx => 
        tx.merchant_name?.toLowerCase().includes(query) ||
        tx.description?.toLowerCase().includes(query) ||
        formatCurrency(Math.abs(tx.amount_cents)).includes(query)
      );
    }
    
    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(tx => {
        // Get the category ID to check (user category takes precedence)
        const categoryId = tx.user_category_primary || tx.ai_category_primary;
        if (!categoryId) return false;
        
        const category = categories.find(c => c.id === categoryId);
        if (!category) return false;
        
        const selectedCat = categories.find(c => c.id === selectedCategory);
        if (!selectedCat) return false;
        
        // For 3-level hierarchy, we need to check all levels
        
        // If selected category has no parent (it's a root like "Expenses")
        if (!selectedCat.parent_category_id) {
          // Check if transaction category is under this root
          if (category.id === selectedCategory) return true;
          if (category.parent_category_id === selectedCategory) return true;
          
          // Check grandparent relationship
          if (category.parent_category_id) {
            const parent = categories.find(c => c.id === category.parent_category_id);
            if (parent && parent.parent_category_id === selectedCategory) return true;
          }
          return false;
        }
        
        // If selected category has children (it's a mid-level like "Shopping")
        const hasChildren = categories.some(c => c.parent_category_id === selectedCat.id);
        if (hasChildren) {
          // Check if transaction is this category or its child
          if (category.id === selectedCategory) return true;
          if (category.parent_category_id === selectedCategory) return true;
          return false;
        }
        
        // Otherwise it's a leaf category - direct match only
        return category.id === selectedCategory;
      });
    }
    
    return filtered;
  }, [transactions, searchQuery, selectedCategory, categories, categoryMap]);

  const stats = useMemo(() => {
    const moneyIn = transactions
      .filter(tx => tx.direction === 'inflow')
      .reduce((sum, tx) => sum + Math.abs(tx.amount_cents), 0);
    
    const moneyOut = transactions
      .filter(tx => tx.direction === 'outflow')
      .reduce((sum, tx) => sum + Math.abs(tx.amount_cents), 0);
    
    const netChange = moneyIn - moneyOut;
    
    return { moneyIn, moneyOut, netChange };
  }, [transactions]);

  // Count uncategorized transactions (improved logic)
  const uncategorizedCount = useMemo(() => {
    const uncategorized = transactions.filter(tx => {
      const hasNoAICategory = !tx.ai_category_primary || 
                             tx.ai_category_primary === 'Uncategorized' ||
                             tx.ai_category_primary === 'uncategorized';
                             
      const hasGoodPlaidCategory = tx.personal_finance_category_primary && 
                                  tx.personal_finance_category_confidence && 
                                  tx.personal_finance_category_confidence > 0.6;
                                  
      const hasLowAIConfidence = tx.ai_category_confidence && tx.ai_category_confidence < 0.5;
      
      const needsCategorization = (hasNoAICategory && !hasGoodPlaidCategory) || hasLowAIConfidence;
      
      
      return needsCategorization;
    });
    
    return uncategorized.length;
  }, [transactions]);

  const chartData = useMemo(() => {
    if (transactions.length === 0) return [];
    
    // Get date range for the chart
    const dates = transactions.map(tx => new Date(tx.transaction_date));
    if (dates.length === 0) return [];
    
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    // Create daily intervals
    const days = eachDayOfInterval({ start: minDate, end: maxDate });
    
    // Group transactions by day
    const transactionsByDay = new Map<string, Transaction[]>();
    transactions.forEach(tx => {
      const dateKey = format(new Date(tx.transaction_date), 'yyyy-MM-dd');
      if (!transactionsByDay.has(dateKey)) {
        transactionsByDay.set(dateKey, []);
      }
      transactionsByDay.get(dateKey)?.push(tx);
    });
    
    // Calculate cumulative balance for each day
    let cumulativeBalance = 0;
    
    return days.map(date => {
      const dateKey = format(date, 'yyyy-MM-dd');
      const dayTransactions = transactionsByDay.get(dateKey) || [];
      
      // Calculate daily totals
      const dayInflow = dayTransactions
        .filter(tx => tx.direction === 'inflow')
        .reduce((sum, tx) => sum + Math.abs(tx.amount_cents), 0);
      
      const dayOutflow = dayTransactions
        .filter(tx => tx.direction === 'outflow')
        .reduce((sum, tx) => sum + Math.abs(tx.amount_cents), 0);
      
      const dayNet = dayInflow - dayOutflow;
      cumulativeBalance += dayNet;
      
      return {
        date: format(date, 'MMM d'),
        inflow: dayInflow / 100,
        outflow: dayOutflow / 100,
        net: dayNet / 100,
        balance: cumulativeBalance / 100
      };
    });
  }, [transactions]);

  const handleCategoryChange = async (transactionId: string, categoryId: string) => {
    // Get user ID from localStorage or set to null
    const storedUserId = localStorage.getItem('userId');
    const userId = storedUserId && storedUserId !== '' ? storedUserId : null;

    const result = await saveUserCategoryCorrection(
      supabase,
      transactionId,
      categoryId,
      categories,
      userId
    );

    if (result.success) {
      // Update local state to reflect the change
      setTransactions(prev => prev.map(tx => {
        if (tx.id === transactionId) {
          // Match the logic in saveUserCategoryCorrection
          if (!categoryId || categoryId === '' || categoryId === 'uncategorized') {
            // Clear categories
            return {
              ...tx,
              user_category_primary: null,
              user_category_secondary: null,
              user_category_updated_at: new Date().toISOString()
            };
          }

          const category = categories.find(c => c.id === categoryId);
          if (category?.parent_category_id) {
            // It's a child category - set both parent and child
            const parentCategory = categories.find(c => c.id === category.parent_category_id);
            return {
              ...tx,
              user_category_primary: parentCategory?.id || null,
              user_category_secondary: category.id,
              user_category_updated_at: new Date().toISOString()
            };
          } else {
            // It's a parent category - only set parent
            return {
              ...tx,
              user_category_primary: categoryId,
              user_category_secondary: null,
              user_category_updated_at: new Date().toISOString()
            };
          }
        }
        return tx;
      }));
      setEditingCategoryId(null);
    } else {
      console.error('Failed to save category:', result.error);
    }
  };

  const formatPlaidCategory = (plaidCategory: string) => {
    // Split Plaid categories like "FOOD_AND_DRINK_RESTAURANTS" into readable format
    const parts = plaidCategory.split('_');
    const parent = parts[0].charAt(0) + parts[0].slice(1).toLowerCase();
    const child = parts.slice(1).map(p => p.charAt(0) + p.slice(1).toLowerCase()).join(' ');
    
    return {
      parent: parent === 'Food' ? 'Food & Drink' : parent,
      child: child || parent
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Toast Notification */}
      {refreshMessage && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg transition-all duration-300 ${
          refreshMessage.type === 'success' 
            ? 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800'
            : refreshMessage.type === 'error'
            ? 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
            : refreshMessage.type === 'warning'
            ? 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-800'
            : 'bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800'
        }`}>
          <div className="flex items-center gap-3">
            {refreshMessage.type === 'success' && (
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            )}
            {refreshMessage.type === 'error' && (
              <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            )}
            {refreshMessage.type === 'warning' && (
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            )}
            {refreshMessage.type === 'info' && (
              <RefreshCw className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin" />
            )}
            <span className="text-sm font-medium">{refreshMessage.text}</span>
          </div>
        </div>
      )}
      
      {/* AI Categorization Bar - Shows when uncategorized transactions exist */}
      {uncategorizedCount > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-blue-200 dark:border-blue-800 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-800/50 rounded-lg">
                <Brain className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  {uncategorizedCount} transaction{uncategorizedCount !== 1 ? 's' : ''} need categorization
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  AI can automatically categorize these for you
                </p>
              </div>
            </div>
            <button
              onClick={handleAICategorize}
              disabled={categorizing}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-blue-400 disabled:to-indigo-400 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-all shadow-sm hover:shadow-md"
            >
              {categorizing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4" />
                  Categorize with AI
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Header with Chart */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        {/* Stats and Chart Row */}
        <div className="grid grid-cols-3 gap-6 mb-4">
          {/* Left: Financial Stats */}
          <div className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Transactions</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {format(new Date(), 'MMMM yyyy')}
              </p>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Net Change</p>
                <p className={`text-2xl font-semibold ${stats.netChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {stats.netChange >= 0 ? '+' : ''}{formatCurrency(stats.netChange)}
                </p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <ArrowDownLeft className="h-3 w-3 text-green-600 dark:text-green-400" />
                  <span className="text-gray-600 dark:text-gray-400">In:</span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    {formatCurrency(stats.moneyIn)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <ArrowUpRight className="h-3 w-3 text-red-600 dark:text-red-400" />
                  <span className="text-gray-600 dark:text-gray-400">Out:</span>
                  <span className="font-medium text-red-600 dark:text-red-400">
                    {formatCurrency(stats.moneyOut)}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Center: Chart */}
          <div className="col-span-2">
            <TransactionChart data={chartData} height={100} />
          </div>
        </div>
        
        {/* Simplified Action Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Date range is now controlled by parent Dashboard component */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 pl-10 pr-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-300 text-sm rounded-lg border border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>

            {/* Category Filter - Updated to show leaf categories */}
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
              }}
              className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-300 text-sm px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none"
            >
              <option value="all">All Categories</option>
              {/* Group by parent categories */}
              {parentCategories.map(parent => {
                const children = categories.filter(c => c.parent_category_id === parent.id);
                if (children.length === 0) {
                  return <option key={parent.id} value={parent.id}>{parent.name}</option>;
                }
                return (
                  <optgroup key={parent.id} label={parent.name}>
                    <option value={parent.id}>All {parent.name}</option>
                    {children.map(child => (
                      <option key={child.id} value={child.id}>
                        {child.name}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <RecategorizeButton 
              workspaceId={workspace?.id || ''}
              onComplete={loadTransactions}
            />
            <button
              onClick={() => setShowWebhookTester(!showWebhookTester)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg flex items-center gap-2 transition-colors"
            >
              {showWebhookTester ? 'Hide' : 'Show'} Webhook Tester
            </button>
            <button 
              onClick={handleResetCategories}
              disabled={categorizing}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-sm rounded-lg flex items-center gap-2 transition-colors"
            >
              <XCircle className={`h-4 w-4 ${categorizing ? 'animate-spin' : ''}`} />
              Reset AI Categories
            </button>
            <button 
              onClick={refreshTransactions}
              disabled={refreshing}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm rounded-lg flex items-center gap-2 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Webhook Tester */}
      {showWebhookTester && (
        <div className="mb-6">
          <WebhookTester />
        </div>
      )}

      {/* Clean Transaction Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Date
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Transaction
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Account
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Category
              </th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Amount
              </th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800">
            {filteredTransactions.map((tx) => {
              return (
                <tr 
                  key={tx.id} 
                  className={`border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-500 ${
                    tx.recently_categorized ? 'bg-green-50 dark:bg-green-900/10' : ''
                  }`}
                >
                  {/* Date Column */}
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm text-gray-900 dark:text-gray-100">
                        {format(new Date(tx.transaction_date), 'MMM d')}
                      </p>
                      {tx.status === 'pending' && (
                        <span className="inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300">
                          Pending
                        </span>
                      )}
                    </div>
                  </td>
                  
                  {/* Transaction Column */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="relative w-8 h-8 flex-shrink-0">
                        {tx.merchant_logo_url ? (
                          <img 
                            src={tx.merchant_logo_url} 
                            alt={tx.merchant_name || 'Merchant'}
                            className="w-8 h-8 rounded-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent && !parent.querySelector('.fallback-logo')) {
                                const fallback = document.createElement('div');
                                fallback.className = 'fallback-logo w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white';
                                fallback.style.background = getMerchantColor(tx.merchant_name || '');
                                fallback.textContent = getMerchantInitials(tx.merchant_name || '');
                                parent.appendChild(fallback);
                              }
                            }}
                          />
                        ) : null}
                        <div 
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white ${tx.merchant_logo_url ? 'hidden' : ''}`}
                          style={{ background: getMerchantColor(tx.merchant_name || '') }}
                        >
                          {getMerchantInitials(tx.merchant_name || '')}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {getCleanMerchantName(tx.merchant_name) || 'Unknown Transaction'}
                        </p>
                        {tx.description && tx.description !== tx.merchant_name && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">
                            {tx.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  
                  {/* Account Column */}
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {tx.account_name}
                    </div>
                  </td>
                  
                  {/* Category Column */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {editingCategoryId === tx.id ? (
                        <CategorySelectorFinal
                          categories={categories}
                          value={tx.user_category_secondary || tx.user_category_primary || tx.ai_category_secondary || tx.ai_category_primary || ''}
                          onChange={(categoryId) => {
                            handleCategoryChange(tx.id, categoryId);
                            setEditingCategoryId(null);
                          }}
                          className="min-w-[200px]"
                        />
                      ) : (
                        <button
                          onClick={() => setEditingCategoryId(tx.id)}
                          className="text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded px-2 py-1 -mx-2 -my-1 transition-colors"
                        >
                          <CategoryDisplaySimple
                            transaction={tx}
                            categories={categories}
                            className="text-sm"
                          />
                        </button>
                      )}
                    </div>
                  </td>
                  
                  {/* Amount Column */}
                  <td className={`px-6 py-4 text-sm font-medium text-right ${
                    tx.direction === 'inflow' ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-gray-100'
                  }`}>
                    {tx.direction === 'inflow' ? '+' : ''}
                    {formatCurrency(Math.abs(tx.amount_cents))}
                  </td>
                  
                  <td className="px-6 py-4">
                    <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
                      <MoreVertical className="h-4 w-4 text-gray-400" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Export with React.memo for performance optimization
export const MercuryTransactionsClean = React.memo(MercuryTransactionsCleanComponent);