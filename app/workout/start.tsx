import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useStore } from '@/store/useStore';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import type { ActivityType } from '@/types';

interface WorkoutType {
  id: ActivityType;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  caloriesPerMin: number;
}

const workoutTypes: WorkoutType[] = [
  { id: 'running', name: 'Running', icon: 'walk', color: '#ec4899', caloriesPerMin: 10 },
  { id: 'cycling', name: 'Cycling', icon: 'bicycle', color: '#f97316', caloriesPerMin: 8 },
  { id: 'strength', name: 'Strength', icon: 'barbell', color: '#8b5cf6', caloriesPerMin: 6 },
  { id: 'yoga', name: 'Yoga', icon: 'body', color: '#10b981', caloriesPerMin: 3 },
  { id: 'swimming', name: 'Swimming', icon: 'water', color: '#3b82f6', caloriesPerMin: 9 },
  { id: 'hiking', name: 'Hiking', icon: 'trail-sign', color: '#f59e0b', caloriesPerMin: 5 },
];

export default function StartWorkoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const { activeWorkout, startWorkout, endWorkout, pauseWorkout, resumeWorkout, updateActiveWorkout } = useStore();

  const [selectedType, setSelectedType] = useState<ActivityType | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [distance, setDistance] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isActive && !isPaused) {
      timerRef.current = setInterval(() => {
        setSeconds((prev) => {
          const newSeconds = prev + 1;
          // Simulate distance increase for cardio activities
          if (selectedType && ['running', 'cycling', 'swimming', 'hiking'].includes(selectedType)) {
            const rate = selectedType === 'cycling' ? 0.005 : selectedType === 'running' ? 0.002 : 0.001;
            setDistance((d) => d + rate);
          }
          return newSeconds;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, isPaused, selectedType]);

  useEffect(() => {
    if (isActive && !isPaused) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isActive, isPaused]);

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getCaloriesBurned = () => {
    if (!selectedType) return 0;
    const type = workoutTypes.find((t) => t.id === selectedType);
    return Math.round((type?.caloriesPerMin || 5) * (seconds / 60));
  };

  const handleStart = () => {
    if (!selectedType) {
      Alert.alert('Select Activity', 'Please select an activity type to start');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    startWorkout(selectedType);
    setIsActive(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsPaused(true);
    pauseWorkout();
  };

  const handleResume = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsPaused(false);
    resumeWorkout();
  };

  const handleEnd = () => {
    Alert.alert('End Workout', 'Are you sure you want to end this workout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End Workout',
        style: 'destructive',
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          const duration = Math.floor(seconds / 60);
          const calories = getCaloriesBurned();
          updateActiveWorkout({
            duration,
            calories,
            distance: parseFloat(distance.toFixed(2)),
          });
          const completed = endWorkout();
          if (completed) {
            router.replace(`/workout/${completed.id}`);
          }
        },
      },
    ]);
  };

  const handleClose = () => {
    if (isActive) {
      Alert.alert('Discard Workout', 'Are you sure you want to discard this workout?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => router.back(),
        },
      ]);
    } else {
      router.back();
    }
  };

  const selectedWorkout = workoutTypes.find((t) => t.id === selectedType);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={
          selectedWorkout
            ? [selectedWorkout.color, `${selectedWorkout.color}dd`]
            : (colors.gradient as unknown as string[])
        }
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isActive ? (selectedWorkout?.name || 'Workout') : 'Start Workout'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {isActive && (
          <View style={styles.activeStatus}>
            <Animated.View
              style={[
                styles.pulsingDot,
                { transform: [{ scale: pulseAnim }] },
                isPaused && { backgroundColor: '#f59e0b' },
              ]}
            />
            <Text style={styles.statusText}>{isPaused ? 'Paused' : 'In Progress'}</Text>
          </View>
        )}
      </LinearGradient>

      <View style={styles.content}>
        {!isActive ? (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Select Activity Type
            </Text>
            <View style={styles.typesGrid}>
              {workoutTypes.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedType(type.id);
                  }}
                  activeOpacity={0.8}
                >
                  <Card
                    variant={selectedType === type.id ? 'gradient' : 'elevated'}
                    gradientColors={[type.color, `${type.color}dd`]}
                    style={styles.typeCard}
                  >
                    <View
                      style={[
                        styles.typeIconContainer,
                        {
                          backgroundColor:
                            selectedType === type.id
                              ? 'rgba(255,255,255,0.2)'
                              : `${type.color}20`,
                        },
                      ]}
                    >
                      <Ionicons
                        name={type.icon}
                        size={28}
                        color={selectedType === type.id ? '#fff' : type.color}
                      />
                    </View>
                    <Text
                      style={[
                        styles.typeName,
                        {
                          color: selectedType === type.id ? '#fff' : colors.text,
                        },
                      ]}
                    >
                      {type.name}
                    </Text>
                  </Card>
                </TouchableOpacity>
              ))}
            </View>

            <Button
              title="Start Workout"
              onPress={handleStart}
              variant="primary"
              size="lg"
              fullWidth
              icon="play"
              disabled={!selectedType}
              style={{ marginTop: 32 }}
            />
          </>
        ) : (
          <View style={styles.activeContainer}>
            <View style={styles.timerContainer}>
              <Text style={[styles.timerLabel, { color: colors.textSecondary }]}>
                Duration
              </Text>
              <Text style={[styles.timer, { color: colors.text }]}>
                {formatTime(seconds)}
              </Text>
            </View>

            <View style={styles.statsRow}>
              <Card variant="elevated" style={styles.statCard}>
                <Ionicons name="flame" size={28} color={colors.primary} />
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {getCaloriesBurned()}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Calories
                </Text>
              </Card>

              {['running', 'cycling', 'swimming', 'hiking'].includes(selectedType || '') && (
                <Card variant="elevated" style={styles.statCard}>
                  <Ionicons name="location" size={28} color="#f97316" />
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {distance.toFixed(2)}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                    km
                  </Text>
                </Card>
              )}

              <Card variant="elevated" style={styles.statCard}>
                <Ionicons name="speedometer" size={28} color="#facc15" />
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {seconds > 0 && distance > 0
                    ? ((distance / (seconds / 3600)) || 0).toFixed(1)
                    : '0.0'}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  km/h
                </Text>
              </Card>
            </View>

            <View style={styles.controlsRow}>
              {isPaused ? (
                <Button
                  title="Resume"
                  onPress={handleResume}
                  variant="primary"
                  size="lg"
                  icon="play"
                  style={{ flex: 1 }}
                />
              ) : (
                <Button
                  title="Pause"
                  onPress={handlePause}
                  variant="secondary"
                  size="lg"
                  icon="pause"
                  style={{ flex: 1 }}
                />
              )}
              <Button
                title="End"
                onPress={handleEnd}
                variant="destructive"
                size="lg"
                icon="stop"
                style={{ flex: 1 }}
              />
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  activeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  pulsingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22c55e',
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
  },
  typesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  typeCard: {
    width: '100%',
    minWidth: 100,
    alignItems: 'center',
    paddingVertical: 20,
  },
  typeIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  typeName: {
    fontSize: 14,
    fontWeight: '600',
  },
  activeContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  timerContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  timerLabel: {
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  timer: {
    fontSize: 72,
    fontWeight: '200',
    marginTop: 8,
    fontVariant: ['tabular-nums'],
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 24,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
});