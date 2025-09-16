import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useWorkspace } from './useWorkspace';
import { RealtimeChannel } from '@supabase/supabase-js';

interface BudgetAlert {
  id?: string;
  type: 'warning' | 'critical' | 'info';
  category_name: string;
  message: string;
  amount_over_cents?: number;
  percentage_used: number;
  suggested_action?: string;
  timestamp?: string;
  dismissed?: boolean;
}

interface UpcomingBill {
  merchant_pattern: string;
  estimated_amount_cents: number;
  next_expected_date: string;
  confidence_score: number;
  category_name: string;
}

interface BudgetSummary {
  total_budgeted_cents: number;
  total_spent_cents: number;
  categories_over_budget: number;
  utilization_percentage: number;
  health_score: number;
}

interface UseBudgetMonitoring {
  budgetAlerts: BudgetAlert[];
  budgetStatus: 'on_track' | 'warning' | 'over_budget' | null;
  upcomingBills: UpcomingBill[];
  summary: BudgetSummary | null;
  loading: boolean;
  error: string | null;
  
  // Methods
  checkBudgetStatus: () => Promise<void>;
  dismissAlert: (alertId: string) => void;
  refreshMonitoring: () => Promise<void>;
}

const CACHE_DURATION = 30 * 1000; // 30 seconds cache (faster refresh)
const POLL_INTERVAL = 45 * 1000; // Poll every 45 seconds

