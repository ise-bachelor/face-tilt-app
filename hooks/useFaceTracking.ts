import { useEffect, useRef, useState } from 'react';
import type { FaceLandmarksDetector, Rotation, ExperimentCondition, HeadPose, ScreenRotation, HeadTranslation, NonCoupledRotationDirection, NonCoupledRotationState } from '../types';
import { KalmanFilter } from '../utils/KalmanFilter';
import { calculateFaceAnglesWithTranslation } from '../utils/faceAngles';

type UseFaceTrackingArgs = {
  videoRef: React.RefObject<HTMLVideoElement>;
  detector: FaceLandmarksDetector | null;
  isModelLoaded: boolean;
  condition?: ExperimentCondition;
  enableNonCoupledRotation?: boolean; // 非連動型回転を有効にするか
};

// 感度係数
const ROTATION_SENSITIVITY = 1.0;           // 頭部回転の感度係数
const TRANSLATION_SENSITIVITY_TX = 0.0025;   // 左右移動の感度係数
const TRANSLATION_SENSITIVITY_TY = 0.001;   // 上下移動の感度係数
const TRANSLATION_SENSITIVITY_TZ = 0.005;   // 前後移動の感度係数

// 画面回転の最大角度
const MAX_ROTATION_ANGLE = 60;

// 非連動型回転の順序
const NON_COUPLED_ROTATION_SEQUENCE: NonCoupledRotationDirection[] = [
  'Pitch',
  'RollReverse',
  'Yaw',
  'PitchReverse',
  'Roll',
  'YawReverse',
];

// 非連動型回転のタイミング
const NON_COUPLED_ROTATION_INTERVAL_MS = 3 * 60 * 1000; // 3分
const NON_COUPLED_ROTATION_DURATION_MS = 1000; // 1秒
const NON_COUPLED_ROTATION_PAUSE_MS = 2000; // 2秒

// 値を指定範囲にクランプする関数
const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

// 非連動型回転を計算する関数
const calculateNonCoupledRotation = (
  direction: NonCoupledRotationDirection,
  elapsedTime: number
): Rotation => {
  if (!direction) {
    return { rotateX: 0, rotateY: 0, rotateZ: 0 };
  }

  // 1秒かけて60度まで回転
  const progress = Math.min(elapsedTime / NON_COUPLED_ROTATION_DURATION_MS, 1.0);
  const angle = progress * MAX_ROTATION_ANGLE;

  const rotation: Rotation = { rotateX: 0, rotateY: 0, rotateZ: 0 };

  switch (direction) {
    case 'Pitch':
      rotation.rotateX = angle;
      break;
    case 'PitchReverse':
      rotation.rotateX = -angle;
      break;
    case 'Yaw':
      rotation.rotateY = angle;
      break;
    case 'YawReverse':
      rotation.rotateY = -angle;
      break;
    case 'Roll':
      rotation.rotateZ = angle;
      break;
    case 'RollReverse':
      rotation.rotateZ = -angle;
      break;
  }

  return rotation;
};

