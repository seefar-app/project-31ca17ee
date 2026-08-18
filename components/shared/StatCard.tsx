import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient?: boolean;
  gradientColors?: string[];
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  gradient = false,
  gradientColors,
}: StatCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  const content = (
    <>
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={24} color={gradient ? '#fff' : colors.primary} />
      </View>
      <Text style={[styles.title, { color: gradient ? 'rgba(255,255,255,0.8)' : colors.textSecondary }]}>
        {title}
      </Text>
      <Text style={[styles.value, { color: gradient ? '#fff' : colors.text }]}>
        {value}
      </Text>
      {subtitle && (
        <Text style={[styles.subtitle, { color: gradient ? 'rgba(255,255,255,0.7)' : colors.textTertiary }]}>
          {subtitle}
        </Text>
      )}
    </>
  );

  if (gradient) {
    return (
      <LinearGradient
        colors={gradientColors || (colors.gradient as unknown as string[])}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        {content}
      </LinearGradient>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  iconContainer: {
    marginBottom: 8,
  },
  title: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 4,
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
  },
});