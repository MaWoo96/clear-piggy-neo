import React from 'react';
import { Block, BlockTitle, Card, List, ListItem } from 'konsta/react';
import { ArrowUpRight, ArrowDownLeft, TrendingUp, Wallet, DollarSign } from 'lucide-react';
import { formatCurrency } from '../../lib/supabase';

interface KonstaDashboardProps {
  accounts: any[];
  transactions: any[];
  loading: boolean;
  onRefresh: () => void;
}

export const KonstaDashboard: React.FC<KonstaDashboardProps> = ({
  accounts,
  transactions,
  loading,
  onRefresh,
}) => {
  const totalBalance = accounts.reduce((sum, acc) => sum + (acc.current_balance_cents || 0), 0);
  const availableBalance = accounts.reduce((sum, acc) => sum + (acc.available_balance_cents || 0), 0);

  const recentTransactions = transactions.slice(0, 5);
  const limitedTransactions = transactions.slice(0, 20); // Limit for performance
  const monthlyIncome = limitedTransactions
    .filter(t => t.type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0);
  const monthlyExpenses = limitedTransactions
    .filter(t => t.type === 'debit')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="pb-4">
      {/* Balance Card */}
      <Block strong inset className="my-4">
        <Card
          colors={{
            bgIos: 'bg-gradient-to-r from-primary-600 to-primary-700',
            bgMaterial: 'bg-gradient-to-r from-primary-600 to-primary-700',
            textIos: 'text-white',
            textMaterial: 'text-white',
          }}
        >
          <div className="p-6 text-center">
            <p className="text-sm opacity-90 mb-1">Total Balance</p>
            <p className="text-4xl font-bold mb-3">{formatCurrency(totalBalance)}</p>
            <p className="text-sm opacity-75">
              Available: {formatCurrency(availableBalance)}
            </p>
          </div>
        </Card>
      </Block>

      {/* Quick Stats */}
      <Block strong inset>
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <ArrowUpRight className="w-8 h-8 text-success-500" />
                <span className="text-xs text-gray-500">This Month</span>
              </div>
              <p className="text-xs text-gray-500 mb-1">Income</p>
              <p className="text-xl font-semibold text-success-600">
                {formatCurrency(monthlyIncome)}
              </p>
            </div>
          </Card>

          <Card>
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <ArrowDownLeft className="w-8 h-8 text-danger-500" />
                <span className="text-xs text-gray-500">This Month</span>
              </div>
              <p className="text-xs text-gray-500 mb-1">Expenses</p>
              <p className="text-xl font-semibold text-danger-600">
                {formatCurrency(monthlyExpenses)}
              </p>
            </div>
          </Card>
        </div>
      </Block>

      {/* Accounts */}
      <BlockTitle>Accounts</BlockTitle>
      <List strong inset>
        {accounts.map(account => (
          <ListItem
            key={account.id}
            title={account.name}
            subtitle={account.institution_name || account.subtype}
            text={formatCurrency(account.current_balance_cents || 0)}
            media={<Wallet className="w-6 h-6 text-gray-400" />}
            link
            chevron={false}
          />
        ))}
      </List>

      {/* Recent Transactions */}
      <BlockTitle>Recent Activity</BlockTitle>
      <List strong inset>
        {recentTransactions.map(transaction => (
          <ListItem
            key={transaction.id}
            title={transaction.description}
            subtitle={transaction.category}
            text={
              <span className={transaction.type === 'credit' ? 'text-success-600' : ''}>
                {transaction.type === 'credit' ? '+' : '-'}
                {formatCurrency(transaction.amount)}
              </span>
            }
            media={
              transaction.type === 'credit' ?
                <ArrowUpRight className="w-5 h-5 text-success-500" /> :
                <DollarSign className="w-5 h-5 text-gray-400" />
            }
            link
            chevron={false}
          />
        ))}
      </List>

      {/* Net Cash Flow */}
      <Block strong inset className="mt-4">
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary-600" />
                <span className="text-sm font-medium">Net Cash Flow</span>
              </div>
              <span className="text-xs text-gray-500">This Month</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-success-500 to-success-600 rounded-full"
                    style={{ width: `${Math.min((monthlyIncome / (monthlyIncome + monthlyExpenses)) * 100, 100)}%` }}
                  />
                </div>
              </div>
              <p className={`text-lg font-semibold ml-4 ${
                monthlyIncome - monthlyExpenses >= 0 ? 'text-success-600' : 'text-danger-600'
              }`}>
                {formatCurrency(monthlyIncome - monthlyExpenses)}
              </p>
            </div>
          </div>
        </Card>
      </Block>
    </div>
  );
};