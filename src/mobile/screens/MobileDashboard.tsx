import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '../../shared/components/Card';
import { ArrowUpRight, ArrowDownLeft, TrendingUp, Wallet } from 'lucide-react';
import { formatCurrency } from '../../lib/supabase';

interface MobileDashboardProps {
  accounts: any[];
  transactions: any[];
  loading: boolean;
}

export const MobileDashboard: React.FC<MobileDashboardProps> = ({
  accounts,
  transactions,
  loading,
}) => {
  const totalBalance = accounts.reduce((sum, acc) => sum + (acc.current_balance_cents || 0), 0);
  const availableBalance = accounts.reduce((sum, acc) => sum + (acc.available_balance_cents || 0), 0);

  const recentTransactions = transactions.slice(0, 5);
  const monthlyIncome = transactions
    .filter(t => t.type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0);
  const monthlyExpenses = transactions
    .filter(t => t.type === 'debit')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-4">
      {/* Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="bg-gradient-to-r from-primary-600 to-primary-700 text-white">
          <div className="text-center py-2">
            <p className="text-primary-100 text-sm mb-1">Total Balance</p>
            <p className="text-3xl font-bold">{formatCurrency(totalBalance)}</p>
            <p className="text-primary-200 text-xs mt-2">
              Available: {formatCurrency(availableBalance)}
            </p>
          </div>
        </Card>
      </motion.div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card padding="sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Income</p>
                <p className="text-lg font-semibold text-success-600">
                  {formatCurrency(monthlyIncome)}
                </p>
              </div>
              <ArrowUpRight className="w-5 h-5 text-success-500" />
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card padding="sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Expenses</p>
                <p className="text-lg font-semibold text-danger-600">
                  {formatCurrency(monthlyExpenses)}
                </p>
              </div>
              <ArrowDownLeft className="w-5 h-5 text-danger-500" />
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Account Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-3">
            Accounts ({accounts.length})
          </h3>
          <div className="space-y-2">
            {accounts.map(account => (
              <div key={account.id} className="flex justify-between items-center py-2">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {account.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {account.mask ? `••••${account.mask}` : account.subtype}
                    </p>
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatCurrency(account.current_balance_cents || 0)}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Recent Transactions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
              Recent Activity
            </h3>
            <button className="text-xs text-primary-600 dark:text-primary-400">
              View All
            </button>
          </div>
          <div className="space-y-2">
            {recentTransactions.map(transaction => (
              <div key={transaction.id} className="flex justify-between items-center py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {transaction.description}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {transaction.category}
                  </p>
                </div>
                <p className={`text-sm font-medium ${
                  transaction.type === 'credit'
                    ? 'text-success-600'
                    : 'text-gray-900 dark:text-white'
                }`}>
                  {transaction.type === 'credit' ? '+' : '-'}
                  {formatCurrency(transaction.amount)}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>
    </div>
  );
};