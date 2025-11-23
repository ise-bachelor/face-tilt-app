import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { FaceLandmarksDetector } from '../types';

interface FaceDetectorContextType {
  detector: FaceLandmarksDetector | null;
  isModelLoaded: boolean;
}

const FaceDetectorContext = createContext<FaceDetectorContextType | undefined>(undefined);

export const FaceDetectorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [detector, setDetector] = useState<FaceLandmarksDetector | null>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);

  // アプリ起動時にモデルをロード
  useEffect(() => {
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
  }, []);

  return (
    <FaceDetectorContext.Provider
      value={{
        detector,
        isModelLoaded,
      }}
    >
      {children}
    </FaceDetectorContext.Provider>
  );
};

export const useFaceDetector = (): FaceDetectorContextType => {
  const context = useContext(FaceDetectorContext);
  if (!context) {
    throw new Error('useFaceDetector must be used within FaceDetectorProvider');
  }
  return context;
};
