import React from 'react';
import { Block, BlockTitle, List, ListItem, Toggle } from 'konsta/react';
import {
  User, Bell, Shield, CreditCard, HelpCircle, LogOut,
  Moon, Sun, Globe, ChevronRight, Mail
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface KonstaSettingsProps {
  profile: any;
  workspace: any;
  onSignOut: () => void;
}

export const KonstaSettings: React.FC<KonstaSettingsProps> = ({
  profile,
  workspace,
  onSignOut,
}) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="pb-4">
      {/* Profile Card */}
      <Block strong inset className="my-4">
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <User className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <p className="text-lg font-semibold">{profile?.name || 'User'}</p>
              <p className="text-sm opacity-90">{profile?.email}</p>
              <p className="text-xs opacity-75 mt-1">Pro Plan • Member since 2024</p>
            </div>
          </div>
        </div>
      </Block>

      {/* Account Settings */}
      <BlockTitle>Account</BlockTitle>
      <List strong inset>
        <ListItem
          title="Profile"
          after={profile?.email || 'user@example.com'}
          media={<User className="w-5 h-5" />}
          link
          chevron
        />
        <ListItem
          title="Workspace"
          after={workspace?.name || 'Default'}
          media={<CreditCard className="w-5 h-5" />}
          link
          chevron
        />
        <ListItem
          title="Notifications"
          after="Enabled"
          media={<Bell className="w-5 h-5" />}
          link
          chevron
        />
      </List>

      {/* Preferences */}
      <BlockTitle>Preferences</BlockTitle>
      <List strong inset>
        <ListItem
          title="Dark Mode"
          media={isDark ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          after={
            <Toggle
              checked={isDark}
              onChange={() => toggleTheme()}
            />
          }
        />
        <ListItem
          title="Language"
          after="English (US)"
          media={<Globe className="w-5 h-5" />}
          link
          chevron
        />
      </List>

      {/* Security */}
      <BlockTitle>Security & Privacy</BlockTitle>
      <List strong inset>
        <ListItem
          title="Security Settings"
          after="2FA Enabled"
          media={<Shield className="w-5 h-5" />}
          link
          chevron
        />
        <ListItem
          title="Privacy Policy"
          media={<Shield className="w-5 h-5" />}
          link
          chevron
        />
      </List>

      {/* Support */}
      <BlockTitle>Support</BlockTitle>
      <List strong inset>
        <ListItem
          title="Help Center"
          media={<HelpCircle className="w-5 h-5" />}
          link
          chevron
        />
        <ListItem
          title="Contact Support"
          media={<Mail className="w-5 h-5" />}
          link
          chevron
        />
      </List>

      {/* Sign Out */}
      <Block className="mt-8">
        <List strong inset>
          <ListItem
            title="Sign Out"
            media={<LogOut className="w-5 h-5 text-danger-600" />}
            onClick={onSignOut}
            link
            chevron={false}
            titleWrapClassName="text-danger-600"
          />
        </List>
      </Block>

      {/* Version Info */}
      <Block className="text-center py-4">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Clear Piggy Neo v0.1.0
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          Powered by Konsta UI
        </p>
      </Block>
    </div>
  );
};