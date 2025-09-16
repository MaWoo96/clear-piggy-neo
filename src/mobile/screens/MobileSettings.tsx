import React from 'react';
import { ListItem } from '../../shared/components/ListItem';
import { Card } from '../../shared/components/Card';
import {
  User, Bell, Shield, CreditCard, HelpCircle, LogOut,
  Moon, Sun, ChevronRight, Mail, Phone, Globe
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface MobileSettingsProps {
  profile: any;
  workspace: any;
  onSignOut: () => void;
}

export const MobileSettings: React.FC<MobileSettingsProps> = ({
  profile,
  workspace,
  onSignOut,
}) => {
  const { isDark, toggleTheme } = useTheme();

  const settingsSections = [
    {
      title: 'Account',
      items: [
        {
          icon: User,
          title: 'Profile',
          subtitle: profile?.email || 'user@example.com',
          action: () => console.log('Edit profile'),
        },
        {
          icon: CreditCard,
          title: 'Workspace',
          subtitle: workspace?.name || 'Default Workspace',
          action: () => console.log('Edit workspace'),
        },
        {
          icon: Bell,
          title: 'Notifications',
          subtitle: 'Manage alerts and reminders',
          action: () => console.log('Notifications'),
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          icon: isDark ? Sun : Moon,
          title: 'Dark Mode',
          subtitle: isDark ? 'Currently on' : 'Currently off',
          action: toggleTheme,
        },
        {
          icon: Globe,
          title: 'Language',
          subtitle: 'English (US)',
          action: () => console.log('Language'),
        },
      ],
    },
    {
      title: 'Security & Privacy',
      items: [
        {
          icon: Shield,
          title: 'Security',
          subtitle: 'Password, 2FA, sessions',
          action: () => console.log('Security'),
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          icon: HelpCircle,
          title: 'Help Center',
          subtitle: 'FAQs and documentation',
          action: () => console.log('Help'),
        },
        {
          icon: Mail,
          title: 'Contact Support',
          subtitle: 'Get help from our team',
          action: () => console.log('Support'),
        },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card className="bg-gradient-to-r from-primary-600 to-primary-700 text-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
            <User className="w-8 h-8" />
          </div>
          <div className="flex-1">
            <p className="text-lg font-semibold">{profile?.name || 'User'}</p>
            <p className="text-sm text-primary-100">{profile?.email}</p>
            <p className="text-xs text-primary-200 mt-1">Pro Plan • Member since 2024</p>
          </div>
        </div>
      </Card>

      {/* Settings Sections */}
      {settingsSections.map((section) => (
        <div key={section.title}>
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-4">
            {section.title}
          </h3>
          <Card padding="none">
            {section.items.map((item, index) => (
              <ListItem
                key={item.title}
                icon={item.icon}
                title={item.title}
                subtitle={item.subtitle}
                onClick={item.action}
                showChevron
                className={index === section.items.length - 1 ? 'border-b-0' : ''}
              />
            ))}
          </Card>
        </div>
      ))}

      {/* Sign Out */}
      <Card padding="none">
        <ListItem
          icon={LogOut}
          title="Sign Out"
          subtitle="Sign out of your account"
          onClick={onSignOut}
          className="text-danger-600 dark:text-danger-400 border-b-0"
        />
      </Card>

      {/* Version Info */}
      <div className="text-center py-4">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Clear Piggy Neo v0.1.0
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          Made with ❤️ for mobile
        </p>
      </div>
    </div>
  );
};