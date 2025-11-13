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
import { SteeringLogEntry } from '../types';

interface TunnelConfig {
  width: number;
  length: number;
}

const SteeringTaskPage = () => {
  const router = useRouter();
  const { stream } = useCamera();
  const { session, endSession } = useExperiment();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { detector, isModelLoaded } = useFaceDetector(true);
  const { rotation, headPose, screenRotation, handleStart } = useFaceTracking({
    videoRef,
    detector,
    isModelLoaded,
    condition: session?.condition,
  });

  // タスク設定
  const tunnelWidths = [15, 31, 63];
  const tunnelLengths = [100, 200, 400];
  const configs: TunnelConfig[] = [];
  tunnelWidths.forEach(width => {
    tunnelLengths.forEach(length => {
      configs.push({ width, length });
    });
  });

  const [isPractice, setIsPractice] = useState(true);
  const [currentConfigIndex, setCurrentConfigIndex] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [trialStartTime, setTrialStartTime] = useState(0);
  const [trajectoryLogs, setTrajectoryLogs] = useState<SteeringLogEntry[]>([]);
  const [deviationCount, setDeviationCount] = useState(0);
  const [isTaskStarted, setIsTaskStarted] = useState(false);
  const [trialIndex, setTrialIndex] = useState(0);

  const { isRecording, cameraBlob, screenBlob, startRecording, stopRecording } = useRecording(stream);
  const { logs, exportLogsAsCSV } = usePostureLog({
    session,
    headPose,
    screenRotation,
    isRecording,
  });

  const currentConfig = configs[currentConfigIndex];
  const tunnelStartX = 100;
  const tunnelStartY = 300;
  const tunnelEndX = tunnelStartX + currentConfig.length;
  const tunnelEndY = tunnelStartY;

  // セッションがない場合はホームに戻る
  useEffect(() => {
    if (!session) {
      router.push('/');
    }
  }, [session, router]);

  // カメラストリームをビデオ要素に設定
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play();
    }
  }, [stream]);

  // キャンバスを描画
  useEffect(() => {
    if (canvasRef.current) {
      drawTunnel();
    }
  }, [currentConfig]);

  const handleStartTask = async () => {
    try {
      // 録画開始
      await startRecording();

      // 顔追跡開始
      handleStart();

      setIsTaskStarted(true);
    } catch (error) {
      console.error('タスク開始エラー:', error);
      alert('録画の開始に失敗しました。画面共有を許可してください。');
    }
  };

  const drawTunnel = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // キャンバスをクリア
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // トンネルを描画
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(
      tunnelStartX,
      tunnelStartY - currentConfig.width / 2,
      currentConfig.length,
      currentConfig.width
    );

    // スタート地点
    ctx.fillStyle = '#4caf50';
    ctx.beginPath();
    ctx.arc(tunnelStartX, tunnelStartY, 10, 0, 2 * Math.PI);
    ctx.fill();

    // ゴール地点
    ctx.fillStyle = '#f44336';
    ctx.beginPath();
    ctx.arc(tunnelEndX, tunnelEndY, 10, 0, 2 * Math.PI);
    ctx.fill();
  };

  const isInsideTunnel = (x: number, y: number): boolean => {
    const topEdge = tunnelStartY - currentConfig.width / 2;
    const bottomEdge = tunnelStartY + currentConfig.width / 2;

    return (
      x >= tunnelStartX &&
      x <= tunnelEndX &&
      y >= topEdge &&
      y <= bottomEdge
    );
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isTaskStarted) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // スタート地点近くでのみ開始
    const distToStart = Math.sqrt((x - tunnelStartX) ** 2 + (y - tunnelStartY) ** 2);
    if (distToStart < 20) {
      setIsDrawing(true);
      setTrialStartTime(Date.now());
      setDeviationCount(0);
      setTrajectoryLogs([]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const inside = isInsideTunnel(x, y);

    // 軌跡ログに記録
    const logEntry: SteeringLogEntry = {
      timestamp: Date.now(),
      trial_index: trialIndex,
      tunnel_width: currentConfig.width,
      tunnel_length: currentConfig.length,
      x,
      y,
      is_inside_tunnel: inside,
      is_practice: isPractice,
    };
    setTrajectoryLogs(prev => [...prev, logEntry]);

    // 逸脱カウント
    if (!inside) {
      setDeviationCount(prev => prev + 1);
    }

    // 軌跡を描画
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = inside ? '#2196f3' : '#f44336';
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, 2 * Math.PI);
      ctx.fill();
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // ゴール地点近くで終了
    const distToEnd = Math.sqrt((x - tunnelEndX) ** 2 + (y - tunnelEndY) ** 2);
    if (distToEnd < 20) {
      const completionTime = Date.now() - trialStartTime;
      alert(`完了時間: ${(completionTime / 1000).toFixed(2)}秒\n逸脱回数: ${deviationCount}`);

      // 次のトライアルへ
      setIsDrawing(false);
      const newTrialIndex = trialIndex + 1;
      setTrialIndex(newTrialIndex);

      if (isPractice) {
        // 練習終了 → 本番へ
        setIsPractice(false);
        alert('練習が終了しました。本番を開始します。');
        drawTunnel();
      } else {
        // 本番終了 → 次の条件へ
        const nextConfigIndex = currentConfigIndex + 1;
        if (nextConfigIndex < configs.length) {
          setCurrentConfigIndex(nextConfigIndex);
          setIsPractice(true);
          alert(`条件 ${nextConfigIndex + 1}/${configs.length} を開始します。`);
        } else {
          // 全て終了
          handleCompleteTask();
        }
      }
    } else {
      // ゴール到達せず
      setIsDrawing(false);
      alert('ゴールに到達できませんでした。もう一度試してください。');
      drawTunnel();
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

    // 軌跡ログ（CSV）
    const trajectoryCSV = exportTrajectoryLogsAsCSV();
    if (trajectoryCSV) {
      downloadCSV(trajectoryCSV, `${baseFilename}_trajectory_${timestamp}.csv`);
    }

    // Webカメラ録画（WebM）
    if (cameraBlob) {
      downloadWebM(cameraBlob, `${baseFilename}_camera_${timestamp}.webm`);
    }

    // 画面録画（WebM）
    if (screenBlob) {
      downloadWebM(screenBlob, `${baseFilename}_screen_${timestamp}.webm`);
    }

    // セッション終了してホームに戻る
    alert('データのダウンロードが完了しました。');
    endSession();
    router.push('/');
  };

  const exportTrajectoryLogsAsCSV = (): string => {
    if (trajectoryLogs.length === 0) return '';

    const headers = ['timestamp', 'trial_index', 'tunnel_width', 'tunnel_length', 'x', 'y', 'is_inside_tunnel', 'is_practice'];
    const rows = trajectoryLogs.map(log =>
      [log.timestamp, log.trial_index, log.tunnel_width, log.tunnel_length, log.x.toFixed(2), log.y.toFixed(2), log.is_inside_tunnel, log.is_practice].join(',')
    );

    return [headers.join(','), ...rows].join('\n');
  };

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
              <h1 style={titleStyle}>ステアリングの法則タスク</h1>
              <p style={descriptionStyle}>
                トンネル内をマウスでなぞってゴールまで進んでください。
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
                <p>トンネル幅: {currentConfig.width}px</p>
                <p>トンネル長さ: {currentConfig.length}px</p>
                <p>条件: {currentConfigIndex + 1} / {configs.length}</p>
                {isDrawing && <p>逸脱回数: {deviationCount}</p>}
              </div>

              {/* キャンバス */}
              <canvas
                ref={canvasRef}
                width={800}
                height={600}
                style={canvasStyle}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
              />

              {/* 説明 */}
              <div style={instructionStyle}>
                緑の円からスタートして、赤い円までマウスでなぞってください。
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
  zIndex: 10,
};

const canvasStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  cursor: 'crosshair',
};

const instructionStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: '20px',
  left: '50%',
  transform: 'translateX(-50%)',
  fontSize: '14px',
  color: '#666',
  textAlign: 'center',
  zIndex: 10,
};

export default SteeringTaskPage;
