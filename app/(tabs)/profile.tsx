import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AchievementBadge } from '@/components/shared/AchievementBadge';
import { useAuthStore } from '@/store/useAuthStore';
import { useStore } from '@/store/useStore';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

const goalLabels = {
  lose_weight: 'Lose Weight',
  build_muscle: 'Build Muscle',
  stay_active: 'Stay Active',
  improve_endurance: 'Improve Endurance',
};

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const { user, logout } = useAuthStore();
  const { achievements } = useStore();

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const menuItems: MenuItem[] = [
    {
      icon: 'person-outline',
      label: 'Edit Profile',
      onPress: () => {},
    },
    {
      icon: 'trophy-outline',
      label: 'Achievements',
      value: `${achievements.filter((a) => a.isUnlocked).length}/${achievements.length}`,
      onPress: () => {},
    },
    {
      icon: 'flag-outline',
      label: 'Fitness Goal',
      value: user?.fitnessGoal ? goalLabels[user.fitnessGoal] : 'Not set',
      onPress: () => {},
    },
    {
      icon: 'notifications-outline',
      label: 'Notifications',
      onPress: () => {},
    },
    {
      icon: 'shield-checkmark-outline',
      label: 'Privacy',
      onPress: () => {},
    },
    {
      icon: 'help-circle-outline',
      label: 'Help & Support',
      onPress: () => {},
    },
    {
      icon: 'log-out-outline',
      label: 'Sign Out',
      onPress: handleLogout,
      destructive: true,
    },
  ];

  const unlockedAchievements = achievements.filter((a) => a.isUnlocked);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        <LinearGradient
          colors={colors.gradient as unknown as string[]}
          style={[styles.header, { paddingTop: insets.top + 20 }]}
        >
          <View style={styles.profileSection}>
            <Avatar source={user?.avatar} name={user?.name} size="xl" />
            <Text style={styles.userName}>{user?.name || 'Athlete'}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            <Badge
              text={user?.fitnessGoal ? goalLabels[user.fitnessGoal] : 'No goal'}
              variant="default"
              style={styles.goalBadge}
            />
          </View>
        </LinearGradient>

        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            <Card variant="elevated" style={styles.statCard}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {user?.totalWorkouts || 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Workouts
              </Text>
            </Card>
            <Card variant="elevated" style={styles.statCard}>
              <Text style={[styles.statValue, { color: '#f97316' }]}>
                {user?.totalCalories.toLocaleString() || 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Calories
              </Text>
            </Card>
            <Card variant="elevated" style={styles.statCard}>
              <Text style={[styles.statValue, { color: '#facc15' }]}>
                {user?.totalDistance.toFixed(1) || 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                km
              </Text>
            </Card>
          </View>

          {/* Achievements Section */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Achievements
            </Text>
            <Badge
              text={`${unlockedAchievements.length}/${achievements.length}`}
              variant="primary"
            />
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.achievementsContainer}
          >
            {achievements.map((achievement) => (
              <AchievementBadge
                key={achievement.id}
                achievement={achievement}
                size="md"
              />
            ))}
          </ScrollView>

          {/* Menu Items */}
          <View style={styles.menuSection}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={item.label}
                onPress={item.onPress}
                style={[
                  styles.menuItem,
                  {
                    backgroundColor: colors.card,
                    borderBottomWidth: index < menuItems.length - 1 ? 1 : 0,
                    borderBottomColor: colors.border,
                  },
                ]}
              >
                <View style={styles.menuItemLeft}>
                  <View
                    style={[
                      styles.menuIconContainer,
                      {
                        backgroundColor: item.destructive
                          ? colors.errorLight
                          : colors.primaryLight,
                      },
                    ]}
                  >
                    <Ionicons
                      name={item.icon}
                      size={20}
                      color={item.destructive ? colors.error : colors.primary}
                    />
                  </View>
                  <Text
                    style={[
                      styles.menuItemLabel,
                      {
                        color: item.destructive ? colors.error : colors.text,
                      },
                    ]}
                  >
                    {item.label}
                  </Text>
                </View>
                <View style={styles.menuItemRight}>
                  {item.value && (
                    <Text style={[styles.menuItemValue, { color: colors.textSecondary }]}>
                      {item.value}
                    </Text>
                  )}
                  {!item.destructive && (
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={colors.textTertiary}
                    />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.version, { color: colors.textTertiary }]}>
            FitPulse v1.0.0
          </Text>
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
  profileSection: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginTop: 16,
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  goalBadge: {
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  content: {
    padding: 20,
    marginTop: -20,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  achievementsContainer: {
    gap: 12,
    paddingRight: 20,
    marginBottom: 8,
  },
  menuSection: {
    marginTop: 32,
    borderRadius: 20,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 14,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemValue: {
    fontSize: 14,
    marginRight: 8,
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 32,
  },
});
