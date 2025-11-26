import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useExperiment } from '../contexts/ExperimentContext';
import { useFaceDetector } from '../hooks/useFaceDetector';
import { PostureLogEntry, HeadPose, HeadTranslation, ScreenRotation } from '../types';
import { calculateFaceAnglesWithTranslation } from '../utils/faceAngles';
import { downloadCSV } from '../utils/downloadUtils';

const WebmDebugPage = () => {
  const router = useRouter();
  const { participantInfo } = useExperiment();
  const [isBrowser, setIsBrowser] = useState(false);
  const { detector, isModelLoaded } = useFaceDetector(isBrowser);

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [outputFilename, setOutputFilename] = useState<string>('posture_log');
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<PostureLogEntry[]>([]);
  const [progress, setProgress] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const baseRotationRef = useRef({ rotateX: 0, rotateY: 0, rotateZ: 0 });
  const baseTranslationRef = useRef({ tx: 0, ty: 0, tz: 0 });
  const baseSetRef = useRef(false);

  useEffect(() => {
    setIsBrowser(true);
  }, []);

  // id999チェック
  useEffect(() => {
    if (isBrowser && (!participantInfo || participantInfo.participantId !== '999')) {
      alert('このページはデバッグモード（ID: 999）専用です');
      router.push('/');
    }
  }, [isBrowser, participantInfo, router]);

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
    if (!videoRef.current || !detector || !isModelLoaded || !videoFile) {
      alert('ビデオファイルまたはモデルが準備できていません');
      return;
    }

    setIsProcessing(true);
    setLogs([]);
    setProgress('処理を開始します...');
    baseSetRef.current = false;

    const video = videoRef.current;
    const duration = video.duration;
    const frameRate = 4; // 4Hz
    const interval = 1 / frameRate;
    const tempLogs: PostureLogEntry[] = [];

    try {
      for (let currentTime = 0; currentTime < duration; currentTime += interval) {
        video.currentTime = currentTime;

        // ビデオのシークが完了するまで待つ
        await new Promise<void>((resolve) => {
          const onSeeked = () => {
            video.removeEventListener('seeked', onSeeked);
            resolve();
          };
          video.addEventListener('seeked', onSeeked);
        });

        // フレームから顔検出
        const faces = await detector.estimateFaces(video, { flipHorizontal: false });

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

          // ログエントリを作成
          const logEntry: PostureLogEntry = {
            timestamp: Number(currentTime.toFixed(4)),
            participant_id: '999',
            condition: 'default',
            task_name: 'minutes',
            Head_Pitch: headPose.pitch,
            Head_Yaw: headPose.yaw,
            Head_Roll: headPose.roll,
            Head_Tx: headTranslation.tx,
            Head_Ty: headTranslation.ty,
            Head_Tz: headTranslation.tz,
            Screen_Pitch: 0,
            Screen_Yaw: 0,
            Screen_Roll: 0,
            Latency_ms: 0,
          };

          tempLogs.push(logEntry);
        }

        setProgress(`処理中: ${((currentTime / duration) * 100).toFixed(1)}%`);
      }

      setLogs(tempLogs);
      setProgress(`完了: ${tempLogs.length}件のログを生成しました`);
      console.log(`Generated ${tempLogs.length} posture log entries`);
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
      ].join(',')
    );

    const csvContent = [headers.join(','), ...rows].join('\n');
    const filename = `${outputFilename}.csv`;
    downloadCSV(csvContent, filename);
  };

  if (!isBrowser) {
    return null;
  }

  return (
    <div style={containerStyle}>
      <h1 style={titleStyle}>WebM デバッグページ（姿勢ログ出力）</h1>
      <p style={descriptionStyle}>
        WebMファイルをアップロードして、姿勢ログをCSVに出力します（ID: 999専用）
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

        {/* 出力ファイル名 */}
        <div style={formGroupStyle}>
          <label style={labelStyle}>出力ファイル名（拡張子なし）</label>
          <input
            type="text"
            value={outputFilename}
            onChange={(e) => setOutputFilename(e.target.value)}
            style={inputStyle}
            placeholder="posture_log"
          />
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
            />
          </div>
        )}

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
