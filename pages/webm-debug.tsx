import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useExperiment } from '../contexts/ExperimentContext';
import { useFaceDetector } from '../hooks/useFaceDetector';
import { PostureLogEntry, HeadPose, HeadTranslation, ScreenRotation, ExperimentCondition, TaskType } from '../types';
import { calculateFaceAnglesWithTranslation } from '../utils/faceAngles';
import { downloadCSV } from '../utils/downloadUtils';
import { KalmanFilter } from '../utils/KalmanFilter';

// 感度係数（useFaceTrackingと同じ値）
const ROTATION_SENSITIVITY = 1.0;
const TRANSLATION_SENSITIVITY_TX = 0.0025;
const TRANSLATION_SENSITIVITY_TY = 0.001;
const TRANSLATION_SENSITIVITY_TZ = 0.005;
const MAX_ROTATION_ANGLE = 60;

const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

const WebmDebugPage = () => {
  const router = useRouter();
  const { participantInfo } = useExperiment();
  const [isBrowser, setIsBrowser] = useState(false);
  const { detector, isModelLoaded } = useFaceDetector(isBrowser);

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [participantId, setParticipantId] = useState<string>('999');
  const [condition, setCondition] = useState<ExperimentCondition>('default');
  const [taskName, setTaskName] = useState<TaskType>('minutes');
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<PostureLogEntry[]>([]);
  const [progress, setProgress] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const baseRotationRef = useRef({ rotateX: 0, rotateY: 0, rotateZ: 0 });
  const baseTranslationRef = useRef({ tx: 0, ty: 0, tz: 0 });
  const baseSetRef = useRef(false);

  useEffect(() => {
    setIsBrowser(true);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'video/webm') {
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      setLogs([]);
      setProgress('');
      baseSetRef.current = false;
    } else {
      alert('WebMファイルを選択してください');
    }
  };

  const processVideo = async () => {
    if (!videoRef.current || !canvasRef.current || !detector || !isModelLoaded || !videoFile) {
      alert('ビデオファイルまたはモデルが準備できていません');
      return;
    }

    setIsProcessing(true);
    setLogs([]);
    setProgress('処理を開始します...');
    baseSetRef.current = false;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      alert('Canvas context を取得できませんでした');
      setIsProcessing(false);
      return;
    }

    // ビデオのメタデータが読み込まれるまで待つ
    if (video.readyState < 1) {
      await new Promise<void>((resolve) => {
        const onLoadedMetadata = () => {
          video.removeEventListener('loadedmetadata', onLoadedMetadata);
          resolve();
        };
        video.addEventListener('loadedmetadata', onLoadedMetadata);
      });
    }

    // ビデオデータが読み込まれるまで待つ（readyState >= 2）
    if (video.readyState < 2) {
      await new Promise<void>((resolve) => {
        const onLoadedData = () => {
          video.removeEventListener('loadeddata', onLoadedData);
          resolve();
        };
        video.addEventListener('loadeddata', onLoadedData);
      });
    }

    // 最初のフレームを確実にデコードするため、一瞬再生してから停止
    video.currentTime = 0;
    await new Promise<void>((resolve) => {
      const onSeeked = () => {
        video.removeEventListener('seeked', onSeeked);
        resolve();
      };
      video.addEventListener('seeked', onSeeked);
    });

    // さらにフレームのレンダリングを待つ
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve();
        });
      });
    });

    const duration = video.duration;
    console.log('Video duration:', duration);
    console.log('Video dimensions:', video.videoWidth, 'x', video.videoHeight);

    if (!duration || duration === 0 || !isFinite(duration)) {
      alert('ビデオの長さを取得できませんでした');
      setIsProcessing(false);
      return;
    }

    // Canvasのサイズをビデオの寸法に設定
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    console.log('Canvas size set to:', canvas.width, 'x', canvas.height);

    const frameRate = 4; // 4Hz
    const interval = 1 / frameRate;
    const tempLogs: PostureLogEntry[] = [];

    // カルマンフィルタの初期化
    const screenRotationFilters = {
      rotateX: new KalmanFilter(0.01, 0.1),
      rotateY: new KalmanFilter(0.01, 0.1),
      rotateZ: new KalmanFilter(0.01, 0.1),
    };

    try {
      for (let currentTime = 0; currentTime < duration; currentTime += interval) {
        video.currentTime = currentTime;
        console.log(`Processing frame at ${currentTime.toFixed(2)}s`);

        // ビデオのシークが完了するまで待つ
        await new Promise<void>((resolve) => {
          const onSeeked = () => {
            video.removeEventListener('seeked', onSeeked);
            resolve();
          };
          video.addEventListener('seeked', onSeeked);
        });

        // フレームがレンダリングされるまでさらに待つ
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              resolve();
            });
          });
        });

        // ビデオの状態を確認
        console.log(`Video state - readyState: ${video.readyState}, currentTime: ${video.currentTime}, videoWidth: ${video.videoWidth}, videoHeight: ${video.videoHeight}`);

        // ビデオフレームをCanvasに描画
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        console.log(`Frame drawn to canvas at ${currentTime.toFixed(2)}s`);

        // レイテンシ計測開始
        const detectionStartTime = performance.now();

        // Canvasから顔検出
        const faces = await detector.estimateFaces(canvas, { flipHorizontal: false });
        console.log(`Detected ${faces.length} faces at ${currentTime.toFixed(2)}s`);

        if (faces.length > 0) {
          const face = faces[0];
          const faceData = calculateFaceAnglesWithTranslation(face.keypoints);
          const angles = faceData.rotation;
          const translation = faceData.translation;

          // 最初のフレームで基準を設定
          if (!baseSetRef.current) {
            baseRotationRef.current = { ...angles };
            baseTranslationRef.current = { ...translation };
            baseSetRef.current = true;
            console.log('Base rotation and translation set');
          }

          // 頭部姿勢（基準との差分）
          const headPose: HeadPose = {
            pitch: angles.rotateX - baseRotationRef.current.rotateX,
            yaw: angles.rotateY - baseRotationRef.current.rotateY,
            roll: angles.rotateZ - baseRotationRef.current.rotateZ,
          };

          // 頭部並行移動（基準との差分）
          const headTranslation: HeadTranslation = {
            tx: translation.tx - baseTranslationRef.current.tx,
            ty: translation.ty - baseTranslationRef.current.ty,
            tz: translation.tz - baseTranslationRef.current.tz,
          };

          // 画面回転の計算
          let screenRotation: ScreenRotation;
          if (condition === 'rotate1' || condition === 'rotate2') {
            const rotationMultiplier = condition === 'rotate2' ? 2.0 : 1.0;

            const rawRotation = {
              rotateX: (headPose.pitch * ROTATION_SENSITIVITY
                + headTranslation.ty * TRANSLATION_SENSITIVITY_TY
                + headTranslation.tz * TRANSLATION_SENSITIVITY_TZ) * rotationMultiplier,
              rotateY: (headPose.yaw * ROTATION_SENSITIVITY
                + headTranslation.tx * TRANSLATION_SENSITIVITY_TX) * rotationMultiplier,
              rotateZ: (headPose.roll * ROTATION_SENSITIVITY) * rotationMultiplier,
            };

            // カルマンフィルタ適用
            const filtered = {
              rotateX: screenRotationFilters.rotateX.update(rawRotation.rotateX),
              rotateY: screenRotationFilters.rotateY.update(rawRotation.rotateY),
              rotateZ: screenRotationFilters.rotateZ.update(rawRotation.rotateZ),
            };

            // クランプ適用
            screenRotation = {
              pitch: clamp(filtered.rotateX, -MAX_ROTATION_ANGLE, MAX_ROTATION_ANGLE),
              yaw: clamp(filtered.rotateY, -MAX_ROTATION_ANGLE, MAX_ROTATION_ANGLE),
              roll: clamp(filtered.rotateZ, -MAX_ROTATION_ANGLE, MAX_ROTATION_ANGLE),
            };
          } else {
            // default条件: 画面は回転しない
            screenRotation = { pitch: 0, yaw: 0, roll: 0 };
          }

          // レイテンシ計測終了
          const processingTime = performance.now() - detectionStartTime;

          // ログエントリを作成
          const logEntry: PostureLogEntry = {
            timestamp: Number(currentTime.toFixed(4)),
            participant_id: participantId,
            condition: condition,
            task_name: taskName,
            Head_Pitch: headPose.pitch,
            Head_Yaw: headPose.yaw,
            Head_Roll: headPose.roll,
            Head_Tx: headTranslation.tx,
            Head_Ty: headTranslation.ty,
            Head_Tz: headTranslation.tz,
            Screen_Pitch: screenRotation.pitch,
            Screen_Yaw: screenRotation.yaw,
            Screen_Roll: screenRotation.roll,
            Latency_ms: processingTime,
            // 非連動型回転イベントのデフォルト値（該当しない場合は null）
            NonCoupled_Rotation_Direction: null,
            NonCoupled_Rotation_State: null,
          };

          tempLogs.push(logEntry);
          console.log(`Log entry added. Total logs: ${tempLogs.length}`);
        } else {
          console.log(`No face detected at ${currentTime.toFixed(2)}s, skipping log entry`);
        }

        setProgress(`処理中: ${((currentTime / duration) * 100).toFixed(1)}%`);
      }

      console.log(`Processing complete. Total logs generated: ${tempLogs.length}`);
      setLogs(tempLogs);
      setProgress(`完了: ${tempLogs.length}件のログを生成しました`);
      console.log(`Final log count: ${tempLogs.length}`);
    } catch (error) {
      console.error('処理中にエラーが発生しました:', error);
      setProgress('エラーが発生しました');
    } finally {
      setIsProcessing(false);
    }
  };

  const exportLogsAsCSV = () => {
    if (logs.length === 0) {
      alert('ログがありません');
      return;
    }

    // CSVヘッダー
    const headers = [
      'timestamp',
      'participant_id',
      'condition',
      'task_name',
      'Head_Pitch',
      'Head_Yaw',
      'Head_Roll',
      'Head_Tx',
      'Head_Ty',
      'Head_Tz',
      'Screen_Pitch',
      'Screen_Yaw',
      'Screen_Roll',
      'Latency_ms',
      'NonCoupled_Rotation_Direction',
      'NonCoupled_Rotation_State',
    ];

    // CSVボディ
    const rows = logs.map((log) =>
      [
        log.timestamp,
        log.participant_id,
        log.condition,
        log.task_name,
        log.Head_Pitch.toFixed(4),
        log.Head_Yaw.toFixed(4),
        log.Head_Roll.toFixed(4),
        log.Head_Tx.toFixed(4),
        log.Head_Ty.toFixed(4),
        log.Head_Tz.toFixed(4),
        log.Screen_Pitch.toFixed(4),
        log.Screen_Yaw.toFixed(4),
        log.Screen_Roll.toFixed(4),
        log.Latency_ms.toFixed(2),
        (log.NonCoupled_Rotation_Direction ?? '').toString(),
        (log.NonCoupled_Rotation_State ?? '').toString(),
      ].join(',')
    );

    const csvContent = [headers.join(','), ...rows].join('\n');
    // ファイル名を入力情報から自動生成
    const filename = `${participantId}_${condition}_${taskName}_posture.csv`;
    downloadCSV(csvContent, filename);
  };

  if (!isBrowser) {
    return null;
  }

  return (
    <div style={containerStyle}>
      <h1 style={titleStyle}>WebM デバッグページ（姿勢ログ出力）</h1>
      <p style={descriptionStyle}>
        WebMファイルをアップロードして、姿勢ログをCSVに出力します
      </p>

      <div style={formContainerStyle}>
        {/* ファイル選択 */}
        <div style={formGroupStyle}>
          <label style={labelStyle}>WebMファイルを選択</label>
          <input
            type="file"
            accept="video/webm"
            onChange={handleFileChange}
            style={fileInputStyle}
          />
        </div>

        {/* 参加者ID */}
        <div style={formGroupStyle}>
          <label style={labelStyle}>参加者ID</label>
          <input
            type="text"
            value={participantId}
            onChange={(e) => setParticipantId(e.target.value)}
            style={inputStyle}
            placeholder="999"
          />
        </div>

        {/* 実験条件 */}
        <div style={formGroupStyle}>
          <label style={labelStyle}>実験条件</label>
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value as ExperimentCondition)}
            style={selectStyle}
          >
            <option value="default">Default (回転なし)</option>
            <option value="rotate1">Rotate1 (1x回転)</option>
            <option value="rotate2">Rotate2 (2x回転)</option>
          </select>
        </div>

        {/* タスク選択 */}
        <div style={formGroupStyle}>
          <label style={labelStyle}>タスク</label>
          <select
            value={taskName}
            onChange={(e) => setTaskName(e.target.value as TaskType)}
            style={selectStyle}
          >
            <option value="minutes">タイピングタスク</option>
            <option value="fitts">ポインティングタスク</option>
            <option value="steering">ドラッグタスク</option>
          </select>
        </div>

        {/* ビデオプレビュー */}
        {videoUrl && (
          <div style={videoContainerStyle}>
            <video
              ref={videoRef}
              src={videoUrl}
              style={videoStyle}
              controls
              muted
              playsInline
              preload="auto"
            />
          </div>
        )}

        {/* Canvas（非表示） */}
        <canvas
          ref={canvasRef}
          style={{ display: 'none' }}
        />

        {/* モデルロード状態 */}
        <div style={statusBoxStyle}>
          {isModelLoaded ? (
            <span style={statusTextSuccessStyle}>✓ Face Detection モデル準備完了</span>
          ) : (
            <span style={statusTextLoadingStyle}>Face Detection モデルをロード中...</span>
          )}
        </div>

        {/* 進捗表示 */}
        {progress && (
          <div style={progressBoxStyle}>
            {progress}
          </div>
        )}

        {/* ログ件数表示 */}
        {logs.length > 0 && (
          <div style={logCountBoxStyle}>
            生成されたログ: {logs.length}件
          </div>
        )}

        {/* 処理ボタン */}
        <button
          onClick={processVideo}
          disabled={!videoFile || !isModelLoaded || isProcessing}
          style={
            !videoFile || !isModelLoaded || isProcessing
              ? disabledButtonStyle
              : processButtonStyle
          }
        >
          {isProcessing ? '処理中...' : 'ビデオを解析'}
        </button>

        {/* CSV出力ボタン */}
        <button
          onClick={exportLogsAsCSV}
          disabled={logs.length === 0}
          style={logs.length === 0 ? disabledButtonStyle : downloadButtonStyle}
        >
          CSVをダウンロード
        </button>

        {/* ホームに戻る */}
        <button onClick={() => router.push('/')} style={homeButtonStyle}>
          ホームに戻る
        </button>
      </div>
    </div>
  );
};

