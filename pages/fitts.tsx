import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useCamera } from '../contexts/CameraContext';
import { useExperiment } from '../contexts/ExperimentContext';
import { useFaceDetector } from '../contexts/FaceDetectorContext';
import { useFaceTracking } from '../hooks/useFaceTracking';
import { usePostureLog } from '../hooks/usePostureLog';
import { useRecording } from '../hooks/useRecording';
import { getContainerStyle } from '../styles';
import { downloadCSV, downloadWebM } from '../utils/downloadUtils';
import { FittsTrialLog, FITTS_DIFFICULTY_ORDERS } from '../types';
import { TaskInstructionScreen } from '../components/TaskInstructionScreen';
import { PostTaskQuestionnaires } from '../components/PostTaskQuestionnaires';

// 難易度レベルの定義
interface DifficultyLevel {
  id: 'low' | 'mid' | 'high';
  label: string;
  R: number; // Radius
  W: number; // Target Width
}

const ALL_DIFFICULTY_LEVELS: Record<'low' | 'mid' | 'high', DifficultyLevel> = {
  low: { id: 'low', label: '低難易度', R: 150, W: 80 },
  mid: { id: 'mid', label: '中難易度', R: 300, W: 40 },
  high: { id: 'high', label: '高難易度', R: 450, W: 20 },
};

// 練習用の難易度レベル（本番とは異なるパラメータで学習効果を避ける）
const PRACTICE_LEVEL: DifficultyLevel = {
  id: 'mid', // IDは便宜上mid
  label: '練習',
  R: 225, // 本番にない半径
  W: 60,  // 本番にないターゲットサイズ
};

// 難易度レベルを順序に基づいて取得
const getDifficultyLevels = (order: ('low' | 'mid' | 'high')[]): DifficultyLevel[] => {
  return order.map(id => ALL_DIFFICULTY_LEVELS[id]);
};

// ターゲット数（円周上）
const NUM_TARGETS = 13;

// 各レベルの試行数（13個 × 往復2回）
const TRIALS_PER_LEVEL = 26;

// CUD準拠の配色
const ACTIVE_COLOR = '#FFF100'; // RGB(255,241,0) - アクティブターゲット
const INACTIVE_COLOR = '#C8C8CB'; // RGB(200,200,203) - 非アクティブターゲット

