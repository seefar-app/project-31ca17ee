import { create } from 'zustand';
import * as Crypto from 'expo-crypto';
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
  endWorkout: () => Activity | null;
  pauseWorkout: () => void;
  resumeWorkout: () => void;
  updateActiveWorkout: (updates: Partial<Activity>) => void;
  getActivityById: (id: string) => Activity | undefined;
  filterActivitiesByType: (type: ActivityType | 'all') => Activity[];
}

const mockActivities: Activity[] = [
  {
    id: Crypto.randomUUID(),
    userId: '1',
    type: 'running',
    startTime: new Date(Date.now() - 86400000).toISOString(),
    endTime: new Date(Date.now() - 86400000 + 2700000).toISOString(),
    duration: 45,
    distance: 5.2,
    calories: 420,
    pace: 8.65,
    intensity: 'medium',
    notes: 'Morning run in the park',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    status: 'completed',
  },
  {
    id: Crypto.randomUUID(),
    userId: '1',
    type: 'strength',
    startTime: new Date(Date.now() - 172800000).toISOString(),
    endTime: new Date(Date.now() - 172800000 + 3600000).toISOString(),
    duration: 60,
    distance: 0,
    calories: 350,
    pace: null,
    intensity: 'high',
    notes: 'Upper body workout - chest and back',
    timestamp: new Date(Date.now() - 172800000).toISOString(),
    status: 'completed',
  },
  {
    id: Crypto.randomUUID(),
    userId: '1',
    type: 'cycling',
    startTime: new Date(Date.now() - 259200000).toISOString(),
    endTime: new Date(Date.now() - 259200000 + 5400000).toISOString(),
    duration: 90,
    distance: 25.5,
    calories: 680,
    pace: 17,
    intensity: 'medium',
    notes: 'Scenic route through the hills',
    timestamp: new Date(Date.now() - 259200000).toISOString(),
    status: 'completed',
  },
  {
    id: Crypto.randomUUID(),
    userId: '1',
    type: 'yoga',
    startTime: new Date(Date.now() - 345600000).toISOString(),
    endTime: new Date(Date.now() - 345600000 + 2400000).toISOString(),
    duration: 40,
    distance: 0,
    calories: 150,
    pace: null,
    intensity: 'low',
    notes: 'Relaxing evening flow session',
    timestamp: new Date(Date.now() - 345600000).toISOString(),
    status: 'completed',
  },
  {
    id: Crypto.randomUUID(),
    userId: '1',
    type: 'swimming',
    startTime: new Date(Date.now() - 432000000).toISOString(),
    endTime: new Date(Date.now() - 432000000 + 2700000).toISOString(),
    duration: 45,
    distance: 1.5,
    calories: 380,
    pace: 2,
    intensity: 'medium',
    notes: 'Lap swimming at the pool',
    timestamp: new Date(Date.now() - 432000000).toISOString(),
    status: 'completed',
  },
  {
    id: Crypto.randomUUID(),
    userId: '1',
    type: 'hiking',
    startTime: new Date(Date.now() - 518400000).toISOString(),
    endTime: new Date(Date.now() - 518400000 + 10800000).toISOString(),
    duration: 180,
    distance: 12.3,
    calories: 850,
    pace: 4.1,
    intensity: 'medium',
    notes: 'Mountain trail with beautiful views',
    timestamp: new Date(Date.now() - 518400000).toISOString(),
    status: 'completed',
  },
];

