// hooks/useFaceDetector.ts

import { useEffect, useState } from 'react';
import type { FaceLandmarksDetector } from '../types';

export const useFaceDetector = (isBrowser: boolean) => {
  const [detector, setDetector] = useState<FaceLandmarksDetector | null>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);

  useEffect(() => {
    if (!isBrowser) return;

    let isMounted = true;

    const loadModel = async () => {
      try {
        // @tensorflow/tfjs パッケージ全体を使用することで動的インポートの問題を回避
        const tf = await import('@tensorflow/tfjs');
        const faceLandmarksDetection = await import(
          '@tensorflow-models/face-landmarks-detection'
        );

        // TensorFlow.js のバックエンドが準備できるまで待機
        await tf.ready();

        if (!isMounted) return;

        const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
        const detectorConfig: any = {
          runtime: 'tfjs',
          refineLandmarks: true,
        };

        const loadedDetector = await faceLandmarksDetection.createDetector(
          model,
          detectorConfig
        );

        if (!isMounted) return;

        setDetector(loadedDetector);
        setIsModelLoaded(true);
      } catch (error) {
        console.error('モデルのロードに失敗しました:', error);
      }
    };

    loadModel();

    return () => {
      isMounted = false;
    };
  }, [isBrowser]);

  return { detector, isModelLoaded };
};
