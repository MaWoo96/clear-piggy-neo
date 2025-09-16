import React from 'react';
import { Brain, User } from 'lucide-react';

interface Transaction {
  id: string;
  user_category_primary?: string | null;
  user_category_secondary?: string | null;
  ai_category_primary?: string | null;
  ai_category_secondary?: string | null;
  ai_category_confidence?: number | null;
  [key: string]: any;
}

interface Category {
  id: string;
  name: string;
  parent_category_id?: string | null;
  color?: string;
}

interface CategoryDisplaySimpleProps {
  transaction: Transaction;
  categories: Category[];
  className?: string;
}

export const CategoryDisplaySimple: React.FC<CategoryDisplaySimpleProps> = ({
  transaction,
  categories,
  className = ''
}) => {
  // Determine which category to show (user takes precedence over AI)
  // For user categories, prefer the secondary (child) if it exists, otherwise use primary
  // For AI categories, prefer the secondary if it exists, otherwise use primary
  const categoryId = transaction.user_category_secondary ||
                     transaction.user_category_primary ||
                     transaction.ai_category_secondary ||
                     transaction.ai_category_primary;

  const isUserCategory = !!(transaction.user_category_primary || transaction.user_category_secondary);
  const isAICategory = !isUserCategory && !!(transaction.ai_category_primary || transaction.ai_category_secondary);
  
  // If no category at all, show Uncategorized
  if (!categoryId) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="text-sm text-gray-500 dark:text-gray-400 italic">
          Uncategorized
        </span>
      </div>
    );
  }
  
  // Find the category
  const category = categories.find(c => c.id === categoryId);
  if (!category) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="text-sm text-gray-500 dark:text-gray-400 italic">
          Unknown category
        </span>
      </div>
    );
  }
  
  // Find parent if exists
  const parent = category.parent_category_id 
    ? categories.find(c => c.id === category.parent_category_id)
    : null;
  
  // Get color from parent or category
  const color = parent?.color || category.color || '#6B7280';
  
  // Build the category path
  const fullPath = [];
  if (parent) {
    // Check if parent has a parent (3-level hierarchy)
    const grandparent = parent.parent_category_id 
      ? categories.find(c => c.id === parent.parent_category_id)
      : null;
    
    if (grandparent) {
      fullPath.push(grandparent.name);
    }
    fullPath.push(parent.name);
  }
  fullPath.push(category.name);
  
  // Filter out top-level categories like 'Expenses', 'Income', 'Transfers'
  const categoryPath = fullPath.filter(name => 
    name !== 'Expenses' && name !== 'Income' && name !== 'Transfers'
  );
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1">
        {categoryPath.map((name, index) => (
          <React.Fragment key={index}>
            {index > 0 && (
              <span className="text-xs text-gray-400 dark:text-gray-500">›</span>
            )}
            <span 
              className={index === categoryPath.length - 1 ? "text-sm font-semibold" : "text-xs text-gray-500 dark:text-gray-400"}
              style={index === categoryPath.length - 1 ? { color } : undefined}
            >
              {name}
            </span>
          </React.Fragment>
        ))}
      </div>
      
      {/* Confidence & Source Indicators */}
      <div className="flex items-center gap-1">
        {/* User edited indicator - highest priority */}
        {isUserCategory && (
          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 rounded">
            <User className="h-3 w-3 text-blue-600 dark:text-blue-400" />
            <span className="text-[10px] font-medium text-blue-700 dark:text-blue-300">EDITED</span>
          </div>
        )}
        
        {/* AI categorized indicator */}
        {isAICategory && (
          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 rounded">
            <Brain className="h-3 w-3 text-purple-600 dark:text-purple-400" />
            <span className="text-[10px] font-medium text-purple-700 dark:text-purple-300">
              AI
              {transaction.ai_category_confidence && (
                <span className="ml-1">
                  {(transaction.ai_category_confidence * 100).toFixed(0)}%
                </span>
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryDisplaySimple;