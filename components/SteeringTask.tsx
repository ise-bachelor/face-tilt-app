import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SteeringTrialLog, SteeringPathSample, ScreenRotation } from '../types';

interface SteeringTaskProps {
  participantId: string;
  condition: string;  // NoTilt / Tilt1 / Tilt2
  screenRotation: ScreenRotation;
  onComplete: (logs: SteeringTrialLog[], pathSamples: SteeringPathSample[]) => void;
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
  condition,
  screenRotation,
  onComplete,
  isPractice = false,
  practiceRound = 0,
  onPracticeComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastPositionRef = useRef<{ x: number; y: number; wasInside: boolean } | null>(null);

  const [trials, setTrials] = useState<SteeringTrialLog[]>([]);
  const [allPathSamples, setAllPathSamples] = useState<SteeringPathSample[]>([]);
  const [currentTrialIndex, setCurrentTrialIndex] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [errorTime, setErrorTime] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [lastErrorCheckTime, setLastErrorCheckTime] = useState(0);

  // 現在のトライアルのパスサンプル
  const currentPathSamplesRef = useRef<SteeringPathSample[]>([]);
  const sampleIndexRef = useRef(0);

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

  // パスサンプルを記録するヘルパー関数
  const recordPathSample = useCallback((x: number, y: number, timestamp: number) => {
    const prevSamples = currentPathSamplesRef.current;
    const prevSample = prevSamples.length > 0 ? prevSamples[prevSamples.length - 1] : null;

    // 中心線からの横方向ズレ（水平トンネルの場合）
    // 正が下方向、負が上方向
    const lateral_deviation_px = y - CENTER_Y;
    const distance_to_centerline_px = Math.abs(lateral_deviation_px);

    // 中心線に沿った位置（スタートからの距離）
    const arc_length_along_centerline_px = Math.max(0, x - START_X_MIN);

    // 直前サンプルからの移動距離
    let delta_path_length_px = 0;
    if (prevSample) {
      const dx = x - prevSample.cursor_x;
      const dy = y - prevSample.cursor_y;
      delta_path_length_px = Math.sqrt(dx * dx + dy * dy);
    }

    // トンネル内判定
    const inside_tunnel = distance_to_centerline_px <= currentConfig.W / 2 &&
      x >= START_X_MIN && x <= GOAL_X_MAX;

    const sample: SteeringPathSample = {
      participant_id: participantId,
      condition,
      block_index: isPractice ? 0 : 1,
      trial_index: currentTrialIndex,
      sample_index: sampleIndexRef.current,
      timestamp_ms: timestamp,
      cursor_x: x,
      cursor_y: y,
      inside_tunnel,
      distance_to_centerline_px,
      lateral_deviation_px,
      arc_length_along_centerline_px,
      delta_path_length_px,
    };

    currentPathSamplesRef.current.push(sample);
    sampleIndexRef.current++;
  }, [participantId, condition, isPractice, currentTrialIndex, CENTER_Y, START_X_MIN, GOAL_X_MAX, currentConfig.W]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // キャンバスのローカル座標を使用（回転に影響されない）
    const x = e.nativeEvent.offsetX;
    const y = e.nativeEvent.offsetY;

    // スタートエリア内でのみ開始
    if (isInStartArea(x, y)) {
      const now = performance.now();
      setIsDrawing(true);
      setStartTime(now);
      setErrorTime(0);
      setErrorCount(0);
      setLastErrorCheckTime(now);
      lastPositionRef.current = { x, y, wasInside: true };
      lastMousePositionRef.current = { offsetX: x, offsetY: y };

      // パスサンプルの初期化と最初のサンプル記録
      currentPathSamplesRef.current = [];
      sampleIndexRef.current = 0;
      recordPathSample(x, y, now);

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

    // パスサンプルを記録
    recordPathSample(x, y, performance.now());

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

    // 最後のサンプルを記録
    recordPathSample(x, y, endTime);

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
        // 本番モード：パスサンプルから統計値を計算
        const samples = currentPathSamplesRef.current;

        // 経路長の計算
        const path_length_px = samples.reduce((sum, s) => sum + s.delta_path_length_px, 0);

        // 平均速度
        const mean_speed_px_per_s = path_length_px / (MT / 1000);

        // 経路効率
        const path_efficiency = A / path_length_px;

        // 横方向ズレの統計
        const absDeviations = samples.map(s => Math.abs(s.lateral_deviation_px));
        const mean_abs_lateral_deviation_px = absDeviations.length > 0
          ? absDeviations.reduce((sum, d) => sum + d, 0) / absDeviations.length
          : 0;
        const max_abs_lateral_deviation_px = absDeviations.length > 0
          ? Math.max(...absDeviations)
          : 0;

        // ログを記録
        const log: SteeringTrialLog = {
          participant_id: participantId,
          condition,
          block_index: 1,  // 本番は1
          trial_index: currentTrialIndex,
          course_id: currentConfig.widthCondition,
          steering_length_px: A,
          steering_width_px: currentConfig.W,
          steering_id_L_over_W: A / currentConfig.W,
          trial_start_time_ms: startTime,
          trial_end_time_ms: endTime,
          movement_time_ms: MT,
          success,
          collision_count: errorCount,
          collision_time_ms_total: errorTime,
          path_length_px,
          mean_speed_px_per_s,
          path_efficiency,
          mean_abs_lateral_deviation_px,
          max_abs_lateral_deviation_px,
          tilt_mode: condition,
          screen_roll_deg: screenRotation.roll,
          screen_pitch_deg: screenRotation.pitch,
          screen_yaw_deg: screenRotation.yaw,
        };

        const newTrials = [...trials, log];
        setTrials(newTrials);

        // パスサンプルを全体に追加
        const newAllSamples = [...allPathSamples, ...samples];
        setAllPathSamples(newAllSamples);

        // 次のトライアルへ
        const nextTrialIndex = currentTrialIndex + 1;
        if (nextTrialIndex < totalTrials) {
          setCurrentTrialIndex(nextTrialIndex);
          // currentConfigが変更されると、useEffectでdrawCanvas()が自動的に呼び出される
        } else {
          // 全トライアル完了
          onComplete(newTrials, newAllSamples);
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
