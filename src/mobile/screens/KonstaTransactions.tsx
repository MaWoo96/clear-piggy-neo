import React, { useState, useMemo, useCallback } from 'react';
import { Block, List, ListItem, Searchbar, Sheet, Button, Segmented, SegmentedButton } from 'konsta/react';
import { formatCurrency } from '../../lib/supabase';
import { format } from 'date-fns';
import { ArrowUpRight, ArrowDownLeft, Filter, Calendar } from 'lucide-react';

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

interface KonstaTransactionsProps {
  transactions: Transaction[];
  loading: boolean;
  onRefresh: () => void;
}

export const KonstaTransactions: React.FC<KonstaTransactionsProps> = ({
  transactions,
  loading,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');

  // Memoize filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            t.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' ||
                         (filterType === 'income' && t.type === 'credit') ||
                         (filterType === 'expense' && t.type === 'debit');
      return matchesSearch && matchesType;
    });
  }, [transactions, searchTerm, filterType]);

  // Memoize grouped transactions
  const groupedTransactions = useMemo(() => {
    return filteredTransactions.reduce((groups, transaction) => {
      const date = format(new Date(transaction.date), 'MMMM d, yyyy');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(transaction);
      return groups;
    }, {} as Record<string, Transaction[]>);
  }, [filteredTransactions]);

  // Memoize handlers
  const handleSearchInput = useCallback((e: any) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchTerm('');
  }, []);

  const handleTransactionClick = useCallback((transaction: Transaction) => {
    setSelectedTransaction(transaction);
  }, []);

  const handleCloseSheet = useCallback(() => {
    setSelectedTransaction(null);
  }, []);

  return (
    <>
      <div className="sticky top-0 z-40 bg-white dark:bg-gray-900 pb-2">
        <Block>
          <Searchbar
            value={searchTerm}
            onInput={handleSearchInput}
            onClear={handleClearSearch}
            placeholder="Search transactions..."
            disableButton={false}
          />
        </Block>

        <Block className="pt-0">
          <Segmented strong>
            <SegmentedButton
              active={filterType === 'all'}
              onClick={() => setFilterType('all')}
            >
              All
            </SegmentedButton>
            <SegmentedButton
              active={filterType === 'income'}
              onClick={() => setFilterType('income')}
            >
              Income
            </SegmentedButton>
            <SegmentedButton
              active={filterType === 'expense'}
              onClick={() => setFilterType('expense')}
            >
              Expenses
            </SegmentedButton>
          </Segmented>
        </Block>
      </div>

      <div className="pb-4">
        {Object.entries(groupedTransactions).map(([date, dayTransactions]) => (
          <div key={date}>
            <Block className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              {date}
            </Block>
            <List strong inset>
              {dayTransactions.map(transaction => (
                <ListItem
                  key={transaction.id}
                  title={
                    <div className="flex justify-between items-start">
                      <span className="font-medium truncate pr-2">{transaction.description}</span>
                      <span className={`font-semibold whitespace-nowrap ${
                        transaction.type === 'credit'
                          ? 'text-success-600'
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {transaction.type === 'credit' ? '+' : '-'}
                        {formatCurrency(transaction.amount)}
                      </span>
                    </div>
                  }
                  subtitle={
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs">{transaction.category}</span>
                      <span className="text-xs text-gray-400">{transaction.account}</span>
                    </div>
                  }
                  media={
                    transaction.type === 'credit' ?
                      <ArrowUpRight className="w-5 h-5 text-success-500" /> :
                      <ArrowDownLeft className="w-5 h-5 text-gray-400" />
                  }
                  link
                  onClick={() => handleTransactionClick(transaction)}
                  chevron={false}
                />
              ))}
            </List>
          </div>
        ))}
      </div>

      {/* Transaction Detail Sheet */}
      <Sheet
        opened={!!selectedTransaction}
        onBackdropClick={handleCloseSheet}
      >
        {selectedTransaction && (
          <div className="p-4">
            <div className="text-center mb-6">
              <p className={`text-3xl font-bold ${
                selectedTransaction.type === 'credit' ? 'text-success-600' : 'text-gray-900 dark:text-white'
              }`}>
                {selectedTransaction.type === 'credit' ? '+' : '-'}
                {formatCurrency(selectedTransaction.amount)}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                {format(new Date(selectedTransaction.date), 'MMMM d, yyyy')}
              </p>
            </div>

            <List strong inset>
              <ListItem
                title="Description"
                after={selectedTransaction.description}
              />
              <ListItem
                title="Category"
                after={selectedTransaction.category}
              />
              <ListItem
                title="Account"
                after={selectedTransaction.account}
              />
              <ListItem
                title="Type"
                after={selectedTransaction.type === 'credit' ? 'Income' : 'Expense'}
              />
            </List>

            <Block className="grid grid-cols-2 gap-2">
              <Button outline onClick={handleCloseSheet}>
                Close
              </Button>
              <Button onClick={() => console.log('Edit', selectedTransaction.id)}>
                Edit
              </Button>
            </Block>
          </div>
        )}
      </Sheet>
    </>
  );
};