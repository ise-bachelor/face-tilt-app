export type FaceLandmarksDetector = any;
export type Keypoint = any;

export type Rotation = {
  rotateX: number;
  rotateY: number;
  rotateZ: number;
};

// 実験条件
export type ExperimentCondition = 'rotate1' | 'rotate2' | 'default';

// タスク種類
export type TaskType = 'fitts' | 'steering' | 'minutes' | 'experiment2';

// 実験種別
export type ExperimentType = 'experiment1' | 'experiment2';

// 実験2の条件
export type Experiment2Condition = 'default' | 'rotate';

// 実験2のマニュアル種別
export type ManualType = 'A' | 'B' | 'P';

// タイピングタスクのマッピング（条件→課題文）
export type TypingTaskMapping = 'T1' | 'T2' | 'T3';

// タイピングマッピングの定義
// T1: D→A, R1→B, R2→C
// T2: D→B, R1→C, R2→A
// T3: D→C, R1→A, R2→B
export const TYPING_MAPPINGS: Record<TypingTaskMapping, Record<ExperimentCondition, string>> = {
  T1: { default: 'passage1', rotate1: 'passage2', rotate2: 'passage3' },
  T2: { default: 'passage2', rotate1: 'passage3', rotate2: 'passage1' },
  T3: { default: 'passage3', rotate1: 'passage1', rotate2: 'passage2' },
};

// Fittsタスクの難易度順序（参加者グループ）
export type FittsDifficultyOrder = 'G1' | 'G2' | 'G3';

// Fitts難易度順序の定義（グループ × 条件）
// G1 (ID % 3 == 1): D→LMH, R1→MHL, R2→HLM
// G2 (ID % 3 == 2): D→MHL, R1→HLM, R2→LMH
// G3 (ID % 3 == 0): D→HLM, R1→LMH, R2→MHL
export const FITTS_DIFFICULTY_ORDERS: Record<FittsDifficultyOrder, Record<ExperimentCondition, ('low' | 'mid' | 'high')[]>> = {
  G1: {
    default: ['low', 'mid', 'high'],
    rotate1: ['mid', 'high', 'low'],
    rotate2: ['high', 'low', 'mid'],
  },
  G2: {
    default: ['mid', 'high', 'low'],
    rotate1: ['high', 'low', 'mid'],
    rotate2: ['low', 'mid', 'high'],
  },
  G3: {
    default: ['high', 'low', 'mid'],
    rotate1: ['low', 'mid', 'high'],
    rotate2: ['mid', 'high', 'low'],
  },
};

// 頭部姿勢（基準との差分）
export interface HeadPose {
  pitch: number;
  yaw: number;
  roll: number;
}

// 頭部並行移動（基準との差分）
export interface HeadTranslation {
  tx: number;  // 左右移動（右が正）
  ty: number;  // 上下移動（下が正）
  tz: number;  // 前後移動（前が正、画面に近づく）
}

// 画面回転（実際の回転値）
export interface ScreenRotation {
  pitch: number;
  yaw: number;
  roll: number;
}

// 非連動型回転の方向
export type NonCoupledRotationDirection = 'Pitch' | 'PitchReverse' | 'Yaw' | 'YawReverse' | 'Roll' | 'RollReverse' | null;

// 非連動型回転の状態
export type NonCoupledRotationState = 'rotating' | 'paused' | null;

// 姿勢ログエントリ（4Hzで記録）
export interface PostureLogEntry {
  timestamp: number;
  participant_id: string;
  condition: ExperimentCondition;
  task_name: TaskType;
  // 頭部回転（基準との差分）
  Head_Pitch: number;
  Head_Yaw: number;
  Head_Roll: number;
  // 頭部並行移動（基準との差分）
  Head_Tx: number;
  Head_Ty: number;
  Head_Tz: number;
  // 画面回転（カルマンフィルタ後）
  Screen_Pitch: number;
  Screen_Yaw: number;
  Screen_Roll: number;
  // 処理レイテンシ（ms）
  Latency_ms: number;
  // 非連動型回転イベント（実験2のみ）
  NonCoupled_Rotation_Direction: NonCoupledRotationDirection;
  NonCoupled_Rotation_State: NonCoupledRotationState;
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
  // 1. 試行の基本情報
  participant_id: string;
  condition: string;  // NoTilt / Tilt1 / Tilt2
  block_index: number;  // ブロック番号（0,1,2...）
  trial_index: number;  // そのブロック内での試行番号

