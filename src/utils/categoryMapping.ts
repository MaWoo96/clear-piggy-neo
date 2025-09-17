// Map category IDs to human-readable names
export const CATEGORY_MAPPINGS: Record<string, string> = {
  // Plaid standard categories
  'LOAN_PAYMENTS': 'Loan Payments',
  'BANK_FEES': 'Bank Fees',
  'ENTERTAINMENT': 'Entertainment',
  'FOOD_AND_DRINK': 'Food & Dining',
  'GENERAL_MERCHANDISE': 'General Merchandise',
  'GENERAL_SERVICES': 'General Services',
  'GOVERNMENT_AND_NON_PROFIT': 'Government & Non-Profit',
  'HOME_IMPROVEMENT': 'Home Improvement',
  'MEDICAL': 'Healthcare',
  'PERSONAL_CARE': 'Personal Care',
  'RENT_AND_UTILITIES': 'Rent & Utilities',
  'SHOPS': 'Shopping',
  'TRANSFER': 'Transfer',
  'TRANSFER_IN': 'Income',
  'TRANSFER_OUT': 'Transfer Out',
  'TRANSPORTATION': 'Transportation',
  'TRAVEL': 'Travel',
  'OTHER': 'Other',

  // Detailed categories
  'FOOD_AND_DRINK_RESTAURANTS': 'Restaurants',
  'FOOD_AND_DRINK_FAST_FOOD': 'Fast Food',
  'FOOD_AND_DRINK_COFFEE_SHOPS': 'Coffee Shops',
  'FOOD_AND_DRINK_GROCERIES': 'Groceries',
  'FOOD_AND_DRINK_BEER_WINE_AND_LIQUOR': 'Alcohol',

  'TRANSPORTATION_CARS_AND_TRUCKS': 'Auto & Vehicles',
  'TRANSPORTATION_GAS': 'Gas',
  'TRANSPORTATION_PARKING': 'Parking',
  'TRANSPORTATION_PUBLIC_TRANSIT': 'Public Transit',
  'TRANSPORTATION_TAXIS_AND_RIDE_SHARES': 'Ride Sharing',

  'SHOPS_CLOTHING_AND_ACCESSORIES': 'Clothing',
  'SHOPS_DEPARTMENT_STORES': 'Department Stores',
  'SHOPS_ELECTRONICS': 'Electronics',
  'SHOPS_SPORTING_GOODS': 'Sporting Goods',

  'ENTERTAINMENT_MOVIES_AND_DVDS': 'Movies',
  'ENTERTAINMENT_MUSIC_AND_AUDIO': 'Music',
  'ENTERTAINMENT_NEWSPAPERS_AND_MAGAZINES': 'Media',

  'BILLS_AND_UTILITIES': 'Bills & Utilities',
  'BILLS_AND_UTILITIES_INTERNET_AND_CABLE': 'Internet & Cable',
  'BILLS_AND_UTILITIES_TELEPHONE': 'Phone',
  'BILLS_AND_UTILITIES_UTILITIES': 'Utilities',

  'MEDICAL_DENTAL_CARE': 'Dental Care',
  'MEDICAL_PHARMACIES_AND_SUPPLEMENTS': 'Pharmacy',

  'LOAN_PAYMENTS_MORTGAGE': 'Mortgage',
  'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT': 'Credit Card Payment',
  'LOAN_PAYMENTS_PERSONAL_LOAN_PAYMENT': 'Personal Loan',

  'PERSONAL_CARE_GYMS_AND_FITNESS_CENTERS': 'Gym & Fitness',

  'GENERAL_MERCHANDISE_ONLINE_MARKETPLACES': 'Online Shopping',
  'GENERAL_MERCHANDISE_ELECTRONICS': 'Electronics',
};

// Function to convert category ID or code to human-readable name
export function getCategoryName(categoryId: string | null | undefined): string {
  if (!categoryId) return 'Uncategorized';

  // Check if it's a known mapping
  if (CATEGORY_MAPPINGS[categoryId]) {
    return CATEGORY_MAPPINGS[categoryId];
  }

  // Check if it's a UUID (category ID from database)
  const isUUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(categoryId);
  if (isUUID) {
    // For UUIDs, we can't map them without database lookup
    // Return a placeholder or the original ID
    return 'Category';
  }

  // Try to format underscore-separated strings
  if (categoryId.includes('_')) {
    return categoryId
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  }

  // Return as-is if no mapping found
  return categoryId;
}

// Function to replace category IDs in text with readable names
export function formatCategoryInsights(text: string, categoriesMap?: Record<string, string>): string {
  if (!text || typeof text !== 'string') {
    return String(text || '');
  }

  let formatted = text;

  // Replace UUIDs with category names
  formatted = formatted.replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, (match) => {
    // If we have a custom map, use it
    if (categoriesMap && categoriesMap[match]) {
      return categoriesMap[match];
    }
    // Otherwise, return a generic placeholder
    return 'this category';
  });

  // Replace known category codes
  Object.entries(CATEGORY_MAPPINGS).forEach(([code, name]) => {
    // Use word boundary to avoid partial matches
    const regex = new RegExp(`\\b${code}\\b`, 'g');
    formatted = formatted.replace(regex, name);
  });

  return formatted;
}

// Function to get category color
export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    'FOOD_AND_DRINK': '#10B981', // Green
    'TRANSPORTATION': '#3B82F6', // Blue
    'SHOPS': '#8B5CF6', // Purple
    'ENTERTAINMENT': '#EC4899', // Pink
    'BILLS_AND_UTILITIES': '#F59E0B', // Amber
    'MEDICAL': '#EF4444', // Red
    'LOAN_PAYMENTS': '#6366F1', // Indigo
    'PERSONAL_CARE': '#84CC16', // Lime
    'RENT_AND_UTILITIES': '#06B6D4', // Cyan
    'GENERAL_MERCHANDISE': '#64748B', // Slate
    'TRANSFER': '#71717A', // Zinc
    'TRAVEL': '#F97316', // Orange
  };

  // Check if category starts with any of the main categories
  for (const [prefix, color] of Object.entries(colors)) {
    if (category.toUpperCase().startsWith(prefix)) {
      return color;
    }
  }

  return '#9CA3AF'; // Default gray
}