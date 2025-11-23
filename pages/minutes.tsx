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
import { TaskInstructionScreen } from '../components/TaskInstructionScreen';
import { TypingTask } from '../components/TypingTask';
import { TypingResultLog, TYPING_MAPPINGS } from '../types';
import { getPassageById } from '../data/typingPassages';
import { PostTaskQuestionnaires } from '../components/PostTaskQuestionnaires';

const TypingTaskPage = () => {
  const router = useRouter();
  const { stream } = useCamera();
  const { session, endSession } = useExperiment();
  const videoRef = useRef<HTMLVideoElement>(null);

  const { detector, isModelLoaded } = useFaceDetector(true);
  const { rotation, headPose, headTranslation, screenRotation, handleStart } = useFaceTracking({
    videoRef,
    detector,
    isModelLoaded,
    condition: session?.condition,
  });

  const [isTaskStarted, setIsTaskStarted] = useState(false);
  const [isTaskCompleted, setIsTaskCompleted] = useState(false);
  const [isShowingQuestionnaire, setIsShowingQuestionnaire] = useState(false);
  const [typingResult, setTypingResult] = useState<TypingResultLog | null>(null);

  const { isRecording, cameraBlob, startRecording, stopRecording } = useRecording(stream);
  const { logs, exportLogsAsCSV } = usePostureLog({
    session,
    headPose,
    headTranslation,
    screenRotation,
    isRecording,
  });

  // マッピングに基づいて課題文を取得
  const passage = (() => {
    if (!session) return null;
    const mapping = session.typingMapping || 'T1';
    const passageId = TYPING_MAPPINGS[mapping][session.condition];
    return getPassageById(passageId) || null;
  })();

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

  const handleCompleteTask = (result: TypingResultLog) => {
    // 録画停止
    stopRecording();

    setIsTaskStarted(false);
    setTypingResult(result);
    setIsTaskCompleted(true);
  };

  // 完了画面に遷移したら自動でデータダウンロード（cameraBlobの準備を待つ）
  useEffect(() => {
    if (isTaskCompleted && typingResult && cameraBlob) {
      const timer = setTimeout(() => {
        downloadData(typingResult);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isTaskCompleted, typingResult, cameraBlob]);

  const downloadData = (result: TypingResultLog) => {
    if (!session) return;

    const baseFilename = `P${session.participant_id}_${session.condition}_Task1`;

    // 姿勢ログ（CSV）
    const postureCSV = exportLogsAsCSV();
    if (postureCSV) {
      downloadCSV(postureCSV, `${baseFilename}_pose.csv`);
    }

    // タイピング結果ログ（CSV）
    const typingResultCSV = generateTypingResultCSV(result);
    downloadCSV(typingResultCSV, `${baseFilename}_typing_result.csv`);

    // キー入力ログ（CSV）
    const keyLogCSV = generateKeyLogCSV(result);
    downloadCSV(keyLogCSV, `${baseFilename}_key_log.csv`);

    // Webカメラ録画（WebM）
    if (cameraBlob) {
      downloadWebM(cameraBlob, `${baseFilename}_video.webm`);
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

  const generateTypingResultCSV = (result: TypingResultLog): string => {
    const headers = [
      'participant_id',
      'condition',
      'passage_id',
      'final_text',
      'final_time_ms'
    ].join(',');

    // テキスト内のカンマと改行をエスケープ
    const escapedText = `"${result.final_text.replace(/"/g, '""')}"`;

    const row = [
      result.participant_id,
      result.condition,
      result.passage_id,
      escapedText,
      result.final_time_ms
    ].join(',');

    return [headers, row].join('\n');
  };

  const generateKeyLogCSV = (result: TypingResultLog): string => {
    const headers = [
      'participant_id',
      'condition',
      'passage_id',
      'key',
      'timestamp_ms',
      'is_backspace'
    ].join(',');

    const rows = result.key_logs.map(log => {
      // キー名内のカンマをエスケープ
      const escapedKey = log.key.includes(',') ? `"${log.key}"` : log.key;
      return [
        result.participant_id,
        result.condition,
        result.passage_id,
        escapedKey,
        log.timestamp_ms,
        log.is_backspace
      ].join(',');
    });

    return [headers, ...rows].join('\n');
  };

  const containerStyle = getContainerStyle(rotation);

  if (!session || !passage) {
    return <div>読み込み中...</div>;
  }

  // タスク完了画面
  if (isTaskCompleted) {
    return (
      <div style={pageStyle}>
        <div style={completionContainerStyle}>
          <h1 style={titleStyle}>タスク完了</h1>
          <p style={descriptionStyle}>
            タイピングタスクが完了しました。
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

  // アンケート画面
  if (isShowingQuestionnaire) {
    return (
      <PostTaskQuestionnaires
        participantId={session.participant_id}
        condition={session.condition}
        taskName="Typing"
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
          title="タイピングタスク"
          description={
            <>
              左画面に表示される課題文を見ながら、
              <br />
              右画面のテキストエリアに同じ文章を入力してください。
              <br />
              <br />
              ・課題文はコピー＆ペーストできません
              <br />
              ・できるだけ早く正確に入力することを心がけてください
              <br />
              ・入力が完了したら「完了」ボタンを押してください
            </>
          }
          onStart={handleStartTask}
          isModelLoaded={isModelLoaded}
        />
      ) : (
        // タスク画面（回転する）
        <TypingTask
          passage={passage}
          participantId={session.participant_id}
          condition={session.condition}
          onComplete={handleCompleteTask}
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

export default TypingTaskPage;
