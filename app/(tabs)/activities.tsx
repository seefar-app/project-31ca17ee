import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ActivityCard } from '@/components/shared/ActivityCard';
import { Card } from '@/components/ui/Card';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { useStore } from '@/store/useStore';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import type { ActivityType } from '@/types';

type FilterType = 'all' | ActivityType;

const filterOptions: { id: FilterType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'all', label: 'All', icon: 'apps' },
  { id: 'running', label: 'Running', icon: 'walk' },
  { id: 'cycling', label: 'Cycling', icon: 'bicycle' },
  { id: 'strength', label: 'Strength', icon: 'barbell' },
  { id: 'yoga', label: 'Yoga', icon: 'body' },
  { id: 'swimming', label: 'Swimming', icon: 'water' },
  { id: 'hiking', label: 'Hiking', icon: 'trail-sign' },
];

export default function ActivitiesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const { activities, isLoadingActivities, fetchActivities, filterActivitiesByType } = useStore();

  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchActivities();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchActivities();
    setRefreshing(false);
  }, []);

  const filteredActivities = filterActivitiesByType(selectedFilter);

  const totalStats = activities.reduce(
    (acc, activity) => ({
      calories: acc.calories + activity.calories,
      duration: acc.duration + activity.duration,
      distance: acc.distance + activity.distance,
    }),
    { calories: 0, duration: 0, distance: 0 }
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={colors.gradient as unknown as string[]}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <Text style={styles.headerTitle}>Activities</Text>
        <Text style={styles.headerSubtitle}>{activities.length} workouts completed</Text>
      </LinearGradient>

      <View style={styles.content}>
        {/* Stats Summary */}
        <View style={styles.statsRow}>
          <View style={[styles.statItem, { backgroundColor: colors.card }]}>
            <Ionicons name="flame" size={20} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {totalStats.calories.toLocaleString()}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>cal</Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: colors.card }]}>
            <Ionicons name="time" size={20} color="#f97316" />
            <Text style={[styles.statValue, { color: colors.text }]}>{totalStats.duration}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>min</Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: colors.card }]}>
            <Ionicons name="location" size={20} color="#facc15" />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {totalStats.distance.toFixed(1)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>km</Text>
          </View>
        </View>

        {/* Filter Pills */}
        <FlatList
          horizontal
          data={filterOptions}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setSelectedFilter(item.id)}
              style={[
                styles.filterPill,
                {
                  backgroundColor:
                    selectedFilter === item.id ? colors.primary : colors.backgroundSecondary,
                },
              ]}
            >
              <Ionicons
                name={item.icon}
                size={16}
                color={selectedFilter === item.id ? '#fff' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.filterText,
                  { color: selectedFilter === item.id ? '#fff' : colors.textSecondary },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />

        {/* Activities List */}
        {isLoadingActivities ? (
          <View style={styles.skeletonContainer}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : (
          <FlatList
            data={filteredActivities}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: insets.bottom + 100 },
            ]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
            renderItem={({ item }) => (
              <ActivityCard
                activity={item}
                onPress={() => router.push(`/workout/${item.id}`)}
              />
            )}
            ListEmptyComponent={() => (
              <Card variant="elevated" style={styles.emptyCard}>
                <Ionicons name="search-outline" size={48} color={colors.textTertiary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No activities found
                </Text>
                <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
                  {selectedFilter === 'all'
                    ? 'Start your first workout!'
                    : `No ${selectedFilter} workouts yet`}
                </Text>
              </Card>
            )}
          />
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
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
  },
  filterContainer: {
    paddingVertical: 20,
    gap: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    gap: 6,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    paddingTop: 4,
  },
  skeletonContainer: {
    paddingTop: 20,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 60,
    marginTop: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 4,
  },
});