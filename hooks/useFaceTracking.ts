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

export const useFaceTracking = ({
  videoRef,
  detector,
  isModelLoaded,
  condition = 'rotate',
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
  const renderTimeRef = useRef<number>(0);

  // 各軸のカルマンフィルタ
  const kalmanFiltersRef = useRef({
    rotateX: new KalmanFilter(0.01, 0.5),
    rotateY: new KalmanFilter(0.01, 0.5),
    rotateZ: new KalmanFilter(0.01, 0.5),
  });

  const applyKalmanFilter = (newRotation: Rotation): Rotation => {
    return {
      rotateX: kalmanFiltersRef.current.rotateX.update(newRotation.rotateX),
      rotateY: kalmanFiltersRef.current.rotateY.update(newRotation.rotateY),
      rotateZ: kalmanFiltersRef.current.rotateZ.update(newRotation.rotateZ),
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

              // 頭部姿勢（基準との差分）
              const headPoseDiff: HeadPose = {
                pitch: angles.rotateX - baseRotationRef.current.rotateX,
                yaw: angles.rotateY - baseRotationRef.current.rotateY,
                roll: angles.rotateZ - baseRotationRef.current.rotateZ,
              };
              setHeadPose(headPoseDiff);

              // 頭部並行移動（基準との差分）
              const headTranslationDiff: HeadTranslation = {
                tx: translation.tx - baseTranslationRef.current.tx,
                ty: translation.ty - baseTranslationRef.current.ty,
                tz: translation.tz - baseTranslationRef.current.tz,
              };
              setHeadTranslation(headTranslationDiff);

              // 実験条件に応じて画面回転を設定
              let finalRotation: Rotation;
              let rawRotation: Rotation;
              if (condition === 'rotate') {
                // Rotate条件: 画面が回転する
                // 並行移動による回転への寄与を計算
                // Tx (左右) → Yaw (rotateY): 右(+)→rotateY(+), 左(-)→rotateY(-)
                // Ty (上下) → Pitch (rotateX): 上(-)→rotateX(-), 下(+)→rotateX(+)
                // Tz (前後) → Pitch (rotateX): 前(+)→rotateX(+), 後(-)→rotateX(-)

                const translationSensitivity = 0.005; // 並行移動の感度係数

                rawRotation = {
                  // Pitch: 頭部回転 + Ty + Tz による寄与
                  // Ty: 下方向(+)が正なので、rotateX(+)に寄与（前かがみ寄り）
                  // Tz: 前方向(+)が正なので、rotateX(+)に寄与（前のめり強調）
                  rotateX: headPoseDiff.pitch * 2
                    + headTranslationDiff.ty * translationSensitivity
                    + headTranslationDiff.tz * translationSensitivity,
                  // Yaw: 頭部回転 + Tx による寄与
                  // Tx: 右方向(+)が正なので、rotateY(+)に寄与
                  rotateY: headPoseDiff.yaw * 2
                    + headTranslationDiff.tx * translationSensitivity,
                  // Roll: 頭部回転のみ
                  rotateZ: headPoseDiff.roll * 2,
                };
                finalRotation = applyKalmanFilter(rawRotation);
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
    kalmanFiltersRef.current.rotateX.reset(0);
    kalmanFiltersRef.current.rotateY.reset(0);
    kalmanFiltersRef.current.rotateZ.reset(0);
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