// スタイル定義
const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  backgroundColor: '#f5f5f5',
  padding: '20px',
};

const titleStyle: React.CSSProperties = {
  fontSize: '28px',
  fontWeight: 'bold',
  marginBottom: '10px',
  color: '#333',
};

const descriptionStyle: React.CSSProperties = {
  fontSize: '16px',
  color: '#666',
  marginBottom: '30px',
  textAlign: 'center',
};

const formContainerStyle: React.CSSProperties = {
  backgroundColor: 'white',
  padding: '30px',
  borderRadius: '12px',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  width: '100%',
  maxWidth: '600px',
};

const formGroupStyle: React.CSSProperties = {
  marginBottom: '20px',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '14px',
  fontWeight: 'bold',
  marginBottom: '8px',
  color: '#333',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px',
  fontSize: '14px',
  border: '2px solid #ddd',
  borderRadius: '6px',
  outline: 'none',
  boxSizing: 'border-box',
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px',
  fontSize: '14px',
  border: '2px solid #ddd',
  borderRadius: '6px',
  outline: 'none',
  boxSizing: 'border-box',
  cursor: 'pointer',
  backgroundColor: 'white',
};

const fileInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px',
  fontSize: '14px',
  border: '2px solid #ddd',
  borderRadius: '6px',
  outline: 'none',
  boxSizing: 'border-box',
  cursor: 'pointer',
};

