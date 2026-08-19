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

  const rafRef = useRef<number | null>(null);
  const lastDetectionTime = useRef(0);
  const simulationInterval = useRef<NodeJS.Timeout | null>(null);

  const exerciseType = (params.exercise as ExerciseType) || 'squat';

  // Simulate pose detection initialization
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsModelLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  // Simulate pose detection when tracking
  useEffect(() => {
    if (isTracking && !isModelLoading) {
      // Simulate pose detection at 10 FPS
      simulationInterval.current = setInterval(() => {
        simulatePoseDetection();
      }, 100);
    } else {
      if (simulationInterval.current) {
        clearInterval(simulationInterval.current);
        simulationInterval.current = null;
      }
    }

    return () => {
      if (simulationInterval.current) {
        clearInterval(simulationInterval.current);
      }
    };
  }, [isTracking, isModelLoading]);

  // Simulate pose detection with random variations
  const simulatePoseDetection = useCallback(() => {
    const time = Date.now();
    const cycle = Math.sin(time / 1000) * 0.5 + 0.5; // 0 to 1 cycle

    // Generate simulated keypoints
    const centerX = SCREEN_WIDTH / 2;
    const centerY = SCREEN_HEIGHT / 2;
    
    const simulatedKeypoints: PoseKeypoint[] = KEYPOINT_NAMES.map((name, index) => {
      let x = centerX;
      let y = centerY;
      
      // Position keypoints in a human-like structure
      switch (name) {
        case 'nose':
          y = centerY - 150;
          break;
        case 'left_shoulder':
          x = centerX - 60;
          y = centerY - 100;
          break;
        case 'right_shoulder':
          x = centerX + 60;
          y = centerY - 100;
          break;
        case 'left_elbow':
          x = centerX - 80;
          y = centerY - 40;
          break;
        case 'right_elbow':
          x = centerX + 80;
          y = centerY - 40;
          break;
        case 'left_wrist':
          x = centerX - 90;
          y = centerY + 20;
          break;
        case 'right_wrist':
          x = centerX + 90;
          y = centerY + 20;
          break;
        case 'left_hip':
          x = centerX - 50;
          y = centerY + 50;
          break;
        case 'right_hip':
          x = centerX + 50;
          y = centerY + 50;
          break;
        case 'left_knee':
          x = centerX - 50;
          y = centerY + 150 + (cycle * 40); // Simulate squat motion
          break;
        case 'right_knee':
          x = centerX + 50;
          y = centerY + 150 + (cycle * 40);
          break;
        case 'left_ankle':
          x = centerX - 50;
          y = centerY + 250;
          break;
        case 'right_ankle':
          x = centerX + 50;
          y = centerY + 250;
          break;
      }

      return {
        x,
        y,
        score: 0.8 + Math.random() * 0.2,
        name,
      };
    });

    setKeypoints(simulatedKeypoints);
    analyzePose(simulatedKeypoints, cycle);
  }, [exerciseType]);

  // Analyze pose for exercise tracking
  const analyzePose = useCallback(
    (points: PoseKeypoint[], cycle: number) => {
      if (points.length < 17) return;

      const getPoint = (name: string) => points.find((p) => p.name === name);

      const leftKnee = getPoint('left_knee');
      const leftHip = getPoint('left_hip');
      const leftAnkle = getPoint('left_ankle');

      if (exerciseType === 'squat' && leftKnee && leftHip && leftAnkle) {
        // Simulate angle based on cycle
        const kneeAngle = 170 - (cycle * 80); // 170 degrees (standing) to 90 degrees (squat)

        // Form feedback based on simulated angle
        if (kneeAngle < 100) {
          setFormFeedback({
            isGoodForm: true,
            message: 'Great depth!',
            severity: 'good',
          });
        } else if (kneeAngle < 140) {
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
          const isDown = kneeAngle < 110;
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
    },
    [exerciseType]
  );

  const toggleTracking = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsTracking(!isTracking);
  };

  const toggleCameraFacing = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  };

  const handleFinish = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  if (!permission) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={['#ec4899', '#f43f5e', '#fb7185']}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.permissionContainer, { paddingTop: insets.top + 60 }]}>
          <View style={[styles.iconCircle, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <Ionicons name="camera" size={48} color="#fff" />
          </View>
          <Text style={[styles.permissionTitle, { color: '#fff' }]}>
            Camera Permission Required
          </Text>
          <Text style={[styles.permissionText, { color: 'rgba(255,255,255,0.9)' }]}>
            We need access to your camera to track your exercise form and count reps.
          </Text>
          <Button
            title="Grant Permission"
            onPress={requestPermission}
            variant="secondary"
            style={{ marginTop: 32 }}
          />
        </View>
      </View>
    );
  }

  if (isModelLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={['#ec4899', '#f43f5e', '#fb7185']}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.loadingContainer, { paddingTop: insets.top + 60 }]}>
          <Text style={[styles.loadingTitle, { color: '#fff' }]}>
            Initializing AI Trainer
          </Text>
          <Text style={[styles.loadingMessage, { color: 'rgba(255,255,255,0.8)' }]}>
            Loading pose detection model...
          </Text>
          <ActivityIndicator size="large" color="#fff" style={{ marginVertical: 24 }} />
          <Text style={[styles.loadingHint, { color: 'rgba(255,255,255,0.7)' }]}>
            This may take a few seconds on first launch
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing={facing}>
        {/* Pose skeleton overlay */}
        {keypoints.length > 0 && (
          <Svg style={StyleSheet.absoluteFill}>
            {/* Draw skeleton lines */}
            {SKELETON_CONNECTIONS.map(([start, end], index) => {
              const startPoint = keypoints[start];
              const endPoint = keypoints[end];
              if (startPoint && endPoint && startPoint.score > 0.3 && endPoint.score > 0.3) {
                return (
                  <Line
                    key={`line-${index}`}
                    x1={startPoint.x}
                    y1={startPoint.y}
                    x2={endPoint.x}
                    y2={endPoint.y}
                    stroke="#ec4899"
                    strokeWidth="3"
                    opacity={0.8}
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
                    r="6"
                    fill="#fff"
                    stroke="#ec4899"
                    strokeWidth="2"
                  />
                );
              }
              return null;
            })}
          </Svg>
        )}

        {/* Top bar */}
        <LinearGradient
          colors={['rgba(0,0,0,0.6)', 'transparent']}
          style={[styles.topBar, { paddingTop: insets.top + 12 }]}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.exerciseInfo}>
            <Text style={styles.exerciseTitle}>
              {exerciseType.charAt(0).toUpperCase() + exerciseType.slice(1)}
            </Text>
            <Text style={styles.exerciseSubtitle}>AI Form Tracking</Text>
          </View>
          <TouchableOpacity onPress={toggleCameraFacing} style={styles.flipButton}>
            <Ionicons name="camera-reverse" size={24} color="#fff" />
          </TouchableOpacity>
        </LinearGradient>

        {/* Rep counter */}
        <View style={styles.repCounter}>
          <LinearGradient
            colors={['rgba(236, 72, 153, 0.9)', 'rgba(244, 63, 94, 0.9)']}
            style={styles.repCounterGradient}
          >
            <Text style={styles.repCountLabel}>REPS</Text>
            <Text style={styles.repCountNumber}>{exerciseState.repCount}</Text>
          </LinearGradient>
        </View>

        {/* Form feedback */}
        {isTracking && (
          <View style={styles.feedbackContainer}>
            <LinearGradient
              colors={
                formFeedback.severity === 'good'
                  ? ['rgba(34, 197, 94, 0.9)', 'rgba(22, 163, 74, 0.9)']
                  : formFeedback.severity === 'warning'
                  ? ['rgba(251, 146, 60, 0.9)', 'rgba(249, 115, 22, 0.9)']
                  : ['rgba(239, 68, 68, 0.9)', 'rgba(220, 38, 38, 0.9)']
              }
              style={styles.feedbackGradient}
            >
              <Ionicons
                name={
                  formFeedback.severity === 'good'
                    ? 'checkmark-circle'
                    : formFeedback.severity === 'warning'
                    ? 'warning'
                    : 'close-circle'
                }
                size={20}
                color="#fff"
              />
              <Text style={styles.feedbackText}>{formFeedback.message}</Text>
            </LinearGradient>
          </View>
        )}

        {/* Bottom controls */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={[styles.bottomControls, { paddingBottom: insets.bottom + 24 }]}
        >
          {!isTracking ? (
            <View style={styles.startContainer}>
              <Text style={styles.instructionText}>
                Position yourself in frame and tap Start to begin tracking
              </Text>
              <Button
                title="Start Tracking"
                onPress={toggleTracking}
                variant="primary"
                style={{ width: '100%' }}
              />
            </View>
          ) : (
            <View style={styles.controlsRow}>
              <TouchableOpacity onPress={toggleTracking} style={styles.controlButton}>
                <View style={[styles.stopButton, { backgroundColor: '#ef4444' }]}>
                  <Ionicons name="pause" size={32} color="#fff" />
                </View>
                <Text style={styles.controlLabel}>Pause</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleFinish} style={styles.controlButton}>
                <View style={[styles.stopButton, { backgroundColor: '#22c55e' }]}>
                  <Ionicons name="checkmark" size={32} color="#fff" />
                </View>
                <Text style={styles.controlLabel}>Finish</Text>
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
  camera: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flipButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseInfo: {
    flex: 1,
    alignItems: 'center',
  },
  exerciseTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  exerciseSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '500',
  },
  repCounter: {
    position: 'absolute',
    top: 120,
    right: 24,
  },
  repCounterGradient: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  repCountLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  repCountNumber: {
    color: '#fff',
    fontSize: 48,
    fontWeight: '800',
    lineHeight: 52,
  },
  feedbackContainer: {
    position: 'absolute',
    top: 120,
    left: 24,
    right: 120,
  },
  feedbackGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
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
  loadingHint: {
    fontSize: 12,
    marginTop: 16,
    fontStyle: 'italic',
  },
});
