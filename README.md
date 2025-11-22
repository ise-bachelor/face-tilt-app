# 実験用 Web アプリケーション v2.0

頭部姿勢（回転・並行移動）に応じて画面を回転させながら3種類のタスクを実行し、その操作性・負荷・パフォーマンスを評価するための Web 実験システムです。

## 実施タスク

1. **タイピングタスク（Typing）**
   - 左に表示される課題文を右の入力欄に入力する

2. **ポインティングタスク（Fitts）**
   - 円周上に並んだターゲットを交互にクリック
   - ISO 9241-411準拠

3. **ドラッグタスク（Steering）**
   - トンネル内をマウスでなぞってゴールまで進む

## 実験条件

- **Rotate1条件**: 画面が頭部姿勢に応じてリアルタイムに回転
- **Rotate2条件**: Rotate1の2倍の回転量で画面が回転
- **Default条件**: 画面は一切回転しない（固定）

## 頭部追跡と画面回転

### 頭部データ

頭部の動きは以下の6軸で追跡されます：

**回転（Rotation）**
- **Pitch**: 上下の傾き（うなずき）
- **Yaw**: 左右の回転（首振り）
- **Roll**: 傾き（首かしげ）

**並行移動（Translation）**
- **Tx**: 左右への移動
- **Ty**: 上下への移動
- **Tz**: 前後への移動（画面への近づき/離れ）

### 画面回転ロジック

| 頭部の動き | 画面回転への影響 |
|-----------|----------------|
| Pitch (上下回転) | rotateX に反映 |
| Yaw (左右回転) | rotateY に反映 |
| Roll (傾き) | rotateZ に反映 |
| Ty (上下移動) | rotateX に反映 |
| Tx (左右移動) | rotateY に反映 |
| Tz (前後移動) | rotateX に反映 |

### 感度係数

```typescript
ROTATION_SENSITIVITY = 1.0;           // 頭部回転の感度係数
TRANSLATION_SENSITIVITY_TX = 0.0025;   // 左右移動の感度係数
TRANSLATION_SENSITIVITY_TY = 0.001;   // 上下移動の感度係数
TRANSLATION_SENSITIVITY_TZ = 0.005;   // 前後移動の感度係数
```

### 回転制限

画面回転は各軸 ±60度 に制限されます。

## 技術スタック

- **Next.js 14** / React 18 / TypeScript 5
- **TensorFlow.js 4.x** + MediaPipe Face Landmarks Detection
- **MediaRecorder API**: Webカメラ・画面録画
- **CSS 3D Transforms**: 画面回転表現
- **Kalman Filter**: 画面振動軽減（応答性重視設定）

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで `http://localhost:3000` を開きます。

### 3. カメラの許可

初回アクセス時にカメラへのアクセス許可を求められるので、許可してください。

## 使用方法

### 1. 同意フォーム

- 参加者ID、年齢、性別、利き手を入力
- 映像公開への同意を選択
- 送信後、同意情報がCSVでダウンロードされます

### 2. 実験設定

- **実験条件**: Rotate1 / Rotate2 / Default
- **タスク選択**: Typing / Fitts / Steering

### 3. タスク開始

「タスク開始」ボタンを押すと、以下が同時に開始されます：

- 姿勢ログ記録（4Hz）
- Webカメラ録画
- 画面回転（Rotate条件のみ）

### 4. タスク完了・データダウンロード

タスク終了時に以下のデータが自動ダウンロードされます：

- 姿勢ログ（CSV）
- タスク固有ログ（CSV）
- 議事録テキスト（TXT）※議事録タスクのみ
- Webカメラ映像（WebM）

## データ形式

### 姿勢ログ（posture_log.csv）

| カラム | 説明 |
|--------|------|
| timestamp | ミリ秒精度の時刻 |
| participant_id | 参加者ID |
| condition | rotate1 / rotate2 / default |
| task_name | minutes / fitts / steering |
| Head_Pitch | 頭部Pitch（基準との差分） |
| Head_Yaw | 頭部Yaw（基準との差分） |
| Head_Roll | 頭部Roll（基準との差分） |
| Head_Tx | 頭部左右移動（基準との差分） |
| Head_Ty | 頭部上下移動（基準との差分） |
| Head_Tz | 頭部前後移動（基準との差分） |
| Screen_Pitch_Raw | 画面Pitch（フィルタ前） |
| Screen_Yaw_Raw | 画面Yaw（フィルタ前） |
| Screen_Roll_Raw | 画面Roll（フィルタ前） |
| Screen_Pitch | 画面Pitch（フィルタ後） |
| Screen_Yaw | 画面Yaw（フィルタ後） |
| Screen_Roll | 画面Roll（フィルタ後） |
| audio_current_time | 音声再生位置（議事録タスクのみ） |
| audio_is_playing | 音声再生状態（議事録タスクのみ） |

