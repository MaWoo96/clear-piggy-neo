/**
 * Utility functions for account name formatting and normalization
 */

/**
 * Normalizes account names to a consistent, clean format
 * Examples:
 * - "EVERYDAY CHECKING ...3421" -> "Checking ••3421"
 * - "SAVINGS ACCOUNT ...7658" -> "Savings ••7658"
 * - "CHASE FREEDOM UNLIMITED" -> "Credit Card"
 * 
 * @param accountName - The original account name from Plaid/bank
 * @param accountType - The account type (checking, savings, credit_card, etc.)
 * @param mask - The last 4 digits of the account
 * @returns Normalized account name
 */
export function normalizeAccountName(
  accountName?: string | null,
  accountType?: string | null,
  mask?: string | null
): string {
  // If no account name, use type-based default
  if (!accountName) {
    return formatAccountType(accountType, mask);
  }

  // Clean up the account name
  let normalized = accountName.toUpperCase();
  
  // Extract mask from the name if it exists (to preserve it)
  let extractedMask: string | null = null;
  const maskMatch = normalized.match(/\.{3}(\d{4})$/) || 
                     normalized.match(/••(\d{4})$/) || 
                     normalized.match(/\s+(\d{4})$/);
  if (maskMatch) {
    extractedMask = maskMatch[1];
  }
  
  // Remove any existing mask patterns from the name
  normalized = normalized
    .replace(/\s*\.{3}\d{4}$/, '') // Remove ...3421 pattern
    .replace(/\s*••\d{4}$/, '') // Remove ••3421 pattern
    .replace(/\s*\*{2,}\d{4}$/, '') // Remove **3421 pattern
    .replace(/\s+\d{4}$/, ''); // Remove standalone 4 digits at end

  // Remove common bank prefixes/suffixes
  normalized = normalized
    .replace(/^(EVERYDAY|PERSONAL|BUSINESS|MY|PREMIER|PREMIUM|GOLD|PLATINUM|BASIC)\s+/i, '')
    .replace(/\s+(ACCOUNT|ACCT)$/i, '')
    .replace(/\.\.\./g, ''); // Remove ellipsis

  // Detect account type from name if not provided
  const detectedType = detectAccountType(normalized, accountType);
  
  // Use either the extracted mask from the name, or the provided mask parameter
  // Prefer the provided mask parameter if both exist
  const finalMask = mask || extractedMask;
  
  // Format based on detected type
  switch (detectedType) {
    case 'checking':
      return formatWithMask('Checking', finalMask);
    
    case 'savings':
      return formatWithMask('Savings', finalMask);
    
    case 'credit_card':
      // Try to extract card name
      const cardName = extractCardName(normalized);
      return formatWithMask(cardName || 'Credit Card', finalMask);
    
    case 'loan':
      const loanType = detectLoanType(normalized);
      return formatWithMask(loanType, finalMask);
    
    case 'investment':
      return formatWithMask('Investment', finalMask);
    
    case 'money_market':
      return formatWithMask('Money Market', finalMask);
    
    case 'cd':
      return formatWithMask('CD', finalMask);
    
    default:
      // If we can't determine type, use cleaned name with mask
      const cleanName = normalized
        .split(/\s+/)
        .map(word => word.charAt(0) + word.slice(1).toLowerCase())
        .join(' ')
        .replace(/\s*\d{4}$/, ''); // Remove trailing 4 digits
      
      return formatWithMask(cleanName || 'Account', finalMask);
  }
}

/**
 * Formats account type with proper capitalization
 */
function formatAccountType(accountType?: string | null, mask?: string | null): string {
  if (!accountType) {
    return formatWithMask('Account', mask);
  }

  const typeMap: Record<string, string> = {
    'checking': 'Checking',
    'savings': 'Savings',
    'credit_card': 'Credit Card',
    'credit': 'Credit Card',
    'loan': 'Loan',
    'auto': 'Auto Loan',
    'mortgage': 'Mortgage',
    'investment': 'Investment',
    'brokerage': 'Brokerage',
    'money_market': 'Money Market',
    'cd': 'CD',
    'depository': 'Account',
    'other': 'Account'
  };

  const formatted = typeMap[accountType.toLowerCase()] || 
    accountType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  
  return formatWithMask(formatted, mask);
}

/**
 * Adds mask to account name if available
 */
