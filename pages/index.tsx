import { useEffect, useRef, useState } from 'react';

// 型定義のみをインポート（実行時には読み込まれない）
type FaceLandmarksDetector = any;
type Keypoint = any;

// カルマンフィルタクラス
class KalmanFilter {
  private x: number; // 推定値
  private P: number; // 推定誤差の共分散
  private Q: number; // プロセスノイズの共分散
  private R: number; // 観測ノイズの共分散

  constructor(processNoise: number = 0.01, measurementNoise: number = 0.1, initialValue: number = 0) {
    this.x = initialValue; // 初期推定値
    this.P = 1; // 初期推定誤差
    this.Q = processNoise; // プロセスノイズ（システムの不確実性）
    this.R = measurementNoise; // 観測ノイズ（測定の不確実性）
  }

  // カルマンフィルタの更新
  update(measurement: number): number {
    // 予測ステップ
    const x_pred = this.x; // 状態予測（前回の推定値をそのまま使用）
    const P_pred = this.P + this.Q; // 誤差共分散の予測

    // 更新ステップ
    const K = P_pred / (P_pred + this.R); // カルマンゲインの計算
    this.x = x_pred + K * (measurement - x_pred); // 状態推定値の更新
    this.P = (1 - K) * P_pred; // 誤差共分散の更新

    return this.x;
  }

  // フィルタをリセット
  reset(value: number = 0) {
    this.x = value;
    this.P = 1;
  }

  // 現在の推定値を取得
  getValue(): number {
    return this.x;
  }
}

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [detector, setDetector] = useState<FaceLandmarksDetector | null>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [rotation, setRotation] = useState({ rotateX: 0, rotateY: 0, rotateZ: 0 });
  const animationFrameRef = useRef<number>();
  const [isBrowser, setIsBrowser] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [baseRotation, setBaseRotation] = useState({ rotateX: 0, rotateY: 0, rotateZ: 0 });
  const currentRotationRef = useRef({ rotateX: 0, rotateY: 0, rotateZ: 0 });
  const detectionStartTimeRef = useRef<number>(0);
  const renderTimeRef = useRef<number>(0);
  
  // 各軸のカルマンフィルタ
  const kalmanFiltersRef = useRef({
    rotateX: new KalmanFilter(0.01, 0.5),
    rotateY: new KalmanFilter(0.01, 0.5),
    rotateZ: new KalmanFilter(0.01, 0.5),
  });

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

  // カルマンフィルタを適用した回転処理
  const applyKalmanFilter = (newRotation: { rotateX: number; rotateY: number; rotateZ: number }) => {
    const filteredRotation = {
      rotateX: kalmanFiltersRef.current.rotateX.update(newRotation.rotateX),
      rotateY: kalmanFiltersRef.current.rotateY.update(newRotation.rotateY),
      rotateZ: kalmanFiltersRef.current.rotateZ.update(newRotation.rotateZ),
    };
    
    return filteredRotation;
  };

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
          // 特徴点取得の直前の時間を記録
          detectionStartTimeRef.current = performance.now();
          
          const faces = await detector.estimateFaces(videoRef.current, {
            flipHorizontal: false
          });

          if (faces.length > 0) {
            const face = faces[0];
            const angles = calculateFaceAngles(face.keypoints);
            currentRotationRef.current = angles;

            // スタート後のみ画面を傾ける（基準からの差分の2倍）
            if (isStarted) {
              const rawRotation = {
                rotateX: (angles.rotateX - baseRotation.rotateX) * 2,
                rotateY: (angles.rotateY - baseRotation.rotateY) * 2,
                rotateZ: (angles.rotateZ - baseRotation.rotateZ) * 2,
              };
              
              // カルマンフィルタを適用
              const filteredRotation = applyKalmanFilter(rawRotation);
              setRotation(filteredRotation);
              
              // レンダリング完了時刻を記録（次のフレームで）
              requestAnimationFrame(() => {
                renderTimeRef.current = performance.now();
                const totalTime = renderTimeRef.current - detectionStartTimeRef.current;
                console.log(`特徴点取得〜画面反映: ${totalTime.toFixed(2)}ms`);
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
  }, [detector, isModelLoaded, isStarted, baseRotation]);

  // スタートボタンのハンドラー
  const handleStart = () => {
    setBaseRotation(currentRotationRef.current);
    setIsStarted(true);
    
    // カルマンフィルタを初期化
    kalmanFiltersRef.current.rotateX.reset(0);
    kalmanFiltersRef.current.rotateY.reset(0);
    kalmanFiltersRef.current.rotateZ.reset(0);
  };

  // ストップボタンのハンドラー
  const handleStop = () => {
    setIsStarted(false);
    setRotation({ rotateX: 0, rotateY: 0, rotateZ: 0 });
    
    // カルマンフィルタをリセット
    kalmanFiltersRef.current.rotateX.reset(0);
    kalmanFiltersRef.current.rotateY.reset(0);
    kalmanFiltersRef.current.rotateZ.reset(0);
  };

  // 3D変換を適用したコンテナのスタイル
  // translateZ(-1000px)は画面が手前に倒れた際にクリックできないコンポーネントが生じるのを防ぐ役割
  const containerStyle = {
    transform: `
      translateZ(-1000px)
      perspective(1000px)
      rotateX(${rotation.rotateX}deg)
      rotateY(${rotation.rotateY}deg)
      rotateZ(${rotation.rotateZ}deg)
    `,
    transformStyle: 'preserve-3d' as const,
    transition: 'transform 0.05s linear',
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
          {!isStarted && (
            <p style={{ margin: '10px 0', fontSize: '14px', color: '#666', marginTop: '15px' }}>
              スタートボタンを押すと、現在の姿勢を基準に画面が傾きます
            </p>
          )}
        </div>

        {!isStarted ? (
          <button
            onClick={handleStart}
            disabled={!isModelLoaded}
            style={{
              width: '100%',
              padding: '30px',
              fontSize: '28px',
              fontWeight: 'bold',
              border: 'none',
              borderRadius: '15px',
              background: isModelLoaded 
                ? 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'
                : '#ccc',
              color: 'white',
              cursor: isModelLoaded ? 'pointer' : 'not-allowed',
              transition: 'transform 0.2s, opacity 0.2s',
              boxShadow: isModelLoaded ? '0 8px 25px rgba(17, 153, 142, 0.4)' : 'none',
              marginBottom: '40px',
            }}
            onMouseEnter={(e) => {
              if (isModelLoaded) {
                e.currentTarget.style.transform = 'scale(1.02)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {isModelLoaded ? 'スタート 🚀' : 'モデルを読み込み中...'}
          </button>
        ) : (
          <button
            onClick={handleStop}
            style={{
              width: '100%',
              padding: '30px',
              fontSize: '28px',
              fontWeight: 'bold',
              border: 'none',
              borderRadius: '15px',
              background: 'linear-gradient(135deg, #fc4a1a 0%, #f7b733 100%)',
              color: 'white',
              cursor: 'pointer',
              transition: 'transform 0.2s, opacity 0.2s',
              boxShadow: '0 8px 25px rgba(252, 74, 26, 0.4)',
              marginBottom: '40px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.02)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            ストップ ⏸️
          </button>
        )}

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
          📹 カメラを許可して、スタートボタンを押してください
        </p>
        <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
          スタート時の姿勢を基準に、顔の動きの2倍画面が傾きます
        </p>
      </div>
      </>
      )}
    </div>
  );
}