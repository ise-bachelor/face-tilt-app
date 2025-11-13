import React, { useState } from 'react';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useCamera } from '../contexts/CameraContext';
import { useExperiment } from '../contexts/ExperimentContext';
import { ExperimentCondition, TaskType } from '../types';

const taskDescriptions: Record<TaskType, string> = {
  typing: `
【議事録作成タスク】
会議音声を聞きながら議事録を作成してください。
- 音声は自由に巻き戻し・一時停止できます
- テキストエリアに自由に記述してください
- 音声が終了したら完了ボタンを押してください
  `.trim(),
  fitts: `
【フィッツの法則タスク】
円周上に並んだターゲットを交互にクリックしてください。
- ターゲットサイズ: 16px / 32px / 64px
- 距離: 128px / 256px / 512px
- 練習1回の後、本番39クリックを実施します
  `.trim(),
  steering: `
【ステアリングの法則タスク】
トンネル内をなぞってゴールまで進んでください。
- トンネル幅: 15px / 31px / 63px
- トンネル長さ: 100px / 200px / 400px
- 練習1回の後、本番9パターンを実施します
  `.trim(),
};

const Home: NextPage = () => {
  const router = useRouter();
  const { isPermissionGranted, isLoading, error, requestPermission } = useCamera();
  const { startSession } = useExperiment();

  const [participantId, setParticipantId] = useState('');
  const [condition, setCondition] = useState<ExperimentCondition>('rotate');
  const [taskName, setTaskName] = useState<TaskType>('typing');

  const handleStartTask = () => {
    if (!participantId.trim()) {
      alert('参加者IDを入力してください');
      return;
    }

    if (!isPermissionGranted) {
      alert('カメラへのアクセスを許可してください');
      return;
    }

    // セッションを開始
    startSession(participantId, condition, taskName);

    // タスクページに遷移
    router.push(`/${taskName}`);
  };

  return (
    <div style={containerStyle}>
      <h1 style={titleStyle}>実験用Webアプリケーション</h1>

      {isLoading && (
        <div style={loadingBoxStyle}>カメラを初期化中...</div>
      )}

      {error && (
        <div style={errorBoxStyle}>
          <p>{error}</p>
          <button onClick={requestPermission} style={buttonStyle}>
            再試行
          </button>
        </div>
      )}

      {isPermissionGranted && !isLoading && (
        <div style={formContainerStyle}>
          {/* 参加者ID */}
          <div style={formGroupStyle}>
            <label style={labelStyle}>参加者ID</label>
            <input
              type="text"
              value={participantId}
              onChange={(e) => setParticipantId(e.target.value)}
              placeholder="例: P001"
              style={inputStyle}
            />
          </div>

          {/* 実験条件 */}
          <div style={formGroupStyle}>
            <label style={labelStyle}>実験条件</label>
            <div style={radioGroupStyle}>
              <label style={radioLabelStyle}>
                <input
                  type="radio"
                  value="rotate"
                  checked={condition === 'rotate'}
                  onChange={(e) => setCondition(e.target.value as ExperimentCondition)}
                />
                <span style={radioTextStyle}>Rotate（画面が回転）</span>
              </label>
              <label style={radioLabelStyle}>
                <input
                  type="radio"
                  value="default"
                  checked={condition === 'default'}
                  onChange={(e) => setCondition(e.target.value as ExperimentCondition)}
                />
                <span style={radioTextStyle}>Default（画面固定）</span>
              </label>
            </div>
          </div>

          {/* タスク選択 */}
          <div style={formGroupStyle}>
            <label style={labelStyle}>タスク選択</label>
            <div style={radioGroupStyle}>
              <label style={radioLabelStyle}>
                <input
                  type="radio"
                  value="typing"
                  checked={taskName === 'typing'}
                  onChange={(e) => setTaskName(e.target.value as TaskType)}
                />
                <span style={radioTextStyle}>議事録作成タスク</span>
              </label>
              <label style={radioLabelStyle}>
                <input
                  type="radio"
                  value="fitts"
                  checked={taskName === 'fitts'}
                  onChange={(e) => setTaskName(e.target.value as TaskType)}
                />
                <span style={radioTextStyle}>フィッツの法則タスク</span>
              </label>
              <label style={radioLabelStyle}>
                <input
                  type="radio"
                  value="steering"
                  checked={taskName === 'steering'}
                  onChange={(e) => setTaskName(e.target.value as TaskType)}
                />
                <span style={radioTextStyle}>ステアリングの法則タスク</span>
              </label>
            </div>
          </div>

          {/* タスク説明 */}
          <div style={descriptionBoxStyle}>
            <h3 style={descriptionTitleStyle}>タスク説明</h3>
            <pre style={descriptionTextStyle}>{taskDescriptions[taskName]}</pre>
          </div>

          {/* タスク開始ボタン */}
          <button onClick={handleStartTask} style={startButtonStyle}>
            タスク開始
          </button>
        </div>
      )}
    </div>
  );
};

// スタイル定義
const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  backgroundColor: '#f5f5f5',
  padding: '20px',
};

const titleStyle: React.CSSProperties = {
  fontSize: '32px',
  fontWeight: 'bold',
  marginBottom: '30px',
  color: '#333',
};

const loadingBoxStyle: React.CSSProperties = {
  padding: '20px',
  backgroundColor: '#e3f2fd',
  borderRadius: '8px',
  fontSize: '18px',
  color: '#1976d2',
};

const errorBoxStyle: React.CSSProperties = {
  padding: '20px',
  backgroundColor: '#ffebee',
  borderRadius: '8px',
  textAlign: 'center',
  color: '#c62828',
};

const formContainerStyle: React.CSSProperties = {
  backgroundColor: 'white',
  padding: '40px',
  borderRadius: '12px',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  maxWidth: '600px',
  width: '100%',
};

const formGroupStyle: React.CSSProperties = {
  marginBottom: '25px',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '16px',
  fontWeight: 'bold',
  marginBottom: '10px',
  color: '#333',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px',
  fontSize: '16px',
  border: '2px solid #ddd',
  borderRadius: '6px',
  outline: 'none',
  transition: 'border-color 0.3s',
};

const radioGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
};

const radioLabelStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  cursor: 'pointer',
};

const radioTextStyle: React.CSSProperties = {
  marginLeft: '8px',
  fontSize: '16px',
  color: '#555',
};

const descriptionBoxStyle: React.CSSProperties = {
  backgroundColor: '#f9f9f9',
  padding: '20px',
  borderRadius: '8px',
  marginBottom: '25px',
  border: '1px solid #e0e0e0',
};

const descriptionTitleStyle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 'bold',
  marginBottom: '10px',
  color: '#333',
};

const descriptionTextStyle: React.CSSProperties = {
  fontSize: '14px',
  lineHeight: '1.6',
  color: '#666',
  margin: 0,
  fontFamily: 'inherit',
  whiteSpace: 'pre-wrap',
};

const startButtonStyle: React.CSSProperties = {
  width: '100%',
  padding: '16px',
  fontSize: '18px',
  fontWeight: 'bold',
  color: 'white',
  backgroundColor: '#1976d2',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  transition: 'background-color 0.3s',
};

const buttonStyle: React.CSSProperties = {
  padding: '12px 24px',
  fontSize: '16px',
  fontWeight: 'bold',
  color: 'white',
  backgroundColor: '#1976d2',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  marginTop: '10px',
};

export default Home;
