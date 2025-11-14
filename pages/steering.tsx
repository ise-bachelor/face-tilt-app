import React, { useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useCamera } from '../contexts/CameraContext';
import { useExperiment } from '../contexts/ExperimentContext';
import { useFaceDetector } from '../hooks/useFaceDetector';
import { useFaceTracking } from '../hooks/useFaceTracking';
import { usePostureLog } from '../hooks/usePostureLog';
import { useRecording } from '../hooks/useRecording';
import { downloadCSV, downloadWebM } from '../utils/downloadUtils';
import { SteeringTrialLog } from '../types';
import { SteeringTask } from '../components/SteeringTask';

const SteeringTaskPage = () => {
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

  // タスク開始時に録画と顔追跡を開始
  useEffect(() => {
    if (session && isModelLoaded && !isRecording) {
      const startTask = async () => {
        try {
          await startRecording();
          handleStart();
        } catch (error) {
          console.error('タスク開始エラー:', error);
        }
      };
      startTask();
    }
  }, [session, isModelLoaded]);

  const handleComplete = (steeringLogs: SteeringTrialLog[]) => {
    if (!session) return;

    // 録画停止
    stopRecording();

    const baseFilename = `${session.participant_id}_${session.task_name}_${session.condition}`;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

    setTimeout(() => {
      // 姿勢ログ（CSV）
      const postureCSV = exportLogsAsCSV();
      if (postureCSV) {
        downloadCSV(postureCSV, `${baseFilename}_posture_${timestamp}.csv`);
      }

      // Steeringタスクログ（CSV）
      if (steeringLogs.length > 0) {
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

        const rows = steeringLogs.map(log =>
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

        const steeringCSV = [headers.join(','), ...rows].join('\n');
        downloadCSV(steeringCSV, `${baseFilename}_steering_${timestamp}.csv`);
      }

      // Webカメラ録画（WebM）
      if (cameraBlob) {
        downloadWebM(cameraBlob, `${baseFilename}_camera_${timestamp}.webm`);
      }

      // セッション終了してホームに戻る
      alert('データのダウンロードが完了しました。');
      endSession();
      router.push('/');
    }, 1000);
  };

  if (!session) {
    return <div>読み込み中...</div>;
  }

  const tiltEnabled = session.condition === 'rotate';

  return (
    <div>
      {/* 非表示のビデオ要素 */}
      <video ref={videoRef} style={{ display: 'none' }} width={640} height={480} />

      {/* Steeringタスクコンポーネント */}
      {isModelLoaded ? (
        <SteeringTask
          participantId={session.participant_id}
          tiltEnabled={tiltEnabled}
          pitch={rotation.rotateX}
          yaw={rotation.rotateY}
          roll={rotation.rotateZ}
          onComplete={handleComplete}
        />
      ) : (
        <div style={loadingStyle}>
          <p>顔認識モデルを読み込み中...</p>
        </div>
      )}
    </div>
  );
};

const loadingStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '18px',
  color: '#666',
};

export default SteeringTaskPage;
