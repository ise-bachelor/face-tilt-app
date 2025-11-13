import { useEffect, useRef, useState } from 'react';

export const useCamera = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isBrowser, setIsBrowser] = useState(false);

  // ブラウザ判定
  useEffect(() => {
    setIsBrowser(true);
  }, []);

  // カメラのセットアップ
  useEffect(() => {
    if (!isBrowser) return;

    const setupCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (error) {
        console.error('カメラのアクセスに失敗しました:', error);
        alert('カメラへのアクセスを許可してください。');
      }
    };

    setupCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isBrowser]);

  return { videoRef, isBrowser };
};
