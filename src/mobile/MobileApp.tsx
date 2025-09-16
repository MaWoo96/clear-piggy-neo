import React, { useState, useCallback, useMemo } from 'react';
import { App, Page, Navbar, Tabbar, TabbarLink, Block } from 'konsta/react';
import { Home, CreditCard, Receipt, TrendingUp, Settings } from 'lucide-react';
import { KonstaDashboard } from './screens/KonstaDashboard';
import { KonstaTransactions } from './screens/KonstaTransactions';
import { KonstaSettings } from './screens/KonstaSettings';
import './styles/ios-fixes.css';

interface MobileAppProps {
  accounts: any[];
  transactions: any[];
  profile: any;
  workspace: any;
  loading: boolean;
  onSignOut: () => void;
  onRefresh: () => void;
}

export const MobileApp: React.FC<MobileAppProps> = ({
  accounts,
  transactions,
  profile,
  workspace,
  loading,
  onSignOut,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState('home');

  const theme = 'ios'; // or 'material' for Android

  // Memoize tab change handlers to prevent re-renders
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  return (
    <App theme={theme} safeAreas>
      <Page className="overflow-hidden">
        <Navbar
          title="Clear Piggy"
          subtitle={workspace?.name || 'Personal Finance'}
          className="sticky top-0 z-50"
          colors={{
            bgIos: 'bg-white dark:bg-gray-900',
            bgMaterial: 'bg-primary-600',
            textIos: 'text-gray-900 dark:text-white',
            textMaterial: 'text-white',
          }}
        />

        <div className="pb-16 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          {activeTab === 'home' && (
            <KonstaDashboard
              accounts={accounts}
              transactions={transactions}
              loading={loading}
              onRefresh={onRefresh}
            />
          )}

          {activeTab === 'transactions' && (
            <KonstaTransactions
              transactions={transactions.slice(0, 50)} // Limit to 50 for performance
              loading={loading}
              onRefresh={onRefresh}
            />
          )}

          {activeTab === 'accounts' && (
            <Block strong inset>
              <div className="p-4">
                <h2 className="text-lg font-semibold mb-4">Accounts</h2>
                {accounts.map((account) => (
                  <div key={account.id} className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{account.name}</p>
                        <p className="text-sm text-gray-500">{account.institution_name}</p>
                      </div>
                      <p className="font-semibold">${(account.current_balance_cents / 100).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Block>
          )}

          {activeTab === 'receipts' && (
            <Block strong inset>
              <div className="p-4">
                <h2 className="text-lg font-semibold mb-4">Receipts</h2>
                <button className="w-full p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                  <Receipt className="w-8 h-8 mx-auto mb-2 text-primary-600" />
                  <p className="text-sm">Upload Receipt</p>
                </button>
              </div>
            </Block>
          )}

          {activeTab === 'settings' && (
            <KonstaSettings
              profile={profile}
              workspace={workspace}
              onSignOut={onSignOut}
            />
          )}
        </div>

        <Tabbar
          labels
          className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900"
        >
          <TabbarLink
            active={activeTab === 'home'}
            onClick={() => handleTabChange('home')}
            icon={<Home className="w-5 h-5" />}
            label="Home"
          />
          <TabbarLink
            active={activeTab === 'accounts'}
            onClick={() => handleTabChange('accounts')}
            icon={<CreditCard className="w-5 h-5" />}
            label="Accounts"
          />
          <TabbarLink
            active={activeTab === 'transactions'}
            onClick={() => handleTabChange('transactions')}
            icon={<TrendingUp className="w-5 h-5" />}
            label="Activity"
          />
          <TabbarLink
            active={activeTab === 'receipts'}
            onClick={() => handleTabChange('receipts')}
            icon={<Receipt className="w-5 h-5" />}
            label="Receipts"
          />
          <TabbarLink
            active={activeTab === 'settings'}
            onClick={() => handleTabChange('settings')}
            icon={<Settings className="w-5 h-5" />}
            label="Settings"
          />
        </Tabbar>
      </Page>
    </App>
  );
};