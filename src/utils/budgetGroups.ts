// Budget category groupings for hierarchical display
export interface BudgetGroup {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  categories: string[]; // List of category names or codes that belong to this group
}

export const BUDGET_GROUPS: BudgetGroup[] = [
  {
    id: 'housing',
    name: 'Housing & Utilities',
    icon: '🏠',
    color: 'blue',
    categories: [
      'Rent/Mortgage', 'Rent & Mortgage', 'Rent & Utilities',
      'RENT_AND_UTILITIES', 'BILLS_AND_UTILITIES',
      'Internet & Cable', 'Phone', 'Utilities',
      'BILLS_AND_UTILITIES_INTERNET_AND_CABLE',
      'BILLS_AND_UTILITIES_TELEPHONE',
      'BILLS_AND_UTILITIES_UTILITIES'
    ]
  },
  {
    id: 'food',
    name: 'Food & Dining',
    icon: '🍽️',
    color: 'green',
    categories: [
      'Food & Dining', 'Restaurants', 'Fast Food',
      'Coffee Shops', 'Groceries', 'Alcohol',
      'FOOD_AND_DRINK', 'FOOD_AND_DRINK_RESTAURANTS',
      'FOOD_AND_DRINK_FAST_FOOD', 'FOOD_AND_DRINK_COFFEE_SHOPS',
      'FOOD_AND_DRINK_GROCERIES', 'FOOD_AND_DRINK_BEER_WINE_AND_LIQUOR',
      'Convenience Stores', 'Ice Cream & Desserts'
    ]
  },
  {
    id: 'transportation',
    name: 'Transportation',
    icon: '🚗',
    color: 'purple',
    categories: [
      'Transportation', 'Gas', 'Gas & Fuel', 'Parking',
      'Public Transit', 'Ride Sharing', 'Auto & Vehicles',
      'Car Insurance', 'TRANSPORTATION', 'TRANSPORTATION_GAS',
      'TRANSPORTATION_PARKING', 'TRANSPORTATION_PUBLIC_TRANSIT',
      'TRANSPORTATION_TAXIS_AND_RIDE_SHARES',
      'TRANSPORTATION_CARS_AND_TRUCKS'
    ]
  },
  {
    id: 'shopping',
    name: 'Shopping',
    icon: '🛍️',
    color: 'pink',
    categories: [
      'Shopping', 'Clothing', 'Clothing & Accessories',
      'Department Stores', 'Electronics', 'Sporting Goods',
      'Online Shopping', 'General Merchandise', 'Superstores',
      'SHOPS', 'SHOPS_CLOTHING_AND_ACCESSORIES',
      'SHOPS_DEPARTMENT_STORES', 'SHOPS_ELECTRONICS',
      'SHOPS_SPORTING_GOODS', 'GENERAL_MERCHANDISE',
      'GENERAL_MERCHANDISE_ONLINE_MARKETPLACES',
      'Gifts & Novelties'
    ]
  },
  {
    id: 'entertainment',
    name: 'Entertainment & Recreation',
    icon: '🎬',
    color: 'orange',
    categories: [
      'Entertainment', 'Movies', 'Music', 'Media',
      'Subscriptions', 'Online Courses', 'Amusement Parks',
      'ENTERTAINMENT', 'ENTERTAINMENT_MOVIES_AND_DVDS',
      'ENTERTAINMENT_MUSIC_AND_AUDIO',
      'ENTERTAINMENT_NEWSPAPERS_AND_MAGAZINES',
      'Gym & Fitness', 'PERSONAL_CARE_GYMS_AND_FITNESS_CENTERS',
      'Personal Training'
    ]
  },
  {
    id: 'healthcare',
    name: 'Healthcare & Personal Care',
    icon: '⚕️',
    color: 'red',
    categories: [
      'Healthcare', 'Medical', 'Dental Care', 'Pharmacy',
      'Personal Care', 'Doctor Visits', 'Pet Supplies',
      'MEDICAL', 'MEDICAL_DENTAL_CARE',
      'MEDICAL_PHARMACIES_AND_SUPPLEMENTS',
      'PERSONAL_CARE'
    ]
  },
  {
    id: 'financial',
    name: 'Financial & Loans',
    icon: '💰',
    color: 'indigo',
    categories: [
      'Loan Payments', 'Mortgage', 'Credit Card Payment',
      'Personal Loan', 'Bank Fees', 'Financial Services',
      'LOAN_PAYMENTS', 'LOAN_PAYMENTS_MORTGAGE',
      'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT',
      'LOAN_PAYMENTS_PERSONAL_LOAN_PAYMENT',
      'BANK_FEES'
    ]
  },
  {
    id: 'travel',
    name: 'Travel',
    icon: '✈️',
    color: 'teal',
    categories: [
      'Travel', 'TRAVEL'
    ]
  },
  {
    id: 'other',
    name: 'Other',
    icon: '📦',
    color: 'gray',
    categories: [
      'Other', 'General Services', 'Government & Non-Profit',
      'Transfer', 'Income', 'Transfer Out',
      'OTHER', 'GENERAL_SERVICES',
      'GOVERNMENT_AND_NON_PROFIT',
      'TRANSFER', 'TRANSFER_IN', 'TRANSFER_OUT'
    ]
  }
];

// Helper function to find which group a category belongs to
export function findBudgetGroup(categoryName: string): BudgetGroup | undefined {
  return BUDGET_GROUPS.find(group =>
    group.categories.some(cat =>
      cat.toLowerCase() === categoryName.toLowerCase() ||
      cat === categoryName
    )
  );
}

// Helper function to group budget lines
export function groupBudgetLines(budgetLines: any[]): Map<string, any[]> {
  const grouped = new Map<string, any[]>();

  // Initialize all groups
  BUDGET_GROUPS.forEach(group => {
    grouped.set(group.id, []);
  });

  // Sort budget lines into groups
  budgetLines.forEach(line => {
    const group = findBudgetGroup(line.line_name) ||
                  findBudgetGroup(line.categories?.name || '') ||
                  BUDGET_GROUPS.find(g => g.id === 'other');

    if (group) {
      const lines = grouped.get(group.id) || [];
      lines.push(line);
      grouped.set(group.id, lines);
    }
  });

  return grouped;
}

// Calculate totals for a group
export function calculateGroupTotals(lines: any[]): {
  budgeted: number;
  spent: number;
  remaining: number;
  percentage: number;
} {
  const budgeted = lines.reduce((sum, line) => sum + (line.budgeted_amount_cents || 0), 0);
  const spent = lines.reduce((sum, line) => sum + (line.spent_cents || 0), 0);
  const remaining = budgeted - spent;
  const percentage = budgeted > 0 ? (spent / budgeted) * 100 : 0;

  return { budgeted, spent, remaining, percentage };
}