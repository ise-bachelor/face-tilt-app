import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SteeringTrialLog } from '../types';

interface SteeringTaskProps {
  participantId: string;
  tiltCondition: 'baseline' | 'tilt';
  onComplete: (logs: SteeringTrialLog[]) => void;
  isPractice?: boolean;
  practiceRound?: number;
  onPracticeComplete?: () => void;
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

const TRIALS_PER_CONDITION = 10;

export const SteeringTask: React.FC<SteeringTaskProps> = ({
  participantId,
  tiltCondition,
  onComplete,
  isPractice = false,
  practiceRound = 0,
  onPracticeComplete,
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

  // 画面サイズを管理
  const [canvasSize, setCanvasSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  });

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

  // 練習モードでは常にeasyを使用、本番モードでは条件順序に従う
  const currentConfig = isPractice
    ? TUNNEL_CONFIGS[0] // easy
    : TUNNEL_CONFIGS[conditionOrder[currentTrialIndex]];
  const totalTrials = conditionOrder.length;

  // 画面サイズに基づいたトンネルの配置を計算
  const CANVAS_WIDTH = canvasSize.width;
  const CANVAS_HEIGHT = canvasSize.height;
  const CENTER_Y = CANVAS_HEIGHT / 2;
  const A = 800;  // トンネル長さ: 800px（固定）
  const START_X_MIN = CANVAS_WIDTH / 2 - 500;
  const START_X_MAX = START_X_MIN + 100;
  const GOAL_X_MIN = START_X_MIN + A;
  const GOAL_X_MAX = GOAL_X_MIN + 100;

  // 画面サイズの変更を監視
  useEffect(() => {
    const handleResize = () => {
      setCanvasSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
  }, [currentConfig, CANVAS_WIDTH, CANVAS_HEIGHT, CENTER_Y, A, START_X_MIN, START_X_MAX, GOAL_X_MIN, GOAL_X_MAX]);

  // 初期描画とcurrentTrialIndex変更時の再描画
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas, currentTrialIndex, canvasSize]);

  // 通路内判定
  const isInsideTunnel = useCallback((x: number, y: number): boolean => {
    const topEdge = CENTER_Y - currentConfig.W / 2;
    const bottomEdge = CENTER_Y + currentConfig.W / 2;
    return x >= START_X_MIN && x <= GOAL_X_MAX && y >= topEdge && y <= bottomEdge;
  }, [CENTER_Y, currentConfig.W, START_X_MIN, GOAL_X_MAX]);

  // スタートエリア判定
  const isInStartArea = useCallback((x: number, y: number): boolean => {
    const topEdge = CENTER_Y - currentConfig.W / 2;
    const bottomEdge = CENTER_Y + currentConfig.W / 2;
    return x >= START_X_MIN && x <= START_X_MAX && y >= topEdge && y <= bottomEdge;
  }, [CENTER_Y, currentConfig.W, START_X_MIN, START_X_MAX]);

  // ゴールエリア判定
  const isInGoalArea = useCallback((x: number, y: number): boolean => {
    const topEdge = CENTER_Y - currentConfig.W / 2;
    const bottomEdge = CENTER_Y + currentConfig.W / 2;
    return x >= GOAL_X_MIN && x <= GOAL_X_MAX && y >= topEdge && y <= bottomEdge;
  }, [CENTER_Y, currentConfig.W, GOAL_X_MIN, GOAL_X_MAX]);

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
  }, [isDrawing, isInsideTunnel]);

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

      setIsDrawing(false);

      // 練習モードの場合
      if (isPractice) {
        // ログは記録しない
        // 練習完了をコールバック
        if (onPracticeComplete) {
          onPracticeComplete();
        }
        drawCanvas();
      } else {
        // 本番モード：ログを記録
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

        // 次のトライアルへ
        const nextTrialIndex = currentTrialIndex + 1;
        if (nextTrialIndex < totalTrials) {
          setCurrentTrialIndex(nextTrialIndex);
          // currentConfigが変更されると、useEffectでdrawCanvas()が自動的に呼び出される
        } else {
          // 全トライアル完了
          onComplete(newTrials);
        }
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
        {isPractice ? (
          <>
            <p style={{ fontWeight: 'bold', color: '#1976d2' }}>練習モード</p>
            <p>練習回数: {practiceRound + 1} / 3</p>
          </>
        ) : (<></>)}
      </div>

      {/* キャンバス */}
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        style={canvasStyle}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />

      {/* 説明 */}
      <div style={instructionStyle}>
        {isPractice ?
        (isDrawing
          ? 'ゴールまでマウスボタンを押したまま進んでください'
          : 'STARTエリアをクリックして開始してください') : (<></>)}
      </div>
    </div>
  );
};

// スタイル定義
const containerWrapperStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  overflow: 'hidden',
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
  position: 'absolute',
  top: 0,
  left: 0,
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
