import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SteeringTrialLog } from '../types';

interface SteeringTaskProps {
  participantId: string;
  tiltEnabled: boolean;
  pitch?: number;
  yaw?: number;
  roll?: number;
  onComplete: (logs: SteeringTrialLog[]) => void;
}

type WidthCondition = 'easy' | 'medium' | 'hard';

interface TunnelConfig {
  widthCondition: WidthCondition;
  W: number;  // Tunnel width
}

const TUNNEL_CONFIGS: TunnelConfig[] = [
  { widthCondition: 'easy', W: 200 },
  { widthCondition: 'medium', W: 100 },
  { widthCondition: 'hard', W: 50 },
];

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 400;
const CENTER_Y = 200;
const A = 800;  // Tunnel length
const START_X_MIN = 150;
const START_X_MAX = 250;
const GOAL_X_MIN = 950;
const GOAL_X_MAX = 1050;
const TRIALS_PER_CONDITION = 10;

export const SteeringTask: React.FC<SteeringTaskProps> = ({
  participantId,
  tiltEnabled,
  pitch = 0,
  yaw = 0,
  roll = 0,
  onComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastPositionRef = useRef<{ x: number; y: number; wasInside: boolean } | null>(null);

  const [trials, setTrials] = useState<SteeringTrialLog[]>([]);
  const [currentTrialIndex, setCurrentTrialIndex] = useState(0);
  const [currentConditionIndex, setCurrentConditionIndex] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [errorTime, setErrorTime] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [lastErrorCheckTime, setLastErrorCheckTime] = useState(0);
  const [isTaskStarted, setIsTaskStarted] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  // ランダムな条件順序を生成（コンポーネントマウント時のみ）
  const [conditionOrder] = useState(() => {
    const order: number[] = [];
    TUNNEL_CONFIGS.forEach((_, index) => {
      for (let i = 0; i < TRIALS_PER_CONDITION; i++) {
        order.push(index);
      }
    });
    // Fisher-Yates shuffle
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    return order;
  });

  const currentConfig = TUNNEL_CONFIGS[conditionOrder[currentTrialIndex]];
  const totalTrials = conditionOrder.length;

  // キャンバスを描画
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 背景を白でクリア
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // トンネルを描画（グレー）
    const topEdge = CENTER_Y - currentConfig.W / 2;
    const bottomEdge = CENTER_Y + currentConfig.W / 2;
    ctx.fillStyle = '#84919E';
    ctx.fillRect(START_X_MIN, topEdge, A, currentConfig.W);

    // スタートエリア（緑）
    ctx.fillStyle = '#03AF7A';
    ctx.fillRect(START_X_MIN, topEdge, 100, currentConfig.W);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('START', (START_X_MIN + START_X_MAX) / 2, CENTER_Y);

    // ゴールエリア（空色）
    ctx.fillStyle = '#4DC4FF';
    ctx.fillRect(GOAL_X_MIN, topEdge, 100, currentConfig.W);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('GOAL', (GOAL_X_MIN + GOAL_X_MAX) / 2, CENTER_Y);
  }, [currentConfig]);

  // 初期描画
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // 通路内判定
  const isInsideTunnel = (x: number, y: number): boolean => {
    const topEdge = CENTER_Y - currentConfig.W / 2;
    const bottomEdge = CENTER_Y + currentConfig.W / 2;
    return x >= START_X_MIN && x <= GOAL_X_MAX && y >= topEdge && y <= bottomEdge;
  };

  // スタートエリア判定
  const isInStartArea = (x: number, y: number): boolean => {
    const topEdge = CENTER_Y - currentConfig.W / 2;
    const bottomEdge = CENTER_Y + currentConfig.W / 2;
    return x >= START_X_MIN && x <= START_X_MAX && y >= topEdge && y <= bottomEdge;
  };

  // ゴールエリア判定
  const isInGoalArea = (x: number, y: number): boolean => {
    const topEdge = CENTER_Y - currentConfig.W / 2;
    const bottomEdge = CENTER_Y + currentConfig.W / 2;
    return x >= GOAL_X_MIN && x <= GOAL_X_MAX && y >= topEdge && y <= bottomEdge;
  };

  // エラー計測のためのアニメーションループ
  useEffect(() => {
    if (!isDrawing) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const checkPosition = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mouseEvent = (window as any).lastMouseEvent;
      if (!mouseEvent) {
        animationFrameRef.current = requestAnimationFrame(checkPosition);
        return;
      }

      const x = mouseEvent.clientX - rect.left;
      const y = mouseEvent.clientY - rect.top;
      const now = performance.now();
      const inside = isInsideTunnel(x, y);

      // エラー時間の計測
      if (!inside && lastErrorCheckTime > 0) {
        const deltaTime = now - lastErrorCheckTime;
        setErrorTime(prev => prev + deltaTime);
      }

      // エラーカウント（境界をまたいだときのみ）
      if (lastPositionRef.current && lastPositionRef.current.wasInside && !inside) {
        setErrorCount(prev => prev + 1);
      }

      lastPositionRef.current = { x, y, wasInside: inside };
      setLastErrorCheckTime(now);

      animationFrameRef.current = requestAnimationFrame(checkPosition);
    };

    animationFrameRef.current = requestAnimationFrame(checkPosition);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isDrawing, currentConfig.W]);

  // マウスイベントをグローバルに保存
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      (window as any).lastMouseEvent = e;
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isTaskStarted || isComplete) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // スタートエリア内でのみ開始
    if (isInStartArea(x, y)) {
      setIsDrawing(true);
      setStartTime(performance.now());
      setErrorTime(0);
      setErrorCount(0);
      setLastErrorCheckTime(performance.now());
      lastPositionRef.current = { x, y, wasInside: true };
      drawCanvas();
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const inside = isInsideTunnel(x, y);

    // 軌跡を描画
    ctx.fillStyle = inside ? '#2196F3' : '#F44336';
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, 2 * Math.PI);
    ctx.fill();
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const endTime = performance.now();
    const MT = endTime - startTime;

    // ゴールエリアに到達したかチェック
    if (isInGoalArea(x, y)) {
      // 成功判定（例：エラー時間がMTの20%以下）
      const success = errorTime <= MT * 0.2;

      // ログを記録
      const log: SteeringTrialLog = {
        participantId,
        tiltCondition: tiltEnabled ? 'tilt' : 'baseline',
        trialId: currentTrialIndex,
        widthCondition: currentConfig.widthCondition,
        A,
        W: currentConfig.W,
        startTime,
        endTime,
        MT,
        errorTime,
        errorCount,
        success,
      };

      setTrials(prev => [...prev, log]);
      setIsDrawing(false);

      // 次のトライアルへ
      const nextTrialIndex = currentTrialIndex + 1;
      if (nextTrialIndex < totalTrials) {
        setCurrentTrialIndex(nextTrialIndex);
        setTimeout(() => {
          drawCanvas();
        }, 100);
      } else {
        // 全トライアル完了
        setIsComplete(true);
      }
    } else {
      // ゴールに到達せずに終了
      setIsDrawing(false);
      alert('ゴールエリアに到達できませんでした。もう一度試してください。');
      drawCanvas();
    }
  };

  const handleStartTask = () => {
    setIsTaskStarted(true);
    drawCanvas();
  };

  const handleDownloadCSV = () => {
    if (trials.length === 0) return;

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

    const rows = trials.map(log =>
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

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `steering_${participantId}_${tiltEnabled ? 'tilt' : 'baseline'}_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    onComplete(trials);
  };

  // Tiltスタイル
  const containerStyle: React.CSSProperties = {
    transform: tiltEnabled
      ? `rotateX(${pitch}deg) rotateY(${yaw}deg) rotateZ(${roll}deg)`
      : 'none',
    transition: 'transform 0.1s linear',
  };

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <div style={contentStyle}>
          {!isTaskStarted ? (
            <div style={startContainerStyle}>
              <h1 style={titleStyle}>Steering Law タスク</h1>
              <p style={descriptionStyle}>
                トンネル内をマウスドラッグでなぞり、スタートからゴールまで移動してください。
                <br />
                できるだけ速く、かつトンネルからはみ出さないように進んでください。
              </p>
              <div style={infoBoxStyle}>
                <p>条件: {tiltEnabled ? 'Tilt有効' : 'Baseline'}</p>
                <p>試行数: {totalTrials}回</p>
              </div>
              <button onClick={handleStartTask} style={startButtonStyle}>
                タスク開始
              </button>
            </div>
          ) : isComplete ? (
            <div style={completeContainerStyle}>
              <h2 style={completeTitleStyle}>タスク完了！</h2>
              <p style={completeDescriptionStyle}>
                全{totalTrials}試行が完了しました。
                <br />
                データをダウンロードしてください。
              </p>
              <button onClick={handleDownloadCSV} style={downloadButtonStyle}>
                CSVダウンロード
              </button>
            </div>
          ) : (
            <>
              <div style={taskInfoStyle}>
                <p>試行: {currentTrialIndex + 1} / {totalTrials}</p>
                <p>難易度: {currentConfig.widthCondition} (幅: {currentConfig.W}px)</p>
                {isDrawing && (
                  <>
                    <p>エラー回数: {errorCount}</p>
                    <p>エラー時間: {(errorTime / 1000).toFixed(2)}秒</p>
                  </>
                )}
              </div>
              <canvas
                ref={canvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                style={canvasStyle}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
              />
              <div style={instructionStyle}>
                {isDrawing
                  ? 'ゴールまでマウスボタンを押したまま進んでください'
                  : 'STARTエリアをクリックして開始してください'}
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
  backgroundColor: '#F5F5F5',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '20px',
};

const contentStyle: React.CSSProperties = {
  backgroundColor: '#FFFFFF',
  borderRadius: '12px',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  overflow: 'hidden',
};

const startContainerStyle: React.CSSProperties = {
  padding: '60px 40px',
  textAlign: 'center',
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

const infoBoxStyle: React.CSSProperties = {
  backgroundColor: '#F0F0F0',
  padding: '20px',
  borderRadius: '8px',
  marginBottom: '30px',
  fontSize: '14px',
  color: '#333',
};

const startButtonStyle: React.CSSProperties = {
  padding: '16px 48px',
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#FFFFFF',
  backgroundColor: '#1976D2',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
};

const completeContainerStyle: React.CSSProperties = {
  padding: '60px 40px',
  textAlign: 'center',
  maxWidth: '600px',
};

const completeTitleStyle: React.CSSProperties = {
  fontSize: '28px',
  fontWeight: 'bold',
  marginBottom: '20px',
  color: '#4CAF50',
};

const completeDescriptionStyle: React.CSSProperties = {
  fontSize: '16px',
  color: '#666',
  marginBottom: '30px',
  lineHeight: '1.6',
};

const downloadButtonStyle: React.CSSProperties = {
  padding: '16px 48px',
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#FFFFFF',
  backgroundColor: '#4CAF50',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
};

const taskInfoStyle: React.CSSProperties = {
  position: 'absolute',
  top: '20px',
  left: '20px',
  fontSize: '14px',
  color: '#333',
  backgroundColor: 'rgba(255, 255, 255, 0.9)',
  padding: '15px',
  borderRadius: '8px',
  lineHeight: '1.6',
  zIndex: 10,
};

const canvasStyle: React.CSSProperties = {
  display: 'block',
  cursor: 'crosshair',
  border: '1px solid #E0E0E0',
};

const instructionStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: '20px',
  left: '50%',
  transform: 'translateX(-50%)',
  fontSize: '16px',
  color: '#333',
  backgroundColor: 'rgba(255, 255, 255, 0.9)',
  padding: '10px 20px',
  borderRadius: '8px',
  zIndex: 10',
};
