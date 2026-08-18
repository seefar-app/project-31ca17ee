import { Text, type TextProps, StyleSheet } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

export type ThemedTextProps = TextProps & {
  variant?: 'default' | 'secondary' | 'tertiary' | 'title' | 'subtitle' | 'link';
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({ style, variant = 'default', type = 'default', ...rest }: ThemedTextProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  const textColor = variant === 'secondary' 
    ? colors.textSecondary 
    : variant === 'tertiary' 
      ? colors.textTertiary 
      : variant === 'link' 
        ? colors.primary 
        : colors.text;

  return (
    <Text
      style={[
        { color: textColor },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'defaultSemiBold' && styles.defaultSemiBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 38,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
  },
  link: {
    fontSize: 16,
    lineHeight: 24,
  },
});