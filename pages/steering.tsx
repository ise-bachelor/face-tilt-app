import React, { useRef, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useCamera } from '../contexts/CameraContext';
import { useExperiment } from '../contexts/ExperimentContext';
import { useFaceDetector } from '../hooks/useFaceDetector';
import { useFaceTracking } from '../hooks/useFaceTracking';
import { usePostureLog } from '../hooks/usePostureLog';
import { useRecording } from '../hooks/useRecording';
import { getContainerStyle } from '../styles';
import { downloadCSV, downloadWebM } from '../utils/downloadUtils';
import { SteeringTrialLog } from '../types';
import { SteeringTask } from '../components/SteeringTask';

const TOTAL_TRIALS = 30; // 3条件 × 10試行

const SteeringTaskPage = () => {
  const router = useRouter();
  const { stream } = useCamera();
  const { session, endSession } = useExperiment();
  const videoRef = useRef<HTMLVideoElement>(null);

  const { detector, isModelLoaded } = useFaceDetector(true);
  const { rotation, headPose, screenRotation, handleStart } = useFaceTracking({
    videoRef,
    detector,
    isModelLoaded,
    condition: session?.condition,
  });

  const [isTaskStarted, setIsTaskStarted] = useState(false);
  const [isTaskCompleted, setIsTaskCompleted] = useState(false);
  const [steeringLogs, setSteeringLogs] = useState<SteeringTrialLog[]>([]);

  const { isRecording, cameraBlob, startRecording, stopRecording } = useRecording(stream);
  const { logs, exportLogsAsCSV } = usePostureLog({
    session,
    headPose,
    screenRotation,
    isRecording,
  });

  // セッションがない場合はホームに戻る
  useEffect(() => {
    if (!session) {
      router.push('/');
    }
  }, [session, router]);

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

  // タスク開始
  const handleStartTask = async () => {
    try {
      await startRecording();
      handleStart();
      setIsTaskStarted(true);
    } catch (error) {
      console.error('タスク開始エラー:', error);
      alert('録画の開始に失敗しました。');
    }
  };

  // タスク完了
  const handleComplete = (logs: SteeringTrialLog[]) => {
    setSteeringLogs(logs);
    stopRecording();
    setIsTaskStarted(false);
    setIsTaskCompleted(true);
  };

  // データダウンロード
  const handleDownloadData = () => {
    if (!session) return;

    const baseFilename = `${session.participant_id}_steering_${session.condition}`;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

    // Steering トライアルログ（CSV）
    const steeringCSV = exportSteeringLogsAsCSV();
    if (steeringCSV) {
      downloadCSV(steeringCSV, `${baseFilename}_trials_${timestamp}.csv`);
    }

    // 姿勢ログ（CSV）
    const postureCSV = exportLogsAsCSV();
    if (postureCSV) {
      downloadCSV(postureCSV, `${baseFilename}_posture_${timestamp}.csv`);
    }

    // Webカメラ録画（WebM）
    if (cameraBlob) {
      downloadWebM(cameraBlob, `${baseFilename}_camera_${timestamp}.webm`);
    }

    // セッション終了してホームに戻る
    alert('データのダウンロードが完了しました。');
  };

  // Steering ログを CSV に変換
  const exportSteeringLogsAsCSV = (): string => {
    if (steeringLogs.length === 0) return '';

    const headers = [
      'participantId',
      'tiltCondition',
      'trialId',
      'widthCondition',
      'A',
      'W',
      'startTime',
      'endTime',
      'MT',
      'errorTime',
      'errorCount',
      'success',
    ];

    const rows = steeringLogs.map(log =>
      [
        log.participantId,
        log.tiltCondition,
        log.trialId,
        log.widthCondition,
        log.A,
        log.W,
        log.startTime.toFixed(2),
        log.endTime.toFixed(2),
        log.MT.toFixed(2),
        log.errorTime.toFixed(2),
        log.errorCount,
        log.success,
      ].join(',')
    );

    return [headers.join(','), ...rows].join('\n');
  };

  // ホームに戻る
  const handleBackToHome = () => {
    endSession();
    router.push('/');
  };

  // コンテナスタイル（Tilt条件に応じて変換）
  const containerStyle = getContainerStyle(rotation);

  if (!session) {
    return <div>読み込み中...</div>;
  }

  const tiltCondition = session.condition === 'rotate' ? 'tilt' : 'baseline';

  // タスク完了画面（回転しない）
  if (isTaskCompleted) {
    return (
      <div style={pageStyle}>
        <div style={completionContainerStyle}>
          <h1 style={titleStyle}>タスク完了</h1>
          <p style={descriptionStyle}>
            全 {TOTAL_TRIALS} 試行が完了しました。
          </p>
          <div style={buttonContainerStyle}>
            <button onClick={handleDownloadData} style={downloadButtonStyle}>
              データをダウンロード
            </button>
            <button onClick={handleBackToHome} style={homeButtonStyle}>
              ホームに戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  // タスク実行中は画面全体を回転
  const currentPageStyle = isTaskStarted
    ? { ...pageStyle, ...containerStyle }
    : pageStyle;

  return (
    <div style={currentPageStyle}>
      {/* 非表示のビデオ要素 */}
      <video ref={videoRef} style={{ display: 'none' }} width={640} height={480} />

      {!isTaskStarted ? (
        // 説明画面（回転しない）
        <div style={startContainerStyle}>
          <h1 style={titleStyle}>Steering Law タスク</h1>
          <p style={descriptionStyle}>
            トンネル内をマウスドラッグでなぞり、スタートからゴールまで移動してください。
            <br />
            できるだけ速く、かつトンネルからはみ出さないように進んでください。
          </p>
          <p style={descriptionStyle}>
            全{TOTAL_TRIALS}試行（3難易度 × 10試行）
          </p>
          <button
            onClick={handleStartTask}
            disabled={!isModelLoaded}
            style={startButtonStyle}
          >
            {isModelLoaded ? 'タスク開始' : '顔認識モデル読み込み中...'}
          </button>
        </div>
      ) : (
        // タスク画面
        <div style={contentContainerStyle}>
          <SteeringTask
            participantId={session.participant_id}
            tiltCondition={tiltCondition}
            onComplete={handleComplete}
          />
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

const startContainerStyle: React.CSSProperties = {
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

const contentContainerStyle: React.CSSProperties = {
  position: 'relative',
  width: '1200px',
  height: '400px',
  backgroundColor: 'white',
  borderRadius: '12px',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  overflow: 'hidden',
};

const completionContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '40px',
  backgroundColor: 'white',
  borderRadius: '12px',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
};

const titleStyle: React.CSSProperties = {
  fontSize: '32px',
  fontWeight: 'bold',
  marginBottom: '20px',
  color: '#333',
};

const descriptionStyle: React.CSSProperties = {
  fontSize: '18px',
  color: '#666',
  marginBottom: '20px',
  textAlign: 'center',
  lineHeight: '1.6',
};

const startButtonStyle: React.CSSProperties = {
  padding: '16px 32px',
  fontSize: '18px',
  fontWeight: 'bold',
  color: 'white',
  backgroundColor: '#1976d2',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
};

const buttonContainerStyle: React.CSSProperties = {
  display: 'flex',
  gap: '20px',
  marginTop: '20px',
};

const downloadButtonStyle: React.CSSProperties = {
  padding: '16px 32px',
  fontSize: '18px',
  fontWeight: 'bold',
  color: 'white',
  backgroundColor: '#4caf50',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
};

const homeButtonStyle: React.CSSProperties = {
  padding: '16px 32px',
  fontSize: '18px',
  fontWeight: 'bold',
  color: 'white',
  backgroundColor: '#1976d2',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
};

export default SteeringTaskPage;
