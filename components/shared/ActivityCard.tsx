import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import type { Activity } from '@/types';

interface ActivityCardProps {
  activity: Activity;
  onPress?: () => void;
}

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

export function ActivityCard({ activity, onPress }: ActivityCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const activityColor = activityColors[activity.type];

  return (
    <Card variant="elevated" onPress={onPress} style={styles.card}>
      <View style={styles.container}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: `${activityColor}20` },
          ]}
        >
          <Ionicons
            name={activityIcons[activity.type]}
            size={24}
            color={activityColor}
          />
        </View>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}
            </Text>
            <Badge
              text={activity.status}
              variant={activity.status === 'completed' ? 'success' : 'primary'}
              size="sm"
            />
          </View>
          <Text style={[styles.date, { color: colors.textSecondary }]}>
            {format(new Date(activity.timestamp), 'MMM d, yyyy • h:mm a')}
          </Text>
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Ionicons name="time-outline" size={14} color={colors.textTertiary} />
              <Text style={[styles.statText, { color: colors.textSecondary }]}>
                {activity.duration} min
              </Text>
            </View>
            <View style={styles.stat}>
              <Ionicons name="flame-outline" size={14} color={colors.textTertiary} />
              <Text style={[styles.statText, { color: colors.textSecondary }]}>
                {activity.calories} cal
              </Text>
            </View>
            {activity.distance > 0 && (
              <View style={styles.stat}>
                <Ionicons name="location-outline" size={14} color={colors.textTertiary} />
                <Text style={[styles.statText, { color: colors.textSecondary }]}>
                  {activity.distance.toFixed(1)} km
                </Text>
              </View>
            )}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  date: {
    fontSize: 12,
    marginTop: 2,
  },
  stats: {
    flexDirection: 'row',
    marginTop: 8,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    fontSize: 12,
    marginLeft: 4,
  },
});