### フィッツタスクログ（fitts_trials.csv）

| カラム | 説明 |
|--------|------|
| participantId | 参加者ID |
| tiltCondition | tilt / baseline |
| trialId | トライアル番号 |
| levelId | 難易度 (low/mid/high) |
| D | ターゲット間距離（px） |
| W | ターゲット幅（px） |
| startTime | 開始時刻 |
| endTime | 終了時刻 |
| MT | 移動時間（ms） |
| targetIndex | 正解ターゲット番号 |
| clickedIndex | クリックしたターゲット番号 |
| isError | エラーか |

### ステアリングタスクログ（steering_trials.csv）

| カラム | 説明 |
|--------|------|
| participantId | 参加者ID |
| tiltCondition | tilt / baseline |
| trialId | トライアル番号 |
| widthCondition | 難易度 (easy/medium/hard) |
| A | トンネル長さ（px） |
| W | トンネル幅（px） |
| startTime | 開始時刻 |
| endTime | 終了時刻 |
| MT | 移動時間（ms） |
| errorTime | エラー時間（ms） |
| errorCount | エラー回数 |
| success | 成功したか |

## タスク詳細

### 議事録作成タスク（Minutes）

- 会議音声を聞きながら欠落文を入力
- 音声の再生・一時停止・シーク可能
- 全ての欠落文を入力すると完了

### フィッツの法則タスク（Fitts）

- 3難易度レベル × 各26試行 = 78試行
- 難易度: low (R=150, W=80), mid (R=300, W=40), high (R=450, W=20)
- 練習5回 + 本番
- CUD準拠配色

### ステアリングの法則タスク（Steering）

- 3幅条件 × 10試行 = 30試行
- 幅: easy (200px), medium (100px), hard (50px)
- 長さ: 800px
- 練習3回 + 本番

## ブラウザ互換性

- **Chrome / Edge（推奨）**: 全機能サポート
- **Firefox**: 全機能サポート
- **Safari**: カメラアクセスにHTTPSが必要

## トラブルシューティング

### カメラが動作しない

- ブラウザがカメラへのアクセスを許可しているか確認
- HTTPSまたはlocalhostでアクセスしているか確認
- 他のアプリがカメラを使用していないか確認

### 画面回転がカクカクする

- ブラウザのハードウェアアクセラレーションを有効化
- 他のタブやアプリを閉じてリソースを確保

### データがダウンロードされない

- ブラウザのポップアップブロックを確認
- ダウンロードフォルダの権限を確認

## 開発情報

### プロジェクト構造

```
face-tilt-app/
├── components/          # Reactコンポーネント
├── contexts/            # React Context（カメラ、実験セッション）
├── data/                # 議事録タスクデータ
├── hooks/               # カスタムフック
│   ├── useFaceTracking.ts   # 顔追跡・画面回転ロジック
│   ├── useFaceDetector.ts   # 顔検出モデル管理
│   ├── usePostureLog.ts     # 姿勢ログ記録
│   └── useRecording.ts      # 録画管理
├── pages/               # Next.jsページ
│   ├── index.tsx       # ホーム画面・同意フォーム
│   ├── minutes.tsx     # 議事録タスク
│   ├── fitts.tsx       # フィッツタスク
│   └── steering.tsx    # ステアリングタスク
├── types/               # TypeScript型定義
├── utils/               # ユーティリティ関数
│   ├── faceAngles.ts   # 顔角度・位置計算
│   ├── KalmanFilter.ts # カルマンフィルタ
│   └── downloadUtils.ts # ダウンロード処理
└── public/              # 静的ファイル
```

### 主要な実装

- **useFaceTracking**: 顔追跡・画面回転計算（カルマンフィルタ、60度制限）
- **calculateFaceAnglesWithTranslation**: 顔特徴点から回転・並行移動を計算
- **usePostureLog**: 4Hz姿勢ログ記録（フィルタ前後の値を記録）
- **useRecording**: Webカメラ録画
- **CameraContext**: カメラストリーム管理
- **ExperimentContext**: 実験セッション情報管理

### パフォーマンス

コンソールに `特徴点取得〜画面傾き計算: XXms` と表示され、処理時間を確認できます。

## ライセンス

MIT
