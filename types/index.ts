export interface User {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  age: number;
  weight: number;
  height: number;
  fitnessGoal: 'lose_weight' | 'build_muscle' | 'stay_active' | 'improve_endurance';
  totalCalories: number;
  totalDistance: number;
  totalWorkouts: number;
  joinDate: string;
}

export interface Activity {
  id: string;
  userId: string;
  type: 'running' | 'cycling' | 'strength' | 'yoga' | 'swimming' | 'hiking';
  startTime: string;
  endTime: string | null;
  duration: number;
  distance: number;
  calories: number;
  pace: number | null;
  intensity: 'low' | 'medium' | 'high';
  notes: string | null;
  timestamp: string;
  status: 'active' | 'completed' | 'paused';
}

export interface Goal {
  id: string;
  userId: string;
  type: 'calories' | 'distance' | 'workouts' | 'duration';
  target: string;
  targetValue: number;
  startDate: string;
  endDate: string;
  progress: number;
  status: 'active' | 'completed' | 'failed';
}

export interface Achievement {
  id: string;
  userId: string;
  badge: string;
  title: string;
  description: string;
  icon: string;
  unlockedDate: string | null;
  isUnlocked: boolean;
}

export interface DailyStats {
  id: string;
  userId: string;
  date: string;
  totalCalories: number;
  totalDistance: number;
  totalDuration: number;
  activityCount: number;
}

export interface WeeklyData {
  day: string;
  calories: number;
  duration: number;
}

export type ActivityType = Activity['type'];
export type FitnessGoal = User['fitnessGoal'];
export type ActivityStatus = Activity['status'];

// Pose tracking types
export interface PoseKeypoint {
  name: string;
  x: number;
  y: number;
  score: number;
}

export interface DetectedPose {
  keypoints: PoseKeypoint[];
  score: number;
}

export interface ExerciseRep {
  exerciseType: ExerciseType;
  count: number;
  lastAngle: number;
  isDown: boolean;
}

export type ExerciseType = 'squat' | 'pushup' | 'jumping_jack' | 'lunge';

export interface FormFeedback {
  isGoodForm: boolean;
  message: string;
  severity: 'good' | 'warning' | 'error';
}
