import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/store/useAuthStore';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import type { FitnessGoal } from '@/types';

interface GoalOption {
  id: FitnessGoal;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
}

const goalOptions: GoalOption[] = [
  {
    id: 'lose_weight',
    title: 'Lose Weight',
    icon: 'trending-down',
    description: 'Burn fat and get leaner',
  },
  {
    id: 'build_muscle',
    title: 'Build Muscle',
    icon: 'barbell',
    description: 'Gain strength and size',
  },
  {
    id: 'stay_active',
    title: 'Stay Active',
    icon: 'heart',
    description: 'Maintain general fitness',
  },
  {
    id: 'improve_endurance',
    title: 'Improve Endurance',
    icon: 'flash',
    description: 'Run longer, faster',
  },
];

export default function SignupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const { signup, isLoading, authError, clearError } = useAuthStore();

  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedGoal, setSelectedGoal] = useState<FitnessGoal | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [step]);

  useEffect(() => {
    clearError();
  }, [name, email, password, selectedGoal]);

  const handleSignup = async () => {
    if (!selectedGoal) return;
    const success = await signup(email, password, name, selectedGoal);
    if (success) {
      router.replace('/(tabs)');
    }
  };

  const canProceedStep1 = name.trim().length >= 2 && email.includes('@') && password.length >= 6;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={colors.gradient as unknown as string[]}
        style={[styles.header, { paddingTop: insets.top + 20 }]}
      >
        <TouchableOpacity
          onPress={() => (step === 1 ? router.back() : setStep(1))}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {step === 1 ? 'Create Account' : 'Set Your Goal'}
        </Text>
        <Text style={styles.headerSubtitle}>
          {step === 1 ? 'Start your fitness journey today' : 'What do you want to achieve?'}
        </Text>
        <View style={styles.stepIndicator}>
          <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]} />
          <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />
          <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]} />
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 1 ? (
            <Animated.View
              style={[
                styles.form,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <Input
                label="Full Name"
                placeholder="Enter your name"
                value={name}
                onChangeText={setName}
                icon="person-outline"
                autoCapitalize="words"
              />

              <Input
                label="Email"
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                icon="mail-outline"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Input
                label="Password"
                placeholder="Create a password"
                value={password}
                onChangeText={setPassword}
                icon="lock-closed-outline"
                secureTextEntry
              />

              {authError && step === 1 && (
                <View style={[styles.errorContainer, { backgroundColor: colors.errorLight }]}>
                  <Ionicons name="alert-circle" size={20} color={colors.error} />
                  <Text style={[styles.errorText, { color: colors.error }]}>{authError}</Text>
                </View>
              )}

              <Button
                title="Continue"
                onPress={() => setStep(2)}
                variant="primary"
                size="lg"
                fullWidth
                disabled={!canProceedStep1}
                icon="arrow-forward"
                iconPosition="right"
                style={{ marginTop: 8 }}
              />

              <View style={styles.loginRow}>
                <Text style={[styles.loginText, { color: colors.textSecondary }]}>
                  Already have an account?{' '}
                </Text>
                <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                  <Text style={[styles.loginLink, { color: colors.primary }]}>Sign In</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          ) : (
            <Animated.View
              style={[
                styles.goalsContainer,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              {goalOptions.map((goal) => (
                <TouchableOpacity
                  key={goal.id}
                  onPress={() => setSelectedGoal(goal.id)}
                  activeOpacity={0.8}
                >
                  <Card
                    variant={selectedGoal === goal.id ? 'gradient' : 'elevated'}
                    style={[
                      styles.goalCard,
                      selectedGoal === goal.id && styles.goalCardSelected,
                    ]}
                  >
                    <View style={styles.goalContent}>
                      <View
                        style={[
                          styles.goalIcon,
                          {
                            backgroundColor: selectedGoal === goal.id
                              ? 'rgba(255,255,255,0.2)'
                              : colors.primaryLight,
                          },
                        ]}
                      >
                        <Ionicons
                          name={goal.icon}
                          size={24}
                          color={selectedGoal === goal.id ? '#fff' : colors.primary}
                        />
                      </View>
                      <View style={styles.goalText}>
                        <Text
                          style={[
                            styles.goalTitle,
                            { color: selectedGoal === goal.id ? '#fff' : colors.text },
                          ]}
                        >
                          {goal.title}
                        </Text>
                        <Text
                          style={[
                            styles.goalDescription,
                            {
                              color: selectedGoal === goal.id
                                ? 'rgba(255,255,255,0.8)'
                                : colors.textSecondary,
                            },
                          ]}
                        >
                          {goal.description}
                        </Text>
                      </View>
                      {selectedGoal === goal.id && (
                        <Ionicons name="checkmark-circle" size={24} color="#fff" />
                      )}
                    </View>
                  </Card>
                </TouchableOpacity>
              ))}

              {authError && step === 2 && (
                <View style={[styles.errorContainer, { backgroundColor: colors.errorLight }]}>
                  <Ionicons name="alert-circle" size={20} color={colors.error} />
                  <Text style={[styles.errorText, { color: colors.error }]}>{authError}</Text>
                </View>
              )}

              <Button
                title="Create Account"
                onPress={handleSignup}
                variant="primary"
                size="lg"
                fullWidth
                loading={isLoading}
                disabled={!selectedGoal}
                icon="checkmark"
                iconPosition="right"
                style={{ marginTop: 16 }}
              />
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  stepDotActive: {
    backgroundColor: '#fff',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  form: {
    marginTop: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    marginLeft: 8,
    fontSize: 14,
    flex: 1,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  loginText: {
    fontSize: 14,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '600',
  },
  goalsContainer: {
    gap: 12,
  },
  goalCard: {
    marginBottom: 0,
  },
  goalCardSelected: {
    borderWidth: 0,
  },
  goalContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalText: {
    flex: 1,
    marginLeft: 16,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  goalDescription: {
    fontSize: 13,
    marginTop: 2,
  },
});