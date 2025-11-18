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
import { MinutesEditingTask } from '../components/MinutesEditingTask';
import { MinutesInputLog, MinutesTypoLog } from '../types';

const MinutesTaskPage = () => {
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

  const [isTaskStarted, setIsTaskStarted] = useState(false);
  const [inputLogs, setInputLogs] = useState<MinutesInputLog[]>([]);
  const [typoLogs, setTypoLogs] = useState<MinutesTypoLog[]>([]);

  const { isRecording, cameraBlob, startRecording, stopRecording } = useRecording(stream);
  const { logs, exportLogsAsCSV } = usePostureLog({
    session,
    headPose,
    screenRotation,
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

  const handleCompleteTask = (inputLogs: MinutesInputLog[], typoLogs: MinutesTypoLog[]) => {
    // 録画停止
    stopRecording();

    setIsTaskStarted(false);
    setInputLogs(inputLogs);
    setTypoLogs(typoLogs);

    // データダウンロード
    setTimeout(() => {
      downloadData(inputLogs, typoLogs);
    }, 1000);
  };

  const downloadData = (inputLogs: MinutesInputLog[], typoLogs: MinutesTypoLog[]) => {
    if (!session) return;

    const baseFilename = `P${session.participant_id}_${session.condition}_Task1`;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

    // 姿勢ログ（CSV）
    const postureCSV = exportLogsAsCSV();
    if (postureCSV) {
      downloadCSV(postureCSV, `${baseFilename}_pose.csv`);
    }

    // 欠落文入力ログ（CSV）
    const inputLogCSV = generateInputLogCSV(inputLogs);
    downloadCSV(inputLogCSV, `${baseFilename}_input.csv`);

    // 誤字指摘ログ（CSV）
    const typoLogCSV = generateTypoLogCSV(typoLogs);
    downloadCSV(typoLogCSV, `${baseFilename}_typo.csv`);

    // Webカメラ録画（WebM）
    if (cameraBlob) {
      downloadWebM(cameraBlob, `${baseFilename}_video.webm`);
    }

    // セッション終了してホームに戻る
    alert('データのダウンロードが完了しました。');
    endSession();
    router.push('/');
  };

  const generateInputLogCSV = (logs: MinutesInputLog[]): string => {
    const headers = [
      'sentenceId',
      'T_highlight_pressed',
      'T_typing_start',
      'T_typing_end',
      'search_time',
      'input_time',
      'need_fix',
      'fix_count'
    ].join(',');

    const rows = logs.map(log => [
      log.sentenceId,
      log.T_highlight_pressed,
      log.T_typing_start,
      log.T_typing_end,
      log.search_time,
      log.input_time,
      log.need_fix,
      log.fix_count
    ].join(','));

    return [headers, ...rows].join('\n');
  };

  const generateTypoLogCSV = (logs: MinutesTypoLog[]): string => {
    const headers = ['timestamp', 'error_id', 'corrected'].join(',');

    const rows = logs.map(log => [
      log.timestamp,
      log.error_id,
      log.corrected
    ].join(','));

    return [headers, ...rows].join('\n');
  };

  const containerStyle = getContainerStyle(rotation);

  if (!session) {
    return <div>読み込み中...</div>;
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
          title="議事録編集タスク"
          description={
            <>
              画面左側のお手本と同じになるように、右側の議事録を編集してください。
              <br />
              ・「次の文をハイライト」ボタンで、入力すべき文が黄色でハイライト表示されます
              <br />
              ・右側の欠落箇所をクリックして、左側と同じ文を入力してください
              <br />
              ・「入力確認」ボタンで、入力の正誤判定を行います
              <br />
              ・正解ならお手本が緑色でハイライトされます
              <br />
              ・不正解なら内容を修正してください
              <br />
              ・誤字を見つけたらクリックして修正してください
              <br />
              ・まず練習タスク（1文）を行い、その後本番タスク（8文）を実施します
            </>
          }
          onStart={handleStartTask}
          isModelLoaded={isModelLoaded}
        />
      ) : (
        // タスク画面（回転する）
        <MinutesEditingTask onComplete={handleCompleteTask} />
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

export default MinutesTaskPage;