const videoContainerStyle: React.CSSProperties = {
  marginBottom: '20px',
  display: 'flex',
  justifyContent: 'center',
};

const videoStyle: React.CSSProperties = {
  maxWidth: '100%',
  height: 'auto',
  borderRadius: '8px',
  border: '2px solid #ddd',
};

const statusBoxStyle: React.CSSProperties = {
  padding: '12px',
  borderRadius: '6px',
  marginBottom: '15px',
  backgroundColor: '#f0f0f0',
  textAlign: 'center',
};

const statusTextSuccessStyle: React.CSSProperties = {
  color: '#2e7d32',
  fontWeight: 'bold',
};

const statusTextLoadingStyle: React.CSSProperties = {
  color: '#1976d2',
  fontWeight: 'bold',
};

const progressBoxStyle: React.CSSProperties = {
  padding: '12px',
  borderRadius: '6px',
  marginBottom: '15px',
  backgroundColor: '#e3f2fd',
  textAlign: 'center',
  color: '#1976d2',
  fontWeight: 'bold',
};

const logCountBoxStyle: React.CSSProperties = {
  padding: '12px',
  borderRadius: '6px',
  marginBottom: '15px',
  backgroundColor: '#e8f5e9',
  textAlign: 'center',
  color: '#2e7d32',
  fontWeight: 'bold',
};

const processButtonStyle: React.CSSProperties = {
  width: '100%',
  padding: '14px',
  fontSize: '16px',
  fontWeight: 'bold',
  color: 'white',
  backgroundColor: '#1976d2',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  marginBottom: '10px',
};

const downloadButtonStyle: React.CSSProperties = {
  width: '100%',
  padding: '14px',
  fontSize: '16px',
  fontWeight: 'bold',
  color: 'white',
  backgroundColor: '#2e7d32',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  marginBottom: '10px',
};

const homeButtonStyle: React.CSSProperties = {
  width: '100%',
  padding: '14px',
  fontSize: '16px',
  fontWeight: 'bold',
  color: '#666',
  backgroundColor: '#e0e0e0',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
};

const disabledButtonStyle: React.CSSProperties = {
  width: '100%',
  padding: '14px',
  fontSize: '16px',
  fontWeight: 'bold',
  color: '#999',
  backgroundColor: '#e0e0e0',
  border: 'none',
  borderRadius: '8px',
  cursor: 'not-allowed',
  marginBottom: '10px',
};

export default WebmDebugPage;
