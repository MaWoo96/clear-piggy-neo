/**
 * Core hook for managing AI Workspace Personalization
 * Handles AI profile CRUD operations, learning events, master prompt building, and insights caching
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/database.types';
import {
  AIWorkspaceProfile,
  AILearningEvent,
  AIInsightCache,
  AIProfileOnboardingData,
  CategoryCorrectionData,
  UserFeedbackData,
  UseAIProfileReturn,
  InsightType,
  InsightFilter,
  LearningEventFilter,
  AIProfileUpdate
} from '../types/ai';

export function useAIProfile(workspaceId: string): UseAIProfileReturn {
  // Data states
  const [profile, setProfile] = useState<AIWorkspaceProfile | null>(null);
  const [insights, setInsights] = useState<AIInsightCache[]>([]);
  const [learningHistory, setLearningHistory] = useState<AILearningEvent[]>([]);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [recordingEvent, setRecordingEvent] = useState(false);
  const [generatingInsights, setGeneratingInsights] = useState(false);
  
  // Error state
  const [error, setError] = useState<Error | null>(null);

  // Fetch AI profile on mount and workspace change
  useEffect(() => {
    if (workspaceId) {
      fetchProfile();
      fetchInsights();
      fetchLearningHistory();
    }
  }, [workspaceId]);

  // Fetch the AI profile for the workspace
  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('ai_workspace_profiles')
        .select('*')
        .eq('workspace_id', workspaceId)
        .maybeSingle();
      
      if (error) {
        throw error;
      }
      
      setProfile(data);
    } catch (err) {
      console.error('Error fetching AI profile:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch cached insights
  const fetchInsights = async (filter?: InsightFilter) => {
    try {
      let query = supabase
        .from('ai_insights_cache')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('is_valid', true)
        .gte('expires_at', new Date().toISOString())
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (filter?.type) {
        query = query.eq('insight_type', filter.type);
      }
      
      if (filter?.min_confidence) {
        query = query.gte('confidence_score', filter.min_confidence);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      setInsights(data || []);
      return data || [];
    } catch (err) {
      console.error('Error fetching insights:', err);
      setError(err as Error);
      return [];
    }
  };

  // Fetch learning history
  const fetchLearningHistory = async (limit = 50) => {
    try {
      const { data, error } = await supabase
        .from('ai_learning_events')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      
      setLearningHistory(data || []);
      return data || [];
    } catch (err) {
      console.error('Error fetching learning history:', err);
      setError(err as Error);
      return [];
    }
  };

  // Create a new AI profile
  const createProfile = async (data: AIProfileOnboardingData): Promise<AIWorkspaceProfile> => {
    try {
      setUpdatingProfile(true);
      setError(null);
      
      const { data: user } = await supabase.auth.getUser();
      
      const profileData = {
        workspace_id: workspaceId,
        financial_goals: data.financial_goals,
        spending_personality: data.spending_personality,
        primary_concerns: data.primary_concerns,
        household_size: data.household_size,
        income_frequency: data.income_frequency,
        custom_context: data.custom_context || null,
        created_by: user?.user?.id || null
      };
      
      const { data: newProfile, error } = await supabase
        .from('ai_workspace_profiles')
        .insert(profileData)
        .select()
        .single();
      
      if (error) throw error;
      
      setProfile(newProfile);
      
      // Trigger master prompt rebuild
      await rebuildMasterPrompt();
      
      return newProfile;
    } catch (err) {
      console.error('Error creating AI profile:', err);
      setError(err as Error);
      throw err;
    } finally {
      setUpdatingProfile(false);
    }
  };

  // Update existing profile
  const updateProfile = async (updates: Partial<AIWorkspaceProfile>) => {
    try {
      setUpdatingProfile(true);
      setError(null);
      
      const { error } = await supabase
        .from('ai_workspace_profiles')
        .update(updates)
        .eq('workspace_id', workspaceId);
      
      if (error) throw error;
      
      // Refresh profile
      await fetchProfile();
      
      // Rebuild master prompt if significant changes
      if (updates.financial_goals || updates.spending_personality || 
          updates.primary_concerns || updates.custom_context) {
        await rebuildMasterPrompt();
      }
    } catch (err) {
      console.error('Error updating AI profile:', err);
      setError(err as Error);
      throw err;
    } finally {
      setUpdatingProfile(false);
    }
  };

  // Update custom context
  const updateCustomContext = async (context: string) => {
    await updateProfile({ custom_context: context });
  };

  // Record a category correction
  const recordCategoryCorrection = async (data: CategoryCorrectionData) => {
    try {
      setRecordingEvent(true);
      setError(null);
      
      const { data: user } = await supabase.auth.getUser();
      
      if (!profile?.id) {
        throw new Error('AI profile not found');
      }
      
      const eventData = {
        workspace_id: workspaceId,
        profile_id: profile.id,
        event_type: 'category_correction',
        transaction_id: data.transaction_id,
        original_category_id: data.original_category_id,
        corrected_category_id: data.corrected_category_id,
        correction_reason: data.correction_reason,
        created_by: user?.user?.id
      };

      const { error } = await supabase
        .from('ai_learning_events')
        .insert(eventData);

      if (error) throw error;

      // Update statistics
      await updateProfile({
        total_corrections: (profile.total_corrections || 0) + 1,
        last_learning_event_at: new Date().toISOString()
      });
      
      // Refresh learning history
      await fetchLearningHistory();
      
      // Trigger background processing
      await processLearningEvents();
    } catch (err) {
      console.error('Error recording category correction:', err);
      setError(err as Error);
      throw err;
    } finally {
      setRecordingEvent(false);
    }
  };

  // Record user feedback
  const recordUserFeedback = async (data: UserFeedbackData) => {
    try {
      setRecordingEvent(true);
      setError(null);
      
      const { data: user } = await supabase.auth.getUser();
      
      if (!profile?.id) {
        throw new Error('AI profile not found');
      }
      
      const eventData = {
        workspace_id: workspaceId,
        profile_id: profile.id,
        event_type: 'feedback',
        feedback_type: data.feedback_type,
        feedback_text: data.feedback_text,
        feedback_context: data.feedback_context || {},
        created_by: user?.user?.id
      };

      const { error } = await supabase
        .from('ai_learning_events')
        .insert(eventData);

      if (error) throw error;
      
      // Update statistics
      await updateProfile({
        total_feedback_events: (profile.total_feedback_events || 0) + 1,
        last_learning_event_at: new Date().toISOString()
      });
      
      // Refresh learning history
      await fetchLearningHistory();
    } catch (err) {
      console.error('Error recording user feedback:', err);
      setError(err as Error);
      throw err;
    } finally {
      setRecordingEvent(false);
    }
  };

  // Get learning history with filters
  const getLearningHistory = async (limit?: number) => {
    return fetchLearningHistory(limit);
  };

  // Get insights with optional type filter
  const getInsights = async (type?: InsightType) => {
    return fetchInsights(type ? { type } : undefined);
  };

  // Generate a new insight
  const generateInsight = async (type: InsightType, params?: any): Promise<AIInsightCache> => {
    try {
      setGeneratingInsights(true);
      setError(null);
      
      // Call edge function to generate insight
      const { data, error } = await supabase.functions.invoke('ai-generate-insight', {
        body: {
          workspace_id: workspaceId,
          profile_id: profile?.id,
          insight_type: type,
          params
        }
      });
      
      if (error) throw error;
      
      // Refresh insights
      await fetchInsights();
      
      return data.insight;
    } catch (err) {
      console.error('Error generating insight:', err);
      setError(err as Error);
      throw err;
    } finally {
      setGeneratingInsights(false);
    }
  };

  // Invalidate all insights
  const invalidateInsights = async () => {
    try {
      const { error } = await supabase
        .from('ai_insights_cache')
        .update({ is_valid: false })
        .eq('workspace_id', workspaceId);
      
      if (error) throw error;
      
      // Refresh insights
      await fetchInsights();
    } catch (err) {
      console.error('Error invalidating insights:', err);
      setError(err as Error);
      throw err;
    }
  };

  // Mark insight as helpful or not
  const markInsightHelpful = async (insightId: string, helpful: boolean) => {
    try {
      // First get current views count
      const { data: currentInsight } = await supabase
        .from('ai_insights_cache')
        .select('views_count')
        .eq('id', insightId)
        .single();
      
      const newViewsCount = (currentInsight?.views_count || 0) + 1;

      const { error } = await supabase
        .from('ai_insights_cache')
        .update({
          was_helpful: helpful,
          views_count: newViewsCount
        })
        .eq('id', insightId)
        .eq('workspace_id', workspaceId);
      
      if (error) throw error;
      
      // Update local state
      setInsights(prev => prev.map(insight => 
        insight.id === insightId 
          ? { ...insight, was_helpful: helpful, views_count: insight.views_count + 1 }
          : insight
      ));
    } catch (err) {
      console.error('Error marking insight helpful:', err);
      setError(err as Error);
      throw err;
    }
  };

  // Dismiss an insight
  const dismissInsight = async (insightId: string) => {
    try {
      const { error } = await supabase
        .from('ai_insights_cache')
        .update({
          dismissed_at: new Date().toISOString(),
          is_valid: false
        })
        .eq('id', insightId)
        .eq('workspace_id', workspaceId);
      
      if (error) throw error;
      
      // Remove from local state
      setInsights(prev => prev.filter(insight => insight.id !== insightId));
    } catch (err) {
      console.error('Error dismissing insight:', err);
      setError(err as Error);
      throw err;
    }
  };

  // Rebuild master prompt
  const rebuildMasterPrompt = async (): Promise<string> => {
    try {
      // Call database function to rebuild master prompt
      const { data, error } = await supabase.rpc('rebuild_ai_master_prompt', { p_workspace_id: workspaceId });
      
      if (error) throw error;
      
      return data;
    } catch (err) {
      console.error('Error rebuilding master prompt:', err);
      setError(err as Error);
      throw err;
    }
  };

  // Process unprocessed learning events
  const processLearningEvents = async () => {
    try {
      // Call edge function to process learning events
      const { error } = await supabase.functions.invoke('ai-reprocess-profile', {
        body: {
          workspace_id: workspaceId,
          profile_id: profile?.id
        }
      });
      
      if (error) throw error;
    } catch (err) {
      console.error('Error processing learning events:', err);
      // Don't throw - this is a background operation
    }
  };

  // Get statistics
  const getStats = () => {
    return {
      totalCorrections: profile?.total_corrections || 0,
      totalFeedback: profile?.total_feedback_events || 0,
      accuracyScore: profile?.accuracy_score || 0,
      lastLearningEvent: profile?.last_learning_event_at || null
    };
  };

  return {
    // Data
    profile,
    insights,
    learningHistory,
    
    // Loading states
    loading,
    updatingProfile,
    recordingEvent,
    generatingInsights,
    
    // Error state
    error,
    
    // Profile management
    createProfile,
    updateProfile,
    updateCustomContext,
    
    // Learning events
    recordCategoryCorrection,
    recordUserFeedback,
    getLearningHistory,
    
    // Insights
    getInsights,
    generateInsight,
    invalidateInsights,
    markInsightHelpful,
    dismissInsight,
    
    // Master prompt
    rebuildMasterPrompt,
    
    // Statistics
    getStats
  };
}