import { useEffect, useRef, useState } from 'react';
import type { FaceLandmarksDetector, Rotation, ExperimentCondition, HeadPose, ScreenRotation, HeadTranslation } from '../types';
import { KalmanFilter } from '../utils/KalmanFilter';
import { calculateFaceAnglesWithTranslation } from '../utils/faceAngles';

type UseFaceTrackingArgs = {
  videoRef: React.RefObject<HTMLVideoElement>;
  detector: FaceLandmarksDetector | null;
  isModelLoaded: boolean;
  condition?: ExperimentCondition;
};

// 感度係数
const ROTATION_SENSITIVITY = 2.0;           // 頭部回転の感度係数
const TRANSLATION_SENSITIVITY_TX = 0.005;   // 左右移動の感度係数
const TRANSLATION_SENSITIVITY_TY = 0.005;   // 上下移動の感度係数
const TRANSLATION_SENSITIVITY_TZ = 0.005;   // 前後移動の感度係数

// 画面回転の最大角度
const MAX_ROTATION_ANGLE = 60;

// 値を指定範囲にクランプする関数
const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

export const useFaceTracking = ({
  videoRef,
  detector,
  isModelLoaded,
  condition = 'rotate1',
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
  const [rawScreenRotation, setRawScreenRotation] = useState<ScreenRotation>({
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

  const baseRotationRef = useRef<Rotation>({
    rotateX: 0,
    rotateY: 0,
    rotateZ: 0,
  });

  const currentRotationRef = useRef<Rotation>({
    rotateX: 0,
    rotateY: 0,
    rotateZ: 0,
  });

  const baseTranslationRef = useRef<HeadTranslation>({
    tx: 0,
    ty: 0,
    tz: 0,
  });

  const currentTranslationRef = useRef<HeadTranslation>({
    tx: 0,
    ty: 0,
    tz: 0,
  });

  // 基準角度が設定されたかどうかを追跡
  const baseRotationSetRef = useRef<boolean>(false);

  const animationFrameRef = useRef<number>();
  const detectionStartTimeRef = useRef<number>(0);

  // 頭部回転用カルマンフィルタ
  const headPoseFiltersRef = useRef({
    pitch: new KalmanFilter(0.01, 0.5),
    yaw: new KalmanFilter(0.01, 0.5),
    roll: new KalmanFilter(0.01, 0.5),
  });

  // 頭部並行移動用カルマンフィルタ
  const headTranslationFiltersRef = useRef({
    tx: new KalmanFilter(0.01, 0.5),
    ty: new KalmanFilter(0.01, 0.5),
    tz: new KalmanFilter(0.01, 0.5),
  });

  // 画面回転用カルマンフィルタ
  const screenRotationFiltersRef = useRef({
    rotateX: new KalmanFilter(0.01, 0.5),
    rotateY: new KalmanFilter(0.01, 0.5),
    rotateZ: new KalmanFilter(0.01, 0.5),
  });

  const applyHeadPoseFilter = (pose: HeadPose): HeadPose => {
    return {
      pitch: headPoseFiltersRef.current.pitch.update(pose.pitch),
      yaw: headPoseFiltersRef.current.yaw.update(pose.yaw),
      roll: headPoseFiltersRef.current.roll.update(pose.roll),
    };
  };

  const applyHeadTranslationFilter = (translation: HeadTranslation): HeadTranslation => {
    return {
      tx: headTranslationFiltersRef.current.tx.update(translation.tx),
      ty: headTranslationFiltersRef.current.ty.update(translation.ty),
      tz: headTranslationFiltersRef.current.tz.update(translation.tz),
    };
  };

  const applyScreenRotationFilter = (newRotation: Rotation): Rotation => {
    return {
      rotateX: screenRotationFiltersRef.current.rotateX.update(newRotation.rotateX),
      rotateY: screenRotationFiltersRef.current.rotateY.update(newRotation.rotateY),
      rotateZ: screenRotationFiltersRef.current.rotateZ.update(newRotation.rotateZ),
    };
  };

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

            currentRotationRef.current = angles;
            currentTranslationRef.current = translation;

            if (isStarted) {
              // タスク開始直後の最初のフレームで基準角度と基準位置を設定
              if (!baseRotationSetRef.current) {
                baseRotationRef.current = { ...angles };
                baseTranslationRef.current = { ...translation };
                baseRotationSetRef.current = true;
              }

              // 頭部姿勢（基準との差分）- 生の値
              const rawHeadPose: HeadPose = {
                pitch: angles.rotateX - baseRotationRef.current.rotateX,
                yaw: angles.rotateY - baseRotationRef.current.rotateY,
                roll: angles.rotateZ - baseRotationRef.current.rotateZ,
              };

              // 頭部姿勢にカルマンフィルタを適用
              const filteredHeadPose = applyHeadPoseFilter(rawHeadPose);
              setHeadPose(filteredHeadPose);

              // 頭部並行移動（基準との差分）- 生の値
              const rawHeadTranslation: HeadTranslation = {
                tx: translation.tx - baseTranslationRef.current.tx,
                ty: translation.ty - baseTranslationRef.current.ty,
                tz: translation.tz - baseTranslationRef.current.tz,
              };

              // 頭部並行移動にカルマンフィルタを適用
              const filteredHeadTranslation = applyHeadTranslationFilter(rawHeadTranslation);
              setHeadTranslation(filteredHeadTranslation);

              // 実験条件に応じて画面回転を設定
              let finalRotation: Rotation;
              let rawRotation: Rotation;
              if (condition === 'rotate1' || condition === 'rotate2') {
                // Rotate条件: 画面が回転する
                // 並行移動による回転への寄与を計算
                // Tx (左右) → Yaw (rotateY): 右(+)→rotateY(+), 左(-)→rotateY(-)
                // Ty (上下) → Pitch (rotateX): 上(-)→rotateX(-), 下(+)→rotateX(+)
                // Tz (前後) → Pitch (rotateX): 前(+)→rotateX(+), 後(-)→rotateX(-)

                // rotate2は回転量を2倍にする
                const rotationMultiplier = condition === 'rotate2' ? 2.0 : 1.0;

                rawRotation = {
                  // Pitch: 頭部回転 + Ty + Tz による寄与
                  rotateX: (filteredHeadPose.pitch * ROTATION_SENSITIVITY
                    + filteredHeadTranslation.ty * TRANSLATION_SENSITIVITY_TY
                    + filteredHeadTranslation.tz * TRANSLATION_SENSITIVITY_TZ) * rotationMultiplier,
                  // Yaw: 頭部回転 + Tx による寄与
                  rotateY: (filteredHeadPose.yaw * ROTATION_SENSITIVITY
                    + filteredHeadTranslation.tx * TRANSLATION_SENSITIVITY_TX) * rotationMultiplier,
                  // Roll: 頭部回転のみ
                  rotateZ: (filteredHeadPose.roll * ROTATION_SENSITIVITY) * rotationMultiplier,
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

              // 画面回転の値を記録（カルマンフィルタ前）
              setRawScreenRotation({
                pitch: rawRotation.rotateX,
                yaw: rawRotation.rotateY,
                roll: rawRotation.rotateZ,
              });

              // 画面回転の値を記録（カルマンフィルタ後）
              setScreenRotation({
                pitch: finalRotation.rotateX,
                yaw: finalRotation.rotateY,
                roll: finalRotation.rotateZ,
              });

              // パフォーマンス計測（同期処理に変更）
              const totalTime = performance.now() - detectionStartTimeRef.current;
              console.log(`特徴点取得〜画面反映: ${totalTime.toFixed(2)}ms`);
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
    // 頭部回転フィルタをリセット
    headPoseFiltersRef.current.pitch.reset(0);
    headPoseFiltersRef.current.yaw.reset(0);
    headPoseFiltersRef.current.roll.reset(0);
    // 頭部並行移動フィルタをリセット
    headTranslationFiltersRef.current.tx.reset(0);
    headTranslationFiltersRef.current.ty.reset(0);
    headTranslationFiltersRef.current.tz.reset(0);
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
    rawScreenRotation,
    screenRotation,
    isStarted,
    handleStart,
    handleStop
  };
};
