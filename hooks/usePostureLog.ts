import { useEffect, useRef, useState } from 'react';
import { PostureLogEntry, HeadPose, HeadTranslation, ScreenRotation, ExperimentSession } from '../types';

interface UsePostureLogProps {
  session: ExperimentSession | null;
  headPose: HeadPose;
  headTranslation: HeadTranslation;
  rawScreenRotation: ScreenRotation;
  screenRotation: ScreenRotation;
  isRecording: boolean;
}

export const usePostureLog = ({
  session,
  headPose,
  headTranslation,
  rawScreenRotation,
  screenRotation,
  isRecording,
}: UsePostureLogProps) => {
  const [logs, setLogs] = useState<PostureLogEntry[]>([]);
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRecording && session) {
      // 4Hz = 250ms間隔でログを記録
      intervalIdRef.current = setInterval(() => {
        const logEntry: PostureLogEntry = {
          timestamp: Date.now(),
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
          // 画面回転（カルマンフィルタ前）
          Screen_Pitch_Raw: rawScreenRotation.pitch,
          Screen_Yaw_Raw: rawScreenRotation.yaw,
          Screen_Roll_Raw: rawScreenRotation.roll,
          // 画面回転（カルマンフィルタ後）
          Screen_Pitch: screenRotation.pitch,
          Screen_Yaw: screenRotation.yaw,
          Screen_Roll: screenRotation.roll,
        };

        setLogs((prevLogs) => [...prevLogs, logEntry]);
      }, 250); // 4Hz = 250ms
    }

    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
    };
  }, [isRecording, session, headPose, headTranslation, rawScreenRotation, screenRotation]);

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
      'Screen_Pitch_Raw',
      'Screen_Yaw_Raw',
      'Screen_Roll_Raw',
      'Screen_Pitch',
      'Screen_Yaw',
      'Screen_Roll',
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
        log.Screen_Pitch_Raw.toFixed(4),
        log.Screen_Yaw_Raw.toFixed(4),
        log.Screen_Roll_Raw.toFixed(4),
        log.Screen_Pitch.toFixed(4),
        log.Screen_Yaw.toFixed(4),
        log.Screen_Roll.toFixed(4),
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
