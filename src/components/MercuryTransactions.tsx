import React, { useState, useEffect, useMemo } from 'react';
import { supabase, formatCurrency } from '../lib/supabase';
import { format, startOfMonth, endOfMonth, subMonths, eachDayOfInterval } from 'date-fns';
import { 
  Filter, Download, Search, ChevronDown, 
  RefreshCw, Tag, Brain,
  Receipt, Paperclip,
  ArrowUpRight, ArrowDownLeft,
  AlertCircle, CheckCircle, XCircle
} from 'lucide-react';
import { useWorkspace } from '../hooks/useWorkspace';
import { TransactionChart } from './TransactionChart';
// import { TransactionFeedback } from './transactions/TransactionFeedback';
import { useAIProfile } from '../hooks/useAIProfile';
import { syncAllTransactions } from '../services/syncTransactions';

interface Transaction {
  id: string;
  transaction_date: string;
  merchant_name: string | null;
  merchant_logo_url: string | null;
  amount_cents: number;
  direction: 'inflow' | 'outflow';
  status?: 'posted' | 'pending';
  personal_finance_category_primary: string | null;
  personal_finance_category_confidence: number | null;
  user_category_primary?: string | null;
  ai_category_primary?: string | null;
  ai_category_confidence?: number | null;
  bank_account_id: string;
  account_name?: string;
  tags?: string[];
  has_receipt?: boolean;
  selected?: boolean;
  recently_categorized?: boolean;
}

const AI_CATEGORIES = [
  // Living Expenses
  'Rent/Mortgage',
  'Utilities',
  'Insurance',
  
  // Food & Dining
  'Groceries',
  'Restaurants',
  'Coffee Shops',
  'Food Delivery',
  
  // Transportation
  'Gas/Fuel',
  'Public Transit',
  'Rideshare',
  'Parking',
  'Auto Maintenance',
  
  // Shopping
  'Clothing',
  'Electronics',
  'Home Goods',
  'Online Shopping',
  
  // Entertainment
  'Streaming Services',
  'Movies/Events',
  'Gaming',
  'Hobbies',
  
  // Health & Wellness
  'Healthcare',
  'Pharmacy',
  'Gym/Fitness',
  'Personal Care',
  
  // Financial
  'Loan Payment',
  'Credit Card',
  'Investment',
  'Savings',
  'Bank Fees',
  
  // Income
  'Salary',
  'Freelance',
  'Refund',
  'Other Income',
  
  // Other
  'Subscription',
  'Education',
  'Gifts',
  'Charity',
  'Miscellaneous',
  'Transfer'
];

