import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useCamera } from '../contexts/CameraContext';
import { useExperiment } from '../contexts/ExperimentContext';
import { useFaceDetector } from '../hooks/useFaceDetector';
import { useFaceTracking } from '../hooks/useFaceTracking';
import { usePostureLog } from '../hooks/usePostureLog';
import { useRecording } from '../hooks/useRecording';
import { getContainerStyle } from '../styles';
import { downloadCSV, downloadWebM } from '../utils/downloadUtils';
import { FittsLogEntry } from '../types';

interface TargetConfig {
  size: number;
  distance: number;
}

const FittsTaskPage = () => {
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

  // タスク設定
  const targetSizes = [16, 32, 64];
  const targetDistances = [128, 256, 512];
  const configs: TargetConfig[] = [];
  targetSizes.forEach(size => {
    targetDistances.forEach(distance => {
      configs.push({ size, distance });
    });
  });

  const [isPractice, setIsPractice] = useState(true);
  const [currentConfigIndex, setCurrentConfigIndex] = useState(0);
  const [clickCount, setClickCount] = useState(0);
  const [currentTargetIndex, setCurrentTargetIndex] = useState(0);
  const [trialStartTime, setTrialStartTime] = useState(0);
  const [isTaskStarted, setIsTaskStarted] = useState(false);
  const [clickLogs, setClickLogs] = useState<FittsLogEntry[]>([]);

  const { isRecording, cameraBlob, startRecording, stopRecording } = useRecording(stream);
  const { logs, exportLogsAsCSV } = usePostureLog({
    session,
    headPose,
    screenRotation,
    isRecording,
  });

  const currentConfig = configs[currentConfigIndex];
  const totalClicks = isPractice ? 10 : 39;

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
      // play() のエラーを適切にハンドリング
      videoElement.play().catch((error) => {
        // AbortError は通常無視して問題ない（新しい load によって中断された場合）
        if (error.name !== 'AbortError') {
          console.error('ビデオの再生に失敗しました:', error);
        }
      });
    }
  }, [stream]);

  const handleStartTask = async () => {
    try {
      // 録画開始
      await startRecording();

      // 顔追跡開始
      handleStart();

      setIsTaskStarted(true);
      setTrialStartTime(Date.now());
    } catch (error) {
      console.error('タスク開始エラー:', error);
      alert('録画の開始に失敗しました。');
    }
  };

  const handleTargetClick = () => {
    const clickTime = Date.now() - trialStartTime;

    // ログに記録
    const logEntry: FittsLogEntry = {
      timestamp: Date.now(),
      trial_index: clickCount,
      target_size: currentConfig.size,
      target_distance: currentConfig.distance,
      click_time: clickTime,
      is_practice: isPractice,
    };
    setClickLogs(prev => [...prev, logEntry]);

    // 次のターゲットへ
    const newClickCount = clickCount + 1;
    setClickCount(newClickCount);
    setCurrentTargetIndex(1 - currentTargetIndex); // 0と1を交互に
    setTrialStartTime(Date.now());

    // 練習または本番の終了判定
    if (newClickCount >= totalClicks) {
      if (isPractice) {
        // 練習終了 → 本番へ
        setIsPractice(false);
        setClickCount(0);
        setCurrentTargetIndex(0);
        alert('練習が終了しました。本番を開始します。');
      } else {
        // 本番終了 → 次の条件へ
        const nextConfigIndex = currentConfigIndex + 1;
        if (nextConfigIndex < configs.length) {
          setCurrentConfigIndex(nextConfigIndex);
          setClickCount(0);
          setCurrentTargetIndex(0);
          setIsPractice(true);
          alert(`条件 ${nextConfigIndex + 1}/${configs.length} を開始します。`);
        } else {
          // 全て終了
          handleCompleteTask();
        }
      }
    }
  };

  const handleCompleteTask = () => {
    // 録画停止
    stopRecording();

    setIsTaskStarted(false);

    // データダウンロード
    setTimeout(() => {
      downloadData();
    }, 1000);
  };

  const downloadData = () => {
    if (!session) return;

    const baseFilename = `${session.participant_id}_${session.task_name}_${session.condition}`;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

    // 姿勢ログ（CSV）
    const postureCSV = exportLogsAsCSV();
    if (postureCSV) {
      downloadCSV(postureCSV, `${baseFilename}_posture_${timestamp}.csv`);
    }

    // クリックログ（CSV）
    const clickCSV = exportClickLogsAsCSV();
    if (clickCSV) {
      downloadCSV(clickCSV, `${baseFilename}_clicks_${timestamp}.csv`);
    }

    // Webカメラ録画（WebM）
    if (cameraBlob) {
      downloadWebM(cameraBlob, `${baseFilename}_camera_${timestamp}.webm`);
    }

    // セッション終了してホームに戻る
    alert('データのダウンロードが完了しました。');
    endSession();
    router.push('/');
  };

  const exportClickLogsAsCSV = (): string => {
    if (clickLogs.length === 0) return '';

    const headers = ['timestamp', 'trial_index', 'target_size', 'target_distance', 'click_time', 'is_practice'];
    const rows = clickLogs.map(log =>
      [log.timestamp, log.trial_index, log.target_size, log.target_distance, log.click_time, log.is_practice].join(',')
    );

    return [headers.join(','), ...rows].join('\n');
  };

  const getTargetPosition = (index: number) => {
    const angle = index === 0 ? 0 : Math.PI;
    const x = 400 + currentConfig.distance * Math.cos(angle);
    const y = 300 + currentConfig.distance * Math.sin(angle);
    return { x, y };
  };

  const target0Pos = getTargetPosition(0);
  const target1Pos = getTargetPosition(1);

  const containerStyle = getContainerStyle(rotation);

  if (!session) {
    return <div>読み込み中...</div>;
  }

  return (
    <div style={pageStyle}>
      {/* 非表示のビデオ要素 */}
      <video ref={videoRef} style={{ display: 'none' }} width={640} height={480} />

      {/* 3D変換されるコンテナ */}
      <div style={containerStyle}>
        <div style={contentContainerStyle}>
          {!isTaskStarted ? (
            <div style={startContainerStyle}>
              <h1 style={titleStyle}>フィッツの法則タスク</h1>
              <p style={descriptionStyle}>
                円周上に並んだターゲットを交互にクリックしてください。
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
            <>
              {/* 情報表示 */}
              <div style={infoContainerStyle}>
                <p>モード: {isPractice ? '練習' : '本番'}</p>
                <p>クリック数: {clickCount} / {totalClicks}</p>
                <p>ターゲットサイズ: {currentConfig.size}px</p>
                <p>距離: {currentConfig.distance}px</p>
                <p>条件: {currentConfigIndex + 1} / {configs.length}</p>
              </div>

              {/* ターゲット表示エリア */}
              <div style={targetAreaStyle}>
                {/* ターゲット0 */}
                <div
                  onClick={currentTargetIndex === 0 ? handleTargetClick : undefined}
                  style={{
                    ...targetStyle,
                    left: target0Pos.x - currentConfig.size / 2,
                    top: target0Pos.y - currentConfig.size / 2,
                    width: currentConfig.size,
                    height: currentConfig.size,
                    backgroundColor: currentTargetIndex === 0 ? '#f44336' : '#ccc',
                    cursor: currentTargetIndex === 0 ? 'pointer' : 'default',
                  }}
                />

                {/* ターゲット1 */}
                <div
                  onClick={currentTargetIndex === 1 ? handleTargetClick : undefined}
                  style={{
                    ...targetStyle,
                    left: target1Pos.x - currentConfig.size / 2,
                    top: target1Pos.y - currentConfig.size / 2,
                    width: currentConfig.size,
                    height: currentConfig.size,
                    backgroundColor: currentTargetIndex === 1 ? '#f44336' : '#ccc',
                    cursor: currentTargetIndex === 1 ? 'pointer' : 'default',
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>
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

const contentContainerStyle: React.CSSProperties = {
  position: 'relative',
  width: '800px',
  height: '600px',
  backgroundColor: 'white',
  borderRadius: '12px',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
};

const startContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  padding: '40px',
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
  marginBottom: '30px',
  textAlign: 'center',
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

const infoContainerStyle: React.CSSProperties = {
  position: 'absolute',
  top: '20px',
  left: '20px',
  fontSize: '14px',
  color: '#333',
  lineHeight: '1.6',
};

const targetAreaStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  height: '100%',
};

const targetStyle: React.CSSProperties = {
  position: 'absolute',
  borderRadius: '50%',
  transition: 'background-color 0.2s',
};

export default FittsTaskPage;
