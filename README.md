# 実験用 Web アプリケーション v1.4

頭部姿勢（Head Pitch/Yaw/Roll）に応じて画面を回転させながら3種類のタスクを実行し、その操作性・負荷・パフォーマンスを評価するための Web 実験システムです。

## 実施タスク

1. **議事録作成タスク（Typing）**
   - 会議音声を聞きながら議事録を作成

2. **フィッツの法則タスク（Fitts）**
   - 円周上に並んだターゲットを交互にクリック

3. **ステアリングの法則タスク（Steering）**
   - トンネル内をマウスでなぞってゴールまで進む

## 実験条件

- **Rotate条件**: 画面が頭部姿勢に応じてリアルタイムに回転
- **Default条件**: 画面は一切回転しない（Screen_Pitch/Yaw/Roll = 0固定）

## 機能

- 📹 Webカメラから顔の特徴点を検出（MediaPipe Face Mesh）
- 🔄 顔の動きに連動して画面が3D回転（Rotate条件）
- 📊 姿勢ログ記録（4Hz、250ms間隔）
- 🎥 Webカメラ録画 + 画面録画（同時記録）
- 💾 データ自動ダウンロード（CSV、WebM、TXT形式）
- 🎯 3種類の実験タスク（Typing、Fitts、Steering）

## 技術スタック

- **Next.js 14** / React 18 / TypeScript 5
- **TensorFlow.js 4.x** + MediaPipe Face Landmarks Detection
- **MediaRecorder API**: Webカメラ・画面録画
- **CSS 3D Transforms**: 画面回転表現
- **Kalman Filter**: 画面振動軽減

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 音声ファイルの準備（議事録タスク用）

議事録作成タスクで使用する音声ファイルを `public/sample-audio.mp3` に配置してください。

音声ファイルがない場合、議事録タスクは動作しますが音声は再生されません。

### 3. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで `http://localhost:3000` を開きます。

### 4. カメラの許可

初回アクセス時にカメラへのアクセス許可を求められるので、許可してください。

## 使用方法

### 1. ホーム画面で設定

- **参加者ID**: 実験参加者の識別ID（例: P001）
- **実験条件**: Rotate（画面回転）または Default（画面固定）
- **タスク選択**: Typing / Fitts / Steering

### 2. タスク開始

「タスク開始」ボタンを押すと、以下が同時に開始されます：

- 姿勢ログ記録（4Hz）
- Webカメラ録画
- 画面録画
- 画面回転（Rotate条件のみ）

### 3. タスク実施

各タスクの指示に従って操作します。

### 4. タスク完了・データダウンロード

タスク終了条件を達成すると、以下のデータが自動ダウンロードされます：

- **姿勢ログ（CSV）**: Head_Pitch/Yaw/Roll、Screen_Pitch/Yaw/Roll
- **タスク固有ログ（CSV）**: クリックログ（Fitts）、軌跡ログ（Steering）
- **議事録テキスト（TXT）**: 入力テキスト（Typing）
- **Webカメラ映像（WebM）**: 参加者の顔映像
- **画面録画（WebM）**: タスク実行中の画面

## データ形式

### 姿勢ログ（posture_log.csv）

| カラム | 説明 |
|--------|------|
| timestamp | ミリ秒精度の時刻 |
| participant_id | 参加者ID |
| condition | rotate / default |
| task_name | typing / fitts / steering |
| Head_Pitch/Yaw/Roll | 基準姿勢との差分 |
| Screen_Pitch/Yaw/Roll | 実際の画面回転値 |
| audio_current_time | 音声再生位置（議事録タスクのみ） |
| audio_is_playing | 音声再生状態（議事録タスクのみ） |

### フィッツタスクログ（clicks_log.csv）

| カラム | 説明 |
|--------|------|
| timestamp | クリック時刻 |
| trial_index | トライアル番号 |
| target_size | ターゲットサイズ（px） |
| target_distance | ターゲット間距離（px） |
| click_time | クリック所要時間（ms） |
| is_practice | 練習モードか |

### ステアリングタスクログ（trajectory_log.csv）

| カラム | 説明 |
|--------|------|
| timestamp | 記録時刻 |
| trial_index | トライアル番号 |
| tunnel_width | トンネル幅（px） |
| tunnel_length | トンネル長さ（px） |
| x, y | マウス座標 |
| is_inside_tunnel | トンネル内か |
| is_practice | 練習モードか |

## タスク詳細

### 議事録作成タスク（Typing）

- 会議音声を聞きながら議事録を自由記述
- 音声の巻き戻し・一時停止・シーク可能
- 音声終了後「タスク完了」ボタンを押す

### フィッツの法則タスク（Fitts）

- ターゲットサイズ: 16px / 32px / 64px
- 距離: 128px / 256px / 512px
- 練習1回 + 本番39クリック × 条件数

### ステアリングの法則タスク（Steering）

- トンネル幅: 15px / 31px / 63px
- トンネル長さ: 100px / 200px / 400px
- 9パターン（3×3）を実施
- 練習1回 + 本番1セット

## ブラウザ互換性

- **Chrome / Edge（推奨）**: 全機能サポート
- **Firefox**: 全機能サポート
- **Safari**: カメラアクセスにHTTPSが必要

## トラブルシューティング

### カメラが動作しない

- ブラウザがカメラへのアクセスを許可しているか確認
- HTTPSまたはlocalhostでアクセスしているか確認
- 他のアプリがカメラを使用していないか確認

### 録画が開始できない

- 画面共有の許可を確認
- ブラウザが MediaRecorder API をサポートしているか確認

### データがダウンロードされない

- ブラウザのポップアップブロックを確認
- ダウンロードフォルダの権限を確認

## 開発情報

### プロジェクト構造

```
face-tilt-app/
├── components/          # Reactコンポーネント
├── contexts/            # React Context（カメラ、実験セッション）
├── hooks/               # カスタムフック（顔追跡、姿勢ログ、録画）
├── pages/               # Next.jsページ
│   ├── index.tsx       # ホーム画面
│   ├── typing.tsx      # 議事録タスク
│   ├── fitts.tsx       # フィッツタスク
│   └── steering.tsx    # ステアリングタスク
├── types/               # TypeScript型定義
├── utils/               # ユーティリティ関数
└── public/              # 静的ファイル
```

### 主要な実装

- **useFaceTracking**: 顔追跡と画面回転ロジック（Kalman Filter適用）
- **usePostureLog**: 4Hz姿勢ログ記録
- **useRecording**: Webカメラ + 画面録画
- **CameraContext**: カメラストリーム管理
- **ExperimentContext**: 実験セッション情報管理

## ライセンス

MIT