export const useFaceTracking = ({
  videoRef,
  detector,
  isModelLoaded,
  condition = 'rotate1',
  enableNonCoupledRotation = false,
}: UseFaceTrackingArgs) => {
  const [rotation, setRotation] = useState<Rotation>({
    rotateX: 0,
    rotateY: 0,
    rotateZ: 0,
  });
  const [headPose, setHeadPose] = useState<HeadPose>({
    pitch: 0,
    yaw: 0,
    roll: 0,
  });
  const [screenRotation, setScreenRotation] = useState<ScreenRotation>({
    pitch: 0,
    yaw: 0,
    roll: 0,
  });
  const [headTranslation, setHeadTranslation] = useState<HeadTranslation>({
    tx: 0,
    ty: 0,
    tz: 0,
  });
  const [isStarted, setIsStarted] = useState(false);
  const [latency, setLatency] = useState(0);

  // 非連動型回転の状態
  const [nonCoupledRotationDirection, setNonCoupledRotationDirection] = useState<NonCoupledRotationDirection>(null);
  const [nonCoupledRotationState, setNonCoupledRotationState] = useState<NonCoupledRotationState>(null);

  const baseRotationRef = useRef<Rotation>({
    rotateX: 0,
    rotateY: 0,
    rotateZ: 0,
  });

  const baseTranslationRef = useRef<HeadTranslation>({
    tx: 0,
    ty: 0,
    tz: 0,
  });

  // 基準角度が設定されたかどうかを追跡
  const baseRotationSetRef = useRef<boolean>(false);

  const animationFrameRef = useRef<number>();
  const detectionStartTimeRef = useRef<number>(0);

  // 非連動型回転の管理用ref
  const nonCoupledRotationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const nonCoupledRotationSequenceRef = useRef<number>(0); // 回転シーケンスのインデックス
  const nonCoupledRotationStartTimeRef = useRef<number>(0);
  const taskStartTimeRef = useRef<number>(0);

  // 画面回転用カルマンフィルタ（応答性を重視した設定）
  const screenRotationFiltersRef = useRef({
    rotateX: new KalmanFilter(0.01, 0.1),
    rotateY: new KalmanFilter(0.01, 0.1),
    rotateZ: new KalmanFilter(0.01, 0.1),
  });

  const applyScreenRotationFilter = (newRotation: Rotation): Rotation => {
    return {
      rotateX: screenRotationFiltersRef.current.rotateX.update(newRotation.rotateX),
      rotateY: screenRotationFiltersRef.current.rotateY.update(newRotation.rotateY),
      rotateZ: screenRotationFiltersRef.current.rotateZ.update(newRotation.rotateZ),
    };
  };

  // 非連動型回転を開始する関数
  const startNonCoupledRotation = () => {
    if (!enableNonCoupledRotation) return;

    const direction = NON_COUPLED_ROTATION_SEQUENCE[nonCoupledRotationSequenceRef.current % NON_COUPLED_ROTATION_SEQUENCE.length];
    console.log(`非連動型回転開始: ${direction}`);

    setNonCoupledRotationDirection(direction);
    setNonCoupledRotationState('rotating');
    nonCoupledRotationStartTimeRef.current = Date.now();

    // 1秒後に回転完了（pause状態に移行）
    setTimeout(() => {
      setNonCoupledRotationState('paused');

      // 2秒後に非連動型回転を終了（ユーザに再連動）
      setTimeout(() => {
        setNonCoupledRotationDirection(null);
        setNonCoupledRotationState(null);
        nonCoupledRotationSequenceRef.current += 1;
      }, NON_COUPLED_ROTATION_PAUSE_MS);
    }, NON_COUPLED_ROTATION_DURATION_MS);
  };

  // 非連動型回転のタイマー管理
  useEffect(() => {
    if (!isStarted || !enableNonCoupledRotation) {
      // タイマーをクリア
      if (nonCoupledRotationTimerRef.current) {
        clearInterval(nonCoupledRotationTimerRef.current);
        nonCoupledRotationTimerRef.current = null;
      }
      return;
    }

    // タスク開始時刻を記録
    taskStartTimeRef.current = Date.now();
    nonCoupledRotationSequenceRef.current = 0;

    // 3分ごとに非連動型回転を開始
    nonCoupledRotationTimerRef.current = setInterval(() => {
      startNonCoupledRotation();
    }, NON_COUPLED_ROTATION_INTERVAL_MS);

    return () => {
      if (nonCoupledRotationTimerRef.current) {
        clearInterval(nonCoupledRotationTimerRef.current);
        nonCoupledRotationTimerRef.current = null;
      }
    };
  }, [isStarted, enableNonCoupledRotation]);

  useEffect(() => {
    if (!detector || !isModelLoaded || !videoRef.current) return;

    const detectFace = async () => {
      if (videoRef.current && videoRef.current.readyState === 4) {
        try {
          detectionStartTimeRef.current = performance.now();

          const faces = await detector.estimateFaces(videoRef.current, {
            flipHorizontal: false,
          });

          if (faces.length > 0) {
            const face = faces[0];
            const faceData = calculateFaceAnglesWithTranslation(face.keypoints);
            const angles = faceData.rotation;
            const translation = faceData.translation;

            if (isStarted) {
              // タスク開始直後の最初のフレームで基準角度と基準位置を設定
              if (!baseRotationSetRef.current) {
                baseRotationRef.current = { ...angles };
                baseTranslationRef.current = { ...translation };
                baseRotationSetRef.current = true;
              }

              // 実験条件に応じて画面回転を設定
              let finalRotation: Rotation;
              let rawRotation: Rotation;
              let headPoseDiff: HeadPose;
              let headTranslationDiff: HeadTranslation;

              // 非連動型回転が有効な場合はそれを優先
              if (nonCoupledRotationDirection && nonCoupledRotationState) {
                // 非連動型回転中は基準姿勢を現在の姿勢に更新し続ける
                // これにより、ユーザの姿勢入力が画面回転に反映されない
                baseRotationRef.current = { ...angles };
                baseTranslationRef.current = { ...translation };

                // 頭部姿勢は常に0（基準姿勢を更新しているため）
                headPoseDiff = {
                  pitch: 0,
                  yaw: 0,
                  roll: 0,
                };
                setHeadPose(headPoseDiff);

                // 頭部並行移動も常に0
                headTranslationDiff = {
                  tx: 0,
                  ty: 0,
                  tz: 0,
                };
                setHeadTranslation(headTranslationDiff);

                const elapsedTime = Date.now() - nonCoupledRotationStartTimeRef.current;

                if (nonCoupledRotationState === 'rotating') {
                  // 回転中（1秒かけて60度まで）
                  finalRotation = calculateNonCoupledRotation(nonCoupledRotationDirection, elapsedTime);
                } else {
                  // 停止中（最大角度を維持）
                  finalRotation = calculateNonCoupledRotation(nonCoupledRotationDirection, NON_COUPLED_ROTATION_DURATION_MS);
                }
                setRotation(finalRotation);
              } else {
                // ユーザ連動モード: 頭部姿勢（基準との差分）を計算
                headPoseDiff = {
                  pitch: angles.rotateX - baseRotationRef.current.rotateX,
                  yaw: angles.rotateY - baseRotationRef.current.rotateY,
                  roll: angles.rotateZ - baseRotationRef.current.rotateZ,
                };
                setHeadPose(headPoseDiff);

                // 頭部並行移動（基準との差分）を計算
                headTranslationDiff = {
                  tx: translation.tx - baseTranslationRef.current.tx,
                  ty: translation.ty - baseTranslationRef.current.ty,
                  tz: translation.tz - baseTranslationRef.current.tz,
                };
                setHeadTranslation(headTranslationDiff);

                if (condition === 'rotate1' || condition === 'rotate2') {
                  // Rotate条件: 画面が回転する（ユーザの姿勢に連動）
                  // 並行移動による回転への寄与を計算
                  // Tx (左右) → Yaw (rotateY): 右(+)→rotateY(+), 左(-)→rotateY(-)
                  // Ty (上下) → Pitch (rotateX): 上(-)→rotateX(-), 下(+)→rotateX(+)
                  // Tz (前後) → Pitch (rotateX): 前(+)→rotateX(+), 後(-)→rotateX(-)

                  // rotate2は回転量を2倍にする
                  const rotationMultiplier = condition === 'rotate2' ? 2.0 : 1.0;

                  rawRotation = {
                    // Pitch: 頭部回転 + Ty + Tz による寄与
                    rotateX: (headPoseDiff.pitch * ROTATION_SENSITIVITY
                      + headTranslationDiff.ty * TRANSLATION_SENSITIVITY_TY
                      + headTranslationDiff.tz * TRANSLATION_SENSITIVITY_TZ) * rotationMultiplier,
                    // Yaw: 頭部回転 + Tx による寄与
                    rotateY: (headPoseDiff.yaw * ROTATION_SENSITIVITY
                      + headTranslationDiff.tx * TRANSLATION_SENSITIVITY_TX) * rotationMultiplier,
                    // Roll: 頭部回転のみ
                    rotateZ: (headPoseDiff.roll * ROTATION_SENSITIVITY) * rotationMultiplier,
                  };

                  // 画面回転にカルマンフィルタを適用
                  const filtered = applyScreenRotationFilter(rawRotation);

                  // 60度制限を適用
                  finalRotation = {
                    rotateX: clamp(filtered.rotateX, -MAX_ROTATION_ANGLE, MAX_ROTATION_ANGLE),
                    rotateY: clamp(filtered.rotateY, -MAX_ROTATION_ANGLE, MAX_ROTATION_ANGLE),
                    rotateZ: clamp(filtered.rotateZ, -MAX_ROTATION_ANGLE, MAX_ROTATION_ANGLE),
                  };
                  setRotation(finalRotation);
                } else {
                  // Default条件: 画面は回転しない
                  rawRotation = { rotateX: 0, rotateY: 0, rotateZ: 0 };
                  finalRotation = { rotateX: 0, rotateY: 0, rotateZ: 0 };
                  setRotation(finalRotation);
                }
              }

              // 画面回転の値を記録（カルマンフィルタ後）
              setScreenRotation({
                pitch: finalRotation.rotateX,
                yaw: finalRotation.rotateY,
                roll: finalRotation.rotateZ,
              });

              // レイテンシを計測してコンソールに出力
              const processingTime = performance.now() - detectionStartTimeRef.current;
              setLatency(processingTime);
              console.log(`処理レイテンシ: ${processingTime.toFixed(2)}ms`);
            }
          }
        } catch (error) {
          console.error('顔検出エラー:', error);
        }
      }

      animationFrameRef.current = requestAnimationFrame(detectFace);
    };

    detectFace();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [detector, isModelLoaded, isStarted, videoRef]);

  const resetFilters = () => {
    // 画面回転フィルタをリセット
    screenRotationFiltersRef.current.rotateX.reset(0);
    screenRotationFiltersRef.current.rotateY.reset(0);
    screenRotationFiltersRef.current.rotateZ.reset(0);
  };

  const handleStart = () => {
    // 基準角度は次のフレームで設定されるため、フラグをリセット
    baseRotationSetRef.current = false;
    setIsStarted(true);
    resetFilters();
  };

  const handleStop = () => {
    setIsStarted(false);
    setRotation({ rotateX: 0, rotateY: 0, rotateZ: 0 });
    setHeadTranslation({ tx: 0, ty: 0, tz: 0 });
    baseRotationSetRef.current = false;
    resetFilters();
  };

  return {
    rotation,
    headPose,
    headTranslation,
    screenRotation,
    latency,
    isStarted,
    handleStart,
    handleStop,
    nonCoupledRotationDirection,
    nonCoupledRotationState,
  };
};
