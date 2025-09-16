import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface BudgetAlert {
  id?: string;
  type: 'warning' | 'critical' | 'info';
  category_name: string;
  message: string;
  amount_over_cents?: number;
  percentage_used: number;
  suggested_action?: string;
}

interface BudgetAlertBarProps {
  alerts: BudgetAlert[];
  onDismiss: (alertId: string) => void;
  autoDismissDelay?: number; // Auto-dismiss delay in milliseconds (default: 8000ms)
  onNavigateToBudget?: () => void; // Optional callback to navigate to budget tab
}

export const BudgetAlertBar: React.FC<BudgetAlertBarProps> = ({ 
  alerts, 
  onDismiss, 
  autoDismissDelay = 3000,
  onNavigateToBudget
}) => {
  const { isDark } = useTheme();
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  
  // Memoize summary alerts to prevent infinite useEffect loops
  // Handle manual dismiss for summary alerts
  const handleManualDismiss = useCallback((summaryAlertId: string, alert: BudgetAlert) => {
    // Clear the timeout if it exists
    const timeout = timeoutsRef.current.get(summaryAlertId);
    if (timeout) {
      clearTimeout(timeout);
      timeoutsRef.current.delete(summaryAlertId);
    }
    
    // For summary alerts, we need to dismiss all alerts of that type
    if (summaryAlertId === 'critical-summary') {
      // Find all critical alerts and dismiss them
      alerts.filter(a => a.type === 'critical').forEach(a => {
        const alertKey = a.id || `${a.category_name}-${a.type}`;
        onDismiss(alertKey);
      });
    } else if (summaryAlertId === 'warning-summary') {
      // Find all warning alerts and dismiss them
      alerts.filter(a => a.type === 'warning').forEach(a => {
        const alertKey = a.id || `${a.category_name}-${a.type}`;
        onDismiss(alertKey);
      });
    } else if (summaryAlertId === 'info-summary') {
      // Find all info alerts and dismiss them
      alerts.filter(a => a.type === 'info').forEach(a => {
        const alertKey = a.id || `${a.category_name}-${a.type}`;
        onDismiss(alertKey);
      });
    }
  }, [alerts, onDismiss]);

  const displayAlerts = useMemo(() => {
    // Group alerts by severity for summary display
    const alertCounts = alerts.reduce((acc, alert) => {
      acc[alert.type] = (acc[alert.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Create summary alerts instead of individual ones
    const summaryAlerts = [];
    if (alertCounts.critical > 0) {
      summaryAlerts.push({
        id: 'critical-summary',
        type: 'critical' as const,
        category_name: 'Budget Alert',
        message: `${alertCounts.critical} critical budget alert${alertCounts.critical > 1 ? 's' : ''}`,
        percentage_used: 100,
        suggested_action: 'Review your Budget tab for details'
      });
    }
    if (alertCounts.warning > 0) {
      summaryAlerts.push({
        id: 'warning-summary', 
        type: 'warning' as const,
        category_name: 'Budget Alert',
        message: `${alertCounts.warning} budget warning${alertCounts.warning > 1 ? 's' : ''}`,
        percentage_used: 85,
        suggested_action: 'Check your Budget tab for details'
      });
    }
    if (alertCounts.info > 0) {
      summaryAlerts.push({
        id: 'info-summary',
        type: 'info' as const, 
        category_name: 'Budget Alert',
        message: `${alertCounts.info} budget notification${alertCounts.info > 1 ? 's' : ''}`,
        percentage_used: 50,
        suggested_action: 'View your Budget tab for more info'
      });
    }

    return summaryAlerts;
  }, [alerts]);

  // Set up auto-dismiss timers for new alerts
  useEffect(() => {
    console.log(`🔔 Setting up auto-dismiss for ${displayAlerts.length} summary alerts`);
    
    if (displayAlerts.length === 0) return;
    
    displayAlerts.forEach((alert) => {
      const alertKey = alert.id || `${alert.category_name}-${alert.type}`;
      
      // Skip if alert already has a timeout
      if (timeoutsRef.current.has(alertKey)) {
        console.log(`⏰ Alert ${alertKey} already has timer`);
        return;
      }
      
      console.log(`⏰ Setting ${autoDismissDelay}ms auto-dismiss timer for: ${alertKey}`);
      
      // Set up auto-dismiss timer - use the same dismiss logic as manual dismiss
      const timeout = setTimeout(() => {
        console.log(`🚫 Auto-dismissing summary alert: ${alertKey}`);
        handleManualDismiss(alertKey, alert);
        timeoutsRef.current.delete(alertKey);
      }, autoDismissDelay);
      
      timeoutsRef.current.set(alertKey, timeout);
    });
    
    // Clean up timers for alerts that are no longer present
    const currentAlertKeys = new Set(
      displayAlerts.map(alert => alert.id || `${alert.category_name}-${alert.type}`)
        .filter(key => !key.startsWith('undefined'))
    );
    
    timeoutsRef.current.forEach((timeout, key) => {
      if (!currentAlertKeys.has(key)) {
        clearTimeout(timeout);
        timeoutsRef.current.delete(key);
      }
    });
  }, [displayAlerts, autoDismissDelay, handleManualDismiss]);

  // Clean up all timers on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      timeoutsRef.current.clear();
    };
  }, []);

  if (displayAlerts.length === 0) return null;

  const getAlertStyles = (type: 'warning' | 'critical' | 'info') => {
    switch (type) {
      case 'critical':
        return isDark 
          ? 'bg-red-900/90 border-red-700 text-red-100'
          : 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return isDark
          ? 'bg-yellow-900/90 border-yellow-700 text-yellow-100'
          : 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
        return isDark
          ? 'bg-blue-900/90 border-blue-700 text-blue-100'
          : 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const getIcon = (type: 'warning' | 'critical' | 'info') => {
    switch (type) {
      case 'critical':
        return <AlertTriangle className="h-5 w-5" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5" />;
      case 'info':
        return <Info className="h-5 w-5" />;
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      <AnimatePresence>
        {displayAlerts.map((alert, index) => (
          <motion.div
            key={alert.id || `${alert.category_name}-${index}`}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            transition={{ 
              type: 'spring',
              stiffness: 500,
              damping: 30,
              delay: index * 0.1
            }}
            className={`
              p-4 rounded-lg border backdrop-blur-sm shadow-lg cursor-pointer hover:opacity-90 transition-opacity
              ${getAlertStyles(alert.type)}
            `}
            onClick={() => onNavigateToBudget?.()}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {getIcon(alert.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {alert.message}
                    </p>
                    {alert.suggested_action && (
                      <p className="text-xs mt-1 opacity-90">
                        {alert.suggested_action}
                      </p>
                    )}
                    {alert.percentage_used > 0 && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span>{alert.category_name}</span>
                          <span>{alert.percentage_used.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-black/20 rounded-full h-1.5">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(alert.percentage_used, 100)}%` }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                            className={`h-1.5 rounded-full ${
                              alert.type === 'critical' ? 'bg-red-500' :
                              alert.type === 'warning' ? 'bg-yellow-500' :
                              'bg-blue-500'
                            }`}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent triggering navigation
                      handleManualDismiss(alert.id!, alert);
                    }}
                    className="flex-shrink-0 hover:opacity-70 transition-opacity"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};