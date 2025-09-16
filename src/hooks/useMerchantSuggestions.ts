import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface MerchantSuggestion {
  category_id: string;
  category_name: string;
  confidence: number;
  times_used: number;
}

export function useMerchantSuggestions(workspaceId: string, merchantName: string | null) {
  const [suggestion, setSuggestion] = useState<MerchantSuggestion | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!workspaceId || !merchantName) {
      setSuggestion(null);
      return;
    }

    const fetchSuggestion = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.rpc('get_merchant_suggestions', {
          p_workspace_id: workspaceId,
          p_merchant_name: merchantName
        });

        if (!error && data && data.length > 0) {
          setSuggestion(data[0]);
        } else {
          setSuggestion(null);
        }
      } catch (error) {
        console.error('Failed to fetch merchant suggestions:', error);
        setSuggestion(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestion();
  }, [workspaceId, merchantName]);

  return { suggestion, isLoading };
}

// Hook to get learning statistics
export function useLearningStats(workspaceId: string) {
  const [stats, setStats] = useState({
    totalPatterns: 0,
    highConfidencePatterns: 0,
    recentLearnings: [] as any[]
  });

  useEffect(() => {
    if (!workspaceId) return;

    const fetchStats = async () => {
      try {
        // Get total patterns
        const { count: totalPatterns } = await supabase
          .from('merchant_intelligence')
          .select('*', { count: 'exact', head: true })
          .eq('workspace_id', workspaceId);

        // Get high confidence patterns (>= 0.9)
        const { count: highConfidencePatterns } = await supabase
          .from('merchant_intelligence')
          .select('*', { count: 'exact', head: true })
          .eq('workspace_id', workspaceId)
          .gte('confidence_score', 0.9);

        // Get recent learning events
        const { data: recentLearnings } = await supabase
          .from('merchant_intelligence')
          .select(`
            merchant_name,
            primary_category_id,
            confidence_score,
            last_updated,
            categories!inner(name)
          `)
          .eq('workspace_id', workspaceId)
          .order('last_updated', { ascending: false })
          .limit(5);

        setStats({
          totalPatterns: totalPatterns || 0,
          highConfidencePatterns: highConfidencePatterns || 0,
          recentLearnings: recentLearnings || []
        });
      } catch (error) {
        console.error('Failed to fetch learning stats:', error);
      }
    };

    fetchStats();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('merchant_intelligence_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'merchant_intelligence',
          filter: `workspace_id=eq.${workspaceId}`
        }, 
        () => {
          fetchStats(); // Refetch stats on any change
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [workspaceId]);

  return stats;
}