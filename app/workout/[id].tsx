import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useStore } from '@/store/useStore';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import type { Activity } from '@/types';

const activityIcons: Record<Activity['type'], keyof typeof Ionicons.glyphMap> = {
  running: 'walk',
  cycling: 'bicycle',
  strength: 'barbell',
  yoga: 'body',
  swimming: 'water',
  hiking: 'trail-sign',
};

const activityColors: Record<Activity['type'], string> = {
  running: '#ec4899',
  cycling: '#f97316',
  strength: '#8b5cf6',
  yoga: '#10b981',
  swimming: '#3b82f6',
  hiking: '#f59e0b',
};

export default function WorkoutDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const { getActivityById } = useStore();

  const activity = getActivityById(id || '');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  if (!activity) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.notFound, { paddingTop: insets.top + 60 }]}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.textTertiary} />
          <Text style={[styles.notFoundText, { color: colors.textSecondary }]}>
            Workout not found
          </Text>
          <Button
            title="Go Back"
            onPress={() => router.back()}
            variant="primary"
            style={{ marginTop: 24 }}
          />
        </View>
      </View>
    );
  }

  const activityColor = activityColors[activity.type];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[activityColor, `${activityColor}dd`]}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <View style={styles.headerRow}>
          <Button
            title=""
            onPress={() => router.back()}
            variant="ghost"
            icon="arrow-back"
            style={styles.backButton}
          />
          <Badge
            text={activity.status}
            variant={activity.status === 'completed' ? 'success' : 'primary'}
          />
        </View>

        <View style={styles.headerContent}>
          <View style={styles.activityIcon}>
            <Ionicons name={activityIcons[activity.type]} size={40} color={activityColor} />
          </View>
          <Text style={styles.activityType}>
            {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}
          </Text>
          <Text style={styles.activityDate}>
            {format(new Date(activity.timestamp), 'EEEE, MMMM d, yyyy')}
          </Text>
          <Text style={styles.activityTime}>
            {format(new Date(activity.startTime), 'h:mm a')}
            {activity.endTime && ` - ${format(new Date(activity.endTime), 'h:mm a')}`}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Main Stats */}
          <View style={styles.mainStats}>
            <Card variant="elevated" style={styles.mainStatCard}>
              <Ionicons name="time-outline" size={32} color={activityColor} />
              <Text style={[styles.mainStatValue, { color: colors.text }]}>
                {activity.duration}
              </Text>
              <Text style={[styles.mainStatLabel, { color: colors.textSecondary }]}>
                Minutes
              </Text>
            </Card>

            <Card variant="elevated" style={styles.mainStatCard}>
              <Ionicons name="flame-outline" size={32} color="#f97316" />
              <Text style={[styles.mainStatValue, { color: colors.text }]}>
                {activity.calories}
              </Text>
              <Text style={[styles.mainStatLabel, { color: colors.textSecondary }]}>
                Calories
              </Text>
            </Card>

            {activity.distance > 0 && (
              <Card variant="elevated" style={styles.mainStatCard}>
                <Ionicons name="location-outline" size={32} color="#facc15" />
                <Text style={[styles.mainStatValue, { color: colors.text }]}>
                  {activity.distance.toFixed(2)}
                </Text>
                <Text style={[styles.mainStatLabel, { color: colors.textSecondary }]}>
                  km
                </Text>
              </Card>
            )}
          </View>

          {/* Details Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Details</Text>
            <Card variant="elevated">
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                  Intensity
                </Text>
                <Badge
                  text={activity.intensity}
                  variant={
                    activity.intensity === 'high'
                      ? 'error'
                      : activity.intensity === 'medium'
                        ? 'warning'
                        : 'success'
                  }
                />
              </View>

              {activity.pace && (
                <View style={[styles.detailRow, { borderTopWidth: 1, borderTopColor: colors.border }]}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                    Average Pace
                  </Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {activity.pace.toFixed(1)} km/h
                  </Text>
                </View>
              )}

              {activity.notes && (
                <View style={[styles.detailRow, { borderTopWidth: 1, borderTopColor: colors.border }]}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                    Notes
                  </Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {activity.notes}
                  </Text>
                </View>
              )}
            </Card>
          </View>

          {/* Celebration Card for Completed Workouts */}
          {activity.status === 'completed' && (
            <Card variant="gradient" style={styles.celebrationCard}>
              <Text style={styles.celebrationEmoji}>🎉</Text>
              <Text style={styles.celebrationTitle}>Great Workout!</Text>
              <Text style={styles.celebrationText}>
                You burned {activity.calories} calories in {activity.duration} minutes.
                Keep up the amazing work!
              </Text>
            </Card>
          )}

          <Button
            title="Back to Home"
            onPress={() => router.replace('/(tabs)')}
            variant="primary"
            size="lg"
            fullWidth
            icon="home"
            style={{ marginTop: 24 }}
          />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    width: 40,
    height: 40,
  },
  headerContent: {
    alignItems: 'center',
    marginTop: 20,
  },
  activityIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  activityType: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
  },
  activityDate: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
  },
  activityTime: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 24,
    marginTop: -20,
  },
  mainStats: {
    flexDirection: 'row',
    gap: 12,
  },
  mainStatCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 24,
  },
  mainStatValue: {
    fontSize: 32,
    fontWeight: '700',
    marginTop: 8,
  },
  mainStatLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  section: {
    marginTop: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  celebrationCard: {
    marginTop: 28,
    alignItems: 'center',
    paddingVertical: 32,
  },
  celebrationEmoji: {
    fontSize: 48,
  },
  celebrationTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginTop: 12,
  },
  celebrationText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  notFoundText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
});