export const useBudgetMonitoring = (): UseBudgetMonitoring => {
  const { workspace } = useWorkspace();
  const [budgetAlerts, setBudgetAlerts] = useState<BudgetAlert[]>([]);
  const [budgetStatus, setBudgetStatus] = useState<'on_track' | 'warning' | 'over_budget' | null>(null);
  const [upcomingBills, setUpcomingBills] = useState<UpcomingBill[]>([]);
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const lastFetchRef = useRef<number>(0);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const activeBudgetIdRef = useRef<string | null>(null);
  const dismissedAlertsRef = useRef<Map<string, number>>(new Map()); // Track dismissed alerts with timestamps

  const checkBudgetStatus = useCallback(async (force = false) => {
    if (!workspace?.id) return;

    // Check cache unless forced
    const now = Date.now();
    if (!force && now - lastFetchRef.current < CACHE_DURATION) {
      console.log('Using cached budget monitoring data');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get the current service role key
      const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY || 
                        process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

      // Call budget monitor edge function
      const response = await fetch(
        `${process.env.REACT_APP_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/budget-monitor`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceKey || (await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({
            workspace_id: workspace.id,
            include_upcoming_bills: true,
            days_ahead: 30
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Budget monitoring failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        // Update state with monitoring data, but preserve dismissed alerts
        setBudgetAlerts(prev => {
          const newAlerts = data.alerts || [];
          const now = Date.now();
          const DISMISS_DURATION = 5 * 60 * 1000; // Keep dismissed for 5 minutes
          
          // Clean up old dismissed alerts
          dismissedAlertsRef.current.forEach((timestamp, key) => {
            if (now - timestamp > DISMISS_DURATION) {
              dismissedAlertsRef.current.delete(key);
            }
          });
          
          // Only add alerts that haven't been dismissed recently
          const filteredNewAlerts = newAlerts.filter((newAlert: any) => {
            const alertKey = newAlert.id || `${newAlert.category_name}-${newAlert.type}`;
            return !dismissedAlertsRef.current.has(alertKey);
          });
          
          return filteredNewAlerts;
        });
        setBudgetStatus(data.overall_status);
        setUpcomingBills(data.upcoming_bills || []);
        setSummary(data.summary);
        activeBudgetIdRef.current = data.budget_id;
        lastFetchRef.current = now;
        
        console.log(`Budget monitoring updated:
          Status: ${data.overall_status}
          Alerts: ${data.alerts?.length || 0}
          Upcoming bills: ${data.upcoming_bills?.length || 0}
        `);
      } else {
        console.log('No active budget found');
        setBudgetStatus(null);
        setBudgetAlerts([]);
        setUpcomingBills([]);
        setSummary(null);
      }
    } catch (err) {
      console.error('Error checking budget status:', err);
      setError(err instanceof Error ? err.message : 'Failed to check budget status');
    } finally {
      setLoading(false);
    }
  }, [workspace?.id]);

  const dismissAlert = useCallback((alertId: string) => {
    // Add to dismissed alerts with timestamp
    dismissedAlertsRef.current.set(alertId, Date.now());
    
    setBudgetAlerts(prev => 
      prev.filter(alert => {
        const alertKey = alert.id || `${alert.category_name}-${alert.type}`;
        return alertKey !== alertId;
      })
    );

    // Only try to dismiss in database if alertId looks like a UUID (contains hyphens in UUID pattern)
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidPattern.test(alertId)) {
      (supabase as any)
        .from('budget_alerts')
        .update({ is_dismissed: true, dismissed_at: new Date().toISOString() })
        .eq('id', alertId)
        .then(({ error }: any) => {
          if (error) {
            console.error('Error dismissing alert in database:', error);
          }
        });
    }
    // For non-UUID alert keys (like "GENERAL_MERCHANDISE-critical"), we just dismiss them in local state
  }, []);

  const refreshMonitoring = useCallback(async () => {
    await checkBudgetStatus(true);
  }, [checkBudgetStatus]);

  // Set up real-time subscription for budget changes
  useEffect(() => {
    if (!workspace?.id || !activeBudgetIdRef.current) return;

    console.log('Setting up budget monitoring subscriptions...');

    // Subscribe to budget_lines changes
    const channel = supabase
      .channel(`budget-monitoring-${workspace.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'budget_lines',
          filter: `budget_id=eq.${activeBudgetIdRef.current}`
        },
        (payload: any) => {
          console.log('Budget line changed:', payload);
          // Debounce updates
          setTimeout(() => checkBudgetStatus(true), 1000);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions',
          filter: `workspace_id=eq.${workspace.id}`
        },
        (payload: any) => {
          console.log('New transaction detected:', payload);
          // Check if we should update budget monitoring
          const transaction = payload.new as any;
          if (transaction.direction === 'outflow' && transaction.status === 'posted') {
            setTimeout(() => checkBudgetStatus(true), 2000);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'budget_alerts',
          filter: `workspace_id=eq.${workspace.id}`
        },
        (payload: any) => {
          console.log('Budget alert changed:', payload);
          checkBudgetStatus(true);
        }
      )
      .subscribe((status: any) => {
        console.log('Budget monitoring subscription status:', status);
      });

    channelRef.current = channel;

    return () => {
      console.log('Cleaning up budget monitoring subscriptions');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [workspace?.id, checkBudgetStatus]);

  // Initial load and periodic refresh
  useEffect(() => {
    if (!workspace?.id) return;

    // Initial load
    checkBudgetStatus();

    // Set up polling for updates
    const interval = setInterval(() => {
      checkBudgetStatus();
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [workspace?.id, checkBudgetStatus]);

  // Get persisted alerts from database on mount
  useEffect(() => {
    if (!workspace?.id) return;

    const loadPersistedAlerts = async () => {
      const { data, error } = await (supabase as any)
        .from('budget_alerts')
        .select('*')
        .eq('workspace_id', workspace.id)
        .eq('is_dismissed', false)
        .order('created_at', { ascending: false })
        .limit(10);

      if (data && !error) {
        const persistedAlerts: BudgetAlert[] = data.map((alert: any) => ({
          id: alert.id,
          type: alert.severity === 'critical' ? 'critical' : 
                alert.severity === 'warning' ? 'warning' : 'info',
          category_name: alert.category_id || 'Budget',
          message: alert.message,
          amount_over_cents: alert.current_amount_cents,
          percentage_used: 0, // Would need to calculate
          suggested_action: alert.alert_type === 'overspend' 
            ? 'Consider reducing spending or adjusting your budget'
            : 'Monitor spending closely',
          timestamp: alert.created_at
        }));

        // Merge with existing alerts
        setBudgetAlerts(prev => {
          const merged = [...persistedAlerts];
          prev.forEach(alert => {
            if (!alert.id || !merged.find(a => a.id === alert.id)) {
              merged.push(alert);
            }
          });
          return merged;
        });
      }
    };

    loadPersistedAlerts();
  }, [workspace?.id]);

  return {
    budgetAlerts,
    budgetStatus,
    upcomingBills,
    summary,
    loading,
    error,
    checkBudgetStatus,
    dismissAlert,
    refreshMonitoring
  };
};