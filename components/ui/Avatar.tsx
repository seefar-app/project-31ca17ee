import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

interface AvatarProps {
  source?: string | null;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showStatus?: boolean;
  isOnline?: boolean;
  style?: ViewStyle;
}

export function Avatar({
  source,
  name = '',
  size = 'md',
  showStatus = false,
  isOnline = false,
  style,
}: AvatarProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  const sizes = {
    sm: { container: 32, text: 12, status: 8 },
    md: { container: 48, text: 16, status: 12 },
    lg: { container: 64, text: 20, status: 14 },
    xl: { container: 96, text: 28, status: 18 },
  };

  const currentSize = sizes[size];
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View
      style={[
        styles.container,
        {
          width: currentSize.container,
          height: currentSize.container,
          borderRadius: currentSize.container / 2,
        },
        style,
      ]}
    >
      {source ? (
        <Image
          source={{ uri: source }}
          style={[
            styles.image,
            {
              width: currentSize.container,
              height: currentSize.container,
              borderRadius: currentSize.container / 2,
            },
          ]}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <View
          style={[
            styles.placeholder,
            {
              width: currentSize.container,
              height: currentSize.container,
              borderRadius: currentSize.container / 2,
              backgroundColor: colors.primary,
            },
          ]}
        >
          <Text style={[styles.initials, { fontSize: currentSize.text }]}>
            {initials || '?'}
          </Text>
        </View>
      )}
      {showStatus && (
        <View
          style={[
            styles.status,
            {
              width: currentSize.status,
              height: currentSize.status,
              borderRadius: currentSize.status / 2,
              backgroundColor: isOnline ? colors.success : colors.textTertiary,
              borderColor: colors.background,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  image: {
    backgroundColor: '#e5e7eb',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: '#ffffff',
    fontWeight: '600',
  },
  status: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 2,
  },
});