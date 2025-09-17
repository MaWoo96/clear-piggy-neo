import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, RefreshCw, MoreHorizontal, Trash2, AlertCircle,
  TrendingUp, TrendingDown, CreditCard, Building2, Wallet,
  DollarSign, Eye, EyeOff, ArrowUpRight, ArrowDownRight,
  Landmark, PiggyBank, Banknote
} from 'lucide-react';
import { format } from 'date-fns';
import { PlaidLinkButton } from './PlaidLink';

interface Account {
  id: string;
  name: string;
  institution_name: string;
  account_type?: string;
  account_subtype?: string;
  current_balance_cents?: number;
  available_balance_cents?: number;
  last_sync_at?: string;
  mask?: string;
  institution?: {
    logo_url?: string;
    logo_base64?: string;
    primary_color?: string;
  };
}

interface AccountsViewProps {
  accounts: Account[];
  refreshBalances: () => void;
  refreshingBalances: boolean;
  cleanAllBankData?: () => void;
  loadDashboardData: () => void;
  handleDisconnectAccount: (accountId: string) => void;
  disconnectingAccount: string | null;
  showDisconnectConfirm: string | null;
  setShowDisconnectConfirm: (id: string | null) => void;
}

// Get institution color based on name
const getInstitutionColor = (name: string | undefined): string => {
  if (!name) return 'from-gray-600 to-gray-700';
  const lowerName = name.toLowerCase();

  // Plaid Sandbox
  if (lowerName.includes('plaid')) return 'from-green-500 to-emerald-600';

  // Major Banks
  if (lowerName.includes('chase')) return 'from-blue-600 to-blue-700';
  if (lowerName.includes('wells fargo')) return 'from-red-600 to-yellow-500';
  if (lowerName.includes('bank of america')) return 'from-red-600 to-red-700';
  if (lowerName.includes('citi')) return 'from-blue-500 to-sky-600';
  if (lowerName.includes('capital one')) return 'from-red-500 to-rose-600';

  // Default gradient
  return 'from-indigo-600 to-purple-600';
};

// Get account type icon
const getAccountIcon = (type?: string, subtype?: string) => {
  const className = "h-5 w-5 text-white/90";

  if (subtype?.includes('credit')) return <CreditCard className={className} />;
  if (subtype?.includes('savings')) return <PiggyBank className={className} />;
  if (subtype?.includes('checking')) return <Banknote className={className} />;
  if (type?.includes('investment')) return <TrendingUp className={className} />;
  return <Landmark className={className} />;
};

const formatCurrency = (cents: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(cents / 100);
};