const mockAchievements: Achievement[] = [
  {
    id: Crypto.randomUUID(),
    userId: '1',
    badge: 'first_workout',
    title: 'First Steps',
    description: 'Completed your first workout',
    icon: 'trophy',
    unlockedDate: new Date(Date.now() - 2592000000).toISOString(),
    isUnlocked: true,
  },
  {
    id: Crypto.randomUUID(),
    userId: '1',
    badge: 'week_warrior',
    title: 'Week Warrior',
    description: 'Worked out 7 days in a row',
    icon: 'flame',
    unlockedDate: new Date(Date.now() - 864000000).toISOString(),
    isUnlocked: true,
  },
  {
    id: Crypto.randomUUID(),
    userId: '1',
    badge: 'calorie_crusher',
    title: 'Calorie Crusher',
    description: 'Burned 5,000 calories total',
    icon: 'flash',
    unlockedDate: new Date(Date.now() - 432000000).toISOString(),
    isUnlocked: true,
  },
  {
    id: Crypto.randomUUID(),
    userId: '1',
    badge: 'distance_master',
    title: 'Distance Master',
    description: 'Traveled 50km total',
    icon: 'map',
    unlockedDate: null,
    isUnlocked: false,
  },
  {
    id: Crypto.randomUUID(),
    userId: '1',
    badge: 'early_bird',
    title: 'Early Bird',
    description: 'Complete 10 workouts before 7am',
    icon: 'sunny',
    unlockedDate: null,
    isUnlocked: false,
  },
  {
    id: Crypto.randomUUID(),
    userId: '1',
    badge: 'variety_king',
    title: 'Variety King',
    description: 'Try all 6 workout types',
    icon: 'star',
    unlockedDate: new Date(Date.now() - 172800000).toISOString(),
    isUnlocked: true,
  },
];

const mockGoals: Goal[] = [
  {
    id: Crypto.randomUUID(),
    userId: '1',
    type: 'calories',
    target: 'Burn 500 calories daily',
    targetValue: 500,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 86400000 * 30).toISOString(),
    progress: 72,
    status: 'active',
  },
  {
    id: Crypto.randomUUID(),
    userId: '1',
    type: 'workouts',
    target: '5 workouts per week',
    targetValue: 5,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 86400000 * 7).toISOString(),
    progress: 60,
    status: 'active',
  },
];

const mockWeeklyData: WeeklyData[] = [
  { day: 'Mon', calories: 450, duration: 45 },
  { day: 'Tue', calories: 320, duration: 35 },
  { day: 'Wed', calories: 580, duration: 60 },
  { day: 'Thu', calories: 0, duration: 0 },
  { day: 'Fri', calories: 420, duration: 50 },
  { day: 'Sat', calories: 680, duration: 90 },
  { day: 'Sun', calories: 150, duration: 30 },
];

export const useStore = create<AppState>((set, get) => ({
  activities: [],
  goals: mockGoals,
  achievements: mockAchievements,
  dailyStats: null,
  weeklyData: [],
  activeWorkout: null,
  isLoadingActivities: false,
  isLoadingStats: false,

  fetchActivities: async () => {
    set({ isLoadingActivities: true });
    await new Promise(resolve => setTimeout(resolve, 600));
    set({ activities: mockActivities, isLoadingActivities: false });
  },

  fetchDailyStats: async () => {
    set({ isLoadingStats: true });
    await new Promise(resolve => setTimeout(resolve, 400));
    const dailyStats: DailyStats = {
      id: Crypto.randomUUID(),
      userId: '1',
      date: new Date().toISOString().split('T')[0],
      totalCalories: 420,
      totalDistance: 5.2,
      totalDuration: 45,
      activityCount: 1,
    };
    set({ dailyStats, isLoadingStats: false });
  },

  fetchWeeklyData: async () => {
    await new Promise(resolve => setTimeout(resolve, 300));
    set({ weeklyData: mockWeeklyData });
  },

  startWorkout: (type: ActivityType) => {
    const workout: Activity = {
      id: Crypto.randomUUID(),
      userId: '1',
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

  endWorkout: () => {
    const { activeWorkout, activities } = get();
    if (!activeWorkout) return null;

    const completedWorkout: Activity = {
      ...activeWorkout,
      endTime: new Date().toISOString(),
      status: 'completed',
    };

    set({
      activities: [completedWorkout, ...activities],
      activeWorkout: null,
    });

    return completedWorkout;
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
}));