  // 2. ターゲット・タスク条件
  amplitude_px: number;  // スタートからターゲット中心までの距離（px）
  target_width_px: number;  // ターゲットの直径（px）
  target_direction_deg: number;  // スタートから見たターゲット方向（度）
  start_center_x: number;  // スタート円の中心x座標（px）
  start_center_y: number;  // スタート円の中心y座標（px）
  target_center_x: number;  // ターゲット中心x座標（px）
  target_center_y: number;  // ターゲット中心y座標（px）
  id_theoretical: number;  // 理論的なID: log2(A/W + 1)

  // 3. 時間情報（ミリ秒）
  trial_start_time_ms: number;  // ターゲットが表示された時刻
  click_time_ms: number;  // クリックが確定した時刻
  movement_time_ms: number;  // MT（移動時間）

  // 4. クリック位置と誤差
  click_x: number;  // クリック位置のx座標（px）
  click_y: number;  // クリック位置のy座標（px）
  hit: boolean;  // ターゲット内に入ったかどうか
  dx_px: number;  // ターゲット中心から見たx方向のずれ
  dy_px: number;  // ターゲット中心から見たy方向のずれ
  radial_error_px: number;  // ターゲット中心からの距離（ずれの大きさ）
  error_angle_world_deg: number;  // 誤差ベクトルの角度（画面座標系での方向）
  e_along_px: number;  // ターゲット方向に沿った誤差（前後方向）
  e_cross_px: number;  // ターゲット方向に直交する誤差（横ずれ）
  error_angle_relative_deg: number;  // ターゲット方向から見た誤差の角度

  // 5. 画面の傾き
  screen_roll_deg: number;  // 画面のRoll角
  screen_pitch_deg: number;  // 画面のPitch角
  screen_yaw_deg: number;  // 画面のYaw角
}

// ステアリングタスク: パスサンプル（時系列ログ）
export interface SteeringPathSample {
  // 基本情報
  participant_id: string;
  condition: string;  // NoTilt / Tilt1 / Tilt2
  block_index: number;
  trial_index: number;
  sample_index: number;

  // 時刻・位置
  timestamp_ms: number;
  cursor_x: number;
  cursor_y: number;

  // 通路とズレ
  inside_tunnel: boolean;
  distance_to_centerline_px: number;
  lateral_deviation_px: number;
  arc_length_along_centerline_px: number;
  delta_path_length_px: number;
}

// ステアリングタスク: トライアルログ（Steering Law準拠）
export interface SteeringTrialLog {
  // 1. 基本情報
  participant_id: string;
  condition: string;  // NoTilt / Tilt1 / Tilt2
  block_index: number;
  trial_index: number;
  course_id: string;

  // 2. コース条件（Steering Law用）
  steering_length_px: number;  // コース中心線の長さ L
  steering_width_px: number;   // トンネル幅 W
  steering_id_L_over_W: number;  // L/W（Steering LawのID）

  // 3. 時間情報
  trial_start_time_ms: number;
  trial_end_time_ms: number;
  movement_time_ms: number;

  // 4. 成功・エラー・衝突関連
  success: boolean;
  collision_count: number;
  collision_time_ms_total: number;

  // 5. 経路の長さ・速度・効率
  path_length_px: number;
  mean_speed_px_per_s: number;
  path_efficiency: number;

  // 6. 通路中心線からのズレ（Trial平均）
  mean_abs_lateral_deviation_px: number;
  max_abs_lateral_deviation_px: number;

  // 7. 画面の傾き
  screen_roll_deg: number;
  screen_pitch_deg: number;
  screen_yaw_deg: number;
}