const FittsTaskPage = () => {
  const router = useRouter();
  const { stream } = useCamera();
  const { session, endSession } = useExperiment();
  const videoRef = useRef<HTMLVideoElement>(null);

  const { detector, isModelLoaded } = useFaceDetector();
  const { rotation, headPose, headTranslation, screenRotation, latency, handleStart } = useFaceTracking({
    videoRef,
    detector,
    isModelLoaded,
    condition: session?.condition,
  });

  // タスク状態管理
  const [isTaskStarted, setIsTaskStarted] = useState(false);
  const [isTaskCompleted, setIsTaskCompleted] = useState(false);
  const [isShowingQuestionnaire, setIsShowingQuestionnaire] = useState(false);
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [currentTrialInLevel, setCurrentTrialInLevel] = useState(0);
  const [currentTargetIndex, setCurrentTargetIndex] = useState<number | null>(null);
  const [trialStartTime, setTrialStartTime] = useState(0);
  const [trialLogs, setTrialLogs] = useState<FittsTrialLog[]>([]);

  // 練習モード管理
  const [isPractice, setIsPractice] = useState(true);
  const [practiceRound, setPracticeRound] = useState(0);
  const [showPracticeCompleteButton, setShowPracticeCompleteButton] = useState(false);
  const PRACTICE_ROUNDS = 5;

  const { isRecording, cameraBlob, startRecording, stopRecording } = useRecording(stream);
  const { logs, exportLogsAsCSV } = usePostureLog({
    session,
    headPose,
    headTranslation,
    screenRotation,
    latency,
    isRecording,
  });

  // セッションの設定に基づいて難易度レベルを取得（グループ × 条件）
  const group = session?.fittsDifficultyOrder || 'G1';
  const condition = session?.condition || 'default';
  const DIFFICULTY_LEVELS = getDifficultyLevels(FITTS_DIFFICULTY_ORDERS[group][condition]);

  // 練習モード時はPRACTICE_LEVEL、本番時はDIFFICULTY_LEVELSを使用
  const currentLevel = isPractice ? PRACTICE_LEVEL : DIFFICULTY_LEVELS[currentLevelIndex];
  const totalTrials = currentLevelIndex * TRIALS_PER_LEVEL + currentTrialInLevel;

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

  // 初期ターゲットをランダムに選択
  const initializeFirstTarget = () => {
    const randomIndex = Math.floor(Math.random() * NUM_TARGETS);
    setCurrentTargetIndex(randomIndex);
    setTrialStartTime(Date.now() / 1000); // 秒単位で保存
  };

  // 対角交互の次のターゲットを計算
  const getNextTargetIndex = (currentIndex: number): number => {
    return (currentIndex + 6) % NUM_TARGETS;
  };

  // タスク開始
  const handleStartTask = async () => {
    try {
      await startRecording();
      handleStart();
      setIsTaskStarted(true);
      initializeFirstTarget();
    } catch (error) {
      console.error('タスク開始エラー:', error);
      alert('録画の開始に失敗しました。');
    }
  };

  // クリック位置からターゲット中心までの距離を計算
  const calculateDistanceFromCenter = (clickX: number, clickY: number, targetIndex: number): number => {
    const centerX = typeof window !== 'undefined' ? window.innerWidth / 2 : 400;
    const centerY = typeof window !== 'undefined' ? window.innerHeight / 2 : 300;
    const targetPos = getTargetPosition(targetIndex, centerX, centerY);

    const dx = clickX - targetPos.x;
    const dy = clickY - targetPos.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // ターゲットクリック処理（クリック座標を受け取る）
  const handleTargetClick = (clickedIndex: number, clickX: number, clickY: number, e: React.MouseEvent) => {
    e.stopPropagation(); // 背景クリックイベントへの伝播を防ぐ
    if (!session || currentTargetIndex === null) return;

    const endTime = Date.now() / 1000; // 秒単位に変換
    const startTime = trialStartTime;
    const MT = endTime - startTime;

    // クリック位置からターゲット中心までの距離を計算
    const distanceFromCenter = calculateDistanceFromCenter(clickX, clickY, currentTargetIndex);

    // ターゲット半径（W/2）より距離が大きい場合はターゲット外クリック
    const isOutsideTarget = distanceFromCenter > (currentLevel.W / 2);

    // エラー判定（正しいターゲットをクリックしたか、またはターゲット外をクリックしたか）
    const isError = clickedIndex !== currentTargetIndex || isOutsideTarget;

    // 練習モードでない場合のみログを記録
    if (!isPractice) {
      const log: FittsTrialLog = {
        participantId: session.participant_id,
        tiltCondition: (session.condition === 'rotate1' || session.condition === 'rotate2') ? 'tilt' : 'baseline',
        trialId: totalTrials,
        levelId: currentLevel.id,
        D: currentLevel.R * 2, // 直径 = 半径 × 2
        W: currentLevel.W,
        startTime: Number(startTime.toFixed(4)),
        endTime: Number(endTime.toFixed(4)),
        MT: Number(MT.toFixed(4)),
        targetIndex: currentTargetIndex,
        clickedIndex,
        isError,
        distanceFromCenter: Number(distanceFromCenter.toFixed(4)),
      };

      setTrialLogs(prev => [...prev, log]);
    }

    // 正しいターゲットがクリックされた場合のみ次へ進む
    if (!isError) {
      // 練習モードの場合
      if (isPractice) {
        const nextRound = practiceRound + 1;
        if (nextRound >= PRACTICE_ROUNDS) {
          // 練習完了：ボタンを表示
          setShowPracticeCompleteButton(true);
          setCurrentTargetIndex(null);
        } else {
          // 次の練習ラウンド
          setPracticeRound(nextRound);
          const nextIndex = getNextTargetIndex(currentTargetIndex);
          setCurrentTargetIndex(nextIndex);
          setTrialStartTime(Date.now() / 1000); // 秒単位で保存
        }
      } else {
        // 本番モード
        const newTrialInLevel = currentTrialInLevel + 1;

        // 現在のレベルが終了したか確認
        if (newTrialInLevel >= TRIALS_PER_LEVEL) {
          const nextLevelIndex = currentLevelIndex + 1;

          // 全レベルが終了したか確認
          if (nextLevelIndex >= DIFFICULTY_LEVELS.length) {
            // 全タスク完了
            handleCompleteTask();
            return;
          } else {
            // 次のレベルへ
            setCurrentLevelIndex(nextLevelIndex);
            setCurrentTrialInLevel(0);
            initializeFirstTarget();
          }
        } else {
          // 同じレベルの次のトライアルへ
          setCurrentTrialInLevel(newTrialInLevel);
          const nextIndex = getNextTargetIndex(currentTargetIndex);
          setCurrentTargetIndex(nextIndex);
          setTrialStartTime(Date.now() / 1000); // 秒単位で保存
        }
      }
    }
  };

  // 背景クリック処理（ターゲット以外の場所をクリックした場合）
  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (!session || currentTargetIndex === null) return;

    const clickX = e.clientX;
    const clickY = e.clientY;

    const endTime = Date.now() / 1000; // 秒単位に変換
    const startTime = trialStartTime;
    const MT = endTime - startTime;

    // クリック位置からターゲット中心までの距離を計算
    const distanceFromCenter = calculateDistanceFromCenter(clickX, clickY, currentTargetIndex);

    // 練習モードでない場合のみログを記録
    if (!isPractice) {
      const log: FittsTrialLog = {
        participantId: session.participant_id,
        tiltCondition: (session.condition === 'rotate1' || session.condition === 'rotate2') ? 'tilt' : 'baseline',
        trialId: totalTrials,
        levelId: currentLevel.id,
        D: currentLevel.R * 2, // 直径 = 半径 × 2
        W: currentLevel.W,
        startTime: Number(startTime.toFixed(4)),
        endTime: Number(endTime.toFixed(4)),
        MT: Number(MT.toFixed(4)),
        targetIndex: currentTargetIndex,
        clickedIndex: -1, // 背景クリックは-1として記録
        isError: true, // 背景クリックは常にエラー
        distanceFromCenter: Number(distanceFromCenter.toFixed(4)),
      };

      setTrialLogs(prev => [...prev, log]);
    }
  };

  // 練習完了後、本番タスク開始
  const handleStartMainTask = () => {
    setIsPractice(false);
    setShowPracticeCompleteButton(false);
    setPracticeRound(0);
    setCurrentLevelIndex(0);
    setCurrentTrialInLevel(0);
    initializeFirstTarget();
  };

  // タスク完了処理
  const handleCompleteTask = () => {
    stopRecording();
    setIsTaskStarted(false);
    setIsTaskCompleted(true);
  };

  // 完了画面に遷移したら自動でデータダウンロード（cameraBlobの準備を待つ）
  useEffect(() => {
    if (isTaskCompleted && cameraBlob) {
      const timer = setTimeout(() => {
        downloadData();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isTaskCompleted, cameraBlob]);

  // データダウンロード
  const downloadData = () => {
    if (!session) return;

    const baseFilename = `${session.participant_id}_fitts_${session.condition}`;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

    // Fitts トライアルログ（CSV）
    const fittsCSV = exportFittsLogsAsCSV();
    if (fittsCSV) {
      downloadCSV(fittsCSV, `${baseFilename}_trials_${timestamp}.csv`);
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
  };

  // アンケートへ進む
  const handleProceedToQuestionnaire = () => {
    setIsTaskCompleted(false);
    setIsShowingQuestionnaire(true);
  };

  // アンケート完了後の処理
  const handleQuestionnaireFinished = () => {
    endSession();
    router.push('/');
  };

  // Fitts ログを CSV に変換
  const exportFittsLogsAsCSV = (): string => {
    if (trialLogs.length === 0) return '';

    const headers = [
      'participantId',
      'tiltCondition',
      'trialId',
      'levelId',
      'D',
      'W',
      'startTime',
      'endTime',
      'MT',
      'targetIndex',
      'clickedIndex',
      'isError',
      'distanceFromCenter',
    ];

    const rows = trialLogs.map(log =>
      [
        log.participantId,
        log.tiltCondition,
        log.trialId,
        log.levelId,
        log.D,
        log.W,
        log.startTime,
        log.endTime,
        log.MT,
        log.targetIndex,
        log.clickedIndex,
        log.isError,
        log.distanceFromCenter,
      ].join(',')
    );

    return [headers.join(','), ...rows].join('\n');
  };

  // ターゲット座標を計算（円周上）
  const getTargetPosition = (index: number, centerX: number, centerY: number) => {
    const angle = (2 * Math.PI * index) / NUM_TARGETS;
    const x = centerX + currentLevel.R * Math.cos(angle);
    const y = centerY + currentLevel.R * Math.sin(angle);
    return { x, y };
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

  // アンケート画面
  if (isShowingQuestionnaire) {
    return (
      <PostTaskQuestionnaires
        participantId={session.participant_id}
        condition={session.condition}
        taskName="Fitts"
        onFinished={handleQuestionnaireFinished}
      />
    );
  }

  // タスク完了画面
  if (isTaskCompleted) {
    return (
      <div style={pageStyle}>
        <div style={completionContainerStyle}>
          <h1 style={titleStyle}>タスク完了</h1>
          <p style={descriptionStyle}>
            全 {DIFFICULTY_LEVELS.length * TRIALS_PER_LEVEL} 試行が完了しました。
            <br />
            データは自動でダウンロードされています。
          </p>
          <button onClick={handleProceedToQuestionnaire} style={questionnaireButtonStyle}>
            アンケートへ進む
          </button>
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
        <TaskInstructionScreen
          title="ポインティングタスク"
          description={<>
            黄色にハイライトされているターゲットを次々クリックしてください。
            <br />
            ・できるだけ速く、正確にクリックすることを心がけてください
          </>}
          onStart={handleStartTask}
          isModelLoaded={isModelLoaded}
        />
      ) : (
        // タスク画面（回転する）
        <div style={contentContainerStyle}>
          {/* 情報表示 */}
          <div style={infoContainerStyle}>
            {isPractice ? (
              <>
                <p style={{ fontWeight: 'bold', color: '#1976d2' }}>練習モード</p>
                <p>
                  練習回数: {practiceRound + 1} / {PRACTICE_ROUNDS}
                </p>
              </>
            ) : (<></>)}
          </div>

          {/* ターゲット表示エリア */}
          <div style={targetAreaStyle} onClick={handleBackgroundClick}>
            {Array.from({ length: NUM_TARGETS }).map((_, index) => {
              const centerX = typeof window !== 'undefined' ? window.innerWidth / 2 : 400;
              const centerY = typeof window !== 'undefined' ? window.innerHeight / 2 : 300;
              const pos = getTargetPosition(index, centerX, centerY);
              const isActive = index === currentTargetIndex;

              return (
                <div
                  key={index}
                  onClick={(e) => handleTargetClick(index, e.clientX, e.clientY, e)}
                  style={{
                    ...targetStyle,
                    left: pos.x - currentLevel.W / 2,
                    top: pos.y - currentLevel.W / 2,
                    width: currentLevel.W,
                    height: currentLevel.W,
                    backgroundColor: isActive ? ACTIVE_COLOR : INACTIVE_COLOR,
                    cursor: 'pointer',
                  }}
                />
              );
            })}

            {/* 練習完了後のタスク開始ボタン（ターゲットの中心に配置） */}
            {showPracticeCompleteButton && (
              <div
                style={{
                  position: 'absolute',
                  left: typeof window !== 'undefined' ? window.innerWidth / 2 - 100 : 300,
                  top: typeof window !== 'undefined' ? window.innerHeight / 2 - 30 : 270,
                  width: 200,
                  textAlign: 'center',
                }}
              >
                <button onClick={handleStartMainTask} style={practiceCompleteButtonStyle}>
                  本番タスク開始
                </button>
              </div>
            )}
          </div>
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

const contentContainerStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  backgroundColor: 'white',
  overflow: 'hidden',
};

const startContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  padding: '40px',
};

const completionContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100vh',
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
  marginBottom: '20px',
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

const questionnaireButtonStyle: React.CSSProperties = {
  padding: '16px 32px',
  fontSize: '18px',
  fontWeight: 'bold',
  color: 'white',
  backgroundColor: '#4caf50',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  marginTop: '20px',
};

const infoContainerStyle: React.CSSProperties = {
  position: 'absolute',
  top: '20px',
  left: '20px',
  fontSize: '14px',
  color: '#333',
  lineHeight: '1.6',
  backgroundColor: 'rgba(255, 255, 255, 0.9)',
  padding: '10px',
  borderRadius: '8px',
};

const targetAreaStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  height: '100%',
};

const targetStyle: React.CSSProperties = {
  position: 'absolute',
  borderRadius: '50%',
  transition: 'background-color 0.1s',
};

const practiceCompleteButtonStyle: React.CSSProperties = {
  padding: '16px 32px',
  fontSize: '18px',
  fontWeight: 'bold',
  color: 'white',
  backgroundColor: '#4caf50',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.2)',
};

export default FittsTaskPage;