export const MercuryTransactions: React.FC = () => {
  const { workspace } = useWorkspace();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dateRange, setDateRange] = useState('this_month');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [categorizing, setCategorizing] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [categoryMap, setCategoryMap] = useState<Map<string, any>>(new Map());
  const [showAISetupPrompt, setShowAISetupPrompt] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<{ type: 'success' | 'error' | 'info' | 'warning'; text: string } | null>(null);
  
  // AI Profile hook
  const { profile, loading: profileLoading } = useAIProfile(workspace?.id || '');

  useEffect(() => {
    if (workspace?.id) {
      loadTransactions();
      loadCategories();
      // Check if AI profile exists
      if (!profileLoading && !profile) {
        setShowAISetupPrompt(true);
      }
    }
  }, [workspace?.id, dateRange]);
  
  const loadCategories = async () => {
    if (!workspace?.id) return;
    
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('parent_category_id', { ascending: true, nullsFirst: true })
      .order('name');
    
    if (data) {
      setCategories(data);
      
      // Create a map for quick lookup
      const catMap = new Map<string, any>();
      data.forEach((cat: any) => {
        catMap.set(cat.id, cat);
      });
      setCategoryMap(catMap);
    }
  };

  const loadTransactions = async () => {
    if (!workspace?.id) return;
    
    setLoading(true);
    try {
      let startDate, endDate;
      const now = new Date();
      
      switch(dateRange) {
        case 'this_month':
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
          break;
        case 'last_month':
          startDate = startOfMonth(subMonths(now, 1));
          endDate = endOfMonth(subMonths(now, 1));
          break;
        case 'last_90':
          startDate = subMonths(now, 3);
          endDate = now;
          break;
        default:
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
      }

      const { data, error } = await supabase
        .from('feed_transactions')
        .select(`
          *,
          bank_accounts!inner(name, mask)
        `)
        .eq('workspace_id', workspace.id)
        .in('status', ['posted', 'pending'])  // Include both posted and pending transactions
        .gte('transaction_date', startDate.toISOString().split('T')[0])
        .lte('transaction_date', endDate.toISOString().split('T')[0])
        .order('transaction_date', { ascending: false })
        .limit(500);

      if (error) throw error;

      const formattedData = (data || []).map((tx: any) => ({
        ...tx,
        account_name: tx.bank_accounts?.name || 'Unknown Account',
        has_receipt: Math.random() > 0.8,
        tags: [],
        // Initialize AI category from Plaid category if not already set
        ai_category_primary: tx.ai_category_primary || 'Uncategorized',
        ai_category_confidence: tx.ai_category_confidence || 0.5
      }));

      setTransactions(formattedData);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshTransactions = async () => {
    setRefreshing(true);
    setRefreshMessage({ type: 'info', text: 'Refreshing transactions from your banks...' });
    
    try {
      // First, trigger Plaid refresh to get latest data from banks
      console.log('Triggering Plaid refresh for workspace:', workspace?.id);
      
      const { data: refreshResult, error: refreshError } = await supabase.functions.invoke(
        'workspace-refresh-transactions',
        {
          body: { workspace_id: workspace?.id }
        }
      );
      
      if (refreshError) {
        console.error('Error refreshing from Plaid:', refreshError);
        setRefreshMessage({ 
          type: 'error', 
          text: 'Failed to refresh transactions. Please try again.' 
        });
      } else {
        console.log('Plaid refresh result:', refreshResult);
        
        // Show success message if refresh was successful
        if (refreshResult?.success) {
          const message = refreshResult.message || 'Transactions refreshed successfully';
          setRefreshMessage({ 
            type: 'success', 
            text: `✓ ${message}` 
          });
        } else if (refreshResult?.message === 'No connected institutions found.') {
          setRefreshMessage({ 
            type: 'info', 
            text: 'No connected bank accounts found. Connect an account to sync transactions.' 
          });
        }
      }
      
      // Wait a moment for webhook updates to process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Now load the updated transactions from database
      await loadTransactions();
      
    } catch (error) {
      console.error('Error during refresh:', error);
      setRefreshMessage({ 
        type: 'error', 
        text: 'An error occurred while refreshing. Please try again.' 
      });
      // Still try to load existing transactions even if refresh failed
      await loadTransactions();
    } finally {
      setRefreshing(false);
      // Clear message after 5 seconds
      setTimeout(() => setRefreshMessage(null), 5000);
    }
  };

  const syncAllRecentTransactions = async () => {
    setRefreshing(true);
    setRefreshMessage({ type: 'info', text: 'Syncing all recent transactions (last 30 days)...' });
    
    try {
      if (!workspace?.id) {
        throw new Error('No workspace selected');
      }
      
      // Call the sync all function
      const result = await syncAllTransactions(workspace.id);
      
      if (result?.success) {
        setRefreshMessage({ 
          type: 'success', 
          text: `✓ Synced ${result.total_synced || 0} transactions from ${result.institutions_synced || 0} institution(s)` 
        });
      } else {
        setRefreshMessage({ 
          type: 'warning', 
          text: 'Sync completed with some issues. Check console for details.' 
        });
      }
      
      // Wait for data to be processed
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Reload transactions
      await loadTransactions();
      
    } catch (error) {
      console.error('Error during full sync:', error);
      setRefreshMessage({ 
        type: 'error', 
        text: 'Failed to sync transactions. Please try again.' 
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
        tx.personal_finance_category_primary?.toLowerCase().includes(query) ||
        formatCurrency(Math.abs(tx.amount_cents)).includes(query)
      );
    }
    
    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(tx => {
        // Check user category, AI category, or Plaid category
        const userCat = (tx as any).user_category_primary;
        const aiCat = tx.ai_category_primary;
        const plaidCat = tx.personal_finance_category_primary;
        
        // If it's a parent category, check if any transaction category matches
        const category = categoryMap.get(selectedCategory);
        if (category) {
          // Check if transaction matches this category or any of its children
          const categoryIds = [selectedCategory];
          // Add child categories
          categories
            .filter(c => c.parent_category_id === selectedCategory)
            .forEach(c => categoryIds.push(c.id));
          
          return (userCat && categoryIds.includes(userCat)) || 
                 (aiCat && categoryIds.includes(aiCat)) ||
                 (plaidCat && category.name.toLowerCase() === plaidCat.toLowerCase());
        }
        return false;
      });
    }
    
    // Filter by subcategory
    if (selectedSubcategory !== 'all') {
      filtered = filtered.filter(tx => {
        const userCat = (tx as any).user_category_primary;
        const aiCat = tx.ai_category_primary;
        return (userCat && userCat === selectedSubcategory) || 
               (aiCat && aiCat === selectedSubcategory);
      });
    }
    
    return filtered;
  }, [transactions, searchQuery, selectedCategory, selectedSubcategory, categories, categoryMap]);

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

  const chartData = useMemo(() => {
    if (transactions.length === 0) return [];
    
    // Get date range for the chart
    const dates = transactions.map(tx => new Date(tx.transaction_date));
    if (dates.length === 0) return [];
    
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    // Create daily intervals
    const days = eachDayOfInterval({ start: minDate, end: maxDate });
    
    // Group transactions by day for efficiency
    const transactionsByDay = new Map<string, Transaction[]>();
    transactions.forEach(tx => {
      const dateKey = format(new Date(tx.transaction_date), 'yyyy-MM-dd');
      if (!transactionsByDay.has(dateKey)) {
        transactionsByDay.set(dateKey, []);
      }
      transactionsByDay.get(dateKey)!.push(tx);
    });
    
    // Calculate cumulative amounts for each day
    return days.map(day => {
      const dateKey = format(day, 'yyyy-MM-dd');
      const dayTransactions = transactionsByDay.get(dateKey) || [];
      
      const dayInflow = dayTransactions
        .filter(tx => tx.direction === 'inflow')
        .reduce((sum, tx) => sum + Math.abs(tx.amount_cents), 0);
      
      const dayOutflow = dayTransactions
        .filter(tx => tx.direction === 'outflow')
        .reduce((sum, tx) => sum + Math.abs(tx.amount_cents), 0);
      
      return {
        date: format(day, 'MMM d'),
        inflow: dayInflow / 100,
        outflow: dayOutflow / 100
      };
    }).filter((_, index, array) => {
      // Only show every nth point if we have too many days to prevent crowding
      if (array.length > 30) {
        return index % Math.ceil(array.length / 30) === 0 || index === array.length - 1;
      }
      return true;
    });
  }, [transactions]);

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredTransactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTransactions.map(tx => tx.id)));
    }
  };
  
  const handleCategoryChanged = (transactionId: string, newCategoryId: string) => {
    // Update the local state to reflect the change
    setTransactions(prev => prev.map(tx => 
      tx.id === transactionId 
        ? { ...tx, ai_category_primary: categories.find(c => c.id === newCategoryId)?.name || 'Uncategorized' }
        : tx
    ));
  };

  const getMerchantInitials = (name: string | null) => {
    if (!name) return '?';
    const words = name.split(' ').filter(w => w.length > 0);
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    return words.slice(0, 2).map(w => w[0]).join('').toUpperCase();
  };

  const formatCategory = (category: string | null) => {
    if (!category) return 'Uncategorized';
    return category.split('_').map(word => 
      word.charAt(0) + word.slice(1).toLowerCase()
    ).join(' ');
  };

  const determineAICategory = (plaidCategory: string | null, merchantName: string | null): { category: string, confidence: number } => {
    const merchantLower = merchantName?.toLowerCase() || '';
    
    // Check merchant-specific patterns first for highest confidence
    
    // Rent/Mortgage
    if (merchantLower.includes('property') || merchantLower.includes('management') || 
        merchantLower.includes('apartment') || merchantLower.includes('realty') ||
        merchantLower.includes('rent') || merchantLower.includes('lease')) {
      return { category: 'Rent/Mortgage', confidence: 0.95 };
    }
    
    // Utilities
    if (merchantLower.includes('electric') || merchantLower.includes('gas company') || 
        merchantLower.includes('water') || merchantLower.includes('utility') ||
        merchantLower.includes('pg&e') || merchantLower.includes('edison')) {
      return { category: 'Utilities', confidence: 0.95 };
    }
    
    // Streaming Services
    if (merchantLower.includes('netflix') || merchantLower.includes('spotify') || 
        merchantLower.includes('hulu') || merchantLower.includes('disney') ||
        merchantLower.includes('amazon prime') || merchantLower.includes('youtube')) {
      return { category: 'Streaming Services', confidence: 0.95 };
    }
    
    // Coffee Shops
    if (merchantLower.includes('starbucks') || merchantLower.includes('coffee') || 
        merchantLower.includes('cafe') || merchantLower.includes('dunkin')) {
      return { category: 'Coffee Shops', confidence: 0.95 };
    }
    
    // Groceries
    if (merchantLower.includes('grocery') || merchantLower.includes('safeway') || 
        merchantLower.includes('kroger') || merchantLower.includes('whole foods') ||
        merchantLower.includes('trader joe') || merchantLower.includes('market')) {
      return { category: 'Groceries', confidence: 0.95 };
    }
    
    // Restaurants
    if (merchantLower.includes('restaurant') || merchantLower.includes('kitchen') || 
        merchantLower.includes('grill') || merchantLower.includes('pizza') ||
        merchantLower.includes('burger') || merchantLower.includes('sushi')) {
      return { category: 'Restaurants', confidence: 0.9 };
    }
    
    // Food Delivery
    if (merchantLower.includes('doordash') || merchantLower.includes('uber eats') || 
        merchantLower.includes('grubhub') || merchantLower.includes('postmates')) {
      return { category: 'Food Delivery', confidence: 0.95 };
    }
    
    // Rideshare
    if (merchantLower.includes('uber') || merchantLower.includes('lyft')) {
      return { category: 'Rideshare', confidence: 0.95 };
    }
    
    // Gas/Fuel
    if (merchantLower.includes('shell') || merchantLower.includes('chevron') || 
        merchantLower.includes('exxon') || merchantLower.includes('gas station') ||
        merchantLower.includes('fuel')) {
      return { category: 'Gas/Fuel', confidence: 0.95 };
    }
    
    // Online Shopping
    if (merchantLower.includes('amazon') || merchantLower.includes('ebay') || 
        merchantLower.includes('etsy') || merchantLower.includes('shopify')) {
      return { category: 'Online Shopping', confidence: 0.9 };
    }
    
    // Healthcare
    if (merchantLower.includes('hospital') || merchantLower.includes('clinic') || 
        merchantLower.includes('doctor') || merchantLower.includes('medical')) {
      return { category: 'Healthcare', confidence: 0.95 };
    }
    
    // Pharmacy
    if (merchantLower.includes('cvs') || merchantLower.includes('walgreens') || 
        merchantLower.includes('pharmacy') || merchantLower.includes('rite aid')) {
      return { category: 'Pharmacy', confidence: 0.95 };
    }
    
    // Gym/Fitness
    if (merchantLower.includes('gym') || merchantLower.includes('fitness') || 
        merchantLower.includes('yoga') || merchantLower.includes('crossfit')) {
      return { category: 'Gym/Fitness', confidence: 0.95 };
    }
    
    // Investment
    if (merchantLower.includes('vanguard') || merchantLower.includes('fidelity') || 
        merchantLower.includes('robinhood') || merchantLower.includes('etrade')) {
      return { category: 'Investment', confidence: 0.95 };
    }
    
    // Map Plaid categories to specific AI categories
    const categoryMap: Record<string, string> = {
      'RENT_AND_UTILITIES': 'Rent/Mortgage',
      'LOAN_PAYMENTS': 'Loan Payment',
      'FOOD_AND_DRINK': 'Restaurants',
      'TRANSPORTATION': 'Gas/Fuel',
      'ENTERTAINMENT': 'Movies/Events',
      'MEDICAL': 'Healthcare',
      'PERSONAL_CARE': 'Personal Care',
      'GENERAL_MERCHANDISE': 'Online Shopping',
      'INCOME': 'Salary',
      'TRANSFER_IN': 'Transfer',
      'TRANSFER_OUT': 'Transfer',
      'BANK_FEES': 'Bank Fees',
      'TAX': 'Miscellaneous',
      'INSURANCE': 'Insurance',
      'TRAVEL': 'Miscellaneous',
      'GENERAL_SERVICES': 'Subscription',
      'GROCERIES': 'Groceries',
      'CASH_ADVANCE': 'Loan Payment',
      'GOVERNMENT_AND_NON_PROFIT': 'Charity'
    };
    
    // Use Plaid category mapping
    if (plaidCategory && categoryMap[plaidCategory]) {
      return { category: categoryMap[plaidCategory], confidence: 0.8 };
    }
    
    // Default to Miscellaneous with lower confidence
    return { category: 'Miscellaneous', confidence: 0.5 };
  };

  const handleAICategorize = async () => {
    if (!workspace?.id) return;
    
    setCategorizing(true);
    
    // Clear previous highlights
    setTransactions(prev => prev.map(tx => ({ ...tx, recently_categorized: false })));
    
    try {
      // Get ALL transactions to categorize (not just uncategorized)
      // This ensures we re-categorize everything when button is clicked
      const transactionIds = transactions.map(tx => tx.id);
      
      // Call the Edge Function with AI profile context if available
      const { data, error } = await supabase.functions.invoke('categorize-transactions', {
        body: {
          workspace_id: workspace.id,
          transaction_ids: transactionIds,
          learn_from_history: true,
          use_ai_profile: !!profile,
          profile_id: profile?.id
        }
      });
      
      if (error) {
        console.error('Categorization error:', error);
        // Fallback to local categorization
        const categorizedTransactions = transactions.map(tx => {
          const { category, confidence } = determineAICategory(
            tx.personal_finance_category_primary,
            tx.merchant_name
          );
          
          return {
            ...tx,
            ai_category_primary: category,
            ai_category_confidence: confidence,
            recently_categorized: true
          };
        });
        
        setTransactions(categorizedTransactions);
      } else if (data) {
        console.log('Categorization response:', data);
        
        // Create a map of categorized transactions from the response
        const categorizedMap = new Map();
        if (data.summary && Array.isArray(data.summary)) {
          data.summary.forEach((item: any) => {
            categorizedMap.set(item.id, {
              category: item.category,
              confidence: item.confidence
            });
          });
        }
        
        // Update transactions with categorization results
        const categorizedTransactions = transactions.map(tx => {
          const categorization = categorizedMap.get(tx.id);
          
          if (categorization) {
            // Use the Edge Function's categorization
            return {
              ...tx,
              ai_category_primary: mapPlaidToAICategory(categorization.category),
              ai_category_confidence: categorization.confidence,
              recently_categorized: true
            };
          } else {
            // Fallback to local categorization for transactions not in response
            const { category, confidence } = determineAICategory(
              tx.personal_finance_category_primary,
              tx.merchant_name
            );
            
            return {
              ...tx,
              ai_category_primary: category,
              ai_category_confidence: confidence,
              recently_categorized: true
            };
          }
        });
        
        setTransactions(categorizedTransactions);
        
        // Don't reload - keep the categorized data in state
        // The AI categories are stored locally in the component state
      }
      
      // Remove highlight after 3 seconds
      setTimeout(() => {
        setTransactions(prev => prev.map(tx => ({ ...tx, recently_categorized: false })));
      }, 3000);
      
    } catch (error) {
      console.error('Error categorizing transactions:', error);
    } finally {
      setCategorizing(false);
    }
  };
  
  // Map Plaid categories to specific AI categories
  const mapPlaidToAICategory = (plaidCategory: string): string => {
    const mapping: Record<string, string> = {
      'RENT_AND_UTILITIES': 'Rent/Mortgage',
      'LOAN_PAYMENTS': 'Loan Payment',
      'FOOD_AND_DRINK': 'Restaurants',
      'TRANSPORTATION': 'Gas/Fuel',
      'ENTERTAINMENT': 'Movies/Events',
      'MEDICAL': 'Healthcare',
      'PERSONAL_CARE': 'Personal Care',
      'GENERAL_MERCHANDISE': 'Online Shopping',
      'GENERAL_SERVICES': 'Subscription',
      'TRANSFER_OUT': 'Transfer',
      'TRANSFER_IN': 'Transfer',
      'INCOME': 'Salary',
      'INSURANCE': 'Insurance',
      'BANK_FEES': 'Bank Fees',
      'TAX': 'Miscellaneous',
      'CASH_ADVANCE': 'Loan Payment',
      'GROCERIES': 'Groceries',
      'TRAVEL': 'Miscellaneous',
      'GOVERNMENT_AND_NON_PROFIT': 'Charity'
    };
    
    return mapping[plaidCategory] || 'Miscellaneous';
  };

  if (loading && transactions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500 dark:text-gray-400">Loading transactions...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* AI Setup Prompt */}
      {showAISetupPrompt && !profile && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Get Better AI Categorization
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Set up your AI profile for personalized transaction categorization (takes 1 minute)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  // Navigate to AI profile setup
                  window.location.href = '/settings/ai-profile';
                }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg"
              >
                Set Up Now
              </button>
              <button
                onClick={() => setShowAISetupPrompt(false)}
                className="px-3 py-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-sm rounded-lg"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Refresh Message Toast */}
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
      
      {/* Stats Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="grid grid-cols-3 gap-4 mb-4">
          {/* Left: Financial Stats */}
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Net Change This Month</p>
              <p className={`text-2xl font-semibold ${stats.netChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {stats.netChange >= 0 ? '+' : '-'}${Math.abs(stats.netChange / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ArrowDownLeft className="h-3 w-3 text-green-600 dark:text-green-400" />
                <span className="text-xs text-gray-500 dark:text-gray-400">Money in</span>
                <span className="text-xs font-medium text-green-600 dark:text-green-400 ml-auto">
                  ${(stats.moneyIn / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <ArrowUpRight className="h-3 w-3 text-red-600 dark:text-red-400" />
                <span className="text-xs text-gray-500 dark:text-gray-400">Money out</span>
                <span className="text-xs font-medium text-red-600 dark:text-red-400 ml-auto">
                  -${(stats.moneyOut / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
          
          {/* Center: Chart */}
          <div className="col-span-2">
            <TransactionChart data={chartData} height={120} />
          </div>
        </div>
        
        {/* Action Buttons and Filters */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <select 
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="appearance-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-300 text-sm px-3 py-1.5 pr-8 rounded-lg border border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none"
              >
                <option value="this_month">This Month</option>
                <option value="last_month">Last Month</option>
                <option value="last_90">Last 90 Days</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400 pointer-events-none" />
            </div>
            
            {/* Category Filter */}
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setSelectedSubcategory('all'); // Reset subcategory when parent changes
                }}
                className="appearance-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-300 text-sm px-3 py-1.5 pr-8 rounded-lg border border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none min-w-[150px]"
              >
                <option value="all">All Categories</option>
                {categories
                  .filter(cat => !cat.parent_category_id) // Only parent categories
                  .map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400 pointer-events-none" />
            </div>
            
            {/* Subcategory Filter - Only show if a parent category is selected */}
            {selectedCategory !== 'all' && (
              <div className="relative">
                <select
                  value={selectedSubcategory}
                  onChange={(e) => setSelectedSubcategory(e.target.value)}
                  className="appearance-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-300 text-sm px-3 py-1.5 pr-8 rounded-lg border border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none min-w-[150px]"
                >
                  <option value="all">All Subcategories</option>
                  {categories
                    .filter(cat => cat.parent_category_id === selectedCategory)
                    .map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400 pointer-events-none" />
              </div>
            )}

            <button className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
              <Filter className="h-4 w-4" />
              Filters
            </button>

            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-300 text-sm rounded-lg border border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>
          </div>
          
          {/* Filter Summary */}
          {(selectedCategory !== 'all' || searchQuery) && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <span>Showing {filteredTransactions.length} of {transactions.length} transactions</span>
              {(selectedCategory !== 'all' || searchQuery) && (
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    setSelectedSubcategory('all');
                    setSearchQuery('');
                  }}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <button 
              onClick={refreshTransactions}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Quick refresh"
            >
              <RefreshCw className={`h-4 w-4 text-gray-600 dark:text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button 
              onClick={syncAllRecentTransactions}
              disabled={refreshing}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white text-sm rounded-lg flex items-center gap-2 transition-colors"
              title="Sync all transactions from the last 30 days"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Sync All
            </button>
            <button className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-lg flex items-center gap-2 transition-colors">
              <Receipt className="h-4 w-4" />
              Match Receipts
            </button>
            <button 
              onClick={handleAICategorize}
              disabled={categorizing}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm rounded-lg flex items-center gap-2 transition-colors"
            >
              {categorizing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Brain className="h-4 w-4" />
              )}
              {categorizing ? 'Categorizing...' : 'AI Categorize'}
            </button>
            <button className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-lg flex items-center gap-2 transition-colors">
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="flex-1 overflow-auto bg-white dark:bg-gray-800">
        <table className="w-full">
          <thead className="sticky top-0 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="text-left p-4 w-10">
                <input
                  type="checkbox"
                  checked={selectedIds.size === filteredTransactions.length && filteredTransactions.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
                />
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Transaction</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Plaid Category</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">AI Category</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tags</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.map((tx) => (
              <tr 
                key={tx.id} 
                className={`border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-500 ${
                  tx.recently_categorized ? 'bg-blue-50 dark:bg-blue-900/20 animate-pulse' : ''
                }`}
              >
                <td className="p-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(tx.id)}
                    onChange={() => toggleSelect(tx.id)}
                    className="rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
                  />
                </td>
                <td className="px-4 py-2">
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {format(new Date(tx.transaction_date), 'MMM d')}
                    </span>
                    {tx.status === 'pending' && (
                      <span className="text-[10px] text-yellow-600 dark:text-yellow-400 font-medium">
                        PENDING
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-3">
                    {tx.merchant_logo_url ? (
                      <img 
                        src={tx.merchant_logo_url} 
                        alt=""
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                          {getMerchantInitials(tx.merchant_name)}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {tx.merchant_name || 'Unknown Merchant'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{tx.account_name}</p>
                    </div>
                  </div>
                </td>
                <td className={`px-4 py-2 text-sm font-medium text-right ${
                  tx.direction === 'inflow' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {tx.direction === 'inflow' ? '+' : '-'}
                  {formatCurrency(Math.abs(tx.amount_cents))}
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-1">
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded">
                      {formatCategory(tx.personal_finance_category_primary)}
                    </span>
                    {tx.personal_finance_category_confidence && (
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">
                        {Math.round(tx.personal_finance_category_confidence * 100)}%
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    {/* Display current AI category with hierarchy */}
                    <div className={`flex items-center gap-1 ${tx.recently_categorized ? 'animate-pulse' : ''}`}>
                      {(() => {
                        const category = categories.find(c => c.id === tx.ai_category_primary || c.name === tx.ai_category_primary);
                        const parentCategory = category?.parent_category_id ? categoryMap.get(category.parent_category_id) : null;
                        
                        if (parentCategory) {
                          // Hierarchical display with parent → child
                          return (
                            <div className="inline-flex items-center">
                              <span 
                                className="px-2 py-0.5 text-[11px] rounded-l font-medium"
                                style={{
                                  backgroundColor: parentCategory.color ? `${parentCategory.color}20` : '#f3f4f6',
                                  color: parentCategory.color || '#6b7280',
                                  borderLeft: `2px solid ${parentCategory.color || '#d1d5db'}`,
                                  borderTop: `1px solid ${parentCategory.color}30`,
                                  borderBottom: `1px solid ${parentCategory.color}30`
                                }}
                              >
                                {parentCategory.name}
                              </span>
                              <span 
                                className="px-2 py-0.5 text-[11px] rounded-r font-medium relative"
                                style={{
                                  backgroundColor: category?.color ? `${category.color}15` : '#f9fafb',
                                  color: category?.color || '#374151',
                                  borderRight: `2px solid ${category?.color || '#e5e7eb'}`,
                                  borderTop: `1px solid ${category?.color}30`,
                                  borderBottom: `1px solid ${category?.color}30`,
                                  marginLeft: '-1px'
                                }}
                              >
                                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400" style={{ fontSize: '8px', marginLeft: '2px' }}>›</span>
                                <span className="ml-2">{category?.name || 'Unknown'}</span>
                              </span>
                            </div>
                          );
                        } else {
                          // Single category display (no parent)
                          return (
                            <span 
                              className={`px-2.5 py-1 text-xs rounded-md font-medium border ${
                                tx.recently_categorized 
                                  ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                  : ''
                              }`} 
                              style={{
                                borderColor: category?.color || '#e5e7eb',
                                backgroundColor: category?.color ? `${category.color}15` : '#f9fafb',
                                color: category?.color || '#374151'
                              }}
                            >
                              {category?.name || tx.ai_category_primary || 'Uncategorized'}
                            </span>
                          );
                        }
                      })()}
                      {tx.ai_category_confidence && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          tx.ai_category_confidence >= 0.8 
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : tx.ai_category_confidence >= 0.6
                            ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                        }`}>
                          {Math.round(tx.ai_category_confidence * 100)}%
                        </span>
                      )}
                    </div>
                    
                    {/* Transaction Feedback Component - Commented out for now */}
                    {/* {workspace?.id && (
                      <TransactionFeedback
                        transaction={{
                          id: tx.id,
                          merchant_name: tx.merchant_name,
                          amount: tx.amount_cents / 100,
                          category_id: categories.find(c => c.name === tx.ai_category_primary)?.id || null,
                          ai_category: tx.ai_category_primary,
                          ai_confidence: tx.ai_category_confidence,
                          date: tx.transaction_date
                        }}
                        workspaceId={workspace.id}
                        categories={categories}
                        onCategoryChanged={handleCategoryChanged}
                      />
                    )} */}
                  </div>
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-1">
                    {tx.tags?.length ? (
                      tx.tags.map(tag => (
                        <span key={tag} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400 text-xs rounded">
                          {tag}
                        </span>
                      ))
                    ) : (
                      <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
                        <Tag className="h-3 w-3 text-gray-400 dark:text-gray-500" />
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2">
                  {tx.has_receipt && (
                    <Paperclip className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};