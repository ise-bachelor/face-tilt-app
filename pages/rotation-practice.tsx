import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useCamera } from '../contexts/CameraContext';
import { useFaceDetector } from '../contexts/FaceDetectorContext';
import { useFaceTracking } from '../hooks/useFaceTracking';
import { getContainerStyle } from '../styles';

const RotationPracticePage = () => {
  const router = useRouter();
  const { stream } = useCamera();
  const videoRef = useRef<HTMLVideoElement>(null);
  const { detector, isModelLoaded } = useFaceDetector();

  const [isPracticeStarted, setIsPracticeStarted] = useState(false);

  const { rotation, handleStart } = useFaceTracking({
    videoRef,
    detector,
    isModelLoaded,
    condition: 'rotate1', // 回転を有効化
    enableNonCoupledRotation: false, // 練習モードでは非連動型回転は無効
  });

  // カメラストリームをビデオ要素に設定
  useEffect(() => {
    const videoElement = videoRef.current;
    if (stream && videoElement) {
      videoElement.srcObject = stream;
      videoElement.play().catch((error) => {
        if (error.name !== 'AbortError') {
          console.error('ビデオの再生に失敗しました:', error);
        }
      });
    }
  }, [stream]);

  const handleStartPractice = () => {
    handleStart();
    setIsPracticeStarted(true);
  };

  const handleEndPractice = () => {
    router.push('/');
  };

  const containerStyle = getContainerStyle(rotation);
  const currentPageStyle = isPracticeStarted
    ? { ...pageStyle, ...containerStyle }
    : pageStyle;

  return (
    <div style={currentPageStyle}>
      {/* 非表示のビデオ要素 */}
      <video ref={videoRef} style={{ display: 'none' }} width={640} height={480} />

      {!isPracticeStarted ? (
        // 説明画面（回転しない）
        <div style={instructionContainerStyle}>
          <h1 style={titleStyle}>回転練習モード</h1>
          <div style={descriptionStyle}>
            <p>このモードでは、画面回転に慣れるための練習ができます。</p>
            <br />
            <p>・頭を動かすと、画面が連動して回転します</p>
            <p>・実際のタスクは含まれていません</p>
            <p>・自由に頭を動かして、回転の感覚を掴んでください</p>
            <br />
            <p>準備ができたら「開始」ボタンを押してください。</p>
          </div>
          <button
            onClick={handleStartPractice}
            style={startButtonStyle}
            disabled={!isModelLoaded}
          >
            {isModelLoaded ? '開始' : '顔検出モデル読み込み中...'}
          </button>
        </div>
      ) : (
        // 練習画面（回転する）
        <div style={practiceContainerStyle}>
          <h1 style={practiceTitleStyle}>頭を動かして画面の回転を確認してください</h1>
          <p style={practiceDescriptionStyle}>
            上下左右に頭を動かしたり、傾けたりして、
            <br />
            画面がどのように回転するか確認してみましょう。
          </p>
          <button onClick={handleEndPractice} style={endButtonStyle}>
            練習を終了
          </button>
        </div>
      )}
    </div>
  );
};

// スタイル定義
const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  backgroundColor: '#f5f5f5',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const instructionContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '40px',
  backgroundColor: 'white',
  borderRadius: '12px',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  maxWidth: '600px',
};

const titleStyle: React.CSSProperties = {
  fontSize: '32px',
  fontWeight: 'bold',
  marginBottom: '20px',
  color: '#333',
};

const descriptionStyle: React.CSSProperties = {
  fontSize: '16px',
  color: '#666',
  marginBottom: '30px',
  lineHeight: '1.6',
};

const startButtonStyle: React.CSSProperties = {
  padding: '16px 48px',
  fontSize: '20px',
  fontWeight: 'bold',
  color: 'white',
  backgroundColor: '#4caf50',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
};

const practiceContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '60px',
  backgroundColor: 'white',
  borderRadius: '12px',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  maxWidth: '800px',
};

const practiceTitleStyle: React.CSSProperties = {
  fontSize: '28px',
  fontWeight: 'bold',
  marginBottom: '20px',
  color: '#333',
  textAlign: 'center',
};

const practiceDescriptionStyle: React.CSSProperties = {
  fontSize: '18px',
  color: '#666',
  marginBottom: '40px',
  lineHeight: '1.8',
  textAlign: 'center',
};

const endButtonStyle: React.CSSProperties = {
  padding: '12px 32px',
  fontSize: '16px',
  fontWeight: 'bold',
  color: 'white',
  backgroundColor: '#f44336',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
};

export default RotationPracticePage;
