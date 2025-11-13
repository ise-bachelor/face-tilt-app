// hooks/useFaceDetector.ts

import { useEffect, useState } from 'react';
import type { FaceLandmarksDetector } from '../types';

export const useFaceDetector = (isBrowser: boolean) => {
  const [detector, setDetector] = useState<FaceLandmarksDetector | null>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);

  useEffect(() => {
    if (!isBrowser) return;

    const loadModel = async () => {
      try {
        // ここは「読み込むだけ」で OK（副作用で backend が登録される）
        await Promise.all([
          import('@tensorflow/tfjs-core'),
          import('@tensorflow/tfjs-backend-webgl'),
        ]);

        const faceLandmarksDetection = await import(
          '@tensorflow-models/face-landmarks-detection'
        );

        const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
        const detectorConfig: any = {
          runtime: 'tfjs',
          refineLandmarks: true,
        };

        const loadedDetector = await faceLandmarksDetection.createDetector(
          model,
          detectorConfig
        );
        setDetector(loadedDetector);
        setIsModelLoaded(true);
      } catch (error) {
        console.error('モデルのロードに失敗しました:', error);
      }
    };

    loadModel();
  }, [isBrowser]);

  return { detector, isModelLoaded };
};
