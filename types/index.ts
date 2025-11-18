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
export type TaskType = 'fitts' | 'steering' | 'minutes';

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

// ステアリングタスク: トライアルログ（Steering Law準拠）
export interface SteeringTrialLog {
  participantId: string;
  tiltCondition: 'baseline' | 'tilt';
  trialId: number;
  widthCondition: 'easy' | 'medium' | 'hard';
  A: number;  // Tunnel length (800px)
  W: number;  // Tunnel width (200/100/50px)
  startTime: number;
  endTime: number;
  MT: number;  // Movement Time
  errorTime: number;  // Time spent outside tunnel
  errorCount: number;  // Number of times exiting tunnel
  success: boolean;
}

// ビデオ画像公開の同意タイプ
export type VideoConsentType =
  | 'approved_identifiable'      // 顔が特定される形式のままで公開OK
  | 'approved_anonymized'        // モザイク処理等で個人が特定されない形式で公開OK
  | 'approved_with_conditions'   // 条件付きで公開を承諾
  | 'not_approved';              // 承諾しない

// ビデオ画像公開についての同意情報
export interface VideoConsent {
  consentType: VideoConsentType;
  conditions?: string;  // 条件付き承諾の場合の条件
}

// 参加者情報
export interface ParticipantInfo {
  participantId: string;
  age: number;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  handedness: 'right' | 'left' | 'other';
  videoConsent: VideoConsent;
}

// 実験セッション情報
export interface ExperimentSession {
  participant_id: string;
  condition: ExperimentCondition;
  task_name: TaskType;
  start_time: number;
  participantInfo?: ParticipantInfo;  // 参加者情報を追加
}

// 議事録編集タスク: 欠落文入力ログ
export interface MinutesInputLog {
  sentenceId: string;
  T_highlight_pressed: number;
  T_typing_start: number;
  T_typing_end: number;
  search_time: number;  // T_typing_start - T_highlight_pressed
  input_time: number;   // T_highlight_pressed(next) - T_typing_start
  modal_time: number;   // モーダル表示時間
  need_fix: boolean;    // ハイライト押下時に入力が正しくなかったか
  fix_count: number;    // 修正を促された回数
}

// 議事録編集タスク: 誤字指摘ログ
export interface MinutesTypoLog {
  timestamp: number;
  error_id: string;
  corrected: boolean;
}