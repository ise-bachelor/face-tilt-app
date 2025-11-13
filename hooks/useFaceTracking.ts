import { useEffect, useRef, useState } from 'react';
import type { FaceLandmarksDetector, Rotation } from '../types';
import { KalmanFilter } from '../utils/KalmanFilter';
import { calculateFaceAngles } from '../utils/faceAngles';

type UseFaceTrackingArgs = {
  videoRef: React.RefObject<HTMLVideoElement>;
  detector: FaceLandmarksDetector | null;
  isModelLoaded: boolean;
};

export const useFaceTracking = ({
  videoRef,
  detector,
  isModelLoaded,
}: UseFaceTrackingArgs) => {
  const [rotation, setRotation] = useState<Rotation>({
    rotateX: 0,
    rotateY: 0,
    rotateZ: 0,
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
              const rawRotation: Rotation = {
                rotateX:
                  (angles.rotateX - baseRotationRef.current.rotateX) * 2,
                rotateY:
                  (angles.rotateY - baseRotationRef.current.rotateY) * 2,
                rotateZ:
                  (angles.rotateZ - baseRotationRef.current.rotateZ) * 2,
              };

              const filteredRotation = applyKalmanFilter(rawRotation);
              setRotation(filteredRotation);

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
    baseRotationRef.current = { ...currentRotationRef.current };
    setIsStarted(true);
    resetFilters();
  };

  const handleStop = () => {
    setIsStarted(false);
    setRotation({ rotateX: 0, rotateY: 0, rotateZ: 0 });
    resetFilters();
  };

  return { rotation, isStarted, handleStart, handleStop };
};