// 旧型（後方互換性のため残す）
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
  typingMapping: TypingTaskMapping;
  fittsDifficultyOrder: FittsDifficultyOrder;
}

// 実験セッション情報
export interface ExperimentSession {
  participant_id: string;
  condition: ExperimentCondition;
  task_name: TaskType;
  start_time: number;
  participantInfo?: ParticipantInfo;  // 参加者情報を追加
  typingMapping?: TypingTaskMapping;  // タイピングタスクのマッピング
  fittsDifficultyOrder?: FittsDifficultyOrder;  // Fitts難易度順序
}

// タイピングタスク: キー入力ログ
export interface TypingKeyLog {
  key: string;
  timestamp_ms: number;
  is_backspace: boolean;
}

// タイピングタスク: 結果ログ
export interface TypingResultLog {
  participant_id: string;
  condition: ExperimentCondition;
  passage_id: string;
  final_text: string;
  final_time_ms: number;
  key_logs: TypingKeyLog[];
}

// NASA-RTLX 回答
export interface NasaRtlxResponse {
  mentalDemand: number;    // 0–100
  physicalDemand: number;  // 0–100
  temporalDemand: number;  // 0–100
  performance: number;     // 0–100
  effort: number;          // 0–100
  frustration: number;     // 0–100
  overallScore: number;    // 6指標の平均
}

// CSQ-VR 項目キー
export type CsqVrItemKey =
  | 'nauseaA'
  | 'nauseaB'
  | 'vestibularA'
  | 'vestibularB'
  | 'oculomotorA'
  | 'oculomotorB';

// CSQ-VR 各項目の回答
export interface CsqVrItemResponse {
  score: number;   // 1–7
  comment: string; // 任意
}

// CSQ-VR 全体の回答
export interface CsqVrResponse {
  items: Record<CsqVrItemKey, CsqVrItemResponse>;
  nauseaScore: number;      // nauseaA + nauseaB
  vestibularScore: number;  // vestibularA + vestibularB
  oculomotorScore: number;  // oculomotorA + oculomotorB
  totalScore: number;       // 上記3カテゴリの合計
}

// ===== 実験2: メール作成タスク =====

// メールシナリオ
export interface EmailScenario {
  id: string;              // 例: "A01", "B01"
  manualType: ManualType;  // 'A' or 'B'
  categories: string[];    // 想定される参照カテゴリ
  customerEmail: string;   // 顧客からのメール本文
}

// メール作成タスク: キー入力ログ
export interface EmailKeyLog {
  key: string;
  timestamp_ms: number;
  is_backspace: boolean;
  is_delete: boolean;
  is_paste: boolean;
}

// メール作成タスク: 各シナリオのログ
export interface EmailScenarioLog {
  participant_id: string;
  condition: Experiment2Condition;
  manual_id: ManualType;
  scenario_id: string;
  scenario_order_index: number;
  reply_start_time: number;     // 返信開始時刻（タイムスタンプ）
  reply_send_time: number;      // 送信ボタン押下時刻
  reply_duration_ms: number;    // 返信に要した時間
  reply_body_text: string;      // 最終的に送信された本文（回答部分のみ）
  reply_body_length_chars: number;  // 文字数
  is_empty_body: boolean;       // 回答部分が空だったか
  keypress_count_total: number; // 総キー入力数
  backspace_count: number;      // Backspace数
  delete_count: number;         // Delete数
  paste_count: number;          // ペースト数
  key_logs: EmailKeyLog[];      // 詳細なキー入力ログ
}

// メール作成タスク: セッションレベルの情報
export interface EmailSessionLog {
  participant_id: string;
  condition: Experiment2Condition;
  manual_id: ManualType;
  task_start_time: number;
  task_end_time: number;
  end_reason: 'time_up' | 'empty_send_3times';  // 終了理由
  scenarios_completed: number;  // 完了したシナリオ数
  scenario_logs: EmailScenarioLog[];  // 各シナリオのログ
}