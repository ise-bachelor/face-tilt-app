import { useEffect, useRef, useState } from 'react';
import type { FaceLandmarksDetector, Rotation, ExperimentCondition, HeadPose, ScreenRotation } from '../types';
import { KalmanFilter } from '../utils/KalmanFilter';
import { calculateFaceAngles } from '../utils/faceAngles';

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
            const angles = calculateFaceAngles(face.keypoints);
            currentRotationRef.current = angles;

            if (isStarted) {
              // タスク開始直後の最初のフレームで基準角度を設定
              if (!baseRotationSetRef.current) {
                baseRotationRef.current = { ...angles };
                baseRotationSetRef.current = true;
              }

              // 頭部姿勢（基準との差分）
              const headPoseDiff: HeadPose = {
                pitch: angles.rotateX - baseRotationRef.current.rotateX,
                yaw: angles.rotateY - baseRotationRef.current.rotateY,
                roll: angles.rotateZ - baseRotationRef.current.rotateZ,
              };
              setHeadPose(headPoseDiff);

              // 実験条件に応じて画面回転を設定
              let finalRotation: Rotation;
              if (condition === 'rotate') {
                // Rotate条件: 画面が回転する（既存ロジック）
                const rawRotation: Rotation = {
                  rotateX: headPoseDiff.pitch * 2,
                  rotateY: headPoseDiff.yaw * 2,
                  rotateZ: headPoseDiff.roll * 2,
                };
                finalRotation = applyKalmanFilter(rawRotation);
                setRotation(finalRotation);
              } else {
                // Default条件: 画面は回転しない
                finalRotation = { rotateX: 0, rotateY: 0, rotateZ: 0 };
                setRotation(finalRotation);
              }

              // 画面回転の値を記録
              setScreenRotation({
                pitch: finalRotation.rotateX,
                yaw: finalRotation.rotateY,
                roll: finalRotation.rotateZ,
              });

              requestAnimationFrame(() => {
                renderTimeRef.current = performance.now();
                const totalTime =
                  renderTimeRef.current - detectionStartTimeRef.current;
                console.log(
                  `特徴点取得〜画面反映: ${totalTime.toFixed(2)}ms`
                );
              });
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
    baseRotationSetRef.current = false;
    resetFilters();
  };

  return {
    rotation,
    headPose,
    screenRotation,
    isStarted,
    handleStart,
    handleStop
  };
};
