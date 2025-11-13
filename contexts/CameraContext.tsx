import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface CameraContextType {
  stream: MediaStream | null;
  isPermissionGranted: boolean;
  isLoading: boolean;
  error: string | null;
  requestPermission: () => Promise<void>;
}

const CameraContext = createContext<CameraContextType | undefined>(undefined);

export const CameraProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const requestPermission = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 640,
          height: 480,
          facingMode: 'user',
        },
      });

      setStream(mediaStream);
      setIsPermissionGranted(true);
      setError(null);
    } catch (err) {
      console.error('カメラアクセスエラー:', err);
      setError('カメラへのアクセスが拒否されました。ブラウザの設定を確認してください。');
      setIsPermissionGranted(false);
    } finally {
      setIsLoading(false);
    }
  };

  // ページ読み込み時に自動的にカメラ許可を要求
  useEffect(() => {
    requestPermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // クリーンアップ: コンポーネントがアンマウントされたらストリームを停止
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  return (
    <CameraContext.Provider
      value={{
        stream,
        isPermissionGranted,
        isLoading,
        error,
        requestPermission,
      }}
    >
      {children}
    </CameraContext.Provider>
  );
};

export const useCamera = (): CameraContextType => {
  const context = useContext(CameraContext);
  if (!context) {
    throw new Error('useCamera must be used within CameraProvider');
  }
  return context;
};
