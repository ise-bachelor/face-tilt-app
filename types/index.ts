export type FaceLandmarksDetector = any;
export type Keypoint = any;

export type Rotation = {
  rotateX: number;
  rotateY: number;
  rotateZ: number;
};

// 実験条件
export type ExperimentCondition = 'rotate' | 'default';

// タスク種類
export type TaskType = 'typing' | 'fitts' | 'steering';

// 頭部姿勢（基準との差分）
export interface HeadPose {
  pitch: number;
  yaw: number;
  roll: number;
}

// 画面回転（実際の回転値）
export interface ScreenRotation {
  pitch: number;
  yaw: number;
  roll: number;
}

// 姿勢ログエントリ（4Hzで記録）
export interface PostureLogEntry {
  timestamp: number;
  participant_id: string;
  condition: ExperimentCondition;
  task_name: TaskType;
  Head_Pitch: number;
  Head_Yaw: number;
  Head_Roll: number;
  Screen_Pitch: number;
  Screen_Yaw: number;
  Screen_Roll: number;
  audio_current_time?: number;  // 議事録タスクのみ
  audio_is_playing?: boolean;    // 議事録タスクのみ
}

// フィッツタスク: クリックログ（旧型 - 後方互換性のため残す）
export interface FittsLogEntry {
  timestamp: number;
  trial_index: number;
  target_size: number;
  target_distance: number;
  click_time: number;
  is_practice: boolean;
}

// フィッツタスク: トライアルログ（ISO 9241-411準拠）
export interface FittsTrialLog {
  participantId: string;
  tiltCondition: 'baseline' | 'tilt';
  trialId: number;
  levelId: 'low' | 'mid' | 'high';
  D: number;  // Distance (radius)
  W: number;  // Width (target size)
  startTime: number;
  endTime: number;
  MT: number;  // Movement Time
  targetIndex: number;
  clickedIndex: number;
  isError: boolean;
}

// ステアリングタスク: 軌跡ログ
export interface SteeringLogEntry {
  timestamp: number;
  trial_index: number;
  tunnel_width: number;
  tunnel_length: number;
  x: number;
  y: number;
  is_inside_tunnel: boolean;
  is_practice: boolean;
}

// 実験セッション情報
export interface ExperimentSession {
  participant_id: string;
  condition: ExperimentCondition;
  task_name: TaskType;
  start_time: number;
}