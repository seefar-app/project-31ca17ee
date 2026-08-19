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

        // Import TensorFlow modules
        const [tf, tfReactNative, poseDetection] = await Promise.all([
          import('@tensorflow/tfjs'),
          import('@tensorflow/tfjs-react-native'),
          import('@tensorflow-models/pose-detection')
        ]);

        setLoadingProgress(30);
        setLoadingMessage('Initializing TensorFlow backend...');

        // Initialize TensorFlow backend
        await tfReactNative.ready();

        if (!isMounted) return;

        setTfReady(true);
        setLoadingProgress(50);
        setLoadingMessage('Loading pose detection model...');

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
          leftHip.score > minScore &&
          leftKnee.score > minScore &&
          leftAnkle.score > minScore
        ) {
          const kneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);

          setFormFeedback({
            isGoodForm: kneeAngle < 120,
            message: kneeAngle < 90 ? 'Great depth!' : 'Go lower',
            severity: kneeAngle < 120 ? 'good' : 'warning',
          });

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
      }
    },
    [exerciseType, calculateAngle]
  );

  // Start tracking
  const handleStartTracking = useCallback(() => {
    if (!detectorRef.current) {
      alert('Model not loaded yet');
      return;
    }
    setIsTracking(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  // Stop tracking
  const handleStopTracking = useCallback(() => {
    setIsTracking(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Show summary and navigate back
    setTimeout(() => {
      router.back();
    }, 500);
  }, [router]);

  // Toggle camera
  const toggleCameraFacing = useCallback(() => {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  // Reset counter
  const handleReset = useCallback(() => {
    setExerciseState({
      repCount: 0,
      isInPosition: false,
      lastAngle: 0,
      phase: 'neutral',
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }, []);

  // Render skeleton overlay
  const renderSkeleton = () => {
    if (keypoints.length === 0) return null;

    return (
      <Svg
        style={StyleSheet.absoluteFill}
        width={SCREEN_WIDTH}
        height={SCREEN_HEIGHT}
      >
        {/* Draw connections */}
        {SKELETON_CONNECTIONS.map(([i, j], index) => {
          const p1 = keypoints[i];
          const p2 = keypoints[j];
          if (p1 && p2 && p1.score > 0.3 && p2.score > 0.3) {
            return (
              <Line
                key={`line-${index}`}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke={formFeedback.isGoodForm ? '#10b981' : '#f59e0b'}
                strokeWidth="3"
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
                fill={formFeedback.isGoodForm ? '#10b981' : '#f59e0b'}
                stroke="#fff"
                strokeWidth="2"
              />
            );
          }
          return null;
        })}
      </Svg>
    );
  };

  // Handle camera permission
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
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Camera Access</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.permissionContainer}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="camera" size={48} color={colors.primary} />
          </View>
          <Text style={[styles.permissionTitle, { color: colors.text }]}>
            Camera Permission Required
          </Text>
          <Text style={[styles.permissionText, { color: colors.textSecondary }]}>
            We need access to your camera to track your exercise form and count reps in real-time.
          </Text>
          <Button
            title="Grant Permission"
            onPress={requestPermission}
            variant="primary"
            style={{ marginTop: 24 }}
          />
        </View>
      </View>
    );
  }

  // Show loading screen while model loads
  if (isModelLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Loading AI Model</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.loadingContainer}>
          {modelError ? (
            <>
              <Ionicons name="alert-circle" size={64} color={colors.error} />
              <Text style={[styles.loadingTitle, { color: colors.error, marginTop: 16 }]}>
                Error Loading Model
              </Text>
              <Text style={[styles.permissionText, { color: colors.textSecondary, marginTop: 8 }]}>
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
                style={{ marginTop: 24 }}
              />
              <Button
                title="Go Back"
                onPress={() => router.back()}
                variant="outline"
                style={{ marginTop: 12 }}
              />
            </>
          ) : (
            <>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingTitle, { color: colors.text, marginTop: 24 }]}>
                {loadingMessage}
              </Text>
              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                  <LinearGradient
                    colors={['#ec4899', '#f43f5e', '#fb7185']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.progressFill, { width: `${loadingProgress}%` }]}
                  />
                </View>
                <Text style={[styles.progressText, { color: colors.primary }]}>
                  {loadingProgress}%
                </Text>
              </View>
              <Text style={[styles.loadingHint, { color: colors.textSecondary }]}>
                This may take a moment on first launch...
              </Text>
            </>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing={facing}
      >
        {renderSkeleton()}

        {/* Header */}
        <LinearGradient
          colors={['rgba(0,0,0,0.6)', 'transparent']}
          style={[styles.header, { paddingTop: insets.top + 16 }]}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {exerciseType.charAt(0).toUpperCase() + exerciseType.slice(1).replace('_', ' ')}
          </Text>
          <TouchableOpacity onPress={toggleCameraFacing} style={styles.backButton}>
            <Ionicons name="camera-reverse" size={24} color="#fff" />
          </TouchableOpacity>
        </LinearGradient>

        {/* Stats overlay */}
        <View style={styles.statsOverlay}>
          <View style={styles.repCounter}>
            <Text style={styles.repCountText}>{exerciseState.repCount}</Text>
            <Text style={styles.repLabel}>REPS</Text>
          </View>

          <View
            style={[
              styles.feedbackBadge,
              {
                backgroundColor:
                  formFeedback.severity === 'good'
                    ? 'rgba(16, 185, 129, 0.9)'
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
                  ? 'warning'
                  : 'close-circle'
              }
              size={20}
              color="#fff"
            />
            <Text style={styles.feedbackText}>{formFeedback.message}</Text>
          </View>
        </View>

        {/* Bottom controls */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={[styles.bottomControls, { paddingBottom: insets.bottom + 24 }]}
        >
          {!isTracking ? (
            <View style={styles.startContainer}>
              <Text style={styles.instructionText}>
                Position yourself in frame and tap Start when ready
              </Text>
              <Button
                title="Start Tracking"
                onPress={handleStartTracking}
                variant="primary"
                icon="play"
              />
            </View>
          ) : (
            <View style={styles.controlsRow}>
              <TouchableOpacity onPress={handleReset} style={styles.controlButton}>
                <Ionicons name="refresh" size={32} color="#fff" />
                <Text style={styles.controlLabel}>Reset</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleStopTracking}>
                <LinearGradient
                  colors={['#ef4444', '#dc2626']}
                  style={styles.stopButton}
                >
                  <Ionicons name="stop" size={32} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.controlButton}>
                <Ionicons name="fitness" size={32} color="#fff" />
                <Text style={styles.controlLabel}>Tracking</Text>
              </View>
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
  header: {
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
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  statsOverlay: {
    position: 'absolute',
    top: 120,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 16,
  },
  repCounter: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  repCountText: {
    fontSize: 48,
    fontWeight: '800',
    color: '#fff',
  },
  repLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 2,
  },
  feedbackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
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
