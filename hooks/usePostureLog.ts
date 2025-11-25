import { useEffect, useRef, useState } from 'react';
import { PostureLogEntry, HeadPose, HeadTranslation, ScreenRotation, ExperimentSession } from '../types';

interface UsePostureLogProps {
  session: ExperimentSession | null;
  headPose: HeadPose;
  headTranslation: HeadTranslation;
  screenRotation: ScreenRotation;
  latency: number;
  isRecording: boolean;
}

export const usePostureLog = ({
  session,
  headPose,
  headTranslation,
  screenRotation,
  latency,
  isRecording,
}: UsePostureLogProps) => {
  const [logs, setLogs] = useState<PostureLogEntry[]>([]);
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);

  // 最新の値を参照するためのref
  const headPoseRef = useRef(headPose);
  const headTranslationRef = useRef(headTranslation);
  const screenRotationRef = useRef(screenRotation);
  const latencyRef = useRef(latency);
  const sessionRef = useRef(session);

  // refを常に最新の値に更新
  useEffect(() => {
    headPoseRef.current = headPose;
    headTranslationRef.current = headTranslation;
    screenRotationRef.current = screenRotation;
    latencyRef.current = latency;
    sessionRef.current = session;
  }, [headPose, headTranslation, screenRotation, latency, session]);

  useEffect(() => {
    if (isRecording && session) {
      // 4Hz = 250ms間隔でログを記録
      intervalIdRef.current = setInterval(() => {
        const currentSession = sessionRef.current;
        if (!currentSession) return;
        console.log("Logging posture data...");
        const logEntry: PostureLogEntry = {
          timestamp: Number((Date.now() / 1000).toFixed(4)), // 秒単位（小数第4位まで）
          participant_id: currentSession.participant_id,
          condition: currentSession.condition,
          task_name: currentSession.task_name,
          // 頭部回転（基準との差分）
          Head_Pitch: headPoseRef.current.pitch,
          Head_Yaw: headPoseRef.current.yaw,
          Head_Roll: headPoseRef.current.roll,
          // 頭部並行移動（基準との差分）
          Head_Tx: headTranslationRef.current.tx,
          Head_Ty: headTranslationRef.current.ty,
          Head_Tz: headTranslationRef.current.tz,
          // 画面回転（カルマンフィルタ後）
          Screen_Pitch: screenRotationRef.current.pitch,
          Screen_Yaw: screenRotationRef.current.yaw,
          Screen_Roll: screenRotationRef.current.roll,
          // 処理レイテンシ
          Latency_ms: latencyRef.current,
        };

        setLogs((prevLogs) => [...prevLogs, logEntry]);
      }, 250); // 4Hz = 250ms
    }

    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
    };
  }, [isRecording, session]); // 依存配列からheadPose等を削除

  const clearLogs = () => {
    setLogs([]);
  };

  const exportLogsAsCSV = (): string => {
    if (logs.length === 0) {
      return '';
    }

    // CSVヘッダー
    const headers = [
      'timestamp',
      'participant_id',
      'condition',
      'task_name',
      'Head_Pitch',
      'Head_Yaw',
      'Head_Roll',
      'Head_Tx',
      'Head_Ty',
      'Head_Tz',
      'Screen_Pitch',
      'Screen_Yaw',
      'Screen_Roll',
      'Latency_ms',
    ];

    // CSVボディ
    const rows = logs.map((log) =>
      [
        log.timestamp,
        log.participant_id,
        log.condition,
        log.task_name,
        log.Head_Pitch.toFixed(4),
        log.Head_Yaw.toFixed(4),
        log.Head_Roll.toFixed(4),
        log.Head_Tx.toFixed(4),
        log.Head_Ty.toFixed(4),
        log.Head_Tz.toFixed(4),
        log.Screen_Pitch.toFixed(4),
        log.Screen_Yaw.toFixed(4),
        log.Screen_Roll.toFixed(4),
        log.Latency_ms.toFixed(2),
      ].join(',')
    );

    return [headers.join(','), ...rows].join('\n');
  };

  return {
    logs,
    clearLogs,
    exportLogsAsCSV,
  };
};
