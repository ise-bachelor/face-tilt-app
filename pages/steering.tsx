import React, { useRef, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useCamera } from '../contexts/CameraContext';
import { useExperiment } from '../contexts/ExperimentContext';
import { useFaceDetector } from '../contexts/FaceDetectorContext';
import { useFaceTracking } from '../hooks/useFaceTracking';
import { usePostureLog } from '../hooks/usePostureLog';
import { useRecording } from '../hooks/useRecording';
import { getContainerStyle } from '../styles';
import { downloadCSV, downloadWebM } from '../utils/downloadUtils';
import { SteeringTrialLog, SteeringPathSample } from '../types';
import { SteeringTask } from '../components/SteeringTask';

// 条件名を変換
const getConditionString = (condition: string): string => {
  switch (condition) {
    case 'default': return 'NoTilt';
    case 'rotate1': return 'Tilt1';
    case 'rotate2': return 'Tilt2';
    default: return condition;
  }
};
import { TaskInstructionScreen } from '../components/TaskInstructionScreen';
import { PostTaskQuestionnaires } from '../components/PostTaskQuestionnaires';

const TOTAL_TRIALS = 30; // 3条件 × 10試行

const SteeringTaskPage = () => {
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

  const [isTaskStarted, setIsTaskStarted] = useState(false);
  const [isTaskCompleted, setIsTaskCompleted] = useState(false);
  const [isShowingQuestionnaire, setIsShowingQuestionnaire] = useState(false);
  const [steeringLogs, setSteeringLogs] = useState<SteeringTrialLog[]>([]);
  const [pathSamples, setPathSamples] = useState<SteeringPathSample[]>([]);

  // 練習モード管理
  const [isPractice, setIsPractice] = useState(true);
  const [practiceRound, setPracticeRound] = useState(0);
  const [showPracticeCompleteButton, setShowPracticeCompleteButton] = useState(false);
  const PRACTICE_ROUNDS = 3;

  const { isRecording, cameraBlob, startRecording, stopRecording } = useRecording(stream);
  const { logs, exportLogsAsCSV } = usePostureLog({
    session,
    headPose,
    headTranslation,
    screenRotation,
    latency,
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

  // 練習完了時の処理
  const handlePracticeComplete = () => {
    const nextRound = practiceRound + 1;
    if (nextRound >= PRACTICE_ROUNDS) {
      // 3回完了したら練習完了ボタンを表示
      setShowPracticeCompleteButton(true);
    } else {
      // 次の練習ラウンドへ
      setPracticeRound(nextRound);
    }
  };

  // 練習完了後、本番タスク開始
  const handleStartMainTask = () => {
    setIsPractice(false);
    setShowPracticeCompleteButton(false);
    setPracticeRound(0);
  };

  // タスク完了
  const handleComplete = (logs: SteeringTrialLog[], samples: SteeringPathSample[]) => {
    setSteeringLogs(logs);
    setPathSamples(samples);
    stopRecording();
    setIsTaskStarted(false);
    setIsTaskCompleted(true);
  };

  // 完了画面に遷移したら自動でデータダウンロード（cameraBlobの準備を待つ）
  useEffect(() => {
    if (isTaskCompleted && steeringLogs.length > 0 && cameraBlob) {
      const timer = setTimeout(() => {
        downloadData();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isTaskCompleted, steeringLogs, cameraBlob]);

  // データダウンロード
  const downloadData = () => {
    if (!session) return;

    const baseFilename = `${session.participant_id}_steering_${session.condition}`;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

    // Steering トライアルログ（CSV）
    const trialCSV = exportSteeringTrialLogsAsCSV();
    if (trialCSV) {
      downloadCSV(trialCSV, `${baseFilename}_trial_log_${timestamp}.csv`);
    }

    // Steering パスログ（CSV）
    const pathCSV = exportPathSamplesAsCSV();
    if (pathCSV) {
      downloadCSV(pathCSV, `${baseFilename}_path_log_${timestamp}.csv`);
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

  // Steering トライアルログを CSV に変換
  const exportSteeringTrialLogsAsCSV = (): string => {
    if (steeringLogs.length === 0) return '';

    const headers = [
      // 基本情報
      'participant_id',
      'condition',
      'block_index',
      'trial_index',
      'course_id',
      // コース条件
      'steering_length_px',
      'steering_width_px',
      'steering_id_L_over_W',
      // 時間情報
      'trial_start_time_ms',
      'trial_end_time_ms',
      'movement_time_ms',
      // 結果
      'success',
      'collision_count',
      'collision_time_ms_total',
      'path_length_px',
      'mean_speed_px_per_s',
      'path_efficiency',
      'mean_abs_lateral_deviation_px',
      'max_abs_lateral_deviation_px',
      // 傾き
      'screen_roll_deg',
      'screen_pitch_deg',
      'screen_yaw_deg',
    ];

    const rows = steeringLogs.map(log =>
      [
        log.participant_id,
        log.condition,
        log.block_index,
        log.trial_index,
        log.course_id,
        log.steering_length_px.toFixed(2),
        log.steering_width_px.toFixed(2),
        log.steering_id_L_over_W.toFixed(4),
        log.trial_start_time_ms.toFixed(2),
        log.trial_end_time_ms.toFixed(2),
        log.movement_time_ms.toFixed(2),
        log.success,
        log.collision_count,
        log.collision_time_ms_total.toFixed(2),
        log.path_length_px.toFixed(2),
        log.mean_speed_px_per_s.toFixed(4),
        log.path_efficiency.toFixed(4),
        log.mean_abs_lateral_deviation_px.toFixed(4),
        log.max_abs_lateral_deviation_px.toFixed(4),
        log.screen_roll_deg.toFixed(4),
        log.screen_pitch_deg.toFixed(4),
        log.screen_yaw_deg.toFixed(4),
      ].join(',')
    );

    return [headers.join(','), ...rows].join('\n');
  };

  // Steering パスサンプルを CSV に変換
  const exportPathSamplesAsCSV = (): string => {
    if (pathSamples.length === 0) return '';

    const headers = [
      // 基本情報
      'participant_id',
      'condition',
      'block_index',
      'trial_index',
      'sample_index',
      // 時刻・位置
      'timestamp_ms',
      'cursor_x',
      'cursor_y',
      // 通路とズレ
      'inside_tunnel',
      'distance_to_centerline_px',
      'lateral_deviation_px',
      'arc_length_along_centerline_px',
      'delta_path_length_px',
    ];

    const rows = pathSamples.map(sample =>
      [
        sample.participant_id,
        sample.condition,
        sample.block_index,
        sample.trial_index,
        sample.sample_index,
        sample.timestamp_ms.toFixed(2),
        sample.cursor_x.toFixed(2),
        sample.cursor_y.toFixed(2),
        sample.inside_tunnel,
        sample.distance_to_centerline_px.toFixed(4),
        sample.lateral_deviation_px.toFixed(4),
        sample.arc_length_along_centerline_px.toFixed(4),
        sample.delta_path_length_px.toFixed(4),
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

  const conditionString = getConditionString(session.condition);

  // アンケート画面
  if (isShowingQuestionnaire) {
    return (
      <PostTaskQuestionnaires
        participantId={session.participant_id}
        condition={session.condition}
        taskName="Steering"
        onFinished={handleQuestionnaireFinished}
      />
    );
  }

  // タスク完了画面（回転しない）
  if (isTaskCompleted) {
    return (
      <div style={pageStyle}>
        <div style={completionContainerStyle}>
          <h1 style={titleStyle}>タスク完了</h1>
          <p style={descriptionStyle}>
            全 {TOTAL_TRIALS} 試行が完了しました。
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
          title="ドラッグタスク"
          description={
            <>
              トンネル内をマウスドラッグでなぞり、<br /> スタートからゴールまで移動してください。
              <br />
              ・できるだけ速くかつトンネルからはみ出さないように進んでください。
            </>
          }
          onStart={handleStartTask}
          isModelLoaded={isModelLoaded}
        />
      ) : (
        // タスク画面
        <div style={contentContainerStyle}>
          <SteeringTask
            participantId={session.participant_id}
            condition={conditionString}
            screenRotation={screenRotation}
            onComplete={handleComplete}
            isPractice={isPractice}
            practiceRound={practiceRound}
            onPracticeComplete={handlePracticeComplete}
          />

          {/* 練習完了後のタスク開始ボタン */}
          {showPracticeCompleteButton && (
            <div style={practiceCompleteOverlayStyle}>
              <div style={practiceCompleteContainerStyle}>
                <p style={practiceCompleteTextStyle}>練習が完了しました！</p>
                <button onClick={handleStartMainTask} style={practiceCompleteButtonStyle}>
                  本番タスク開始
                </button>
              </div>
            </div>
          )}
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
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  backgroundColor: 'white',
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

const practiceCompleteOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 100,
};

const practiceCompleteContainerStyle: React.CSSProperties = {
  backgroundColor: 'white',
  padding: '40px',
  borderRadius: '12px',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
  textAlign: 'center',
};

const practiceCompleteTextStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 'bold',
  marginBottom: '20px',
  color: '#333',
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

export default SteeringTaskPage;
