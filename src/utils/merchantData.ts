// Merchant name normalization and logo management

// Known merchant mappings with proper names and logo sources
export const MERCHANT_DATA: Record<string, { name: string; logo?: string; domain?: string; color?: string }> = {
  // Major retailers
  'walmart': { name: 'Walmart', domain: 'walmart.com', color: '#0071ce' },
  'target': { name: 'Target', domain: 'target.com', color: '#cc0000' },
  'amazon': { name: 'Amazon', domain: 'amazon.com', color: '#ff9900' },
  'costco': { name: 'Costco', domain: 'costco.com', color: '#005daa' },
  'whole foods': { name: 'Whole Foods Market', domain: 'wholefoodsmarket.com', color: '#00674b' },
  'trader joe': { name: "Trader Joe's", domain: 'traderjoes.com', color: '#d64125' },
  'kroger': { name: 'Kroger', domain: 'kroger.com', color: '#003da5' },
  'safeway': { name: 'Safeway', domain: 'safeway.com', color: '#ce0e2d' },
  'cvs': { name: 'CVS Pharmacy', domain: 'cvs.com', color: '#cc0000' },
  'walgreens': { name: 'Walgreens', domain: 'walgreens.com', color: '#e31837' },

  // Fast food & restaurants
  'mcdonald': { name: "McDonald's", domain: 'mcdonalds.com', color: '#ffc72c' },
  'starbucks': { name: 'Starbucks', domain: 'starbucks.com', color: '#006241' },
  'chipotle': { name: 'Chipotle', domain: 'chipotle.com', color: '#a81612' },
  'chick-fil-a': { name: 'Chick-fil-A', domain: 'chick-fil-a.com', color: '#dd0031' },
  'subway': { name: 'Subway', domain: 'subway.com', color: '#008c15' },
  'taco bell': { name: 'Taco Bell', domain: 'tacobell.com', color: '#702082' },
  'burger king': { name: 'Burger King', domain: 'bk.com', color: '#d62300' },
  'wendys': { name: "Wendy's", domain: 'wendys.com', color: '#e2203d' },
  'kfc': { name: 'KFC', domain: 'kfc.com', color: '#f40027' },
  'pizza hut': { name: 'Pizza Hut', domain: 'pizzahut.com', color: '#ee3124' },
  'dominos': { name: "Domino's Pizza", domain: 'dominos.com', color: '#006491' },
  'dunkin': { name: 'Dunkin', domain: 'dunkindonuts.com', color: '#ff6e1e' },
  'panera': { name: 'Panera Bread', domain: 'panerabread.com', color: '#367c2b' },

  // Gas stations
  'shell': { name: 'Shell', domain: 'shell.com', color: '#ffcc00' },
  'chevron': { name: 'Chevron', domain: 'chevron.com', color: '#0066b2' },
  'exxon': { name: 'Exxon', domain: 'exxon.com', color: '#ee293d' },
  'mobil': { name: 'Mobil', domain: 'exxonmobil.com', color: '#003d7a' },
  'bp': { name: 'BP', domain: 'bp.com', color: '#006b3f' },
  'arco': { name: 'ARCO', domain: 'arco.com', color: '#004b93' },
  '76': { name: '76', domain: '76.com', color: '#ff6600' },
  'texaco': { name: 'Texaco', domain: 'texaco.com', color: '#ed1c24' },

  // Tech & services
  'uber': { name: 'Uber', domain: 'uber.com', color: '#000000' },
  'lyft': { name: 'Lyft', domain: 'lyft.com', color: '#ff00bf' },
  'netflix': { name: 'Netflix', domain: 'netflix.com', color: '#e50914' },
  'spotify': { name: 'Spotify', domain: 'spotify.com', color: '#1db954' },
  'apple': { name: 'Apple', domain: 'apple.com', color: '#555555' },
  'google': { name: 'Google', domain: 'google.com', color: '#4285f4' },
  'microsoft': { name: 'Microsoft', domain: 'microsoft.com', color: '#0078d4' },
  'adobe': { name: 'Adobe', domain: 'adobe.com', color: '#fa0f00' },
  'steam': { name: 'Steam', domain: 'steampowered.com', color: '#00adee' },

  // Airlines
  'united': { name: 'United Airlines', domain: 'united.com', color: '#002244' },
  'american air': { name: 'American Airlines', domain: 'aa.com', color: '#0078d2' },
  'delta': { name: 'Delta Air Lines', domain: 'delta.com', color: '#003366' },
  'southwest': { name: 'Southwest Airlines', domain: 'southwest.com', color: '#304cb2' },
  'jetblue': { name: 'JetBlue', domain: 'jetblue.com', color: '#003876' },
  'alaska': { name: 'Alaska Airlines', domain: 'alaskaair.com', color: '#00467f' },

  // Hotels
  'marriott': { name: 'Marriott', domain: 'marriott.com', color: '#a0004d' },
  'hilton': { name: 'Hilton', domain: 'hilton.com', color: '#104c97' },
  'hyatt': { name: 'Hyatt', domain: 'hyatt.com', color: '#005eb8' },
  'holiday inn': { name: 'Holiday Inn', domain: 'ihg.com', color: '#007b53' },
  'airbnb': { name: 'Airbnb', domain: 'airbnb.com', color: '#ff5a5f' },

  // Utilities & services
  'comcast': { name: 'Comcast', domain: 'xfinity.com', color: '#000000' },
  'att': { name: 'AT&T', domain: 'att.com', color: '#009fdb' },
  'verizon': { name: 'Verizon', domain: 'verizon.com', color: '#ee0000' },
  't-mobile': { name: 'T-Mobile', domain: 't-mobile.com', color: '#e20074' },
  'pg&e': { name: 'PG&E', domain: 'pge.com', color: '#0069b4' },
  'pge': { name: 'PG&E', domain: 'pge.com', color: '#0069b4' },
};

