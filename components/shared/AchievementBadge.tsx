import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import type { Achievement } from '@/types';

interface AchievementBadgeProps {
  achievement: Achievement;
  size?: 'sm' | 'md' | 'lg';
}

export function AchievementBadge({ achievement, size = 'md' }: AchievementBadgeProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  const sizes = {
    sm: { container: 48, icon: 20, text: 10 },
    md: { container: 64, icon: 28, text: 11 },
    lg: { container: 80, icon: 36, text: 12 },
  };

  const currentSize = sizes[size];

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.badge,
          {
            width: currentSize.container,
            height: currentSize.container,
            borderRadius: currentSize.container / 2,
            backgroundColor: achievement.isUnlocked
              ? colors.accent
              : colors.backgroundTertiary,
            opacity: achievement.isUnlocked ? 1 : 0.5,
          },
        ]}
      >
        <Ionicons
          name={achievement.icon as any}
          size={currentSize.icon}
          color={achievement.isUnlocked ? '#1f2937' : colors.textTertiary}
        />
      </View>
      <Text
        style={[
          styles.title,
          {
            color: achievement.isUnlocked ? colors.text : colors.textTertiary,
            fontSize: currentSize.text,
          },
        ]}
        numberOfLines={2}
      >
        {achievement.title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: 80,
  },
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#facc15',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
});