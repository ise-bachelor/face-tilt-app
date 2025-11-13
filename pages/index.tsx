import { useEffect, useRef, useState } from 'react';

// 型定義のみをインポート（実行時には読み込まれない）
type FaceLandmarksDetector = any;
type Keypoint = any;

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [detector, setDetector] = useState<FaceLandmarksDetector | null>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [rotation, setRotation] = useState({ rotateX: 0, rotateY: 0, rotateZ: 0 });
  const animationFrameRef = useRef<number>();
  const [isBrowser, setIsBrowser] = useState(false);

  // ブラウザ環境かどうかを確認
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
          audio: false
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
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isBrowser]);

  // 顔検出モデルのロード
  useEffect(() => {
    if (!isBrowser) return;
    
    const loadModel = async () => {
      try {
        // 動的インポートでクライアントサイドでのみライブラリを読み込む
        const [tfjs, tfjsBackend, faceLandmarksDetection] = await Promise.all([
          import('@tensorflow/tfjs-core'),
          import('@tensorflow/tfjs-backend-webgl'),
          import('@tensorflow-models/face-landmarks-detection')
        ]);

        const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
        const detectorConfig: any = {
          runtime: 'mediapipe',
          solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh',
          refineLandmarks: true,
        };
        
        const loadedDetector = await faceLandmarksDetection.createDetector(model, detectorConfig);
        setDetector(loadedDetector);
        setIsModelLoaded(true);
      } catch (error) {
        console.error('モデルのロードに失敗しました:', error);
      }
    };

    loadModel();
  }, [isBrowser]);

  // 顔の角度を計算する関数
  const calculateFaceAngles = (keypoints: any[]) => {
    // 主要な特徴点のインデックス
    const noseTip = keypoints[1];        // 鼻先
    const leftEye = keypoints[33];       // 左目
    const rightEye = keypoints[263];     // 右目
    const leftMouth = keypoints[61];     // 口の左端
    const rightMouth = keypoints[291];   // 口の右端
    const chin = keypoints[152];         // あご
    const forehead = keypoints[10];      // 額

    // Yaw（左右の回転）- 顔が左右を向いているか
    const eyeCenterX = (leftEye.x + rightEye.x) / 2;
    const yawAngle = (noseTip.x - eyeCenterX) * 0.5; // -30度から+30度程度

    // Pitch（上下の回転）- 顔が上下を向いているか
    const eyeCenterY = (leftEye.y + rightEye.y) / 2;
    const faceHeight = Math.abs(forehead.y - chin.y);
    const pitchAngle = ((noseTip.y - eyeCenterY) / faceHeight) * 60; // -30度から+30度程度

    // Roll（傾き）- 顔が左右に傾いているか
    const eyeAngle = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);
    const rollAngle = eyeAngle * (180 / Math.PI); // ラジアンから度に変換

    return {
      rotateY: yawAngle,      // 左右の向き
      rotateX: -pitchAngle,   // 上下の向き（マイナスで反転）
      rotateZ: -rollAngle     // 傾き（マイナスで反転）
    };
  };

  // 顔検出ループ
  useEffect(() => {
    if (!detector || !isModelLoaded || !videoRef.current) return;

    const detectFace = async () => {
      if (videoRef.current && videoRef.current.readyState === 4) {
        try {
          const faces = await detector.estimateFaces(videoRef.current, {
            flipHorizontal: false
          });

          if (faces.length > 0) {
            const face = faces[0];
            const angles = calculateFaceAngles(face.keypoints);
            setRotation(angles);
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
  }, [detector, isModelLoaded]);

  // 3D変換を適用したコンテナのスタイル
  const containerStyle = {
    transform: `
      perspective(1000px)
      rotateX(${rotation.rotateX}deg)
      rotateY(${rotation.rotateY}deg)
      rotateZ(${rotation.rotateZ}deg)
    `,
    transformStyle: 'preserve-3d' as const,
    transition: 'transform 0.1s ease-out',
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative'
    }}>
      {!isBrowser ? (
        <div style={{
          background: 'white',
          padding: '40px',
          borderRadius: '20px',
          fontSize: '20px',
          color: '#333'
        }}>
          読み込み中...
        </div>
      ) : (
        <>
          {/* 非表示のビデオ要素 */}
          <video
            ref={videoRef}
            style={{ display: 'none' }}
            width="640"
            height="480"
          />

      {/* 3D変換されるコンテナ */}
      <div
        ref={containerRef}
        style={{
          ...containerStyle,
          width: '80%',
          maxWidth: '800px',
          background: 'white',
          borderRadius: '20px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          padding: '60px',
          position: 'relative',
        }}
      >
        <h1 style={{
          fontSize: '48px',
          marginBottom: '30px',
          color: '#333',
          textAlign: 'center'
        }}>
          顔の動きで画面が傾く
        </h1>

        <div style={{
          marginBottom: '30px',
          padding: '20px',
          background: '#f0f0f0',
          borderRadius: '10px'
        }}>
          <p style={{ margin: '10px 0', fontSize: '18px' }}>
            <strong>Yaw (左右):</strong> {rotation.rotateY.toFixed(1)}°
          </p>
          <p style={{ margin: '10px 0', fontSize: '18px' }}>
            <strong>Pitch (上下):</strong> {rotation.rotateX.toFixed(1)}°
          </p>
          <p style={{ margin: '10px 0', fontSize: '18px' }}>
            <strong>Roll (傾き):</strong> {rotation.rotateZ.toFixed(1)}°
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '20px',
          marginTop: '40px'
        }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => alert(`ボタン ${num} がクリックされました！`)}
              style={{
                padding: '30px',
                fontSize: '24px',
                fontWeight: 'bold',
                border: 'none',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                cursor: 'pointer',
                transition: 'transform 0.2s',
                boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {num}
            </button>
          ))}
        </div>

        {!isModelLoaded && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '30px',
            borderRadius: '10px',
            fontSize: '20px'
          }}>
            モデルを読み込み中...
          </div>
        )}
      </div>

      {/* 使い方の説明 */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(255,255,255,0.9)',
        padding: '20px 40px',
        borderRadius: '10px',
        textAlign: 'center',
        maxWidth: '600px'
      }}>
        <p style={{ margin: '5px 0', fontSize: '16px' }}>
          📹 カメラを許可して、顔を動かしてみてください
        </p>
        <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
          顔を左右・上下に動かすと画面が傾きます
        </p>
      </div>
      </>
      )}
    </div>
  );
}