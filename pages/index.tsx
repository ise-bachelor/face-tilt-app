import React, { useState } from 'react';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useCamera } from '../contexts/CameraContext';
import { useExperiment } from '../contexts/ExperimentContext';
import { ExperimentCondition, TaskType, ParticipantInfo, ExperimentType, Experiment2Condition, ManualType } from '../types';
import { ConsentForm } from '../components/ConsentForm';
import { downloadCSV, generateParticipantInfoCSV } from '../utils/downloadUtils';


const Home: NextPage = () => {
  const router = useRouter();
  const { isPermissionGranted, isLoading, error, requestPermission } = useCamera();
  const { participantInfo, setParticipantInfo, startSession } = useExperiment();

  // 実験種別の選択状態
  const [experimentType, setExperimentType] = useState<ExperimentType | null>(null);

  // 実験1用の状態
  const [condition, setCondition] = useState<ExperimentCondition>('default');
  const [taskName, setTaskName] = useState<TaskType>('minutes');

  // 実験2用の状態
  const [experiment2Condition, setExperiment2Condition] = useState<Experiment2Condition>('default');
  const [manualType, setManualType] = useState<ManualType>('A');

  // 同意フォームが完了したかどうか
  const consentCompleted = participantInfo !== null;

  // 実験種別が選択されたかどうか
  const experimentTypeSelected = experimentType !== null;

  // 同意フォームの送信処理
  const handleConsentSubmit = (info: ParticipantInfo) => {
    setParticipantInfo(info);

    // デバッグモード（IDが999）の場合はCSVダウンロードしない
    if (info.participantId !== '999') {
      const csvContent = generateParticipantInfoCSV(info);
      const filename = `${info.participantId}_consent.csv`;
      downloadCSV(csvContent, filename);
    }
  };

  const handleStartTask = () => {
    if (!participantInfo) {
      alert('参加者情報が設定されていません');
      return;
    }

    if (!isPermissionGranted) {
      alert('カメラへのアクセスを許可してください');
      return;
    }

    if (!experimentType) {
      alert('実験種別を選択してください');
      return;
    }

    if (experimentType === 'experiment1') {
      // 実験1の場合
      startSession(
        participantInfo.participantId,
        condition,
        taskName,
        participantInfo.typingMapping,
        participantInfo.fittsDifficultyOrder
      );
      router.push(`/${taskName}`);
    } else {
      // 実験2の場合
      router.push(`/experiment2?condition=${experiment2Condition}&manual=${manualType}&participantId=${participantInfo.participantId}`);
    }
  };

  // 実験種別が選択されていない場合は実験種別選択画面を表示
  if (!experimentTypeSelected) {
    return (
      <div style={containerStyle}>
        <h1 style={titleStyle}>実験種別の選択</h1>
        <div style={formContainerStyle}>
          <div style={formGroupStyle}>
            <label style={labelStyle}>参加する実験を選択してください</label>
            <div style={radioGroupStyle}>
              <label style={radioLabelStyle}>
                <input
                  type="radio"
                  value="experiment1"
                  checked={false}
                  onChange={(e) => setExperimentType(e.target.value as ExperimentType)}
                />
                <span style={radioTextStyle}>実験1（タイピング・ポインティング・ドラッグタスク）</span>
              </label>
              <label style={radioLabelStyle}>
                <input
                  type="radio"
                  value="experiment2"
                  checked={false}
                  onChange={(e) => setExperimentType(e.target.value as ExperimentType)}
                />
                <span style={radioTextStyle}>実験2（メール作成タスク）</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 同意フォームがまだ完了していない場合は同意フォームを表示
  if (!consentCompleted) {
    return <ConsentForm experimentType={experimentType} onSubmit={handleConsentSubmit} />;
  }

  // 同意フォーム完了後は実験設定画面を表示
  return (
    <div style={containerStyle}>
      <h1 style={titleStyle}>実験設定</h1>

      {/* 参加者情報の表示 */}
      <div style={participantInfoBoxStyle}>
        <p style={participantInfoTextStyle}>
          参加者ID: <strong>{participantInfo.participantId}</strong>
        </p>
        <p style={participantInfoSubTextStyle}>
          同意フォームのCSVがダウンロードされました
        </p>
      </div>

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
          {/* 実験種別の表示（変更不可） */}
          <div style={formGroupStyle}>
            <label style={labelStyle}>実験種別</label>
            <div style={experimentTypeDisplayStyle}>
              {experimentType === 'experiment1'
                ? '実験1（タイピング・ポインティング・ドラッグタスク）'
                : '実験2（メール作成タスク）'}
            </div>
          </div>

          {/* 実験1の設定 */}
          {experimentType === 'experiment1' && (
            <>
              {/* 実験条件 */}
              <div style={formGroupStyle}>
                <label style={labelStyle}>実験条件</label>
                <div style={radioGroupStyle}>
                  <label style={radioLabelStyle}>
                    <input
                      type="radio"
                      value="default"
                      checked={condition === 'default'}
                      onChange={(e) => setCondition(e.target.value as ExperimentCondition)}
                    />
                    <span style={radioTextStyle}>Default</span>
                  </label>
                  <label style={radioLabelStyle}>
                    <input
                      type="radio"
                      value="rotate1"
                      checked={condition === 'rotate1'}
                      onChange={(e) => setCondition(e.target.value as ExperimentCondition)}
                    />
                    <span style={radioTextStyle}>Rotate1</span>
                  </label>
                  <label style={radioLabelStyle}>
                    <input
                      type="radio"
                      value="rotate2"
                      checked={condition === 'rotate2'}
                      onChange={(e) => setCondition(e.target.value as ExperimentCondition)}
                    />
                    <span style={radioTextStyle}>Rotate2</span>
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
                      value="minutes"
                      checked={taskName === 'minutes'}
                      onChange={(e) => setTaskName(e.target.value as TaskType)}
                    />
                    <span style={radioTextStyle}>タイピングタスク</span>
                  </label>
                  <label style={radioLabelStyle}>
                    <input
                      type="radio"
                      value="fitts"
                      checked={taskName === 'fitts'}
                      onChange={(e) => setTaskName(e.target.value as TaskType)}
                    />
                    <span style={radioTextStyle}>ポインティングタスク</span>
                  </label>
                  <label style={radioLabelStyle}>
                    <input
                      type="radio"
                      value="steering"
                      checked={taskName === 'steering'}
                      onChange={(e) => setTaskName(e.target.value as TaskType)}
                    />
                    <span style={radioTextStyle}>ドラッグタスク</span>
                  </label>
                </div>
              </div>
            </>
          )}

          {/* 実験2の設定 */}
          {experimentType === 'experiment2' && (
            <>
              {/* 実験条件 */}
              <div style={formGroupStyle}>
                <label style={labelStyle}>画面回転条件</label>
                <div style={radioGroupStyle}>
                  <label style={radioLabelStyle}>
                    <input
                      type="radio"
                      value="default"
                      checked={experiment2Condition === 'default'}
                      onChange={(e) => setExperiment2Condition(e.target.value as Experiment2Condition)}
                    />
                    <span style={radioTextStyle}>Default（画面回転なし）</span>
                  </label>
                  <label style={radioLabelStyle}>
                    <input
                      type="radio"
                      value="rotate"
                      checked={experiment2Condition === 'rotate'}
                      onChange={(e) => setExperiment2Condition(e.target.value as Experiment2Condition)}
                    />
                    <span style={radioTextStyle}>Rotate（画面回転あり）</span>
                  </label>
                </div>
              </div>

              {/* マニュアル選択 */}
              <div style={formGroupStyle}>
                <label style={labelStyle}>業務マニュアル</label>
                <div style={radioGroupStyle}>
                  <label style={radioLabelStyle}>
                    <input
                      type="radio"
                      value="A"
                      checked={manualType === 'A'}
                      onChange={(e) => setManualType(e.target.value as ManualType)}
                    />
                    <span style={radioTextStyle}>Manual A（本番用）</span>
                  </label>
                  <label style={radioLabelStyle}>
                    <input
                      type="radio"
                      value="B"
                      checked={manualType === 'B'}
                      onChange={(e) => setManualType(e.target.value as ManualType)}
                    />
                    <span style={radioTextStyle}>Manual B（本番用）</span>
                  </label>
                  <label style={radioLabelStyle}>
                    <input
                      type="radio"
                      value="P"
                      checked={manualType === 'P'}
                      onChange={(e) => setManualType(e.target.value as ManualType)}
                    />
                    <span style={radioTextStyle}>Manual P（練習用 - タスク練習モード）</span>
                  </label>
                </div>
              </div>
            </>
          )}

          {/* 練習モードへのリンク */}
          {experimentType === 'experiment2' && (
            <div style={practiceModeLinkContainerStyle}>
              <p style={practiceModeLabelStyle}>タスクなしの回転練習モード:</p>
              <button
                onClick={() => router.push('/rotation-practice')}
                style={practiceModeButtonStyle}
              >
                回転練習モードへ
              </button>
            </div>
          )}

          {/* タスク開始ボタン */}
          <button
            onClick={handleStartTask}
            style={startButtonStyle}
            disabled={!experimentType}
          >
            タスク開始
          </button>

          {/* デバッグ用リンク */}
          <div style={debugLinkContainerStyle}>
            <a href="/questionnaire-debug" style={debugLinkStyle}>
              アンケートデバッグページ
            </a>
            <br />
            <a href="/webm-debug" style={debugLinkStyle}>
              WebM姿勢ログデバッグページ
            </a>
          </div>
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
};

const titleStyle: React.CSSProperties = {
  fontSize: '32px',
  fontWeight: 'bold',
  marginBottom: '20px',
  color: '#333',
};

const participantInfoBoxStyle: React.CSSProperties = {
  backgroundColor: '#e8f5e9',
  padding: '15px 25px',
  borderRadius: '8px',
  marginBottom: '20px',
  border: '2px solid #66bb6a',
  textAlign: 'center',
};

const participantInfoTextStyle: React.CSSProperties = {
  fontSize: '18px',
  color: '#2e7d32',
  margin: '5px 0',
};

const participantInfoSubTextStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#558b2f',
  margin: '5px 0',
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

const debugLinkContainerStyle: React.CSSProperties = {
  marginTop: '20px',
  paddingTop: '20px',
  borderTop: '1px solid #e0e0e0',
  textAlign: 'center',
};

const debugLinkStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#666',
  textDecoration: 'underline',
};

const experimentTypeDisplayStyle: React.CSSProperties = {
  padding: '12px 16px',
  backgroundColor: '#e3f2fd',
  borderRadius: '6px',
  fontSize: '16px',
  fontWeight: 'bold',
  color: '#1976d2',
  border: '2px solid #1976d2',
};

const practiceModeLinkContainerStyle: React.CSSProperties = {
  marginTop: '20px',
  marginBottom: '20px',
  padding: '20px',
  backgroundColor: '#fff3e0',
  borderRadius: '8px',
  border: '2px solid #ff9800',
  textAlign: 'center',
};

const practiceModeLabelStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 'bold',
  color: '#e65100',
  marginBottom: '10px',
};

const practiceModeButtonStyle: React.CSSProperties = {
  padding: '12px 24px',
  fontSize: '16px',
  fontWeight: 'bold',
  color: 'white',
  backgroundColor: '#ff9800',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  transition: 'background-color 0.3s',
};

export default Home;
