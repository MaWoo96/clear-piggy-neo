import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Check } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  parent_category_id?: string | null;
  color?: string;
  icon?: string;
}

interface CategorySelectorFinalProps {
  categories: Category[];
  value?: string | null;
  onChange: (categoryId: string) => void;
  placeholder?: string;
  className?: string;
}

interface FlattenedCategory {
  id: string;
  name: string;
  path: string[];
  fullPath: string;
  searchText: string;
}

// Simple fuzzy search
function searchScore(query: string, text: string): number {
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  
  if (textLower.includes(queryLower)) return 1;
  
  // Check if all characters exist in order
  let lastIndex = -1;
  for (const char of queryLower) {
    const index = textLower.indexOf(char, lastIndex + 1);
    if (index === -1) return 0;
    lastIndex = index;
  }
  return 0.5;
}

export const CategorySelectorFinal: React.FC<CategorySelectorFinalProps> = ({
  categories,
  value,
  onChange,
  placeholder = "Select a category",
  className = "",
}) => {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // State
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  
  // Flatten categories
  const flattenedCategories = useMemo(() => {
    const flat: FlattenedCategory[] = [];
    const categoryMap = new Map(categories.map(c => [c.id, c]));
    
    // Find categories that have children (these are parents, not leaves)
    const parentIds = new Set(
      categories
        .filter(c => c.parent_category_id)
        .map(c => c.parent_category_id)
    );
    
    categories.forEach(category => {
      // Skip root categories (no parent)
      if (!category.parent_category_id) return;
      
      // Skip categories that have children (only show leaf categories)
      if (parentIds.has(category.id)) return;
      
      const path: string[] = [category.name];
      let current = category;
      
      while (current.parent_category_id) {
        const parent = categoryMap.get(current.parent_category_id);
        if (!parent) break;
        path.unshift(parent.name);
        current = parent;
      }
      
      flat.push({
        id: category.id,
        name: category.name,
        path,
        fullPath: path.join(' › '),
        searchText: path.join(' ').toLowerCase(),
      });
    });
    
    return flat.sort((a, b) => a.fullPath.localeCompare(b.fullPath));
  }, [categories]);
  
  // Get current selection
  const selectedCategory = useMemo(() => {
    return flattenedCategories.find(c => c.id === value);
  }, [value, flattenedCategories]);
  
  // Filter categories
  const filteredCategories = useMemo(() => {
    if (!search || !isOpen) return flattenedCategories;
    
    return flattenedCategories
      .map(cat => ({
        ...cat,
        score: Math.max(
          searchScore(search, cat.name) * 2,
          searchScore(search, cat.fullPath)
        )
      }))
      .filter(cat => cat.score > 0)
      .sort((a, b) => b.score - a.score);
  }, [search, flattenedCategories, isOpen]);
  
  // Open dropdown
  const open = () => {
    setIsOpen(true);
    setSearch('');
    setHighlightedIndex(0);
  };
  
  // Close dropdown
  const close = () => {
    setIsOpen(false);
    setSearch('');
    inputRef.current?.blur();
  };
  
  // Select a category
  const selectCategory = (categoryId: string) => {
    onChange(categoryId);
    close();
  };
  
  // Handle outside clicks
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClick = (e: Event) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        close();
      }
    };
    
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
    };
  }, [isOpen]);
  
  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      const filtered = filteredCategories; // Capture current value
      
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex(i => 
            i < filtered.length - 1 ? i + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex(i => 
            i > 0 ? i - 1 : filtered.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filtered[highlightedIndex]) {
            selectCategory(filtered[highlightedIndex].id);
          }
          break;
        case 'Escape':
          e.preventDefault();
          close();
          break;
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, highlightedIndex]);
  
  // Input display value
  const inputDisplay = isOpen ? search : (selectedCategory?.fullPath || '');
  
  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Input Field */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={inputDisplay}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={open}
          onClick={open}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
        {selectedCategory && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        )}
      </div>
      
      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-80 overflow-auto">
          {filteredCategories.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500">
              No categories found
            </div>
          ) : (
            <div className="py-1">
              {/* Clear option */}
              {selectedCategory && (
                <button
                  type="button"
                  onClick={() => selectCategory('')}
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 text-sm text-gray-500"
                >
                  Clear selection
                </button>
              )}
              
              {/* Categories */}
              {filteredCategories.map((category, index) => {
                const isHighlighted = index === highlightedIndex;
                const isSelected = category.id === value;
                const parentPath = category.path.slice(0, -1);
                
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => selectCategory(category.id)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`
                      w-full px-3 py-2 text-left flex items-center justify-between
                      ${isHighlighted ? 'bg-blue-50 dark:bg-blue-900/30' : ''}
                      ${isSelected ? 'bg-blue-100 dark:bg-blue-900/50' : ''}
                      hover:bg-gray-50 dark:hover:bg-gray-700/50
                    `}
                  >
                    <div className="text-sm">
                      {parentPath.length > 0 && (
                        <>
                          <span className="text-gray-500">
                            {parentPath.join(' › ')}
                          </span>
                          <span className="text-gray-400 mx-1">›</span>
                        </>
                      )}
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {category.name}
                      </span>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-blue-500 ml-2" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CategorySelectorFinal;