// Clean and normalize merchant names
export function normalizeMerchantName(name: string | null): string {
  if (!name) return 'Unknown Transaction';

  // First, handle special patterns seen in the data
  let cleanName = name
    // Remove payment processor prefixes
    .replace(/^(POS |SQ \*|TST\*|PAYPAL \*|SP |SQU\*|PMT\*|APL\*|GOOGLE \*|AMZN\*|AMZN Mktp |Amazon\.com\*)/i, '')
    // Remove "DEBIT CARD PURCHASE - " prefix
    .replace(/^DEBIT CARD PURCHASE\s*-\s*/i, '')
    // Remove "VISA DEBIT PURCHASE - " prefix
    .replace(/^VISA DEBIT PURCHASE\s*-\s*/i, '')
    // Remove "PURCHASE AUTHORIZED ON" patterns
    .replace(/PURCHASE AUTHORIZED ON \d{2}\/\d{2}/i, '')
    // Remove "ON" followed by date patterns
    .replace(/\s+ON\s+\d{1,2}\/\d{1,2}.*/i, '')
    // Remove card processing info
    .replace(/CARD \d{4}\s*/i, '')
    // Remove terminal/register IDs
    .replace(/\s+TERMINAL\s+\w+/i, '')
    .replace(/\s+REG\s+\d+/i, '')
    // Remove reference numbers (REF#, etc.)
    .replace(/\s+REF#.*/i, '')
    // Remove store numbers (#1234, STORE#1234, etc.)
    .replace(/\s*STORE\s*#?\d+/i, '')
    .replace(/#\d+\s*$/, '')
    // Remove city/state at the end (e.g., "CUPERTINO CA", "SAN FRANCISCO C")
    .replace(/\s+[A-Z][A-Z\s]+\s+[A-Z]{2}\s*$/i, '')
    .replace(/\s+[A-Z]{2}\s*$/, '')
    // Remove trailing long numbers (6+ digits)
    .replace(/\s+\d{6,}$/, '')
    // Remove transaction IDs that look like "xxx-xxx-xxxx"
    .replace(/\s+\d{3}-\d{3}-\d{4}.*$/, '')
    // Remove phone numbers
    .replace(/\s+\d{3}-\d{3}-\d{4}/, '')
    .replace(/\s+\(\d{3}\)\s*\d{3}-\d{4}/, '')
    // Remove URLs
    .replace(/\.(com|net|org|co).*$/i, '')
    // Remove extra transaction codes
    .replace(/\s+[A-Z0-9]{10,}$/, '')
    // Clean up extra spaces and special characters
    .replace(/\s+/g, ' ')
    .replace(/\s*\*\s*/g, ' ')
    .trim();

  // Special handling for known patterns
  if (cleanName.toLowerCase().includes('amazon')) {
    cleanName = 'Amazon';
  } else if (cleanName.toLowerCase().includes('apple.com')) {
    cleanName = 'Apple Store';
  } else if (cleanName.toLowerCase().includes('google')) {
    cleanName = 'Google';
  }

  // Try to match with known merchants
  const lowerName = cleanName.toLowerCase();
  for (const [key, data] of Object.entries(MERCHANT_DATA)) {
    if (lowerName.includes(key)) {
      return data.name;
    }
  }

  // If still too long, truncate intelligently
  if (cleanName.length > 30) {
    // Try to find the first meaningful part
    const parts = cleanName.split(/[\s-]+/);
    if (parts.length > 2) {
      cleanName = parts.slice(0, 2).join(' ');
    } else {
      cleanName = cleanName.substring(0, 30).trim() + '...';
    }
  }

  // If we stripped too much, use original but truncate
  if (cleanName.length < 2) {
    cleanName = name.substring(0, 30).trim();
  }

  // Properly capitalize
  return cleanName
    .toLowerCase()
    .split(' ')
    .map(word => {
      // Don't capitalize small words unless they're first
      if (['of', 'and', 'the', 'at', 'in', 'on', 'for'].includes(word)) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ')
    // Capitalize first word always
    .replace(/^./, str => str.toUpperCase());
}

// Get merchant logo URL
export function getMerchantLogoUrl(merchantName: string | null): string | null {
  if (!merchantName) return null;

  const lowerName = merchantName.toLowerCase();

  // Check our merchant database
  for (const [key, data] of Object.entries(MERCHANT_DATA)) {
    if (lowerName.includes(key) && data.domain) {
      // Use Clearbit Logo API for high-quality logos
      return `https://logo.clearbit.com/${data.domain}`;
    }
  }

  // For unrecognized merchants, try to generate a domain
  const cleanName = merchantName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  if (cleanName.length > 3) {
    // Try common domain patterns
    const possibleDomains = [
      `${cleanName}.com`,
      `${cleanName}bank.com`,
      `${cleanName}store.com`
    ];

    // Return the first possible domain (Clearbit will handle 404s gracefully)
    return `https://logo.clearbit.com/${possibleDomains[0]}`;
  }

  return null;
}

// Get merchant brand color
export function getMerchantColor(merchantName: string | null): string {
  if (!merchantName) return '#6B7280'; // Default gray

  const lowerName = merchantName.toLowerCase();

  // Check our merchant database
  for (const [key, data] of Object.entries(MERCHANT_DATA)) {
    if (lowerName.includes(key) && data.color) {
      return data.color;
    }
  }

  // Generate a consistent color based on the name
  const colors = [
    '#EF4444', '#F97316', '#F59E0B', '#EAB308',
    '#84CC16', '#22C55E', '#10B981', '#14B8A6',
    '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1',
    '#8B5CF6', '#A855F7', '#D946EF', '#EC4899'
  ];

  let hash = 0;
  for (let i = 0; i < merchantName.length; i++) {
    hash = merchantName.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}

// Get merchant initials for fallback display
export function getMerchantInitials(merchantName: string | null): string {
  if (!merchantName) return '?';

  const normalized = normalizeMerchantName(merchantName);
  const words = normalized.split(' ').filter(w => w.length > 0);

  if (words.length >= 2) {
    return words[0][0] + words[1][0];
  }

  return normalized.substring(0, 2).toUpperCase();
}

// Check if logo URL is valid
export async function validateLogoUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

// Get merchant data with all enrichments
export function getMerchantData(merchantName: string | null) {
  const normalized = normalizeMerchantName(merchantName);
  const logoUrl = getMerchantLogoUrl(normalized);
  const color = getMerchantColor(normalized);
  const initials = getMerchantInitials(normalized);

  return {
    name: normalized,
    logoUrl,
    color,
    initials
  };
}