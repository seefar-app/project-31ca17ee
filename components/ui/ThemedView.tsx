import { View, type ViewProps } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

export type ThemedViewProps = ViewProps & {
  variant?: 'default' | 'secondary' | 'card';
};

export function ThemedView({ style, variant = 'default', ...otherProps }: ThemedViewProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  const backgroundColor = variant === 'secondary' 
    ? colors.backgroundSecondary 
    : variant === 'card' 
      ? colors.card 
      : colors.background;

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}