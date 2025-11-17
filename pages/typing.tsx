import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useCamera } from '../contexts/CameraContext';
import { useExperiment } from '../contexts/ExperimentContext';
import { useFaceDetector } from '../hooks/useFaceDetector';
import { useFaceTracking } from '../hooks/useFaceTracking';
import { usePostureLog } from '../hooks/usePostureLog';
import { useRecording } from '../hooks/useRecording';
import { getContainerStyle } from '../styles';
import { downloadCSV, downloadText, downloadWebM, generateFilename } from '../utils/downloadUtils';
import { TaskInstructionScreen } from '../components/TaskInstructionScreen';

const TypingTaskPage = () => {
  const router = useRouter();
  const { stream } = useCamera();
  const { session, endSession } = useExperiment();
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const { detector, isModelLoaded } = useFaceDetector(true);
  const { rotation, headPose, screenRotation, handleStart } = useFaceTracking({
    videoRef,
    detector,
    isModelLoaded,
    condition: session?.condition,
  });

  const [text, setText] = useState('');
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioIsPlaying, setAudioIsPlaying] = useState(false);
  const [isTaskStarted, setIsTaskStarted] = useState(false);

  const { isRecording, cameraBlob, startRecording, stopRecording } = useRecording(stream);
  const { logs, exportLogsAsCSV } = usePostureLog({
    session,
    headPose,
    screenRotation,
    audioCurrentTime,
    audioIsPlaying,
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
      // play() のエラーを適切にハンドリング
      videoElement.play().catch((error) => {
        // AbortError は通常無視して問題ない（新しい load によって中断された場合）
        if (error.name !== 'AbortError') {
          console.error('ビデオの再生に失敗しました:', error);
        }
      });
    }
  }, [stream]);

  // 音声の時間更新
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setAudioCurrentTime(audio.currentTime);
    };

    const handlePlay = () => {
      setAudioIsPlaying(true);
    };

    const handlePause = () => {
      setAudioIsPlaying(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, []);

  const handleStartTask = async () => {
    try {
      // 録画開始
      await startRecording();

      // 顔追跡開始（基準姿勢を設定）
      handleStart();

      // 音声再生開始
      if (audioRef.current) {
        audioRef.current.play();
      }

      setIsTaskStarted(true);
    } catch (error) {
      console.error('タスク開始エラー:', error);
      alert('録画の開始に失敗しました。');
    }
  };

  const handleCompleteTask = () => {
    // 録画停止
    stopRecording();

    // 音声停止
    if (audioRef.current) {
      audioRef.current.pause();
    }

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

    // 入力テキスト（TXT）
    downloadText(text, `${baseFilename}_text_${timestamp}.txt`);

    // Webカメラ録画（WebM）
    if (cameraBlob) {
      downloadWebM(cameraBlob, `${baseFilename}_camera_${timestamp}.webm`);
    }

    // セッション終了してホームに戻る
    alert('データのダウンロードが完了しました。');
    endSession();
    router.push('/');
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
          title="議事録作成タスク"
          description={
            <>
              音声を聞きながら議事録を作成してください。
              <br />
              音声は自由に巻き戻し・一時停止できます。
              <br />
              音声が終了したら完了ボタンを押してください。
            </>
          }
          onStart={handleStartTask}
          isModelLoaded={isModelLoaded}
        />
      ) : (
        // タスク画面（回転する）
        <>
          <div style={contentContainerStyle}>
            {/* 左側: 音声プレーヤー */}
            <div style={audioContainerStyle}>
              <h2 style={sectionTitleStyle}>音声再生</h2>
              <audio
                ref={audioRef}
                controls
                style={audioPlayerStyle}
                src="/sample-audio.mp3"
              >
                お使いのブラウザは audio タグをサポートしていません。
              </audio>
              <div style={audioInfoStyle}>
                <p>再生時間: {audioCurrentTime.toFixed(1)}秒</p>
                <p>状態: {audioIsPlaying ? '再生中' : '一時停止'}</p>
              </div>
            </div>

            {/* 中央: テキストエリア */}
            <div style={textAreaContainerStyle}>
              <h2 style={sectionTitleStyle}>議事録</h2>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="会議の内容を自由に記述してください..."
                style={textAreaStyle}
              />
            </div>
          </div>

          {/* コントロールボタン */}
          <div style={buttonContainerStyle}>
            <button onClick={handleCompleteTask} style={completeButtonStyle}>
              タスク完了・データダウンロード
            </button>
          </div>
        </>
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
  padding: '20px',
};

const contentContainerStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  display: 'flex',
  gap: '20px',
  backgroundColor: 'white',
  padding: '30px',
  paddingBottom: '100px',
  boxSizing: 'border-box',
};

const audioContainerStyle: React.CSSProperties = {
  flex: '0 0 350px',
  display: 'flex',
  flexDirection: 'column',
  gap: '15px',
  height: 'fit-content',
};

const textAreaContainerStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: '15px',
  minHeight: 0,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: 'bold',
  color: '#333',
  margin: 0,
};

const audioPlayerStyle: React.CSSProperties = {
  width: '100%',
};

const audioInfoStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#666',
  lineHeight: '1.6',
};

const textAreaStyle: React.CSSProperties = {
  width: '100%',
  flex: 1,
  padding: '15px',
  fontSize: '16px',
  lineHeight: '1.6',
  border: '2px solid #ddd',
  borderRadius: '8px',
  resize: 'none',
  fontFamily: 'inherit',
};

const buttonContainerStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: '30px',
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  justifyContent: 'center',
  zIndex: 10,
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
  transition: 'background-color 0.3s',
};

const completeButtonStyle: React.CSSProperties = {
  padding: '16px 32px',
  fontSize: '18px',
  fontWeight: 'bold',
  color: 'white',
  backgroundColor: '#388e3c',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  transition: 'background-color 0.3s',
};

export default TypingTaskPage;
