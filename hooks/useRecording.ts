import { useState, useRef, useEffect } from 'react';

export const useRecording = (cameraStream: MediaStream | null) => {
  const [isRecording, setIsRecording] = useState(false);
  const [cameraBlob, setCameraBlob] = useState<Blob | null>(null);
  const [screenBlob, setScreenBlob] = useState<Blob | null>(null);

  const cameraRecorderRef = useRef<MediaRecorder | null>(null);
  const screenRecorderRef = useRef<MediaRecorder | null>(null);
  const cameraChunksRef = useRef<Blob[]>([]);
  const screenChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      // Webカメラ録画の開始
      if (cameraStream) {
        cameraChunksRef.current = [];
        const cameraRecorder = new MediaRecorder(cameraStream, {
          mimeType: 'video/webm;codecs=vp9',
        });

        cameraRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            cameraChunksRef.current.push(event.data);
          }
        };

        cameraRecorder.onstop = () => {
          const blob = new Blob(cameraChunksRef.current, { type: 'video/webm' });
          setCameraBlob(blob);
        };

        cameraRecorder.start();
        cameraRecorderRef.current = cameraRecorder;
      }

      // 画面録画の開始
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'browser',
        } as any,
        audio: false,
      });

      screenChunksRef.current = [];
      const screenRecorder = new MediaRecorder(displayStream, {
        mimeType: 'video/webm;codecs=vp9',
      });

      screenRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          screenChunksRef.current.push(event.data);
        }
      };

      screenRecorder.onstop = () => {
        const blob = new Blob(screenChunksRef.current, { type: 'video/webm' });
        setScreenBlob(blob);
        displayStream.getTracks().forEach((track) => track.stop());
      };

      screenRecorder.start();
      screenRecorderRef.current = screenRecorder;

      setIsRecording(true);
    } catch (error) {
      console.error('録画開始エラー:', error);
      throw error;
    }
  };

  const stopRecording = () => {
    if (cameraRecorderRef.current && cameraRecorderRef.current.state !== 'inactive') {
      cameraRecorderRef.current.stop();
    }

    if (screenRecorderRef.current && screenRecorderRef.current.state !== 'inactive') {
      screenRecorderRef.current.stop();
    }

    setIsRecording(false);
  };

  const clearRecordings = () => {
    setCameraBlob(null);
    setScreenBlob(null);
    cameraChunksRef.current = [];
    screenChunksRef.current = [];
  };

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (cameraRecorderRef.current && cameraRecorderRef.current.state !== 'inactive') {
        cameraRecorderRef.current.stop();
      }
      if (screenRecorderRef.current && screenRecorderRef.current.state !== 'inactive') {
        screenRecorderRef.current.stop();
      }
    };
  }, []);

  return {
    isRecording,
    cameraBlob,
    screenBlob,
    startRecording,
    stopRecording,
    clearRecordings,
  };
};
