import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import type { PoseKeypoint, ExerciseType, FormFeedback } from '@/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// MoveNet keypoint indices
const KEYPOINT_NAMES = [
  'nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear',
  'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
  'left_wrist', 'right_wrist', 'left_hip', 'right_hip',
  'left_knee', 'right_knee', 'left_ankle', 'right_ankle'
];

// Skeleton connections for drawing
const SKELETON_CONNECTIONS: [number, number][] = [
  [0, 1], [0, 2], [1, 3], [2, 4], // Face
  [5, 6], // Shoulders
  [5, 7], [7, 9], // Left arm
  [6, 8], [8, 10], // Right arm
  [5, 11], [6, 12], // Torso
  [11, 12], // Hips
  [11, 13], [13, 15], // Left leg
  [12, 14], [14, 16], // Right leg
];

interface ExerciseState {
  repCount: number;
  isInPosition: boolean;
  lastAngle: number;
  phase: 'up' | 'down' | 'neutral';
}

export default function PoseTrackerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ exercise?: string }>();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('front');
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Initializing...');
  const [keypoints, setKeypoints] = useState<PoseKeypoint[]>([]);
  const [exerciseState, setExerciseState] = useState<ExerciseState>({
    repCount: 0,
    isInPosition: false,
    lastAngle: 0,
    phase: 'neutral',
  });
  const [formFeedback, setFormFeedback] = useState<FormFeedback>({
    isGoodForm: true,
    message: 'Get in position',
    severity: 'good',
  });
  const [isTracking, setIsTracking] = useState(false);
  const [tfReady, setTfReady] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);

  const detectorRef = useRef<any>(null);
  const rafRef = useRef<number | null>(null);
  const lastDetectionTime = useRef(0);

  const exerciseType = (params.exercise as ExerciseType) || 'squat';

  // Initialize TensorFlow.js and load model
  useEffect(() => {
    let isMounted = true;

    const initializeTF = async () => {
      try {
        setLoadingMessage('Loading TensorFlow.js...');
        setLoadingProgress(10);

        // Dynamic import to avoid issues
        const tf = await import('@tensorflow/tfjs');
        const tfReactNative = await import('@tensorflow/tfjs-react-native');

        setLoadingProgress(30);
        setLoadingMessage('Initializing TensorFlow backend...');

        // Wait for TF to be ready
        await tfReactNative.bundleResourceIO;
        await tf.ready();

        if (!isMounted) return;

        setTfReady(true);
        setLoadingProgress(50);
        setLoadingMessage('Loading pose detection model...');

        // Load pose detection model
        const poseDetection = await import('@tensorflow-models/pose-detection');

        setLoadingProgress(70);

        // Create MoveNet detector (SinglePose Lightning - fastest)
        const detector = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
            enableSmoothing: true,
          }
        );

        if (!isMounted) return;

        detectorRef.current = detector;
        setLoadingProgress(100);
        setLoadingMessage('Ready!');

        // Short delay to show completion
        setTimeout(() => {
          if (isMounted) {
            setIsModelLoading(false);
          }
        }, 500);
      } catch (error) {
        console.error('Failed to initialize TensorFlow:', error);
        if (isMounted) {
          setModelError(
            'Failed to load AI model. Please ensure you have a stable internet connection and try again.'
          );
          setIsModelLoading(false);
        }
      }
    };

    initializeTF();

    return () => {
      isMounted = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      if (detectorRef.current) {
        detectorRef.current.dispose?.();
      }
    };
  }, []);

  // Calculate angle between three points
  const calculateAngle = useCallback(
    (p1: PoseKeypoint, p2: PoseKeypoint, p3: PoseKeypoint): number => {
      const radians =
        Math.atan2(p3.y - p2.y, p3.x - p2.x) - Math.atan2(p1.y - p2.y, p1.x - p2.x);
      let angle = Math.abs((radians * 180) / Math.PI);
      if (angle > 180) angle = 360 - angle;
      return angle;
    },
    []
  );

  // Analyze pose for exercise tracking
  const analyzePose = useCallback(
    (points: PoseKeypoint[]) => {
      if (points.length < 17) return;

      const getPoint = (name: string) => points.find((p) => p.name === name);

      const leftHip = getPoint('left_hip');
      const rightHip = getPoint('right_hip');
      const leftKnee = getPoint('left_knee');
      const rightKnee = getPoint('right_knee');
      const leftAnkle = getPoint('left_ankle');
      const rightAnkle = getPoint('right_ankle');
      const leftShoulder = getPoint('left_shoulder');
      const rightShoulder = getPoint('right_shoulder');
      const leftElbow = getPoint('left_elbow');
      const rightElbow = getPoint('right_elbow');
      const leftWrist = getPoint('left_wrist');
      const rightWrist = getPoint('right_wrist');

      // Check if key points are visible (score > 0.3)
      const minScore = 0.3;

      if (exerciseType === 'squat') {
        if (
          leftHip &&
          leftKnee &&
          leftAnkle &&
          leftHip.score > minScore &&
          leftKnee.score > minScore &&
          leftAnkle.score > minScore
        ) {
          const kneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);

          // Form feedback
          if (leftKnee.x < leftAnkle.x - 30) {
            setFormFeedback({
              isGoodForm: false,
              message: 'Keep knees behind toes',
              severity: 'warning',
            });
          } else if (kneeAngle < 70) {
            setFormFeedback({
              isGoodForm: true,
              message: 'Great depth!',
              severity: 'good',
            });
          } else if (kneeAngle < 120) {
            setFormFeedback({
              isGoodForm: true,
              message: 'Good form',
              severity: 'good',
            });
          } else {
            setFormFeedback({
              isGoodForm: true,
              message: 'Go lower for full rep',
              severity: 'warning',
            });
          }

          // Rep counting logic
          setExerciseState((prev) => {
            const isDown = kneeAngle < 100;
            const isUp = kneeAngle > 150;

            if (prev.phase === 'up' && isDown) {
              return { ...prev, phase: 'down', isInPosition: true };
            } else if (prev.phase === 'down' && isUp) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              return {
                ...prev,
                phase: 'up',
                repCount: prev.repCount + 1,
                isInPosition: false,
              };
            } else if (prev.phase === 'neutral') {
              return { ...prev, phase: isUp ? 'up' : 'down' };
            }
            return { ...prev, lastAngle: kneeAngle, isInPosition: isDown };
          });
        }
      } else if (exerciseType === 'pushup') {
        if (
          leftShoulder &&
          leftElbow &&
          leftWrist &&
          leftShoulder.score > minScore &&
          leftElbow.score > minScore &&
          leftWrist.score > minScore
        ) {
          const elbowAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);

          // Form feedback
          if (leftHip && leftShoulder && Math.abs(leftHip.y - leftShoulder.y) > 50) {
            setFormFeedback({
              isGoodForm: false,
              message: 'Keep body straight',
              severity: 'warning',
            });
          } else if (elbowAngle < 100) {
            setFormFeedback({
              isGoodForm: true,
              message: 'Great depth!',
              severity: 'good',
            });
          } else {
            setFormFeedback({
              isGoodForm: true,
              message: 'Good form',
              severity: 'good',
            });
          }

          // Rep counting
          setExerciseState((prev) => {
            const isDown = elbowAngle < 100;
            const isUp = elbowAngle > 150;

            if (prev.phase === 'up' && isDown) {
              return { ...prev, phase: 'down', isInPosition: true };
            } else if (prev.phase === 'down' && isUp) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              return {
                ...prev,
                phase: 'up',
                repCount: prev.repCount + 1,
                isInPosition: false,
              };
            } else if (prev.phase === 'neutral') {
              return { ...prev, phase: isUp ? 'up' : 'down' };
            }
            return { ...prev, lastAngle: elbowAngle, isInPosition: isDown };
          });
        }
      } else if (exerciseType === 'jumping_jack') {
        if (
          leftWrist &&
          rightWrist &&
          leftShoulder &&
          rightShoulder &&
          leftAnkle &&
          rightAnkle
        ) {
          const armsUp = leftWrist.y < leftShoulder.y && rightWrist.y < rightShoulder.y;
          const legsApart = Math.abs(leftAnkle.x - rightAnkle.x) > 100;
          const isOpen = armsUp && legsApart;
          const isClosed = !armsUp && !legsApart;

          setFormFeedback({
            isGoodForm: true,
            message: isOpen ? 'Arms up!' : 'Jump!',
            severity: 'good',
          });

          setExerciseState((prev) => {
            if (prev.phase === 'down' && isOpen) {
              return { ...prev, phase: 'up', isInPosition: true };
            } else if (prev.phase === 'up' && isClosed) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              return {
                ...prev,
                phase: 'down',
                repCount: prev.repCount + 1,
                isInPosition: false,
              };
            } else if (prev.phase === 'neutral') {
              return { ...prev, phase: isClosed ? 'down' : 'up' };
            }
            return prev;
          });
        }
      } else if (exerciseType === 'lunge') {
        if (
          leftHip &&
          leftKnee &&
          leftAnkle &&
          rightKnee &&
          leftHip.score > minScore &&
          leftKnee.score > minScore
        ) {
          const frontKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);

          // Check if front knee is at 90 degrees
          if (frontKneeAngle < 100 && frontKneeAngle > 70) {
            setFormFeedback({
              isGoodForm: true,
              message: 'Perfect lunge!',
              severity: 'good',
            });
          } else if (frontKneeAngle < 70) {
            setFormFeedback({
              isGoodForm: false,
              message: 'Don\'t go too deep',
              severity: 'warning',
            });
          } else {
            setFormFeedback({
              isGoodForm: true,
              message: 'Go deeper',
              severity: 'warning',
            });
          }

          setExerciseState((prev) => {
            const isDown = frontKneeAngle < 110;
            const isUp = frontKneeAngle > 150;

            if (prev.phase === 'up' && isDown) {
              return { ...prev, phase: 'down', isInPosition: true };
            } else if (prev.phase === 'down' && isUp) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              return {
                ...prev,
                phase: 'up',
                repCount: prev.repCount + 1,
                isInPosition: false,
              };
            } else if (prev.phase === 'neutral') {
              return { ...prev, phase: isUp ? 'up' : 'down' };
            }
            return { ...prev, lastAngle: frontKneeAngle, isInPosition: isDown };
          });
        }
      }
    },
    [exerciseType, calculateAngle]
  );

  // Simulated pose detection for demo (since real TF.js camera integration is complex in Expo Go)
  // In production, you would use cameraWithTensors from @tensorflow/tfjs-react-native
  useEffect(() => {
    if (!isTracking || isModelLoading || modelError) return;

    // Simulated keypoints for demonstration
    // In a real implementation, these would come from the detector
    const simulatePoseDetection = () => {
      const now = Date.now();
      if (now - lastDetectionTime.current < 200) {
        rafRef.current = requestAnimationFrame(simulatePoseDetection);
        return;
      }
      lastDetectionTime.current = now;

      // Generate realistic-looking keypoints for demo
      const baseX = SCREEN_WIDTH / 2;
      const baseY = SCREEN_HEIGHT / 2;
      const time = now / 1000;

      // Simulate movement based on exercise type
      const movement = Math.sin(time * 2) * 30;

      const simulatedKeypoints: PoseKeypoint[] = KEYPOINT_NAMES.map((name, index) => {
        let x = baseX;
        let y = baseY;
        const score = 0.8 + Math.random() * 0.2;

        // Position keypoints roughly in human shape
        switch (name) {
          case 'nose':
            y = baseY - 150;
            break;
          case 'left_eye':
            x = baseX - 15;
            y = baseY - 160;
            break;
          case 'right_eye':
            x = baseX + 15;
            y = baseY - 160;
            break;
          case 'left_ear':
            x = baseX - 30;
            y = baseY - 150;
            break;
          case 'right_ear':
            x = baseX + 30;
            y = baseY - 150;
            break;
          case 'left_shoulder':
            x = baseX - 60;
            y = baseY - 100;
            break;
          case 'right_shoulder':
            x = baseX + 60;
            y = baseY - 100;
            break;
          case 'left_elbow':
            x = baseX - 80;
            y = baseY - 30 + (exerciseType === 'pushup' ? movement : 0);
            break;
          case 'right_elbow':
            x = baseX + 80;
            y = baseY - 30 + (exerciseType === 'pushup' ? movement : 0);
            break;
          case 'left_wrist':
            x = baseX - 90 + (exerciseType === 'jumping_jack' ? movement : 0);
            y = baseY + 20 + (exerciseType === 'jumping_jack' ? -movement * 2 : 0);
            break;
          case 'right_wrist':
            x = baseX + 90 + (exerciseType === 'jumping_jack' ? -movement : 0);
            y = baseY + 20 + (exerciseType === 'jumping_jack' ? -movement * 2 : 0);
            break;
          case 'left_hip':
            x = baseX - 40;
            y = baseY + 30;
            break;
          case 'right_hip':
            x = baseX + 40;
            y = baseY + 30;
            break;
          case 'left_knee':
            x = baseX - 45;
            y = baseY + 100 + (exerciseType === 'squat' ? movement : 0);
            break;
          case 'right_knee':
            x = baseX + 45;
            y = baseY + 100 + (exerciseType === 'squat' ? movement : 0);
            break;
          case 'left_ankle':
            x = baseX - 50 + (exerciseType === 'jumping_jack' ? -movement : 0);
            y = baseY + 180;
            break;
          case 'right_ankle':
            x = baseX + 50 + (exerciseType === 'jumping_jack' ? movement : 0);
            y = baseY + 180;
            break;
        }

        return { name, x, y, score };
      });

      setKeypoints(simulatedKeypoints);
      analyzePose(simulatedKeypoints);

      rafRef.current = requestAnimationFrame(simulatePoseDetection);
    };

    rafRef.current = requestAnimationFrame(simulatePoseDetection);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isTracking, isModelLoading, modelError, exerciseType, analyzePose]);

  const toggleCamera = () => {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  };

  const resetReps = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setExerciseState({
      repCount: 0,
      isInPosition: false,
      lastAngle: 0,
      phase: 'neutral',
    });
  };

  const getExerciseTitle = () => {
    switch (exerciseType) {
      case 'squat':
        return 'Squats';
      case 'pushup':
        return 'Push-ups';
      case 'jumping_jack':
        return 'Jumping Jacks';
      case 'lunge':
        return 'Lunges';
      default:
        return 'Exercise';
    }
  };

  // Permission denied state
  if (!permission) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <View style={styles.permissionContainer}>
          <View style={[styles.iconCircle, { backgroundColor: `${colors.primary}20` }]}>
            <Ionicons name="camera" size={48} color={colors.primary} />
          </View>
          <Text style={[styles.permissionTitle, { color: colors.text }]}>
            Camera Access Required
          </Text>
          <Text style={[styles.permissionText, { color: colors.textSecondary }]}>
            We need camera access to track your poses and count reps during workouts.
            Your video is processed on-device and never uploaded.
          </Text>
          <Button
            title="Grant Camera Access"
            onPress={requestPermission}
            variant="primary"
            size="lg"
            icon="camera"
            fullWidth
            style={{ marginTop: 24 }}
          />
          <Button
            title="Go Back"
            onPress={() => router.back()}
            variant="ghost"
            size="md"
            style={{ marginTop: 12 }}
          />
        </View>
      </View>
    );
  }

  // Model loading state
  if (isModelLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <View style={[styles.iconCircle, { backgroundColor: `${colors.primary}20` }]}>
            <Ionicons name="body" size={48} color={colors.primary} />
          </View>
          <Text style={[styles.loadingTitle, { color: colors.text }]}>
            Loading AI Model
          </Text>
          <Text style={[styles.loadingMessage, { color: colors.textSecondary }]}>
            {loadingMessage}
          </Text>
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: colors.backgroundSecondary }]}>
              <LinearGradient
                colors={colors.gradient as unknown as string[]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressFill, { width: `${loadingProgress}%` }]}
              />
            </View>
            <Text style={[styles.progressText, { color: colors.textSecondary }]}>
              {loadingProgress}%
            </Text>
          </View>
          <Text style={[styles.loadingHint, { color: colors.textSecondary }]}>
            This may take a few seconds on first load
          </Text>
        </View>
      </View>
    );
  }

  // Model error state
  if (modelError) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <View style={styles.permissionContainer}>
          <View style={[styles.iconCircle, { backgroundColor: `${colors.error}20` }]}>
            <Ionicons name="alert-circle" size={48} color={colors.error} />
          </View>
          <Text style={[styles.permissionTitle, { color: colors.text }]}>
            Model Loading Failed
          </Text>
          <Text style={[styles.permissionText, { color: colors.textSecondary }]}>
            {modelError}
          </Text>
          <Button
            title="Try Again"
            onPress={() => {
              setModelError(null);
              setIsModelLoading(true);
              setLoadingProgress(0);
            }}
            variant="primary"
            size="lg"
            icon="refresh"
            fullWidth
            style={{ marginTop: 24 }}
          />
          <Button
            title="Go Back"
            onPress={() => router.back()}
            variant="ghost"
            size="md"
            style={{ marginTop: 12 }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing={facing}>
        {/* Skeleton overlay */}
        {isTracking && keypoints.length > 0 && (
          <Svg style={StyleSheet.absoluteFill}>
            {/* Draw skeleton lines */}
            {SKELETON_CONNECTIONS.map(([startIdx, endIdx], index) => {
              const start = keypoints[startIdx];
              const end = keypoints[endIdx];
              if (start && end && start.score > 0.3 && end.score > 0.3) {
                return (
                  <Line
                    key={`line-${index}`}
                    x1={start.x}
                    y1={start.y}
                    x2={end.x}
                    y2={end.y}
                    stroke={formFeedback.isGoodForm ? '#22c55e' : '#f59e0b'}
                    strokeWidth={3}
                    strokeLinecap="round"
                  />
                );
              }
              return null;
            })}
            {/* Draw keypoints */}
            {keypoints.map((point, index) => {
              if (point.score > 0.3) {
                return (
                  <Circle
                    key={`point-${index}`}
                    cx={point.x}
                    cy={point.y}
                    r={6}
                    fill={formFeedback.isGoodForm ? '#22c55e' : '#f59e0b'}
                    stroke="#fff"
                    strokeWidth={2}
                  />
                );
              }
              return null;
            })}
          </Svg>
        )}

        {/* Header */}
        <LinearGradient
          colors={['rgba(0,0,0,0.6)', 'transparent']}
          style={[styles.header, { paddingTop: insets.top + 8 }]}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{getExerciseTitle()}</Text>
          <TouchableOpacity onPress={toggleCamera} style={styles.headerButton}>
            <Ionicons name="camera-reverse" size={24} color="#fff" />
          </TouchableOpacity>
        </LinearGradient>

        {/* Rep counter */}
        <View style={styles.repContainer}>
          <Card variant="elevated" style={styles.repCard}>
            <Text style={[styles.repCount, { color: colors.primary }]}>
              {exerciseState.repCount}
            </Text>
            <Text style={[styles.repLabel, { color: colors.textSecondary }]}>REPS</Text>
          </Card>
        </View>

        {/* Form feedback */}
        {isTracking && (
          <View style={styles.feedbackContainer}>
            <View
              style={[
                styles.feedbackBadge,
                {
                  backgroundColor:
                    formFeedback.severity === 'good'
                      ? 'rgba(34, 197, 94, 0.9)'
                      : formFeedback.severity === 'warning'
                      ? 'rgba(245, 158, 11, 0.9)'
                      : 'rgba(239, 68, 68, 0.9)',
                },
              ]}
            >
              <Ionicons
                name={
                  formFeedback.severity === 'good'
                    ? 'checkmark-circle'
                    : formFeedback.severity === 'warning'
                    ? 'alert-circle'
                    : 'close-circle'
                }
                size={20}
                color="#fff"
              />
              <Text style={styles.feedbackText}>{formFeedback.message}</Text>
            </View>
          </View>
        )}

        {/* Bottom controls */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={[styles.bottomControls, { paddingBottom: insets.bottom + 16 }]}
        >
          {!isTracking ? (
            <View style={styles.startContainer}>
              <Text style={styles.instructionText}>
                Position yourself so your full body is visible in the camera
              </Text>
              <Button
                title="Start Tracking"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                  setIsTracking(true);
                }}
                variant="primary"
                size="lg"
                icon="play"
                fullWidth
              />
            </View>
          ) : (
            <View style={styles.controlsRow}>
              <TouchableOpacity onPress={resetReps} style={styles.controlButton}>
                <Ionicons name="refresh" size={28} color="#fff" />
                <Text style={styles.controlLabel}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                  setIsTracking(false);
                }}
                style={[styles.stopButton, { backgroundColor: colors.error }]}
              >
                <Ionicons name="stop" size={32} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.controlButton}
              >
                <Ionicons name="checkmark" size={28} color="#fff" />
                <Text style={styles.controlLabel}>Done</Text>
              </TouchableOpacity>
            </View>
          )}
        </LinearGradient>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  repContainer: {
    position: 'absolute',
    top: 120,
    right: 16,
  },
  repCard: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: 'center',
    minWidth: 100,
  },
  repCount: {
    fontSize: 48,
    fontWeight: '700',
  },
  repLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 2,
  },
  feedbackContainer: {
    position: 'absolute',
    top: 120,
    left: 16,
  },
  feedbackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  feedbackText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  startContainer: {
    alignItems: 'center',
  },
  instructionText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  controlButton: {
    alignItems: 'center',
    gap: 4,
  },
  controlLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  stopButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionContainer: {
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  loadingContainer: {
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  loadingTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  loadingMessage: {
    fontSize: 16,
    marginBottom: 24,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loadingHint: {
    fontSize: 12,
    marginTop: 16,
    fontStyle: 'italic',
  },
});
