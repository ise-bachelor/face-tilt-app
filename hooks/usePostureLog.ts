import { useEffect, useRef, useState } from 'react';
import { PostureLogEntry, HeadPose, HeadTranslation, ScreenRotation, ExperimentSession } from '../types';

interface UsePostureLogProps {
  session: ExperimentSession | null;
  headPose: HeadPose;
  headTranslation: HeadTranslation;
  screenRotation: ScreenRotation;
  audioCurrentTime?: number;
  audioIsPlaying?: boolean;
  isRecording: boolean;
}

export const usePostureLog = ({
  session,
  headPose,
  headTranslation,
  screenRotation,
  audioCurrentTime,
  audioIsPlaying,
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
          Head_Pitch: headPose.pitch,
          Head_Yaw: headPose.yaw,
          Head_Roll: headPose.roll,
          Head_Tx: headTranslation.tx,
          Head_Ty: headTranslation.ty,
          Head_Tz: headTranslation.tz,
          Screen_Pitch: screenRotation.pitch,
          Screen_Yaw: screenRotation.yaw,
          Screen_Roll: screenRotation.roll,
          audio_current_time: audioCurrentTime,
          audio_is_playing: audioIsPlaying,
        };

        setLogs((prevLogs) => [...prevLogs, logEntry]);
      }, 250); // 4Hz = 250ms
    }

    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
    };
  }, [isRecording, session, headPose, headTranslation, screenRotation, audioCurrentTime, audioIsPlaying]);

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
      'audio_current_time',
      'audio_is_playing',
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
        log.audio_current_time?.toFixed(2) || '',
        log.audio_is_playing !== undefined ? log.audio_is_playing : '',
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
