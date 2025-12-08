import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useCamera } from '../contexts/CameraContext';
import { useFaceDetector } from '../contexts/FaceDetectorContext';
import { useFaceTracking } from '../hooks/useFaceTracking';
import { usePostureLog } from '../hooks/usePostureLog';
import { useRecording } from '../hooks/useRecording';
import { getContainerStyle } from '../styles';
import { downloadCSV, downloadWebM } from '../utils/downloadUtils';
import { TaskInstructionScreen } from '../components/TaskInstructionScreen';
import { EmailTask } from '../components/EmailTask';
import { PostTaskQuestionnaires } from '../components/PostTaskQuestionnaires';
import { getManual, getScenarios } from '../data/emailData';
import {
  EmailSessionLog,
  ExperimentCondition,
  Experiment2Condition,
  ManualType,
} from '../types';

const Experiment2Page = () => {
  const router = useRouter();
  const { condition, manual, participantId } = router.query;
  const { stream } = useCamera();
  const videoRef = useRef<HTMLVideoElement>(null);

  const { detector, isModelLoaded } = useFaceDetector();

  // 実験2の条件をExperimentConditionに変換（rotate1を使用）
  const experiment1Condition: ExperimentCondition =
    condition === 'rotate' ? 'rotate1' : 'default';

  const { rotation, headPose, headTranslation, screenRotation, latency, handleStart, nonCoupledRotationDirection, nonCoupledRotationState } = useFaceTracking({
    videoRef,
    detector,
    isModelLoaded,
    condition: experiment1Condition,
    enableNonCoupledRotation: condition === 'rotate', // rotate条件の場合のみ非連動型回転を有効化
  });

  const [isTaskStarted, setIsTaskStarted] = useState(false);
  const [isTaskCompleted, setIsTaskCompleted] = useState(false);
  const [isShowingQuestionnaire, setIsShowingQuestionnaire] = useState(false);
  const [sessionLog, setSessionLog] = useState<EmailSessionLog | null>(null);

  const { isRecording, cameraBlob, startRecording, stopRecording } = useRecording(stream);

  // 姿勢ログのセッション情報を構築
  // 注: sessionはisRecordingの状態に同期させる必要がある
  // isRecordingがtrueの場合のみログを記録するため
  const postureLogSession = isRecording ? {
    participant_id: (participantId as string) || 'unknown',
    condition: experiment1Condition,
    task_name: 'experiment2' as const,
    start_time: Date.now(),
  } : null;

  const { logs, exportLogsAsCSV } = usePostureLog({
    session: postureLogSession,
    headPose,
    headTranslation,
    screenRotation,
    latency,
    isRecording,
    nonCoupledRotationDirection,
    nonCoupledRotationState,
  });

  // パラメータチェック
  useEffect(() => {
    if (!condition || !manual || !participantId) {
      alert('実験条件、マニュアル、参加者IDを指定してください');
      router.push('/');
    }
  }, [condition, manual, participantId, router]);

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

  const handleStartTask = async () => {
    try {
      // 録画開始
      await startRecording();

      // 顔追跡開始（基準姿勢を設定）
      handleStart();

      setIsTaskStarted(true);
    } catch (error) {
      console.error('タスク開始エラー:', error);
      alert('録画の開始に失敗しました。');
    }
  };

  const handleCompleteTask = (log: EmailSessionLog) => {
    // 録画停止
    stopRecording();

    setIsTaskStarted(false);
    setSessionLog(log);
    setIsTaskCompleted(true);
  };

  // 完了画面に遷移したら自動でデータダウンロード（cameraBlobの準備を待つ）
  useEffect(() => {
    if (isTaskCompleted && sessionLog && cameraBlob) {
      const timer = setTimeout(() => {
        downloadData(sessionLog);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isTaskCompleted, sessionLog, cameraBlob]);

  const downloadData = async (log: EmailSessionLog) => {
    const baseFilename = `P${log.participant_id}_${log.condition}_Experiment2`;

    // 姿勢ログ（CSV）
    const postureCSV = exportLogsAsCSV();
    if (postureCSV) {
      downloadCSV(postureCSV, `${baseFilename}_pose.csv`);
      await new Promise(resolve => setTimeout(resolve, 300));
    } else {
      console.warn('Posture logs are empty');
    }

    // セッションログ（CSV）
    const sessionCSV = generateSessionLogCSV(log);
    downloadCSV(sessionCSV, `${baseFilename}_session.csv`);
    await new Promise(resolve => setTimeout(resolve, 300));

    // シナリオログ（CSV）
    const scenarioCSV = generateScenarioLogsCSV(log);
    downloadCSV(scenarioCSV, `${baseFilename}_scenarios.csv`);
    await new Promise(resolve => setTimeout(resolve, 300));

    // キー入力ログ（CSV）
    const keyLogCSV = generateKeyLogsCSV(log);
    downloadCSV(keyLogCSV, `${baseFilename}_key_log.csv`);
    await new Promise(resolve => setTimeout(resolve, 300));

    // Webカメラ録画（WebM）
    if (cameraBlob) {
      downloadWebM(cameraBlob, `${baseFilename}_video.webm`);
    } else {
      console.warn('Camera recording is not available');
    }
  };

  // セッションログCSV生成
  const generateSessionLogCSV = (log: EmailSessionLog): string => {
    const headers = [
      'participant_id',
      'condition',
      'manual_id',
      'task_start_time',
      'task_end_time',
      'end_reason',
      'scenarios_completed'
    ].join(',');

    const row = [
      log.participant_id,
      log.condition,
      log.manual_id,
      log.task_start_time,
      log.task_end_time,
      log.end_reason,
      log.scenarios_completed
    ].join(',');

    return [headers, row].join('\n');
  };

  // シナリオログCSV生成
  const generateScenarioLogsCSV = (log: EmailSessionLog): string => {
    const headers = [
      'participant_id',
      'condition',
      'manual_id',
      'scenario_id',
      'scenario_order_index',
      'reply_start_time',
      'reply_send_time',
      'reply_duration_ms',
      'reply_body_text',
      'reply_body_length_chars',
      'is_empty_body',
      'keypress_count_total',
      'backspace_count',
      'delete_count',
      'paste_count'
    ].join(',');

    const rows = log.scenario_logs.map(scenario => {
      const escapedText = `"${scenario.reply_body_text.replace(/"/g, '""')}"`;
      return [
        scenario.participant_id,
        scenario.condition,
        scenario.manual_id,
        scenario.scenario_id,
        scenario.scenario_order_index,
        scenario.reply_start_time,
        scenario.reply_send_time,
        scenario.reply_duration_ms,
        escapedText,
        scenario.reply_body_length_chars,
        scenario.is_empty_body,
        scenario.keypress_count_total,
        scenario.backspace_count,
        scenario.delete_count,
        scenario.paste_count
      ].join(',');
    });

    return [headers, ...rows].join('\n');
  };

  // キー入力ログCSV生成
  const generateKeyLogsCSV = (log: EmailSessionLog): string => {
    const headers = [
      'participant_id',
      'condition',
      'manual_id',
      'scenario_id',
      'scenario_order_index',
      'key',
      'timestamp_ms',
      'is_backspace',
      'is_delete',
      'is_paste'
    ].join(',');

    const rows: string[] = [];
    log.scenario_logs.forEach(scenario => {
      scenario.key_logs.forEach(keyLog => {
        const escapedKey = keyLog.key.includes(',') ? `"${keyLog.key}"` : keyLog.key;
        rows.push([
          scenario.participant_id,
          scenario.condition,
          scenario.manual_id,
          scenario.scenario_id,
          scenario.scenario_order_index,
          escapedKey,
          keyLog.timestamp_ms,
          keyLog.is_backspace,
          keyLog.is_delete,
          keyLog.is_paste
        ].join(','));
      });
    });

    return [headers, ...rows].join('\n');
  };

  // アンケートへ進む
  const handleProceedToQuestionnaire = () => {
    setIsTaskCompleted(false);
    setIsShowingQuestionnaire(true);
  };

  // アンケート完了後の処理
  const handleQuestionnaireFinished = () => {
    router.push('/');
  };

  const containerStyle = getContainerStyle(rotation);

  if (!condition || !manual || !participantId) {
    return <div>読み込み中...</div>;
  }

  const experiment2Condition = condition as Experiment2Condition;
  const manualType = manual as ManualType;
  const participantIdStr = participantId as string;
  const manualData = getManual(manualType);
  const scenarios = getScenarios(manualType);
  const isDebugMode = participantIdStr === '999'; // デバッグモードの判定
  const isPracticeMode = manualType === 'P'; // 練習モードの判定

  // 練習終了ハンドラ
  const handlePracticeEnd = () => {
    // 録画停止
    stopRecording();
    // ホームページに戻る
    router.push('/');
  };

  // タスク完了画面
  if (isTaskCompleted && sessionLog) {
    return (
      <div style={pageStyle}>
        <div style={completionContainerStyle}>
          <h1 style={titleStyle}>タスク完了</h1>
          <p style={descriptionStyle}>
            メール作成タスクが完了しました。
            <br />
            データは自動でダウンロードされています。
            <br />
            <br />
            完了したメール数: {sessionLog.scenarios_completed}
            <br />
            終了理由: {sessionLog.end_reason === 'time_up' ? '時間切れ' : '空送信3回'}
          </p>
          <button onClick={handleProceedToQuestionnaire} style={questionnaireButtonStyle}>
            アンケートへ進む
          </button>
        </div>
      </div>
    );
  }

  // アンケート画面
  if (isShowingQuestionnaire && sessionLog) {
    return (
      <PostTaskQuestionnaires
        participantId={sessionLog.participant_id}
        condition={experiment1Condition}
        taskName="Experiment2"
        onFinished={handleQuestionnaireFinished}
      />
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
          title="メール作成タスク"
          description={
            <>
              カスタマーサポート担当者として、顧客からのメールに返信してください。
              <br />
              <ul>
                <li>左画面: 業務マニュアル（タブで切り替え可能）</li>
                <li>右画面上部: 顧客からのメール</li>
                <li>右画面下部: 返信メール作成エリア</li>
              </ul>
              <ul>
                <li>30分の制限時間内にできるだけ多くのメールに返信してください</li>
                <li>実際のお客様に返信することを意識して、丁寧かつ親切な内容になることを心がけてください</li>
                <li>マニュアルだけでは確定できないメールについては、回答できる部分にのみ回答し、わからない箇所は「確認に時間がかかる」や「この情報を教えてほしい」といった返信をしてください</li>
                <li>挨拶文は自動で入力されます（回答部分のみ記入）</li>
                <li>「送信する」ボタンを押すと次のメールに進みます</li>
                <li><span style={{ fontWeight: 'bold', color: '#333' }}>基本姿勢でタスク開始ボタンを押してください</span></li>
              </ul>
            </>
          }
          onStart={handleStartTask}
          isModelLoaded={isModelLoaded}
        />
      ) : (
        // タスク画面（回転する）
        <EmailTask
          manual={manualData}
          scenarios={scenarios}
          participantId={participantIdStr}
          condition={experiment2Condition}
          manualId={manualType}
          isDebugMode={isDebugMode}
          isPracticeMode={isPracticeMode}
          onComplete={handleCompleteTask}
          onPracticeEnd={handlePracticeEnd}
        />
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

export default Experiment2Page;
