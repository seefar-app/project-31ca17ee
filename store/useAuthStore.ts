import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { User, FitnessGoal } from '@/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, name: string, fitnessGoal: FitnessGoal) => Promise<boolean>;
  logout: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  clearError: () => void;
}

const mapDatabaseUserToUser = (dbUser: any): User => ({
  id: dbUser.id,
  email: dbUser.email,
  name: dbUser.name || '',
  avatar: dbUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(dbUser.name || 'User')}&background=ec4899&color=fff&size=200`,
  age: dbUser.age,
  weight: dbUser.weight,
  height: dbUser.height,
  fitnessGoal: dbUser.fitnessGoal || 'stay_active',
  totalCalories: dbUser.totalCalories || 0,
  totalDistance: dbUser.totalDistance || 0,
  totalWorkouts: dbUser.totalWorkouts || 0,
  joinDate: dbUser.joinDate || new Date().toISOString(),
});

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  authError: null,

  login: async (email: string, password: string): Promise<boolean> => {
    set({ isLoading: true, authError: null });
    
    try {
      if (!email || !email.includes('@')) {
        set({ authError: 'Please enter a valid email address.', isLoading: false });
        return false;
      }
      
      if (!password || password.length < 6) {
        set({ authError: 'Password must be at least 6 characters.', isLoading: false });
        return false;
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        let friendlyMessage = 'Incorrect email or password. Please try again.';
        if (authError.message.includes('Invalid login credentials')) {
          friendlyMessage = 'Incorrect email or password. Please try again.';
        } else if (authError.message.includes('Email not confirmed')) {
          friendlyMessage = 'Please verify your email before logging in.';
        }
        set({ authError: friendlyMessage, isLoading: false });
        return false;
      }

      if (!authData.user) {
        set({ authError: 'Login failed. Please try again.', isLoading: false });
        return false;
      }

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profile) {
        set({ authError: 'Failed to load user profile.', isLoading: false });
        return false;
      }

      const user = mapDatabaseUserToUser(profile);
      set({ user, isAuthenticated: true, isLoading: false, authError: null });
      return true;
    } catch (error) {
      console.error('Login error:', error);
      set({ authError: 'Login failed. Please try again.', isLoading: false });
      return false;
    }
  },

  signup: async (email: string, password: string, name: string, fitnessGoal: FitnessGoal): Promise<boolean> => {
    set({ isLoading: true, authError: null });
    
    try {
      if (!email || !email.includes('@')) {
        set({ authError: 'Please enter a valid email address.', isLoading: false });
        return false;
      }
      
      if (!password || password.length < 6) {
        set({ authError: 'Password must be at least 6 characters.', isLoading: false });
        return false;
      }

      if (!name || name.trim().length < 2) {
        set({ authError: 'Please enter your name.', isLoading: false });
        return false;
      }

      const { data: authData, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name.trim(),
            fitnessGoal,
          },
        },
      });

      if (signupError) {
        let friendlyMessage = 'Signup failed. Please try again.';
        if (signupError.message.includes('already registered')) {
          friendlyMessage = 'An account with this email already exists.';
        } else if (signupError.message.includes('Password')) {
          friendlyMessage = 'Password does not meet requirements.';
        }
        set({ authError: friendlyMessage, isLoading: false });
        return false;
      }

      if (!authData.user) {
        set({ authError: 'Signup failed. Please try again.', isLoading: false });
        return false;
      }

      // Wait a bit for the trigger to create the user profile
      await new Promise(resolve => setTimeout(resolve, 1000));

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profile) {
        console.error('Profile fetch error:', profileError);
        set({ authError: 'Failed to load user profile.', isLoading: false });
        return false;
      }

      const user = mapDatabaseUserToUser(profile);
      set({ user, isAuthenticated: true, isLoading: false, authError: null });
      return true;
    } catch (error) {
      console.error('Signup error:', error);
      set({ authError: 'Signup failed. Please try again.', isLoading: false });
      return false;
    }
  },

  logout: async () => {
    try {
      await supabase.auth.signOut();
      set({ user: null, isAuthenticated: false, authError: null });
    } catch (error) {
      console.error('Logout error:', error);
      set({ authError: 'Logout failed. Please try again.' });
    }
  },

  initializeAuth: async () => {
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        set({ isLoading: false, isAuthenticated: false, user: null });
        return;
      }

      if (!sessionData.session) {
        set({ isLoading: false, isAuthenticated: false, user: null });
        return;
      }

      const userId = sessionData.session.user.id;
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Profile error:', profileError);
        set({ isLoading: false, isAuthenticated: false, user: null });
        return;
      }

      if (!profile) {
        set({ isLoading: false, isAuthenticated: false, user: null });
        return;
      }

      const user = mapDatabaseUserToUser(profile);
      set({ user, isAuthenticated: true, isLoading: false });

      // Set up auth state change listener
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          set({ user: null, isAuthenticated: false });
        } else if (event === 'SIGNED_IN' && session.user) {
          const { data: updatedProfile } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if (updatedProfile) {
            const updatedUser = mapDatabaseUserToUser(updatedProfile);
            set({ user: updatedUser, isAuthenticated: true });
          }
        }
      });
    } catch (error) {
      console.error('Initialize auth error:', error);
      set({ isLoading: false, isAuthenticated: false, user: null });
    }
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
