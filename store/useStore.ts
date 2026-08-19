import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { Activity, Goal, Achievement, DailyStats, WeeklyData, ActivityType } from '@/types';

interface AppState {
  activities: Activity[];
  goals: Goal[];
  achievements: Achievement[];
  dailyStats: DailyStats | null;
  weeklyData: WeeklyData[];
  activeWorkout: Activity | null;
  isLoadingActivities: boolean;
  isLoadingStats: boolean;
  
  // Actions
  fetchActivities: () => Promise<void>;
  fetchDailyStats: () => Promise<void>;
  fetchWeeklyData: () => Promise<void>;
  startWorkout: (type: ActivityType) => void;
  endWorkout: () => Promise<Activity | null>;
  pauseWorkout: () => void;
  resumeWorkout: () => void;
  updateActiveWorkout: (updates: Partial<Activity>) => void;
  getActivityById: (id: string) => Activity | undefined;
  filterActivitiesByType: (type: ActivityType | 'all') => Activity[];
  saveActiveWorkout: () => Promise<Activity | null>;
}

export const useStore = create<AppState>((set, get) => ({
  activities: [],
  goals: [],
  achievements: [],
  dailyStats: null,
  weeklyData: [],
  activeWorkout: null,
  isLoadingActivities: false,
  isLoadingStats: false,

  fetchActivities: async () => {
    set({ isLoadingActivities: true });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        set({ activities: [], isLoadingActivities: false });
        return;
      }

      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('userId', user.id)
        .order('timestamp', { ascending: false });

      if (error) throw error;

      const activities: Activity[] = (data || []).map(row => ({
        id: row.id,
        userId: row.userId,
        type: row.type as ActivityType,
        startTime: row.startTime,
        endTime: row.endTime,
        duration: row.duration,
        distance: row.distance,
        calories: row.calories,
        pace: row.pace,
        intensity: row.intensity,
        notes: row.notes,
        timestamp: row.timestamp,
        status: row.status,
      }));

      set({ activities, isLoadingActivities: false });
    } catch (error) {
      console.error('Error fetching activities:', error);
      set({ activities: [], isLoadingActivities: false });
    }
  },

  fetchDailyStats: async () => {
    set({ isLoadingStats: true });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        set({ dailyStats: null, isLoadingStats: false });
        return;
      }

      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('daily_stats')
        .select('*')
        .eq('userId', user.id)
        .eq('date', today)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      const dailyStats: DailyStats | null = data ? {
        id: data.id,
        userId: data.userId,
        date: data.date,
        totalCalories: data.totalCalories,
        totalDistance: data.totalDistance,
        totalDuration: data.totalDuration,
        activityCount: data.activityCount,
      } : null;

      set({ dailyStats, isLoadingStats: false });
    } catch (error) {
      console.error('Error fetching daily stats:', error);
      set({ dailyStats: null, isLoadingStats: false });
    }
  },

  fetchWeeklyData: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        set({ weeklyData: [] });
        return;
      }

      const weeklyData: WeeklyData[] = [];
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        const { data, error } = await supabase
          .from('daily_stats')
          .select('totalCalories, totalDuration')
          .eq('userId', user.id)
          .eq('date', dateStr)
          .single();

        const dayIndex = date.getDay();
        weeklyData.push({
          day: days[dayIndex],
          calories: (data?.totalCalories as number) || 0,
          duration: (data?.totalDuration as number) || 0,
        });
      }

      set({ weeklyData });
    } catch (error) {
      console.error('Error fetching weekly data:', error);
      set({ weeklyData: [] });
    }
  },

  startWorkout: (type: ActivityType) => {
    const workout: Activity = {
      id: '',
      userId: '',
      type,
      startTime: new Date().toISOString(),
      endTime: null,
      duration: 0,
      distance: 0,
      calories: 0,
      pace: null,
      intensity: 'medium',
      notes: null,
      timestamp: new Date().toISOString(),
      status: 'active',
    };
    set({ activeWorkout: workout });
  },

  endWorkout: async () => {
    const { activeWorkout } = get();
    if (!activeWorkout) return null;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const completedWorkout: Activity = {
        ...activeWorkout,
        userId: user.id,
        endTime: new Date().toISOString(),
        status: 'completed',
      };

      const { data, error } = await supabase
        .from('activities')
        .insert([{
          userId: user.id,
          type: completedWorkout.type,
          startTime: completedWorkout.startTime,
          endTime: completedWorkout.endTime,
          duration: completedWorkout.duration,
          distance: completedWorkout.distance,
          calories: completedWorkout.calories,
          pace: completedWorkout.pace,
          intensity: completedWorkout.intensity,
          notes: completedWorkout.notes,
          status: 'completed',
        }])
        .select()
        .single();

      if (error) throw error;

      const savedWorkout: Activity = {
        id: data.id,
        userId: data.userId,
        type: data.type as ActivityType,
        startTime: data.startTime,
        endTime: data.endTime,
        duration: data.duration,
        distance: data.distance,
        calories: data.calories,
        pace: data.pace,
        intensity: data.intensity,
        notes: data.notes,
        timestamp: data.timestamp,
        status: data.status,
      };

      const { activities } = get();
      set({
        activities: [savedWorkout, ...activities],
        activeWorkout: null,
      });

      return savedWorkout;
    } catch (error) {
      console.error('Error ending workout:', error);
      return null;
    }
  },

  pauseWorkout: () => {
    const { activeWorkout } = get();
    if (activeWorkout) {
      set({ activeWorkout: { ...activeWorkout, status: 'paused' } });
    }
  },

  resumeWorkout: () => {
    const { activeWorkout } = get();
    if (activeWorkout) {
      set({ activeWorkout: { ...activeWorkout, status: 'active' } });
    }
  },

  updateActiveWorkout: (updates: Partial<Activity>) => {
    const { activeWorkout } = get();
    if (activeWorkout) {
      set({ activeWorkout: { ...activeWorkout, ...updates } });
    }
  },

  getActivityById: (id: string) => {
    return get().activities.find(a => a.id === id);
  },

  filterActivitiesByType: (type: ActivityType | 'all') => {
    const { activities } = get();
    if (type === 'all') return activities;
    return activities.filter(a => a.type === type);
  },

  saveActiveWorkout: async () => {
    const { activeWorkout } = get();
    if (!activeWorkout) return null;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('activities')
        .insert([{
          userId: user.id,
          type: activeWorkout.type,
          startTime: activeWorkout.startTime,
          endTime: activeWorkout.endTime,
          duration: activeWorkout.duration,
          distance: activeWorkout.distance,
          calories: activeWorkout.calories,
          pace: activeWorkout.pace,
          intensity: activeWorkout.intensity,
          notes: activeWorkout.notes,
          status: activeWorkout.status,
        }])
        .select()
        .single();

      if (error) throw error;

      const savedWorkout: Activity = {
        id: data.id,
        userId: data.userId,
        type: data.type as ActivityType,
        startTime: data.startTime,
        endTime: data.endTime,
        duration: data.duration,
        distance: data.distance,
        calories: data.calories,
        pace: data.pace,
        intensity: data.intensity,
        notes: data.notes,
        timestamp: data.timestamp,
        status: data.status,
      };

      const { activities } = get();
      set({
        activities: [savedWorkout, ...activities],
        activeWorkout: null,
      });

      return savedWorkout;
    } catch (error) {
      console.error('Error saving active workout:', error);
      return null;
    }
  },
}));