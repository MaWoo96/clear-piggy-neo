import { supabase } from './supabase';

interface CategorizationRule {
  merchant_pattern: string;
  description_pattern?: string;
  amount_range?: { min: number; max: number };
  category: string;
  confidence: number;
  frequency?: 'monthly' | 'weekly' | 'biweekly';
}

interface TransactionPattern {
  merchant_normalized: string;
  typical_amount: number;
  frequency: string;
  suggested_category: string;
  confidence: number;
}

export class TransactionCategorizer {
  /**
   * Normalize merchant name for better matching
   * Removes special characters, converts to uppercase, removes common suffixes
   */
  static normalizeMerchantName(merchant: string | null): string {
    if (!merchant) return 'UNKNOWN';
    
    return merchant
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize spaces
      .replace(/(INC|LLC|CORP|CO|LTD|COMPANY)$/g, '') // Remove business suffixes
      .replace(/\d{4,}/g, '') // Remove long numbers (like store numbers)
      .replace(/\#\d+/g, '') // Remove reference numbers
      .trim();
  }

  /**
   * Detect rent payments using multiple signals
   */
  static async detectRentPayments(workspaceId: string): Promise<TransactionPattern[]> {
    // Look for large, monthly recurring payments
    const { data: transactions } = await supabase
      .from('feed_transactions')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('direction', 'outflow')
      .eq('status', 'posted')
      .gt('amount_cents', 50000) // > $500 (minimum rent threshold)
      .order('transaction_date', { ascending: false })
      .limit(180); // Last 6 months

    if (!transactions) return [];

    // Group by normalized merchant and amount range
    const patterns = new Map<string, any[]>();
    
    transactions.forEach((tx: any) => {
      const normalizedMerchant = this.normalizeMerchantName(tx.merchant_name || tx.counterparty_name);
      const amountBucket = Math.round(tx.amount_cents / 5000) * 5000; // Round to nearest $50
      const key = `${normalizedMerchant}:${amountBucket}`;
      
      if (!patterns.has(key)) {
        patterns.set(key, []);
      }
      patterns.get(key)!.push(tx);
    });

    const rentPatterns: TransactionPattern[] = [];
    
    // Analyze patterns for rent-like characteristics
    patterns.forEach((txList, key) => {
      if (txList.length >= 2) { // At least 2 occurrences
        // Check if transactions are roughly monthly
        const dates = txList.map(tx => new Date(tx.transaction_date)).sort((a, b) => a.getTime() - b.getTime());
        const daysBetween: number[] = [];
        
        for (let i = 1; i < dates.length; i++) {
          const days = Math.round((dates[i].getTime() - dates[i-1].getTime()) / (1000 * 60 * 60 * 24));
          daysBetween.push(days);
        }
        
        const avgDaysBetween = daysBetween.reduce((a, b) => a + b, 0) / daysBetween.length;
        const isMonthly = avgDaysBetween >= 25 && avgDaysBetween <= 35;
        
        if (isMonthly) {
          const [merchant, amountStr] = key.split(':');
          const amount = parseInt(amountStr);
          
          // High confidence for large monthly payments
          const confidence = amount > 100000 ? 0.9 : 0.7;
          
          rentPatterns.push({
            merchant_normalized: merchant,
            typical_amount: amount,
            frequency: 'monthly',
            suggested_category: 'RENT_AND_UTILITIES',
            confidence
          });
        }
      }
    });

    return rentPatterns;
  }

  /**
   * Detect utility payments using merchant patterns and amounts
   */
  static async detectUtilityPayments(workspaceId: string): Promise<TransactionPattern[]> {
    const utilityKeywords = [
      'ELECTRIC', 'GAS', 'WATER', 'UTILITY', 'UTILITIES',
      'PGE', 'PG&E', 'EDISON', 'POWER', 'ENERGY',
      'COMCAST', 'AT&T', 'VERIZON', 'SPECTRUM', 'COX',
      'WASTE', 'GARBAGE', 'SEWER', 'MUNICIPAL'
    ];

    const { data: transactions } = await supabase
      .from('feed_transactions')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('direction', 'outflow')
      .eq('status', 'posted')
      .order('transaction_date', { ascending: false })
      .limit(180);

    if (!transactions) return [];

    const utilityPatterns: TransactionPattern[] = [];
    const merchantGroups = new Map<string, any[]>();

    transactions.forEach((tx: any) => {
      const normalizedMerchant = this.normalizeMerchantName(tx.merchant_name || tx.counterparty_name);
      const normalizedDesc = (tx.description || '').toUpperCase();
      
      // Check if merchant or description contains utility keywords
      const isUtility = utilityKeywords.some(keyword => 
        normalizedMerchant.includes(keyword) || normalizedDesc.includes(keyword)
      );

      if (isUtility) {
        if (!merchantGroups.has(normalizedMerchant)) {
          merchantGroups.set(normalizedMerchant, []);
        }
        merchantGroups.get(normalizedMerchant)!.push(tx);
      }
    });

    merchantGroups.forEach((txList, merchant) => {
      const avgAmount = txList.reduce((sum, tx) => sum + tx.amount_cents, 0) / txList.length;
      
      utilityPatterns.push({
        merchant_normalized: merchant,
        typical_amount: Math.round(avgAmount),
        frequency: 'monthly',
        suggested_category: 'RENT_AND_UTILITIES',
        confidence: 0.85
      });
    });

    return utilityPatterns;
  }

  /**
   * Auto-categorize transactions using AI patterns
   */
  static async categorizeTransaction(transaction: any): Promise<{
    category: string;
    confidence: number;
    method: 'ai' | 'rule' | 'pattern' | 'default';
  }> {
    const normalizedMerchant = this.normalizeMerchantName(transaction.merchant_name);
    const amount = Math.abs(transaction.amount_cents);

    // Check for existing rules first
    const { data: rules } = await supabase
      .from('category_rules')
      .select('*')
      .eq('workspace_id', transaction.workspace_id)
      .eq('is_active', true)
      .order('priority');

    if (rules) {
      for (const rule of rules) {
        if (this.matchesRule(transaction, rule)) {
          return {
            category: (rule as any).category_id,
            confidence: (rule as any).confidence,
            method: 'rule'
          };
        }
      }
    }

    // AI-based categorization using patterns
    const category = await this.aiCategorize(normalizedMerchant, amount, transaction.description);
    
    if (category) {
      return {
        category: category.category,
        confidence: category.confidence,
        method: 'ai'
      };
    }

    // Use Plaid's category as fallback
    if (transaction.personal_finance_category_primary) {
      return {
        category: transaction.personal_finance_category_primary,
        confidence: transaction.personal_finance_category_confidence || 0.5,
        method: 'default'
      };
    }

    return {
      category: 'GENERAL_MERCHANDISE',
      confidence: 0.3,
      method: 'default'
    };
  }

  /**
   * AI categorization based on merchant patterns
   */
  private static async aiCategorize(
    merchant: string, 
    amount: number, 
    description?: string
  ): Promise<{ category: string; confidence: number } | null> {
    // Common merchant patterns
    const patterns: CategorizationRule[] = [
      // Rent patterns
      { merchant_pattern: 'PROPERTY|MANAGEMENT|APARTMENT|REALTY', category: 'RENT_AND_UTILITIES', confidence: 0.9 },
      { merchant_pattern: 'RENT|LEASE|LANDLORD', category: 'RENT_AND_UTILITIES', confidence: 0.95 },
      
      // Utilities
      { merchant_pattern: 'ELECTRIC|GAS|WATER|UTILITY|PGE|EDISON', category: 'RENT_AND_UTILITIES', confidence: 0.9 },
      { merchant_pattern: 'COMCAST|ATT|VERIZON|SPECTRUM|INTERNET|CABLE', category: 'RENT_AND_UTILITIES', confidence: 0.85 },
      
      // Loans
      { merchant_pattern: 'LOAN|LENDING|CREDIT|MORTGAGE|STUDENT', category: 'LOAN_PAYMENTS', confidence: 0.9 },
      { merchant_pattern: 'BANK.*PAYMENT|AUTO.*LOAN|CAR.*PAYMENT', category: 'LOAN_PAYMENTS', confidence: 0.85 },
      
      // Food
      { merchant_pattern: 'GROCERY|SUPERMARKET|MARKET|WHOLE FOODS|TRADER JOE|SAFEWAY|KROGER', category: 'FOOD_AND_DRINK', confidence: 0.9 },
      { merchant_pattern: 'RESTAURANT|CAFE|COFFEE|STARBUCKS|MCDONALDS|SUBWAY', category: 'FOOD_AND_DRINK', confidence: 0.85 },
      
      // Transportation
      { merchant_pattern: 'UBER|LYFT|TAXI|TRANSIT|METRO|PARKING', category: 'TRANSPORTATION', confidence: 0.85 },
      { merchant_pattern: 'GAS|FUEL|SHELL|CHEVRON|EXXON|BP', category: 'TRANSPORTATION', confidence: 0.9 },
      
      // Entertainment
      { merchant_pattern: 'NETFLIX|SPOTIFY|HULU|DISNEY|AMAZON PRIME|YOUTUBE', category: 'ENTERTAINMENT', confidence: 0.95 },
      { merchant_pattern: 'MOVIE|THEATER|CINEMA|CONCERT|TICKET', category: 'ENTERTAINMENT', confidence: 0.85 },
      
      // Medical
      { merchant_pattern: 'HOSPITAL|CLINIC|DOCTOR|MEDICAL|PHARMACY|CVS|WALGREENS', category: 'MEDICAL', confidence: 0.9 },
      { merchant_pattern: 'DENTAL|OPTOMETRY|HEALTH|WELLNESS', category: 'MEDICAL', confidence: 0.85 },
    ];

    for (const pattern of patterns) {
      const regex = new RegExp(pattern.merchant_pattern);
      if (regex.test(merchant)) {
        // Boost confidence for amount-based patterns
        let confidence = pattern.confidence;
        
        // Large recurring amounts likely rent
        if (pattern.category === 'RENT_AND_UTILITIES' && amount > 100000) {
          confidence = Math.min(confidence + 0.1, 1.0);
        }
        
        return { category: pattern.category, confidence };
      }
    }

    return null;
  }

  /**
   * Check if transaction matches a rule
   */
  private static matchesRule(transaction: any, rule: any): boolean {
    const value = rule.condition_type === 'merchant_name' 
      ? this.normalizeMerchantName(transaction.merchant_name)
      : transaction[rule.condition_type];

    switch (rule.rule_type) {
      case 'contains':
        return value?.includes(rule.condition_value);
      case 'equals':
        return value === rule.condition_value;
      case 'starts_with':
        return value?.startsWith(rule.condition_value);
      case 'regex':
        return new RegExp(rule.pattern).test(value);
      default:
        return false;
    }
  }

  /**
   * Learn from user corrections to improve categorization
   */
  static async learnFromCorrection(
    transactionId: string,
    correctCategory: string,
    workspaceId: string
  ): Promise<void> {
    const { data: transaction } = await supabase
      .from('feed_transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (!transaction) return;

    const normalizedMerchant = this.normalizeMerchantName((transaction as any).merchant_name);

    // Check if we should create a rule for this merchant
    const { data: similarTransactions } = await supabase
      .from('feed_transactions')
      .select('*')
      .eq('workspace_id', workspaceId)
      .ilike('merchant_name', `%${normalizedMerchant}%`)
      .limit(10);

    if (similarTransactions && similarTransactions.length >= 3) {
      // Create a rule for this merchant
      await (supabase as any)
        .from('category_rules')
        .insert({
          workspace_id: workspaceId,
          rule_name: `Auto-learned: ${normalizedMerchant}`,
          condition_type: 'merchant_name',
          condition_value: normalizedMerchant,
          rule_type: 'contains',
          category_id: correctCategory,
          priority: 50, // Medium priority for learned rules
          confidence: 0.8,
          is_active: true
        });
    }
  }

  /**
   * Bulk categorize uncategorized transactions
   */
  static async bulkCategorize(workspaceId: string): Promise<number> {
    const { data: transactions } = await supabase
      .from('feed_transactions')
      .select('*')
      .eq('workspace_id', workspaceId)
      .or('personal_finance_category_primary.is.null,personal_finance_category_primary.eq.')
      .limit(100);

    if (!transactions) return 0;

    let categorizedCount = 0;

    for (const tx of transactions) {
      const result = await this.categorizeTransaction(tx);
      
      if (result.confidence > 0.7) {
        await (supabase as any)
          .from('feed_transactions')
          .update({
            personal_finance_category_primary: result.category,
            personal_finance_category_confidence: result.confidence
          })
          .eq('id', (tx as any).id);
        
        categorizedCount++;
      }
    }

    return categorizedCount;
  }
}