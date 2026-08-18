import { create } from 'zustand';
import * as Crypto from 'expo-crypto';
import type { User, FitnessGoal } from '@/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, name: string, fitnessGoal: FitnessGoal) => Promise<boolean>;
  logout: () => void;
  initializeAuth: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  clearError: () => void;
}

const createMockUser = (email: string, name: string, fitnessGoal: FitnessGoal): User => ({
  id: Crypto.randomUUID(),
  email,
  name,
  avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=ec4899&color=fff&size=200`,
  age: 28,
  weight: 70,
  height: 175,
  fitnessGoal,
  totalCalories: 12450,
  totalDistance: 45.8,
  totalWorkouts: 24,
  joinDate: new Date().toISOString(),
});

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  authError: null,

  login: async (email: string, password: string): Promise<boolean> => {
    set({ isLoading: true, authError: null });
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (!email.includes('@')) {
        set({ authError: 'Please enter a valid email address', isLoading: false });
        return false;
      }
      
      if (password.length < 6) {
        set({ authError: 'Password must be at least 6 characters', isLoading: false });
        return false;
      }

      const user = createMockUser(email, email.split('@')[0], 'stay_active');
      set({ user, isAuthenticated: true, isLoading: false, authError: null });
      return true;
    } catch (error) {
      set({ authError: 'Login failed. Please try again.', isLoading: false });
      return false;
    }
  },

  signup: async (email: string, password: string, name: string, fitnessGoal: FitnessGoal): Promise<boolean> => {
    set({ isLoading: true, authError: null });
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      if (!email.includes('@')) {
        set({ authError: 'Please enter a valid email address', isLoading: false });
        return false;
      }
      
      if (password.length < 6) {
        set({ authError: 'Password must be at least 6 characters', isLoading: false });
        return false;
      }

      if (name.trim().length < 2) {
        set({ authError: 'Please enter your name', isLoading: false });
        return false;
      }

      const user = createMockUser(email, name, fitnessGoal);
      set({ user, isAuthenticated: true, isLoading: false, authError: null });
      return true;
    } catch (error) {
      set({ authError: 'Signup failed. Please try again.', isLoading: false });
      return false;
    }
  },

  logout: () => {
    set({ user: null, isAuthenticated: false, authError: null });
  },

  initializeAuth: async () => {
    set({ isLoading: true });
    await new Promise(resolve => setTimeout(resolve, 800));
    set({ isLoading: false });
  },

  updateUser: (updates: Partial<User>) => {
    const { user } = get();
    if (user) {
      set({ user: { ...user, ...updates } });
    }
  },

  clearError: () => {
    set({ authError: null });
  },
}));