export const AccountsView: React.FC<AccountsViewProps> = ({
  accounts,
  refreshBalances,
  refreshingBalances,
  cleanAllBankData,
  loadDashboardData,
  handleDisconnectAccount,
  disconnectingAccount,
  showDisconnectConfirm,
  setShowDisconnectConfirm
}) => {
  const [showBalances, setShowBalances] = useState(true);

  // Calculate totals
  const totalAssets = accounts
    .filter(a => !a.account_subtype?.includes('credit'))
    .reduce((sum, a) => sum + (a.current_balance_cents || 0), 0);

  const totalDebt = accounts
    .filter(a => a.account_subtype?.includes('credit'))
    .reduce((sum, a) => sum + (a.current_balance_cents || 0), 0);

  const netWorth = totalAssets - totalDebt;

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 dark:text-gray-400">Manage your connected accounts and credit cards</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBalances(!showBalances)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title={showBalances ? "Hide balances" : "Show balances"}
          >
            {showBalances ? (
              <EyeOff className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            ) : (
              <Eye className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            )}
          </button>
          <button
            onClick={refreshBalances}
            className="btn btn-secondary"
            disabled={refreshingBalances}
            title="Refresh account balances with real-time data from Plaid"
          >
            <RefreshCw className={`h-4 w-4 ${refreshingBalances ? 'animate-spin' : ''}`} />
            {refreshingBalances ? 'Refreshing...' : 'Refresh'}
          </button>
          <PlaidLinkButton onSuccess={loadDashboardData}>
            <Plus className="h-4 w-4" />
            Connect Account
          </PlaidLinkButton>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-xl border border-green-200 dark:border-green-800"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-700 dark:text-green-300">Total Assets</span>
            <ArrowUpRight className="h-4 w-4 text-green-600 dark:text-green-400" />
          </div>
          <p className="text-2xl font-bold text-green-900 dark:text-green-100">
            {showBalances ? formatCurrency(totalAssets) : '••••••'}
          </p>
          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
            Across {accounts.filter(a => !a.account_subtype?.includes('credit')).length} accounts
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 p-4 rounded-xl border border-red-200 dark:border-red-800"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-red-700 dark:text-red-300">Total Debt</span>
            <ArrowDownRight className="h-4 w-4 text-red-600 dark:text-red-400" />
          </div>
          <p className="text-2xl font-bold text-red-900 dark:text-red-100">
            {showBalances ? formatCurrency(totalDebt) : '••••••'}
          </p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
            Across {accounts.filter(a => a.account_subtype?.includes('credit')).length} credit cards
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Net Worth</span>
            {netWorth >= 0 ? (
              <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            ) : (
              <TrendingDown className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            )}
          </div>
          <p className={`text-2xl font-bold ${netWorth >= 0 ? 'text-blue-900 dark:text-blue-100' : 'text-red-900 dark:text-red-100'}`}>
            {showBalances ? formatCurrency(netWorth) : '••••••'}
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            Assets minus debt
          </p>
        </motion.div>
      </div>

      {/* Account Cards */}
      <div className="grid grid-cols-2 gap-6">
        {accounts.map((account, index) => {
          const institutionColor = getInstitutionColor(account.institution_name);

          return (
            <motion.div
              key={account.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="relative bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group"
            >
              {/* Gradient Header with Icon */}
              <div className={`h-20 bg-gradient-to-r ${institutionColor} p-4 flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center overflow-hidden">
                    {/* Use actual logo if available, otherwise use icon */}
                    {account.institution?.logo_url || account.institution?.logo_base64 ? (
                      <img
                        src={account.institution.logo_url || `data:image/png;base64,${account.institution.logo_base64}`}
                        alt={account.institution_name}
                        className="w-full h-full object-contain p-1"
                        onError={(e) => {
                          // Fallback to icon if image fails to load
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const iconContainer = target.parentElement;
                          if (iconContainer) {
                            const icon = getAccountIcon(account.account_type, account.account_subtype);
                            const wrapper = document.createElement('div');
                            iconContainer.appendChild(wrapper);
                          }
                        }}
                      />
                    ) : (
                      getAccountIcon(account.account_type, account.account_subtype)
                    )}
                  </div>
                  <div className="text-white">
                    <h3 className="font-semibold text-sm opacity-90">
                      {account.institution_name || 'Bank Account'}
                    </h3>
                    <p className="text-xs opacity-75 capitalize">
                      {account.account_subtype?.replace(/_/g, ' ') || account.account_type || 'Account'}
                    </p>
                  </div>
                </div>

                {/* Actions Menu */}
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDisconnectConfirm(showDisconnectConfirm === account.id ? null : account.id);
                    }}
                    className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <MoreHorizontal className="h-4 w-4 text-white" />
                  </button>

                  {showDisconnectConfirm === account.id && (
                    <div className="absolute right-0 top-10 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-2 z-50">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDisconnectAccount(account.id);
                        }}
                        disabled={disconnectingAccount === account.id}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      >
                        {disconnectingAccount === account.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600" />
                            Disconnecting...
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4" />
                            Disconnect Account
                          </>
                        )}
                      </button>
                      <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                        <AlertCircle className="h-3 w-3 inline mr-1" />
                        This will remove all transactions
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6">
                {/* Account Name and Number */}
                <div className="mb-4">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    {account.name}
                    {account.mask && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">
                        ••{account.mask}
                      </span>
                    )}
                  </h3>
                </div>

                {/* Balances */}
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Current Balance</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {showBalances ? formatCurrency(account.current_balance_cents || 0) : '••••••'}
                    </p>
                  </div>
                  {account.available_balance_cents !== undefined &&
                   account.available_balance_cents !== account.current_balance_cents && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Available</p>
                      <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                        {showBalances ? formatCurrency(account.available_balance_cents || 0) : '••••••'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Last synced: {format(new Date(account.last_sync_at || Date.now()), 'MMM d, h:mm a')}
                  </p>
                  <button
                    onClick={refreshBalances}
                    disabled={refreshingBalances}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    title="Refresh account balance"
                  >
                    <RefreshCw className={`h-3 w-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ${refreshingBalances ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}

      </div>
    </div>
  );
};