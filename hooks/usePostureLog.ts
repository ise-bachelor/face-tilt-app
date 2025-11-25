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

  useEffect(() => {
    if (isRecording && session) {
      // 2Hz = 500ms間隔でログを記録
      intervalIdRef.current = setInterval(() => {
        const logEntry: PostureLogEntry = {
          timestamp: Number((Date.now() / 1000).toFixed(4)), // 秒単位（小数第4位まで）
          participant_id: session.participant_id,
          condition: session.condition,
          task_name: session.task_name,
          // 頭部回転（基準との差分）
          Head_Pitch: headPose.pitch,
          Head_Yaw: headPose.yaw,
          Head_Roll: headPose.roll,
          // 頭部並行移動（基準との差分）
          Head_Tx: headTranslation.tx,
          Head_Ty: headTranslation.ty,
          Head_Tz: headTranslation.tz,
          // 画面回転（カルマンフィルタ後）
          Screen_Pitch: screenRotation.pitch,
          Screen_Yaw: screenRotation.yaw,
          Screen_Roll: screenRotation.roll,
          // 処理レイテンシ
          Latency_ms: latency,
        };

        setLogs((prevLogs) => [...prevLogs, logEntry]);
      }, 500); // 2Hz = 500ms
    }

    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
    };
  }, [isRecording, session, headPose, headTranslation, screenRotation, latency]);

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
