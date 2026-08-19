import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatCard } from '@/components/shared/StatCard';
import { ActivityRing } from '@/components/shared/ActivityRing';
import { ActivityCard } from '@/components/shared/ActivityCard';
import { useAuthStore } from '@/store/useAuthStore';
import { useStore } from '@/store/useStore';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const { user } = useAuthStore();
  const {
    activities,
    dailyStats,
    weeklyData,
    goals,
    isLoadingStats,
    isLoadingActivities,
    fetchActivities,
    fetchDailyStats,
    fetchWeeklyData,
  } = useStore();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const fabScaleAnim = useRef(new Animated.Value(0)).current;
  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    fetchActivities();
    fetchDailyStats();
    fetchWeeklyData();

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

    // Animate FAB with a slight delay
    setTimeout(() => {
      Animated.spring(fabScaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 100,
        useNativeDriver: true,
      }).start();
    }, 400);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchActivities(), fetchDailyStats(), fetchWeeklyData()]);
    setRefreshing(false);
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const calorieGoal = 500;
  const durationGoal = 60;
  const activityGoal = 3;

  const calorieProgress = dailyStats ? (dailyStats.totalCalories / calorieGoal) * 100 : 0;
  const durationProgress = dailyStats ? (dailyStats.totalDuration / durationGoal) * 100 : 0;
  const activityProgress = dailyStats ? (dailyStats.activityCount / activityGoal) * 100 : 0;

  const recentActivities = activities.slice(0, 3);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={colors.gradient as unknown as string[]}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.userName}>{user?.name || 'Athlete'}</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
            <Avatar source={user?.avatar} name={user?.name} size="md" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <Animated.View
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Quick Action Card */}
          <Card variant="gradient" style={styles.quickActionCard}>
            <View style={styles.quickActionContent}>
              <View style={styles.quickActionText}>
                <Text style={styles.quickActionTitle}>Ready to Move?</Text>
                <Text style={styles.quickActionSubtitle}>
                  Start tracking your workout now
                </Text>
              </View>
              <Button
                title="Start"
                onPress={() => router.push('/workout/start')}
                variant="secondary"
                icon="play"
              />
            </View>
          </Card>

          {/* Today's Progress */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Today's Progress</Text>
          </View>

          {isLoadingStats ? (
            <View style={styles.ringsContainer}>
              <Skeleton width={100} height={100} borderRadius={50} />
              <Skeleton width={100} height={100} borderRadius={50} />
              <Skeleton width={100} height={100} borderRadius={50} />
            </View>
          ) : (
            <Card variant="elevated" style={styles.progressCard}>
              <View style={styles.ringsContainer}>
                <ActivityRing
                  progress={calorieProgress}
                  color="#ec4899"
                  size={90}
                  strokeWidth={8}
                  value={dailyStats?.totalCalories.toString() || '0'}
                  label="Calories"
                />
                <ActivityRing
                  progress={durationProgress}
                  color="#f97316"
                  size={90}
                  strokeWidth={8}
                  value={`${dailyStats?.totalDuration || 0}m`}
                  label="Duration"
                />
                <ActivityRing
                  progress={activityProgress}
                  color="#facc15"
                  size={90}
                  strokeWidth={8}
                  value={dailyStats?.activityCount.toString() || '0'}
                  label="Activities"
                />
              </View>
            </Card>
          )}

          {/* Weekly Stats */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>This Week</Text>
          </View>

          <View style={styles.statsGrid}>
            <StatCard
              title="Calories"
              value={user?.totalCalories.toLocaleString() || '0'}
              subtitle="Total burned"
              icon="flame"
              gradient
            />
            <StatCard
              title="Distance"
              value={`${user?.totalDistance.toFixed(1) || 0} km`}
              subtitle="Total covered"
              icon="location"
            />
          </View>

          {/* Weekly Chart */}
          <Card variant="elevated" style={styles.chartCard}>
            <Text style={[styles.chartTitle, { color: colors.text }]}>Weekly Activity</Text>
            <View style={styles.chartContainer}>
              {weeklyData.map((day, index) => {
                const maxCalories = Math.max(...weeklyData.map(d => d.calories), 1);
                const height = (day.calories / maxCalories) * 80;
                return (
                  <View key={day.day} style={styles.chartBar}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: Math.max(height, 4),
                          backgroundColor: day.calories > 0 ? colors.primary : colors.backgroundTertiary,
                        },
                      ]}
                    />
                    <Text style={[styles.chartLabel, { color: colors.textSecondary }]}>
                      {day.day}
                    </Text>
                  </View>
                );
              })}
            </View>
          </Card>

          {/* Recent Activities */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Activities</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/activities')}>
              <Text style={[styles.seeAllText, { color: colors.primary }]}>See All</Text>
            </TouchableOpacity>
          </View>

          {isLoadingActivities ? (
            <>
              <Skeleton height={100} borderRadius={24} style={{ marginBottom: 16 }} />
              <Skeleton height={100} borderRadius={24} style={{ marginBottom: 16 }} />
            </>
          ) : recentActivities.length > 0 ? (
            recentActivities.map((activity) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                onPress={() => router.push(`/workout/${activity.id}`)}
              />
            ))
          ) : (
            <Card variant="elevated" style={styles.emptyCard}>
              <Ionicons name="fitness-outline" size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No activities yet
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
                Start your first workout to see it here
              </Text>
            </Card>
          )}
        </Animated.View>
      </ScrollView>

      {/* Floating AI Assistant Button */}
      <Animated.View
        style={[
          styles.fabContainer,
          {
            bottom: insets.bottom + 90,
            transform: [{ scale: fabScaleAnim }],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/assistant')}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={colors.gradient as unknown as string[]}
            style={styles.fabGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="chatbubbles" size={26} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
        <View style={[styles.fabBadge, { backgroundColor: colors.accent }]}>
          <Text style={styles.fabBadgeText}>AI</Text>
        </View>
      </Animated.View>
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
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {},
  greeting: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    marginTop: -8,
  },
  section: {
    paddingTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  quickActionCard: {
    marginTop: 4,
    marginBottom: 8,
  },
  quickActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quickActionText: {},
  quickActionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  quickActionSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  progressCard: {
    padding: 20,
    marginBottom: 8,
  },
  ringsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  chartCard: {
    marginTop: 24,
    padding: 20,
    marginBottom: 8,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 100,
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
  },
  bar: {
    width: 28,
    borderRadius: 8,
    marginBottom: 8,
  },
  chartLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 40,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  fabContainer: {
    position: 'absolute',
    right: 20,
    zIndex: 100,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    shadowColor: '#ec4899',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  fabGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  fabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000',
  },
});
