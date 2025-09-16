import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ListItem } from '../../shared/components/ListItem';
import { Sheet } from '../../shared/components/Sheet';
import { formatCurrency } from '../../lib/supabase';
import { format } from 'date-fns';
import { Filter, Search, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  category: string;
  account: string;
  merchant_logo?: string;
}

interface MobileTransactionsProps {
  transactions: Transaction[];
  loading: boolean;
  onRefresh: () => void;
}

export const MobileTransactions: React.FC<MobileTransactionsProps> = ({
  transactions,
  loading,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const categories = Array.from(new Set(transactions.map(t => t.category)));

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(t.category);
    return matchesSearch && matchesCategory;
  });

  const handleSwipeAction = (transactionId: string, action: 'edit' | 'delete' | 'categorize') => {
    console.log(`${action} transaction ${transactionId}`);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Sticky Search & Filter Bar */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 pb-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(true)}
            className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg min-touch flex items-center justify-center"
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>

        {selectedCategories.length > 0 && (
          <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
            {selectedCategories.map(cat => (
              <span
                key={cat}
                className="px-3 py-1 text-xs bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-full whitespace-nowrap"
              >
                {cat}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Transaction List with Pull-to-Refresh */}
      <div
        className="flex-1 overflow-y-auto"
        onTouchStart={(e) => {
          const touch = e.touches[0];
          const startY = touch.pageY;

          const handleTouchMove = (e: TouchEvent) => {
            const touch = e.touches[0];
            const currentY = touch.pageY;
            const diff = currentY - startY;

            if (diff > 100 && window.scrollY === 0) {
              onRefresh();
              document.removeEventListener('touchmove', handleTouchMove);
            }
          };

          document.addEventListener('touchmove', handleTouchMove);

          const handleTouchEnd = () => {
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
          };

          document.addEventListener('touchend', handleTouchEnd);
        }}
      >
        <AnimatePresence>
          {filteredTransactions.map((transaction, index) => (
            <motion.div
              key={transaction.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
              className="relative"
            >
              <div
                className="absolute inset-0 flex items-center justify-end gap-2 px-4 bg-danger-500"
                style={{ zIndex: -1 }}
              >
                <button className="text-white text-sm">Delete</button>
              </div>

              <motion.div
                drag="x"
                dragConstraints={{ left: -100, right: 0 }}
                onDragEnd={(e, info) => {
                  if (info.offset.x < -50) {
                    handleSwipeAction(transaction.id, 'delete');
                  }
                }}
                className="bg-white dark:bg-gray-800"
              >
                <ListItem
                  title={transaction.description}
                  subtitle={`${format(new Date(transaction.date), 'MMM d')} • ${transaction.category}`}
                  rightContent={
                    <div className="text-right">
                      <p className={`text-sm font-medium ${
                        transaction.type === 'credit'
                          ? 'text-success-600'
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {transaction.type === 'credit' ? '+' : '-'}
                        {formatCurrency(transaction.amount)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {transaction.account}
                      </p>
                    </div>
                  }
                  onClick={() => setSelectedTransaction(transaction)}
                  showChevron
                />
              </motion.div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Filter Sheet */}
      <Sheet
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        title="Filter Transactions"
        size="md"
      >
        <div className="p-4 space-y-4">
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              Categories
            </h4>
            <div className="space-y-2">
              {categories.map(cat => (
                <label key={cat} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(cat)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedCategories([...selectedCategories, cat]);
                      } else {
                        setSelectedCategories(selectedCategories.filter(c => c !== cat));
                      }
                    }}
                    className="w-4 h-4 text-primary-600 rounded"
                  />
                  <span className="text-sm text-gray-900 dark:text-white">{cat}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                setSelectedCategories([]);
                setShowFilters(false);
              }}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
            >
              Clear
            </button>
            <button
              onClick={() => setShowFilters(false)}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm"
            >
              Apply
            </button>
          </div>
        </div>
      </Sheet>

      {/* Transaction Detail Sheet */}
      <Sheet
        isOpen={!!selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        title="Transaction Details"
        size="lg"
      >
        {selectedTransaction && (
          <div className="p-4 space-y-4">
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {selectedTransaction.type === 'credit' ? '+' : '-'}
                {formatCurrency(selectedTransaction.amount)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {format(new Date(selectedTransaction.date), 'MMMM d, yyyy')}
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Description</p>
                <p className="text-sm text-gray-900 dark:text-white">
                  {selectedTransaction.description}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Category</p>
                <p className="text-sm text-gray-900 dark:text-white">
                  {selectedTransaction.category}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Account</p>
                <p className="text-sm text-gray-900 dark:text-white">
                  {selectedTransaction.account}
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <button className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm">
                Edit
              </button>
              <button className="flex-1 px-4 py-2 bg-danger-600 text-white rounded-lg text-sm">
                Delete
              </button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
};