function formatWithMask(name: string, mask?: string | null): string {
  if (!mask) return name;
  
  // Clean up the mask - remove any dots or spaces
  const cleanMask = mask.toString().replace(/[^\d]/g, '');
  
  // Only use last 4 digits
  const last4 = cleanMask.slice(-4);
  
  if (last4.length === 4) {
    return `${name} ••${last4}`;
  }
  
  return name;
}

/**
 * Detects account type from the account name
 */
function detectAccountType(name: string, providedType?: string | null): string {
  const upperName = name.toUpperCase();
  
  // Use provided type if available and valid
  if (providedType && providedType !== 'depository' && providedType !== 'other') {
    return providedType.toLowerCase();
  }
  
  // Check for specific account types in the name
  if (/CHECKING|CHK|DEBIT/i.test(upperName)) return 'checking';
  if (/SAVINGS|SAV|SAVE/i.test(upperName)) return 'savings';
  if (/CREDIT|CARD|VISA|MASTERCARD|AMEX|DISCOVER/i.test(upperName)) return 'credit_card';
  if (/LOAN|MORTGAGE|AUTO/i.test(upperName)) return 'loan';
  if (/INVEST|BROKERAGE|IRA|401K|RETIREMENT/i.test(upperName)) return 'investment';
  if (/MONEY\s*MARKET|MM/i.test(upperName)) return 'money_market';
  if (/CD|CERTIFICATE/i.test(upperName)) return 'cd';
  
  // Default based on provided type
  return providedType?.toLowerCase() || 'checking';
}

/**
 * Extracts credit card name from account name
 */
function extractCardName(name: string): string | null {
  // Common credit card patterns
  const patterns = [
    { pattern: /CHASE\s+(\w+(?:\s+\w+)?)/i, format: 'Chase $1' },
    { pattern: /CAPITAL\s*ONE\s+(\w+(?:\s+\w+)?)/i, format: 'Capital One $1' },
    { pattern: /BANK\s*OF\s*AMERICA\s+(\w+(?:\s+\w+)?)/i, format: 'BofA $1' },
    { pattern: /WELLS\s*FARGO\s+(\w+(?:\s+\w+)?)/i, format: 'Wells Fargo $1' },
    { pattern: /CITI\s+(\w+(?:\s+\w+)?)/i, format: 'Citi $1' },
    { pattern: /DISCOVER\s+(\w+)?/i, format: 'Discover' },
    { pattern: /AMEX\s+(\w+(?:\s+\w+)?)/i, format: 'Amex $1' },
    { pattern: /AMERICAN\s*EXPRESS\s+(\w+(?:\s+\w+)?)/i, format: 'Amex $1' },
    { pattern: /(VISA|MASTERCARD)\s+(\w+)?/i, format: '$1' },
    { pattern: /(\w+)\s+REWARDS?/i, format: '$1 Rewards' },
    { pattern: /(\w+)\s+CASH\s*BACK/i, format: '$1 Cash Back' },
    { pattern: /(\w+)\s+PLATINUM/i, format: '$1 Platinum' },
    { pattern: /(\w+)\s+GOLD/i, format: '$1 Gold' },
    { pattern: /(\w+)\s+SILVER/i, format: '$1 Silver' },
    { pattern: /FREEDOM\s*(UNLIMITED|FLEX)?/i, format: 'Freedom$1' }
  ];

  for (const { pattern, format } of patterns) {
    const match = name.match(pattern);
    if (match) {
      let result = format;
      for (let i = 1; i < match.length; i++) {
        if (match[i]) {
          result = result.replace(`$${i}`, match[i]);
        }
      }
      // Clean up the result
      return result
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, l => l.toUpperCase());
    }
  }

  return null;
}

/**
 * Detects loan type from account name
 */
function detectLoanType(name: string): string {
  const upperName = name.toUpperCase();
  
  if (/AUTO|CAR|VEHICLE/i.test(upperName)) return 'Auto Loan';
  if (/MORTGAGE|HOME|HOUSE/i.test(upperName)) return 'Mortgage';
  if (/STUDENT|EDUCATION/i.test(upperName)) return 'Student Loan';
  if (/PERSONAL/i.test(upperName)) return 'Personal Loan';
  if (/BUSINESS/i.test(upperName)) return 'Business Loan';
  
  return 'Loan';
}

/**
 * Gets a short display name for transactions and compact views
 * Examples: "Checking", "Savings", "Chase Freedom"
 */
export function getShortAccountName(
  accountName?: string | null,
  accountType?: string | null
): string {
  const normalized = normalizeAccountName(accountName, accountType, null);
  // Remove the mask for short display
  return normalized.replace(/\s*••\d{4}$/, '');
}