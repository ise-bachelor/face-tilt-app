import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SteeringTrialLog } from '../types';

interface SteeringTaskProps {
  participantId: string;
  tiltCondition: 'baseline' | 'tilt';
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
  tiltCondition,
  onComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastPositionRef = useRef<{ x: number; y: number; wasInside: boolean } | null>(null);

  const [trials, setTrials] = useState<SteeringTrialLog[]>([]);
  const [currentTrialIndex, setCurrentTrialIndex] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [errorTime, setErrorTime] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [lastErrorCheckTime, setLastErrorCheckTime] = useState(0);

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

  // 初期描画とcurrentTrialIndex変更時の再描画
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas, currentTrialIndex]);

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
      // 最後のマウス座標を取得
      const mousePos = lastMousePositionRef.current;
      if (!mousePos) {
        animationFrameRef.current = requestAnimationFrame(checkPosition);
        return;
      }

      const x = mousePos.offsetX;
      const y = mousePos.offsetY;
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

  // マウス座標をグローバルに保存（キャンバスローカル座標）
  const lastMousePositionRef = useRef<{ offsetX: number; offsetY: number } | null>(null);

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // キャンバスのローカル座標を保存（回転に影響されない）
    lastMousePositionRef.current = {
      offsetX: e.nativeEvent.offsetX,
      offsetY: e.nativeEvent.offsetY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // キャンバスのローカル座標を使用（回転に影響されない）
    const x = e.nativeEvent.offsetX;
    const y = e.nativeEvent.offsetY;

    // スタートエリア内でのみ開始
    if (isInStartArea(x, y)) {
      setIsDrawing(true);
      setStartTime(performance.now());
      setErrorTime(0);
      setErrorCount(0);
      setLastErrorCheckTime(performance.now());
      lastPositionRef.current = { x, y, wasInside: true };
      lastMousePositionRef.current = { offsetX: x, offsetY: y };
      drawCanvas();
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // マウス座標を更新
    handleCanvasMouseMove(e);

    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // キャンバスのローカル座標を使用（回転に影響されない）
    const x = e.nativeEvent.offsetX;
    const y = e.nativeEvent.offsetY;

    const inside = isInsideTunnel(x, y);

    // 軌跡を描画
    ctx.fillStyle = inside ? '#2196F3' : '#F44336';
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, 2 * Math.PI);
    ctx.fill();
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    // キャンバスのローカル座標を使用（回転に影響されない）
    const x = e.nativeEvent.offsetX;
    const y = e.nativeEvent.offsetY;

    const endTime = performance.now();
    const MT = endTime - startTime;

    // ゴールエリアに到達したかチェック
    if (isInGoalArea(x, y)) {
      // 成功判定（例：エラー時間がMTの20%以下）
      const success = errorTime <= MT * 0.2;

      // ログを記録
      const log: SteeringTrialLog = {
        participantId,
        tiltCondition,
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

      const newTrials = [...trials, log];
      setTrials(newTrials);
      setIsDrawing(false);

      // 次のトライアルへ
      const nextTrialIndex = currentTrialIndex + 1;
      if (nextTrialIndex < totalTrials) {
        setCurrentTrialIndex(nextTrialIndex);
        // currentConfigが変更されると、useEffectでdrawCanvas()が自動的に呼び出される
      } else {
        // 全トライアル完了
        onComplete(newTrials);
      }
    } else {
      // ゴールに到達せずに終了
      setIsDrawing(false);
      alert('ゴールエリアに到達できませんでした。もう一度試してください。');
      drawCanvas();
    }
  };

  return (
    <div style={containerWrapperStyle}>
      {/* タスク情報表示 */}
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

      {/* キャンバス */}
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={canvasStyle}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />

      {/* 説明 */}
      <div style={instructionStyle}>
        {isDrawing
          ? 'ゴールまでマウスボタンを押したまま進んでください'
          : 'STARTエリアをクリックして開始してください'}
      </div>
    </div>
  );
};

// スタイル定義
const containerWrapperStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  height: '100%',
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
  zIndex: 10,
};
